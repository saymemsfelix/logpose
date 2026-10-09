"""
Criação de Ad Creative + Ad na Meta Marketing API.
Suporte a imagem e vídeo com object_story_spec.
"""
import json
import logging
from integrations.meta_ads.client import GRAPH_API_BASE
import httpx

logger = logging.getLogger(__name__)


async def create_ad_creative(
    access_token: str,
    account_id: str,
    name: str,
    page_id: str,
    instagram_actor_id: str | None,
    link: str,
    primary_text: str,
    headline: str,
    description: str,
    cta_type: str,
    image_hash: str | None = None,
    image_url: str | None = None,
    video_id: str | None = None,
    url_tags: str = "",
    display_url: str = "",
) -> dict:
    """
    Cria um Ad Creative com imagem ou vídeo.
    Retorna {"success": True, "creative_id": "..."} ou erro.
    """
    act_id = account_id if account_id.startswith("act_") else f"act_{account_id}"
    url = f"{GRAPH_API_BASE}/{act_id}/adcreatives"

    # Monta link_data (para imagem) ou video_data (para vídeo)
    # NOTA: instagram_actor_id foi DEPRECATED na v22.0+, usar instagram_user_id
    story_spec: dict = {"page_id": page_id}

    if instagram_actor_id in ("", "none", "page_backed"):
        # Página do Facebook usada como identidade no Instagram (page-backed)
        logger.info("Criando ad com identidade da Página no Instagram (page-backed)")
    elif instagram_actor_id in ("no_instagram", "none_no_ig"):
        logger.info("Criando ad sem veiculação no Instagram")
    elif instagram_actor_id and str(instagram_actor_id).isdigit():
        story_spec["instagram_user_id"] = str(instagram_actor_id)
        logger.info(f"Usando instagram_user_id fornecido: {instagram_actor_id}")
    elif instagram_actor_id is None:
        # Fallback apenas se não foi enviado no payload (retrocompatibilidade)
        ig_id = await _resolve_instagram_user_id(access_token, page_id, account_id)
        if ig_id:
            story_spec["instagram_user_id"] = ig_id

    clean_display = ""
    if display_url:
        clean_display = display_url.replace("https://", "").replace("http://", "").strip().rstrip("/")

    cta_value = {"link": link}
    if clean_display:
        cta_value["link_caption"] = clean_display

    if video_id:
        video_data: dict = {
            "video_id": video_id,
            "message": primary_text,
            "call_to_action": {"type": cta_type, "value": cta_value},
        }
        if headline:
            video_data["title"] = headline
        if description:
            video_data["link_description"] = description

        # Se não tiver image_hash nem image_url, gera thumbnail de emergência
        if not image_hash and not image_url:
            logger.warning(f"Creative {name}: video_id {video_id} sem thumbnail. Gerando image_hash de emergência...")
            try:
                from integrations.meta_ads.upload_media import _ensure_fallback_image_hash
                image_hash = await _ensure_fallback_image_hash(access_token, act_id, video_id)
            except Exception as e:
                logger.error(f"Falha ao gerar fallback_image_hash: {e}")

        if image_hash:
            video_data["image_hash"] = image_hash
        elif image_url:
            video_data["image_url"] = image_url
        else:
            return {
                "success": False,
                "error": "Não foi possível gerar thumbnail (image_hash) para o vídeo. Verifique as permissões da conta de anúncios."
            }

        story_spec["video_data"] = video_data
    else:
        link_data: dict = {
            "image_hash": image_hash,
            "link": link,
            "message": primary_text,
            "name": headline,
            "description": description,
            "call_to_action": {"type": cta_type, "value": cta_value},
        }
        # caption — URL de exibição no anúncio (display URL)
        if clean_display:
            link_data["caption"] = clean_display
        story_spec["link_data"] = link_data

    data = {
        "access_token": access_token,
        "name": name,
        "object_story_spec": json.dumps(story_spec),
    }

    # url_tags: parâmetros de URL separados (não aparecem no Ads Library)
    if url_tags:
        data["url_tags"] = url_tags

    logger.info(f"Criando Creative: {name} | Page: {page_id} | Video: {bool(video_id)}")
    logger.info(f"Story spec: {json.dumps(story_spec)}")

    async with httpx.AsyncClient(timeout=30.0) as http:
        response = await http.post(url, data=data)

        if response.status_code == 200:
            result = response.json()
            creative_id = result.get("id")
            logger.info(f"Creative criado: {creative_id}")
            return {"success": True, "creative_id": creative_id}

        error_msg = _parse_error(response)
        logger.error(f"Erro ao criar creative: {error_msg}")
        return {"success": False, "error": error_msg}


