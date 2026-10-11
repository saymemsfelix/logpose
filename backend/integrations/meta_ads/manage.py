"""
Funções de gerenciamento do Meta Ads via Graph API.
- Toggle status (ACTIVE/PAUSED) de campanhas, adsets e ads
- Update budget (daily_budget e lifetime_budget) de campanhas (CBO) e adsets (ABO)
- Resolução inteligente de IDs por correspondência exata e normalizada
"""
import asyncio
import json
import logging
import unicodedata
import re
import httpx
from integrations.meta_ads.client import GRAPH_API_BASE, DEFAULT_TIMEOUT, INITIAL_BACKOFF

logger = logging.getLogger(__name__)


def _normalize_name(s: str) -> str:
    """Normaliza texto para comparacao sem acentos, espacos ou simbolos."""
    if not s:
        return ""
    nfkd = unicodedata.normalize("NFKD", s)
    no_accents = "".join([c for c in nfkd if not unicodedata.combining(c)])
    return re.sub(r"[^a-zA-Z0-9]", "", no_accents.lower())


async def resolve_meta_entity(
    access_token: str,
    account_id: str,
    entity_id: str,
    entity_name: str,
    entity_type: str = "campaign",
) -> tuple[str, str, float | None]:
    """
    Resolve o entity_id e entity_type reais no Meta Ads:
    - Se for placeholder (ex: 'ID_DA_CAMPANHA_BIDCAP_1') ou nome (ex: 'CBO 1+1+2'):
      Busca todas as campanhas e adsets da conta e faz correspondencia inteligente por ID e por nome normalizado.
    - Se for numerico, verifica se existe na conta ou resolve pelo nome para evitar IDs alucinados.
    Retorna: (real_entity_id, real_entity_type, current_budget_reais)
    """
    clean_id = (entity_id or "").strip()
    is_numeric_id = clean_id.isdigit() and len(clean_id) >= 6
    act_id = account_id if str(account_id).startswith("act_") else f"act_{account_id}"
    target_name = (entity_name or clean_id).strip()

    try:
        async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT) as http:
            # 1. Buscar campanhas da conta
            url_camp = f"{GRAPH_API_BASE}/{act_id}/campaigns"
            resp = await http.get(
                url_camp,
                params={
                    "access_token": access_token,
                    "fields": "id,name,status,daily_budget,lifetime_budget,bid_strategy",
                    "limit": "250",
                },
            )
            if resp.status_code == 200:
                campaigns = resp.json().get("data", [])
                matched_camp = None

                # Prioridade 1: ID numerico existente diretamente na conta
                if is_numeric_id:
                    for camp in campaigns:
                        if str(camp.get("id")) == clean_id:
                            matched_camp = camp
                            break

                # Prioridade 2: Nome exato (case-insensitive)
                if not matched_camp and target_name:
                    target_lower = target_name.lower()
                    for camp in campaigns:
                        if camp.get("name", "").strip().lower() == target_lower:
                            matched_camp = camp
                            break

                # Prioridade 3: Nome normalizado (sem espacos, hifens, pipes, +, acentos)
                if not matched_camp and target_name:
                    target_norm = _normalize_name(target_name)
                    if target_norm:
                        for camp in campaigns:
                            if _normalize_name(camp.get("name", "")) == target_norm:
                                matched_camp = camp
                                break

                # Prioridade 4: Substring / contem palavras (priorizando campanhas ATIVAS)
                if not matched_camp and target_name:
                    target_lower = target_name.lower()
                    target_norm = _normalize_name(target_name)
                    sorted_camps = sorted(campaigns, key=lambda c: 0 if c.get("status") == "ACTIVE" else 1)
                    for camp in sorted_camps:
                        c_name = camp.get("name", "").strip().lower()
                        c_norm = _normalize_name(c_name)
                        if (
                            target_lower in c_name
                            or c_name in target_lower
                            or (target_norm and (target_norm in c_norm or c_norm in target_norm))
                        ):
                            matched_camp = camp
                            break

                if matched_camp:
                    b_raw = matched_camp.get("daily_budget") or matched_camp.get("lifetime_budget")
                    budget_reais = float(b_raw) / 100.0 if b_raw else None
                    logger.info(
                        f"Resolved entity '{entity_name or entity_id}' -> Campaign ID {matched_camp['id']} ('{matched_camp.get('name')}')"
                    )
                    return str(matched_camp["id"]), "campaign", budget_reais

            # 2. Se nao achou em campanhas, buscar em adsets (conjuntos)
            url_adsets = f"{GRAPH_API_BASE}/{act_id}/adsets"
            resp_adsets = await http.get(
                url_adsets,
                params={
                    "access_token": access_token,
                    "fields": "id,name,status,daily_budget,lifetime_budget,campaign_id",
                    "limit": "250",
                },
            )
            if resp_adsets.status_code == 200:
                adsets = resp.json().get("data", [])
                matched_adset = None

                if is_numeric_id:
                    for adset in adsets:
                        if str(adset.get("id")) == clean_id:
                            matched_adset = adset
                            break

                if not matched_adset and target_name:
                    target_lower = target_name.lower()
                    for adset in adsets:
                        if adset.get("name", "").strip().lower() == target_lower:
                            matched_adset = adset
                            break

                if not matched_adset and target_name:
                    target_norm = _normalize_name(target_name)
                    if target_norm:
                        for adset in adsets:
                            if _normalize_name(adset.get("name", "")) == target_norm:
                                matched_adset = adset
                                break

                if not matched_adset and target_name:
                    target_lower = target_name.lower()
                    target_norm = _normalize_name(target_name)
                    sorted_adsets = sorted(adsets, key=lambda a: 0 if a.get("status") == "ACTIVE" else 1)
                    for adset in sorted_adsets:
                        a_name = adset.get("name", "").strip().lower()
                        a_norm = _normalize_name(a_name)
                        if (
                            target_lower in a_name
                            or a_name in target_lower
                            or (target_norm and (target_norm in a_norm or a_norm in target_norm))
                        ):
                            matched_adset = adset
                            break

                if matched_adset:
                    b_raw = matched_adset.get("daily_budget") or matched_adset.get("lifetime_budget")
                    budget_reais = float(b_raw) / 100.0 if b_raw else None
                    logger.info(
                        f"Resolved entity '{entity_name or entity_id}' -> AdSet ID {matched_adset['id']} ('{matched_adset.get('name')}')"
                    )
                    return str(matched_adset["id"]), "adset", budget_reais

    except Exception as e:
        logger.warning(f"Erro ao tentar resolver entidade Meta pelo nome/ID '{entity_name or entity_id}': {e}")

    # Fallback: se ja era um ID numerico valido, retorna ele
    if is_numeric_id and not clean_id.startswith("0"):
        return clean_id, entity_type, None

    return clean_id, entity_type, None


