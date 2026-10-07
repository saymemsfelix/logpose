"""
Funções de gerenciamento do Meta Ads via Graph API.
- Toggle status (ACTIVE/PAUSED) de campanhas, adsets e ads
- Update budget (daily_budget) de campanhas e adsets
"""
import logging
from integrations.meta_ads.client import GRAPH_API_BASE

logger = logging.getLogger(__name__)


async def resolve_meta_entity(
    access_token: str,
    account_id: str,
    entity_id: str,
    entity_name: str,
    entity_type: str = "campaign",
) -> tuple[str, str, float | None]:
    """
    Resolve o entity_id e entity_type reais no Meta Ads:
    - Se entity_id for puramente numérico (ex: '120211296875700394'), valida e retorna.
    - Se for placeholder (ex: 'ID_DA_CAMPANHA_BIDCAP_1') ou nome (ex: 'CBO 1+1+2'):
      Busca todas as campanhas e adsets da conta e faz correspondência inteligente por nome.
    Retorna: (real_entity_id, real_entity_type, current_budget_reais)
    """
    import httpx
    from integrations.meta_ads.client import DEFAULT_TIMEOUT

    clean_id = (entity_id or "").strip()
    is_numeric_id = clean_id.isdigit() and len(clean_id) >= 6

    # Se já é um ID numérico puro, retorna ele diretamente
    if is_numeric_id and not clean_id.startswith("0"):
        return clean_id, entity_type, None

    act_id = account_id if str(account_id).startswith("act_") else f"act_{account_id}"
    target_name = (entity_name or clean_id).strip().lower()

    try:
        async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT) as http:
            # 1. Buscar campanhas da conta
            url_camp = f"{GRAPH_API_BASE}/{act_id}/campaigns"
            resp = await http.get(
                url_camp,
                params={
                    "access_token": access_token,
                    "fields": "id,name,status,daily_budget,bid_strategy",
                    "limit": "250",
                },
            )
            if resp.status_code == 200:
                campaigns = resp.json().get("data", [])
                matched_camp = None
                for camp in campaigns:
                    c_name = camp.get("name", "").strip().lower()
                    if c_name == target_name:
                        matched_camp = camp
                        break
                    if target_name in c_name or c_name in target_name:
                        matched_camp = camp

                if matched_camp:
                    b_raw = matched_camp.get("daily_budget")
                    budget_reais = float(b_raw) / 100.0 if b_raw else None
                    logger.info(f"Resolved entity '{entity_name}' -> Campaign ID {matched_camp['id']} ('{matched_camp.get('name')}')")
                    return matched_camp["id"], "campaign", budget_reais

            # 2. Se não achou em campanhas, buscar em adsets (conjuntos)
            url_adsets = f"{GRAPH_API_BASE}/{act_id}/adsets"
            resp_adsets = await http.get(
                url_adsets,
                params={
                    "access_token": access_token,
                    "fields": "id,name,status,daily_budget,campaign_id",
                    "limit": "250",
                },
            )
            if resp_adsets.status_code == 200:
                adsets = resp_adsets.json().get("data", [])
                matched_adset = None
                for adset in adsets:
                    a_name = adset.get("name", "").strip().lower()
                    if a_name == target_name:
                        matched_adset = adset
                        break
                    if target_name in a_name or a_name in target_name:
                        matched_adset = adset

                if matched_adset:
                    b_raw = matched_adset.get("daily_budget")
                    budget_reais = float(b_raw) / 100.0 if b_raw else None
                    logger.info(f"Resolved entity '{entity_name}' -> AdSet ID {matched_adset['id']} ('{matched_adset.get('name')}')")
                    return matched_adset["id"], "adset", budget_reais

    except Exception as e:
        logger.warning(f"Erro ao tentar resolver entidade Meta pelo nome '{entity_name}': {e}")

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


async def update_budget(
    access_token: str,
    entity_id: str,
    entity_type: str,
    daily_budget_reais: float,
) -> dict:
    """
    Atualiza o orçamento diário de uma campanha (CBO) ou adset (ABO).
    Meta API espera o valor em centavos (int).
    Se for campanha ABO (orçamento nos conjuntos), atualiza automaticamente o conjunto ativo.
    """
    budget_cents = int(daily_budget_reais * 100)

    res = await _post_with_retry(
        access_token=access_token,
        entity_id=entity_id,
        params={"daily_budget": str(budget_cents)},
        action_label=f"Budget {entity_type} {entity_id}",
    )
    if res["success"]:
        return res

    # Se falhou e era campanha, verificar se é ABO (orçamento nos adsets)
    err_msg = res.get("error", "").lower()
    if entity_type == "campaign" and ("ad set" in err_msg or "adset" in err_msg or "cannot specify daily_budget" in err_msg or "budget" in err_msg):
        import httpx
        from integrations.meta_ads.client import DEFAULT_TIMEOUT
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
                        target_adset = active_adsets[0]
                        sub_res = await _post_with_retry(
                            access_token=access_token,
                            entity_id=target_adset["id"],
                            params={"daily_budget": str(budget_cents)},
                            action_label=f"Budget adset {target_adset['id']} (fallback ABO)",
                        )
                        if sub_res["success"]:
                            return {"success": True, "note": f"Atualizado no conjunto: {target_adset.get('name', target_adset['id'])}"}
        except Exception as e:
            logger.warning(f"Fallback ABO falhou para campanha {entity_id}: {e}")

    return res


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
    import asyncio
    import httpx
    from integrations.meta_ads.client import DEFAULT_TIMEOUT, INITIAL_BACKOFF

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
        message = error.get("message", "")
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
            "message": f"Erro {response.status_code} da Meta API (resposta não parseável)",
            "code": 0,
            "subcode": 0,
            "is_rate_limit": response.status_code == 429,
        }