async def _resolve_instagram_user_id(
    access_token: str, page_id: str, account_id: str = ""
) -> str | None:
    """
    Fallback: busca o primeiro Instagram account vinculado à conta de anúncio ou à página.
    """
    if not account_id:
        logger.warning("Sem account_id para fallback de Instagram — creative sem IG")
        return None

    act_id = account_id if account_id.startswith("act_") else f"act_{account_id}"

    # 1. connected_instagram_accounts
    try:
        url = f"{GRAPH_API_BASE}/{act_id}/connected_instagram_accounts"
        params = {"access_token": access_token, "fields": "id,username", "limit": "1"}
        async with httpx.AsyncClient(timeout=10.0) as http:
            resp = await http.get(url, params=params)
            if resp.status_code == 200:
                ig_list = resp.json().get("data", [])
                if ig_list and ig_list[0].get("id"):
                    ig_id = str(ig_list[0]["id"])
                    ig_user = ig_list[0].get("username", "?")
                    logger.info(f"Fallback connected IG: {ig_user} ({ig_id})")
                    return ig_id
    except Exception as e:
        logger.warning(f"Erro ao buscar connected_instagram_accounts: {e}")

    # 2. Instagram da Página do Facebook
    if page_id:
        try:
            url = f"{GRAPH_API_BASE}/{page_id}"
            params = {
                "access_token": access_token,
                "fields": "instagram_business_account{id,username}",
            }
            async with httpx.AsyncClient(timeout=10.0) as http:
                resp = await http.get(url, params=params)
                if resp.status_code == 200:
                    ig = resp.json().get("instagram_business_account")
                    if ig and ig.get("id"):
                        ig_id = str(ig["id"])
                        logger.info(f"Fallback Page IG account: {ig.get('username', '?')} ({ig_id})")
                        return ig_id
        except Exception:
            pass

    # 3. Fallback legado act_{id}/instagram_accounts
    try:
        url = f"{GRAPH_API_BASE}/{act_id}/instagram_accounts"
        params = {"access_token": access_token, "fields": "id,username", "limit": "1"}
        async with httpx.AsyncClient(timeout=10.0) as http:
            resp = await http.get(url, params=params)
            if resp.status_code == 200:
                ig_list = resp.json().get("data", [])
                if ig_list and ig_list[0].get("id"):
                    return str(ig_list[0]["id"])
    except Exception:
        pass

    return None


async def create_ad(
    access_token: str,
    account_id: str,
    name: str,
    adset_id: str,
    creative_id: str,
    status: str = "PAUSED",
) -> dict:
    """
    Cria um Ad vinculado a um Ad Set e Creative.
    Retorna {"success": True, "ad_id": "..."} ou erro.
    """
    act_id = account_id if account_id.startswith("act_") else f"act_{account_id}"
    url = f"{GRAPH_API_BASE}/{act_id}/ads"

    data = {
        "access_token": access_token,
        "name": name,
        "adset_id": adset_id,
        "creative": json.dumps({"creative_id": creative_id}),
        "status": status,
    }

    logger.info(f"Criando Ad: {name} | AdSet: {adset_id} | Creative: {creative_id}")

    async with httpx.AsyncClient(timeout=30.0) as http:
        response = await http.post(url, data=data)

        if response.status_code == 200:
            result = response.json()
            ad_id = result.get("id")
            logger.info(f"Ad criado: {ad_id}")
            return {"success": True, "ad_id": ad_id}

        error_msg = _parse_error(response)
        logger.error(f"Erro ao criar ad: {error_msg}")
        return {"success": False, "error": error_msg}


def _parse_error(response: httpx.Response) -> str:
    """Parseia mensagem de erro da Meta API com detalhes."""
    try:
        body = response.json()
        error = body.get("error", {})
        code = error.get("code", "N/A")
        subcode = error.get("error_subcode", "N/A")
        # Prefere error_user_msg (mensagem detalhada na língua do usuário)
        user_msg = error.get("error_user_msg", "")
        msg = user_msg or error.get("message", f"Erro {response.status_code}")
        if subcode == 1885183 or "modo de desenvolvimento" in str(msg).lower() or "development mode" in str(msg).lower():
            return (
                "Seu aplicativo no Meta for Developers está em 'Modo de Desenvolvimento'. "
                "Para publicar anúncios, acesse developers.facebook.com/apps, selecione seu app e mude a chave no topo de 'Em desenvolvimento' para 'Ao vivo' (Live)."
            )

        return msg
    except Exception:
        logger.error(f"Meta API raw response: {response.text}")
        return f"Erro {response.status_code} da Meta API"