async def toggle_entity_status(
    access_token: str,
    entity_id: str,
    entity_type: str,
    new_status: str,
) -> dict:
    """
    Altera o status de uma entidade (campaign, adset, ad).
    new_status: 'ACTIVE' ou 'PAUSED'
    Usa retry com backoff para rate limits.
    """
    return await _post_with_retry(
        access_token=access_token,
        entity_id=entity_id,
        params={"status": new_status},
        action_label=f"Toggle {entity_type} {entity_id}",
    )


async def delete_entity(
    access_token: str,
    entity_id: str,
    entity_type: str = "campaign",
) -> dict:
    """
    Deleta uma entidade (campaign, adset, ad) na Meta Marketing API.
    DELETE https://graph.facebook.com/{version}/{entity_id}?access_token={token}
    """
    url = f"{GRAPH_API_BASE}/{entity_id}"
    try:
        async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT) as http:
            resp = await http.delete(url, params={"access_token": access_token})
            if resp.status_code == 200:
                logger.info(f"{entity_type.capitalize()} {entity_id} deletado com sucesso na Meta")
                return {"success": True}
            error_data = _parse_meta_error(resp)
            logger.error(f"Erro ao deletar {entity_type} {entity_id}: {error_data['message']}")
            return {"success": False, "error": error_data["message"]}
    except Exception as e:
        logger.error(f"Exceção ao deletar {entity_type} {entity_id}: {e}")
        return {"success": False, "error": str(e)}



