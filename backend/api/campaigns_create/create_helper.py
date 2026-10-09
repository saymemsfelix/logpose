"""
Helper para criar campanha completa em uma única conta.
Extrai a lógica de criação sequencial (Campaign → AdSets → Ads)
para manter create.py enxuto e reutilizável no loop multi-account.
"""
import logging
from integrations.meta_ads.create_campaign import create_campaign
from integrations.meta_ads.create_adset import create_adset
from integrations.meta_ads.manage import delete_entity
from api.campaigns_create.ads_batch import create_ads_batch, upload_single_media

logger = logging.getLogger(__name__)

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
VIDEO_EXTENSIONS = {".mp4", ".mov", ".avi", ".mkv", ".webm"}


async def create_for_single_account(
    token: str,
    act_id: str,
    data: dict,
    file_bytes_list: list[tuple[bytes, str, bool]],
    status: str,
    account_label: str = "",
    account_id_db: int = 0,
) -> dict:
    import asyncio
    
    errors: list[str] = []
    created_campaign_ids: list[str] = []
    campaign_count = max(1, int(data.get("campaign_count", 1)))
    adset_count = max(1, int(data.get("adset_count", 1)))
    total_ads_created = 0
    first_campaign_id: str | None = None
    first_adset_id: str | None = None

    acc_label = f"[{account_label}]" if account_label else ""

    # 1. Pré-upload e validação de todas as mídias da conta
    # Garante que vídeos sejam transcodificados e thumbnails gerados ANTES de criar campanha na Meta
    media_cache: dict = {}
    ads_list = data.get("ads", [])
    used_media_indices = set()
    for i, ad in enumerate(ads_list):
        m_idx = ad.get("media_index", i)
        if m_idx < len(file_bytes_list):
            used_media_indices.add(m_idx)
        else:
            errors.append(f"{acc_label} AD {i+1}: Arquivo de mídia não encontrado (índice {m_idx})")
            return {
                "campaigns_created": 0,
                "ads_created": 0,
                "first_campaign_id": None,
                "first_adset_id": None,
                "errors": errors,
                "account_id_db": account_id_db,
                "account_label": account_label,
            }

    for m_idx in sorted(used_media_indices):
        file_bytes, filename, is_video = file_bytes_list[m_idx]
        media_type = "Vídeo" if is_video else "Imagem"
        logger.info(f"{acc_label} Pré-upload de {media_type} [{m_idx+1}/{len(file_bytes_list)}]: {filename}")
        
        m_res = await upload_single_media(token, act_id, file_bytes, filename, is_video)
        if not m_res.get("success"):
            err_msg = f"{acc_label} Upload de {media_type} ({filename}) falhou — {m_res.get('error', 'Erro desconhecido')}"
            logger.error(err_msg)
            errors.append(err_msg)
            return {
                "campaigns_created": 0,
                "ads_created": 0,
                "first_campaign_id": None,
                "first_adset_id": None,
                "errors": errors,
                "account_id_db": account_id_db,
                "account_label": account_label,
            }
        media_cache[m_idx] = m_res
        logger.info(f"{acc_label} Mídia {m_idx+1} ({filename}) pronta no cache!")

    sem = asyncio.Semaphore(3)

    async def _process_campaign(camp_i):
        nonlocal total_ads_created, first_campaign_id, first_adset_id
        if errors:
            return
        
        camp_label = f"{acc_label}[Camp {camp_i + 1}/{campaign_count}]"
        campaign_name = data["campaign_name"]
        if campaign_count > 1:
            campaign_name = f"{campaign_name} #{camp_i + 1:02d}"

        async with sem:
            if errors: return
            camp_result = await create_campaign(
                access_token=token,
                account_id=act_id,
                name=campaign_name,
                daily_budget_reais=data["daily_budget"],
                bid_strategy=data.get("bid_strategy", "VOLUME"),
                status=status,
            )

        if not camp_result["success"]:
            errors.append(f"{camp_label} Erro na campanha: {camp_result['error']}")
            return

        campaign_id = camp_result["campaign_id"]
        created_campaign_ids.append(campaign_id)
        logger.info(f"{camp_label} Campanha criada: {campaign_id}")
        if first_campaign_id is None:
            first_campaign_id = campaign_id

        # AdSets em paralelo para esta campanha
        async def _process_adset(adset_i):
            nonlocal total_ads_created, first_adset_id
            if errors: return
            adset_label = f"{camp_label}[CJ {adset_i + 1}/{adset_count}]"
            
            async with sem:
                if errors: return
                ads_created, adset_id = await _create_adset_with_ads(
                    token=token,
                    act_id=act_id,
                    campaign_id=campaign_id,
                    data=data,
                    adset_i=adset_i,
                    adset_count=adset_count,
                    file_bytes_list=file_bytes_list,
                    status=status,
                    errors=errors,
                    label=adset_label,
                    media_cache=media_cache,
                )
                
            if adset_id and first_adset_id is None:
                first_adset_id = adset_id
            total_ads_created += ads_created

        adset_tasks = [_process_adset(i) for i in range(adset_count)]
        await asyncio.gather(*adset_tasks)

    camp_tasks = [_process_campaign(i) for i in range(campaign_count)]
    await asyncio.gather(*camp_tasks)

    # Rollback automático: se houve erro no processo (adset ou ad falhou),
    # deleta as campanhas que foram criadas nesta tentativa na Meta para não deixar lixo na conta
    if errors and created_campaign_ids:
        logger.warning(
            f"{acc_label} Publicação falhou com {len(errors)} erro(s). "
            f"Iniciando rollback automático de {len(created_campaign_ids)} campanha(s) na Meta..."
        )
        for cid in created_campaign_ids:
            try:
                rollback_res = await delete_entity(token, cid, "campaign")
                if rollback_res.get("success"):
                    logger.info(f"{acc_label} Rollback: campanha incompleta {cid} removida da Meta")
                else:
                    logger.warning(f"{acc_label} Rollback: falha ao remover campanha {cid}: {rollback_res.get('error')}")
            except Exception as e:
                logger.error(f"{acc_label} Erro no rollback da campanha {cid}: {e}")

    return {
        "campaigns_created": campaign_count if not errors else 0, # Aproximado se falhou
        "ads_created": total_ads_created,
        "first_campaign_id": first_campaign_id,
        "first_adset_id": first_adset_id,
        "errors": errors,
        "account_id_db": account_id_db,
        "account_label": account_label,
    }