async def update_budget(
    access_token: str,
    entity_id: str,
    entity_type: str,
    daily_budget_reais: float,
) -> dict:
    """
    Atualiza o orçamento diário de uma campanha (CBO) ou adset (ABO).
    Meta API espera o valor em centavos (int).
    Se for campanha ABO (orçamento nos conjuntos), atualiza automaticamente o(s) conjunto(s) ativo(s).
    """
    budget_cents = max(100, int(round(daily_budget_reais * 100)))

    # 1. Tentativa padrão: daily_budget na entidade
    res = await _post_with_retry(
        access_token=access_token,
        entity_id=entity_id,
        params={"daily_budget": str(budget_cents)},
        action_label=f"Budget {entity_type} {entity_id}",
    )
    if res["success"]:
        return res

    err_msg = res.get("error", "").lower()

    # 2. Se falhou e era campanha, verificar se é ABO (orçamento nos adsets)
    if entity_type == "campaign" and (
        "ad set" in err_msg
        or "adset" in err_msg
        or "cannot specify daily_budget" in err_msg
        or "budget" in err_msg
        or "optimization" in err_msg
        or "1487848" in err_msg
    ):
        try:
            async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT) as http:
                adsets_url = f"{GRAPH_API_BASE}/{entity_id}/adsets"
                resp = await http.get(
                    adsets_url,
                    params={
                        "access_token": access_token,
                        "fields": "id,name,status,daily_budget",
                    },
                )
                if resp.status_code == 200:
                    adsets = resp.json().get("data", [])
                    active_adsets = [a for a in adsets if a.get("status") == "ACTIVE"] or adsets
                    if active_adsets:
                        each_budget = max(100, int(budget_cents / len(active_adsets)))
                        updated_names = []
                        for target_adset in active_adsets:
                            sub_res = await _post_with_retry(
                                access_token=access_token,
                                entity_id=target_adset["id"],
                                params={"daily_budget": str(each_budget)},
                                action_label=f"Budget adset {target_adset['id']} (fallback ABO)",
                            )
                            if sub_res["success"]:
                                updated_names.append(target_adset.get("name", target_adset["id"]))
                        if updated_names:
                            return {
                                "success": True,
                                "note": f"Atualizado no(s) conjunto(s) ABO: {', '.join(updated_names)}",
                            }
        except Exception as e:
            logger.warning(f"Fallback ABO falhou para campanha {entity_id}: {e}")

    # 3. Se o erro indicar que a campanha usa lifetime_budget (orçamento total)
    if "lifetime" in err_msg:
        res_lifetime = await _post_with_retry(
            access_token=access_token,
            entity_id=entity_id,
            params={"lifetime_budget": str(budget_cents)},
            action_label=f"Lifetime budget {entity_type} {entity_id}",
        )
        if res_lifetime["success"]:
            return {"success": True, "note": "Orçamento vitalício atualizado"}

    return res


async def update_bid_amount(
    access_token: str,
    adset_id: str,
    bid_amount_reais: float,
) -> dict:
    """
    Atualiza o Bid Cap (teto de lance / bid_amount) de um conjunto de anúncios.
    Meta API espera o valor em centavos (int).
    Exemplo: R$ 90,00 -> 9000 centavos.
    """
    bid_cents = max(1, int(round(bid_amount_reais * 100)))

    # 1. Tentativa padrão de atualizar bid_amount
    res = await _post_with_retry(
        access_token=access_token,
        entity_id=adset_id,
        params={"bid_amount": str(bid_cents)},
        action_label=f"Update bid_amount adset {adset_id}",
    )
    if res["success"]:
        return {"success": True, "bid_amount": bid_amount_reais}

    err_msg = res.get("error", "").lower()
    # 2. Se exigir bid_strategy compatível (LOWEST_COST_WITH_BID_CAP ou COST_CAP)
    if "bid_strategy" in err_msg or "bid strategy" in err_msg or "strategy" in err_msg:
        res_with_strat = await _post_with_retry(
            access_token=access_token,
            entity_id=adset_id,
            params={
                "bid_amount": str(bid_cents),
                "bid_strategy": "LOWEST_COST_WITH_BID_CAP",
            },
            action_label=f"Update bid_amount + strategy adset {adset_id}",
        )
        if res_with_strat["success"]:
            return {"success": True, "bid_amount": bid_amount_reais}

    return res


async def update_adset_details(
    access_token: str,
    adset_id: str,
    name: str | None = None,
    daily_budget_reais: float | None = None,
    bid_amount_reais: float | None = None,
    status: str | None = None,
) -> dict:
    """
    Atualiza campos de um conjunto de anúncios (nome, orçamento, bid cap, status).
    """
    params: dict[str, str] = {}
    if name and name.strip():
        params["name"] = name.strip()
    if status:
        params["status"] = status.upper()
    if daily_budget_reais is not None and daily_budget_reais > 0:
        params["daily_budget"] = str(max(100, int(round(daily_budget_reais * 100))))
    if bid_amount_reais is not None and bid_amount_reais > 0:
        params["bid_amount"] = str(max(1, int(round(bid_amount_reais * 100))))

    if not params:
        return {"success": True, "note": "Nenhuma alteração informada"}

    res = await _post_with_retry(
        access_token=access_token,
        entity_id=adset_id,
        params=params,
        action_label=f"Update adset details {adset_id}",
    )
    return res


async def update_campaign_details(
    access_token: str,
    campaign_id: str,
    name: str | None = None,
    daily_budget_reais: float | None = None,
    status: str | None = None,
) -> dict:
    """
    Atualiza dados de uma campanha existente (nome, orçamento CBO, status).
    """
    params: dict[str, str] = {}
    if name and name.strip():
        params["name"] = name.strip()
    if status:
        params["status"] = status.upper()

    if daily_budget_reais is not None and daily_budget_reais > 0:
        b_res = await update_budget(access_token, campaign_id, "campaign", daily_budget_reais)
        if not b_res["success"]:
            return b_res

    if params:
        res = await _post_with_retry(
            access_token=access_token,
            entity_id=campaign_id,
            params=params,
            action_label=f"Update campaign details {campaign_id}",
        )
        return res

    return {"success": True}


async def duplicate_adset_in_campaign(
    access_token: str,
    account_id: str,
    source_adset_id: str,
    new_name: str | None = None,
    new_bid_amount_reais: float | None = None,
    new_daily_budget_reais: float | None = None,
    status: str = "PAUSED",
) -> dict:
    """
    Duplica um conjunto de anúncios mantendo os mesmos anúncios/criativos,
    permitindo alterar o nome e o lance (Bid Cap).
    Tenta primeiro o endpoint nativo de cópias da Meta (/copies),
    com fallback para clonagem estruturada.
    """
    act_id = account_id if str(account_id).startswith("act_") else f"act_{account_id}"

    # 1. Tentativa via endpoint nativo de cópia da Meta Ads
    try:
        url_copy = f"{GRAPH_API_BASE}/{source_adset_id}/copies"
        copy_data = {
            "access_token": access_token,
            "deep_copy": "true",
            "status_option": status.upper(),
        }
        if new_name:
            copy_data["rename_options"] = json.dumps({
                "rename_strategy": "CUSTOM_NAME",
                "custom_name": new_name,
            })

        async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT) as http:
            resp = await http.post(url_copy, data=copy_data)
            if resp.status_code == 200:
                result = resp.json()
                new_adset_id = str(result.get("copied_adset_id") or result.get("id", ""))
                if new_adset_id:
                    if new_bid_amount_reais is not None and new_bid_amount_reais > 0:
                        await update_bid_amount(access_token, new_adset_id, new_bid_amount_reais)
                    if new_daily_budget_reais is not None and new_daily_budget_reais > 0:
                        await update_budget(access_token, new_adset_id, "adset", new_daily_budget_reais)
                    if new_name:
                        await update_adset_details(access_token, new_adset_id, name=new_name)

                    logger.info(f"AdSet {source_adset_id} duplicado com sucesso via /copies -> {new_adset_id}")
                    return {"success": True, "adset_id": new_adset_id}
    except Exception as e:
        logger.warning(f"Tentativa /copies falhou: {e}, executando clonagem estruturada manual")

    # 2. Fallback: Clonagem Estruturada
    try:
        async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT) as http:
            # Buscar detalhes do adset original
            resp_adset = await http.get(
                f"{GRAPH_API_BASE}/{source_adset_id}",
                params={
                    "access_token": access_token,
                    "fields": "id,name,campaign_id,bid_strategy,bid_amount,daily_budget,targeting,promoted_object,start_time",
                },
            )
            if resp_adset.status_code != 200:
                err = _parse_meta_error(resp_adset)
                return {"success": False, "error": f"Erro ao ler conjunto original: {err['message']}"}

            orig = resp_adset.json()
            campaign_id = orig.get("campaign_id")
            adset_name = new_name.strip() if new_name else f"{orig.get('name', 'Conjunto')} - Cópia"

            bid_strategy = orig.get("bid_strategy") or "LOWEST_COST_WITHOUT_CAP"
            bid_amount_to_use = new_bid_amount_reais
            if bid_amount_to_use is None and orig.get("bid_amount"):
                bid_amount_to_use = float(orig["bid_amount"]) / 100.0

            # Montar payload do novo conjunto
            create_payload: dict[str, str] = {
                "access_token": access_token,
                "name": adset_name,
                "campaign_id": campaign_id,
                "bid_strategy": bid_strategy,
                "optimization_goal": "OFFSITE_CONVERSIONS",
                "billing_event": "IMPRESSIONS",
                "status": status.upper(),
            }

            if orig.get("promoted_object"):
                create_payload["promoted_object"] = json.dumps(orig["promoted_object"])
            if orig.get("targeting"):
                create_payload["targeting"] = json.dumps(orig["targeting"])
            if orig.get("start_time"):
                create_payload["start_time"] = orig["start_time"]

            # Orçamento se for ABO
            budget_val = new_daily_budget_reais if new_daily_budget_reais is not None else (
                float(orig["daily_budget"]) / 100.0 if orig.get("daily_budget") else None
            )
            if budget_val:
                create_payload["daily_budget"] = str(int(round(budget_val * 100)))

            # Bid amount se aplicável
            if bid_amount_to_use:
                create_payload["bid_amount"] = str(int(round(bid_amount_to_use * 100)))

            resp_create = await http.post(f"{GRAPH_API_BASE}/{act_id}/adsets", data=create_payload)
            if resp_create.status_code != 200:
                err = _parse_meta_error(resp_create)
                return {"success": False, "error": f"Erro ao criar conjunto: {err['message']}"}

            new_adset_id = str(resp_create.json().get("id"))

            # Buscar anúncios do adset original
            resp_ads = await http.get(
                f"{GRAPH_API_BASE}/{source_adset_id}/ads",
                params={
                    "access_token": access_token,
                    "fields": "id,name,creative,status",
                    "limit": "50",
                },
            )
            ads_created = 0
            if resp_ads.status_code == 200:
                ads_list = resp_ads.json().get("data", [])
                for ad in ads_list:
                    c_id = ad.get("creative", {}).get("id")
                    if c_id:
                        ad_payload = {
                            "access_token": access_token,
                            "name": ad.get("name", "Anúncio"),
                            "adset_id": new_adset_id,
                            "creative": json.dumps({"creative_id": c_id}),
                            "status": status.upper(),
                        }
                        r_ad = await http.post(f"{GRAPH_API_BASE}/{act_id}/ads", data=ad_payload)
                        if r_ad.status_code == 200:
                            ads_created += 1

            return {"success": True, "adset_id": new_adset_id, "ads_copied": ads_created}

    except Exception as e:
        logger.error(f"Erro ao duplicar adset {source_adset_id}: {e}")
        return {"success": False, "error": str(e)}