async def _create_adset_with_ads(
    token: str,
    act_id: str,
    campaign_id: str,
    data: dict,
    adset_i: int,
    adset_count: int,
    file_bytes_list: list[tuple[bytes, str, bool]],
    status: str,
    errors: list[str],
    label: str,
    media_cache: dict | None = None,
) -> tuple[int, str | None]:
    """Cria um adset e todos os ads dentro dele. Retorna (ads_created, adset_id)."""
    adset_name = data.get("adset_name", "Conjunto")
    if adset_count > 1:
        adset_name = f"{adset_name} #{adset_i + 1:02d}"

    targeting = dict(data.get("targeting", {}))
    ig_actor_id = data.get("instagram_actor_id")

    if ig_actor_id in ("no_instagram", "none_no_ig"):
        targeting["publisher_platforms"] = ["facebook", "audience_network", "messenger"]

    adset_result = await create_adset(
        access_token=token,
        account_id=act_id,
        campaign_id=campaign_id,
        name=adset_name,
        bid_strategy=data.get("bid_strategy", "VOLUME"),
        bid_amount=data.get("bid_amount"),
        roas_floor=data.get("roas_floor"),
        pixel_id=data["pixel_id"],
        start_time=data["start_time"],
        targeting=targeting,
        status=status,
    )

    if not adset_result["success"]:
        errors.append(f"{label} Erro no conjunto: {adset_result['error']}")
        return 0, None

    adset_id = adset_result["adset_id"]
    logger.info(f"{label} Conjunto criado: {adset_id}")

    ads_created = await create_ads_batch(
        token=token,
        act_id=act_id,
        adset_id=adset_id,
        ads=data.get("ads", []),
        file_bytes_list=file_bytes_list,
        page_id=data.get("page_id", ""),
        instagram_actor_id=ig_actor_id,
        status=status,
        errors=errors,
        label=label,
        media_cache=media_cache,
    )

    return ads_created, adset_id