async def create_new_adset_for_campaign(
    access_token: str,
    account_id: str,
    campaign_id: str,
    name: str,
    bid_strategy: str = "BID_CAP",
    bid_amount_reais: float | None = None,
    daily_budget_reais: float | None = None,
    pixel_id: str = "",
    targeting: dict | None = None,
    copy_ads_from_adset_id: str | None = None,
    status: str = "PAUSED",
) -> dict:
    """
    Cria um novo conjunto de anúncios diretamente dentro de uma campanha existente.
    Pode herdar configurações de pixel/targeting e copiar anúncios de outro conjunto.
    """
    act_id = account_id if str(account_id).startswith("act_") else f"act_{account_id}"

    try:
        async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT) as http:
            # Se pixel_id ou targeting não foram enviados, busca do primeiro adset da campanha
            if not pixel_id or not targeting:
                resp_existing = await http.get(
                    f"{GRAPH_API_BASE}/{campaign_id}/adsets",
                    params={
                        "access_token": access_token,
                        "fields": "id,targeting,promoted_object,start_time",
                        "limit": "1",
                    },
                )
                if resp_existing.status_code == 200:
                    ex_data = resp_existing.json().get("data", [])
                    if ex_data:
                        first_as = ex_data[0]
                        if not pixel_id:
                            pixel_id = (first_as.get("promoted_object") or {}).get("pixel_id", "")
                        if not targeting:
                            targeting = first_as.get("targeting", {})

            # Mapeamento da estratégia de lance
            bid_strat_map = {
                "VOLUME": "LOWEST_COST_WITHOUT_CAP",
                "BID_CAP": "LOWEST_COST_WITH_BID_CAP",
                "COST_CAP": "COST_CAP",
                "ROAS": "LOWEST_COST_WITH_MIN_ROAS",
            }
            api_strat = bid_strat_map.get(bid_strategy, bid_strategy)

            create_data: dict[str, str] = {
                "access_token": access_token,
                "name": name.strip(),
                "campaign_id": campaign_id,
                "bid_strategy": api_strat,
                "optimization_goal": "OFFSITE_CONVERSIONS",
                "billing_event": "IMPRESSIONS",
                "status": status.upper(),
            }

            if pixel_id:
                create_data["promoted_object"] = json.dumps({
                    "pixel_id": pixel_id,
                    "custom_event_type": "PURCHASE",
                })
            if targeting:
                create_data["targeting"] = json.dumps(targeting)

            if daily_budget_reais is not None and daily_budget_reais > 0:
                create_data["daily_budget"] = str(int(round(daily_budget_reais * 100)))

            if bid_amount_reais is not None and bid_amount_reais > 0:
                create_data["bid_amount"] = str(int(round(bid_amount_reais * 100)))

            resp_create = await http.post(f"{GRAPH_API_BASE}/{act_id}/adsets", data=create_data)
            if resp_create.status_code != 200:
                err = _parse_meta_error(resp_create)
                return {"success": False, "error": f"Erro ao criar conjunto: {err['message']}"}

            new_adset_id = str(resp_create.json().get("id"))

            # Copiar anúncios de um conjunto existente se solicitado
            ads_copied = 0
            if copy_ads_from_adset_id:
                resp_ads = await http.get(
                    f"{GRAPH_API_BASE}/{copy_ads_from_adset_id}/ads",
                    params={
                        "access_token": access_token,
                        "fields": "id,name,creative,status",
                        "limit": "50",
                    },
                )
                if resp_ads.status_code == 200:
                    ads_list = resp_ads.json().get("data", [])
                    for ad in ads_list:
                        c_id = ad.get("creative", {}).get("id")
                        if c_id:
                            ad_payload = {
                                "access_token": access_token,
                                "name": ad.get("name", "Anúncio"),
                                "adset_id": new_adset_id,
                                "creative": json.dumps({"creative_id": c_id}),
                                "status": status.upper(),
                            }
                            r_ad = await http.post(f"{GRAPH_API_BASE}/{act_id}/ads", data=ad_payload)
                            if r_ad.status_code == 200:
                                ads_copied += 1

            return {"success": True, "adset_id": new_adset_id, "ads_copied": ads_copied}

    except Exception as e:
        logger.error(f"Erro ao criar conjunto na campanha {campaign_id}: {e}")
        return {"success": False, "error": str(e)}


async def _post_with_retry(
    access_token: str,
    entity_id: str,
    params: dict,
    action_label: str,
    max_retries: int = 3,
) -> dict:
    """
    POST na Graph API com retry para rate limit.
    Parseia erro da Meta API para mensagem amigável.
    """
    url = f"{GRAPH_API_BASE}/{entity_id}"
    post_data = {"access_token": access_token, **params}

    async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT) as http:
        for attempt in range(max_retries):
            response = await http.post(url, data=post_data)

            # Sucesso
            if response.status_code == 200:
                return {"success": True}

            # Parsear erro da Meta
            error_data = _parse_meta_error(response)

            # Rate limit -> retry com backoff
            if error_data["is_rate_limit"]:
                wait_time = INITIAL_BACKOFF * (2 ** attempt)
                logger.warning(
                    f"{action_label}: Rate limit (tentativa "
                    f"{attempt + 1}/{max_retries}). Aguardando {wait_time}s"
                )
                await asyncio.sleep(wait_time)
                continue

            # Outro erro -> retorna imediatamente
            logger.error(f"{action_label}: {error_data['message']}")
            return {"success": False, "error": error_data["message"]}

    # Todas as tentativas esgotadas
    logger.error(f"{action_label}: Rate limit persistente após {max_retries} tentativas")
    return {"success": False, "error": "Rate limit da Meta API. Tente novamente em alguns minutos."}


def _parse_meta_error(response) -> dict:
    """Parseia erro da Meta API para extrair mensagem e tipo."""
    try:
        body = response.json()
        error = body.get("error", {})
        code = error.get("code", 0)
        message = error.get("error_user_msg") or error.get("message", "")
        error_subcode = error.get("error_subcode", 0)

        is_rate_limit = code in (17, 32, 4) or response.status_code == 429

        return {
            "message": message or f"Erro {response.status_code} da Meta API",
            "code": code,
            "subcode": error_subcode,
            "is_rate_limit": is_rate_limit,
        }
    except Exception:
        return {
            "message": f"Erro {response.status_code} da Meta API",
            "code": 0,
            "subcode": 0,
            "is_rate_limit": response.status_code == 429,
        }
