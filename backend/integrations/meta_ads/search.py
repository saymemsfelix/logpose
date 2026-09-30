"""
Busca de dados auxiliares na Meta Marketing API:
- Pixels da conta
- Páginas do Facebook (via Business)
- Contas Instagram vinculadas
- Interesses (targeting search)
"""
import logging
import httpx
from integrations.meta_ads.client import MetaAdsClient, GRAPH_API_BASE

logger = logging.getLogger(__name__)


async def fetch_pixels(client: MetaAdsClient, business_id: str | None = None) -> list[dict]:
    """
    Busca pixels da conta de anúncio e do Business Manager.
    Combina:
    1. /{act_id}/adspixels
    2. /{business_id}/adspixels, owned_pixels, client_pixels
    3. /{act_id}/customconversions
    """
    pixels: dict[str, dict] = {}

    # 1. Ad Account pixels e datasets (novo padrão Meta)
    for edge in ("adspixels", "datasets"):
        try:
            data = await client._get(
                f"{client.account_id}/{edge}",
                params={"fields": "id,name,last_fired_time"},
            )
            for p in data.get("data", []):
                p_id = str(p.get("id", ""))
                if p_id and p_id not in pixels:
                    pixels[p_id] = {
                        "id": p_id,
                        "name": p.get("name") or f"Pixel/Dataset {p_id}",
                        "last_fired_time": p.get("last_fired_time"),
                    }
        except Exception as e:
            logger.warning(f"Erro ao buscar {edge} da conta {client.account_id}: {e}")

    # 2. Business Manager pixels / datasets
    biz_id = business_id or await _get_business_id(client.access_token, client.account_id)
    if biz_id:
        for edge in ("adspixels", "owned_pixels", "client_pixels", "datasets", "owned_datasets"):
            url = f"{GRAPH_API_BASE}/{biz_id}/{edge}"
            params = {
                "access_token": client.access_token,
                "fields": "id,name,last_fired_time",
                "limit": "100",
            }
            try:
                async with httpx.AsyncClient(timeout=15.0) as http:
                    resp = await http.get(url, params=params)
                    if resp.status_code == 200:
                        for p in resp.json().get("data", []):
                            p_id = str(p.get("id", ""))
                            if p_id and p_id not in pixels:
                                pixels[p_id] = {
                                    "id": p_id,
                                    "name": p.get("name") or f"Pixel/Dataset {p_id}",
                                    "last_fired_time": p.get("last_fired_time"),
                                }
            except Exception as e:
                logger.warning(f"Erro ao buscar {edge} do business {biz_id}: {e}")

    # 3. Custom conversions
    try:
        data = await client._get(
            f"{client.account_id}/customconversions",
            params={"fields": "id,name"},
        )
        for p in data.get("data", []):
            p_id = str(p.get("id", ""))
            if p_id and p_id not in pixels:
                pixels[p_id] = {
                    "id": p_id,
                    "name": p.get("name") or f"Conversão {p_id}",
                }
    except Exception:
        pass

    # 4. Fallback: extrair pixels usados em anúncios recentes da conta
    if not pixels:
        try:
            ads_data = await client._get(
                f"{client.account_id}/ads",
                params={"fields": "tracking_specs", "limit": "25"},
            )
            for ad in ads_data.get("data", []):
                for spec in ad.get("tracking_specs", []):
                    for px in spec.get("fb_pixel", []):
                        px_str = str(px)
                        if px_str and px_str not in pixels:
                            pixels[px_str] = {
                                "id": px_str,
                                "name": f"Pixel Ativo {px_str}",
                            }
        except Exception as e:
            logger.warning(f"Erro ao extrair pixels de anúncios anteriores: {e}")

    return list(pixels.values())


async def _get_business_id(access_token: str, ad_account_id: str) -> str | None:
    """Busca o business_id vinculado à conta de anúncio."""
    act_id = ad_account_id if ad_account_id.startswith("act_") else f"act_{ad_account_id}"
    url = f"{GRAPH_API_BASE}/{act_id}"
    params = {"access_token": access_token, "fields": "business"}

    try:
        async with httpx.AsyncClient(timeout=15.0) as http:
            response = await http.get(url, params=params)
            if response.status_code != 200:
                logger.warning(f"Erro ao buscar business: {response.text}")
                return None
            data = response.json()

        biz = data.get("business")
        return biz.get("id") if biz else None
    except Exception as e:
        logger.warning(f"Exceção ao buscar business de {act_id}: {e}")
        return None


async def fetch_pages(
    access_token: str,
    ad_account_id: str,
    business_id: str | None = None,
) -> list[dict]:
    """
    Busca páginas do Facebook por múltiplas fontes:
    1. /act_{id}/promoted_pages (páginas promovidas pela conta de anúncio)
    2. /me/accounts (páginas que o usuário administra)
    3. /{biz_id}/owned_pages e client_pages (páginas vinculadas à BM)
    """
    act_id = ad_account_id if ad_account_id.startswith("act_") else f"act_{ad_account_id}"
    pages: dict[str, dict] = {}

    # 1. Páginas promovidas pela conta de anúncio
    try:
        url = f"{GRAPH_API_BASE}/{act_id}/promoted_pages"
        params = {
            "access_token": access_token,
            "fields": "id,name,picture{url}",
            "limit": "100",
        }
        async with httpx.AsyncClient(timeout=15.0) as http:
            resp = await http.get(url, params=params)
            if resp.status_code == 200:
                for p in resp.json().get("data", []):
                    if p.get("id"):
                        pages[str(p["id"])] = p
    except Exception as e:
        logger.warning(f"Erro em promoted_pages para {act_id}: {e}")

    # 2. Páginas via /me/accounts
    try:
        me_pages = await _fetch_pages_me(access_token)
        for p in me_pages:
            if p.get("id"):
                pages[str(p["id"])] = p
    except Exception as e:
        logger.warning(f"Erro em /me/accounts: {e}")

    # 2.5 Buscar páginas de todas as BMs vinculadas ao perfil (/me/businesses)
    try:
        url_biz = f"{GRAPH_API_BASE}/me/businesses"
        async with httpx.AsyncClient(timeout=10.0) as http:
            resp_biz = await http.get(url_biz, params={"access_token": access_token, "limit": "50"})
            if resp_biz.status_code == 200:
                for b in resp_biz.json().get("data", []):
                    b_id = b.get("id")
                    if b_id:
                        for edge in ("owned_pages", "client_pages"):
                            try:
                                url_p = f"{GRAPH_API_BASE}/{b_id}/{edge}"
                                resp_p = await http.get(
                                    url_p,
                                    params={"access_token": access_token, "fields": "id,name,picture{url}", "limit": "50"}
                                )
                                if resp_p.status_code == 200:
                                    for p in resp_p.json().get("data", []):
                                        if p.get("id"):
                                            pages[str(p["id"])] = p
                            except Exception:
                                pass
    except Exception as e:
        logger.warning(f"Erro ao buscar /me/businesses: {e}")

    # 3. Páginas via Business Manager (owned + client)
    biz_id = business_id or await _get_business_id(access_token, ad_account_id)
    if biz_id:
        for edge in ("owned_pages", "client_pages"):
            try:
                url = f"{GRAPH_API_BASE}/{biz_id}/{edge}"
                params = {
                    "access_token": access_token,
                    "fields": "id,name,picture{url}",
                    "limit": "100",
                }
                async with httpx.AsyncClient(timeout=15.0) as http:
                    resp = await http.get(url, params=params)
                    if resp.status_code == 200:
                        for p in resp.json().get("data", []):
                            if p.get("id"):
                                pages[str(p["id"])] = p
            except Exception as e:
                logger.warning(f"Erro {edge} do business {biz_id}: {e}")

    # 4. Fallback: extrair páginas usadas em criativos recentes da conta de anúncio
    if not pages:
        try:
            url = f"{GRAPH_API_BASE}/{act_id}/adcreatives"
            params = {
                "access_token": access_token,
                "fields": "id,name,object_story_spec,asset_feed_spec",
                "limit": "25",
            }
            async with httpx.AsyncClient(timeout=15.0) as http:
                resp = await http.get(url, params=params)
                if resp.status_code == 200:
                    for c in resp.json().get("data", []):
                        page_id = (
                            c.get("object_story_spec", {}).get("page_id")
                            or c.get("asset_feed_spec", {}).get("page_id")
                        )
                        if page_id and str(page_id) not in pages:
                            page_id_str = str(page_id)
                            pages[page_id_str] = {
                                "id": page_id_str,
                                "name": f"Página Ativa ({page_id_str})",
                            }
        except Exception as e:
            logger.warning(f"Erro ao buscar páginas de adcreatives para {act_id}: {e}")

    return list(pages.values())


async def _fetch_pages_me(access_token: str) -> list[dict]:
    """Fallback: busca páginas via /me/accounts."""
    url = f"{GRAPH_API_BASE}/me/accounts"
    params = {
        "access_token": access_token,
        "fields": "id,name,picture{url}",
        "limit": "100",
    }
    async with httpx.AsyncClient(timeout=15.0) as http:
        response = await http.get(url, params=params)
        if response.status_code != 200:
            logger.warning(f"Erro em /me/accounts: {response.text}")
            return []
        return response.json().get("data", [])


async def fetch_instagram_accounts(
    access_token: str,
    ad_account_id: str,
    business_id: str | None = None,
    pages: list[dict] | None = None,
) -> list[dict]:
    """
    Busca contas Instagram vinculadas:
    1. /act_{id}/connected_instagram_accounts (oficial para Ads)
    2. Via páginas do Facebook vinculadas (instagram_business_account)
    3. /{biz_id}/instagram_accounts
    4. Fallback legado act_{id}/instagram_accounts
    """
    act_id = ad_account_id if ad_account_id.startswith("act_") else f"act_{ad_account_id}"
    ig_map: dict[str, dict] = {}

    # 1. connected_instagram_accounts (oficial para Ads)
    try:
        url = f"{GRAPH_API_BASE}/{act_id}/connected_instagram_accounts"
        params = {
            "access_token": access_token,
            "fields": "id,username,profile_picture_url",
            "limit": "100",
        }
        async with httpx.AsyncClient(timeout=15.0) as http:
            resp = await http.get(url, params=params)
            if resp.status_code == 200:
                for ig in resp.json().get("data", []):
                    if ig.get("id"):
                        ig_map[str(ig["id"])] = {
                            "id": str(ig["id"]),
                            "username": ig.get("username", ""),
                            "profile_pic": ig.get("profile_picture_url", ""),
                        }
    except Exception as e:
        logger.warning(f"Erro em connected_instagram_accounts para {act_id}: {e}")

    # 2. Instagram vinculado às páginas de Facebook encontradas
    if pages:
        for page in pages:
            page_id = page.get("id")
            if not page_id:
                continue
            try:
                url = f"{GRAPH_API_BASE}/{page_id}"
                params = {
                    "access_token": access_token,
                    "fields": "instagram_business_account{id,username,profile_picture_url}",
                }
                async with httpx.AsyncClient(timeout=10.0) as http:
                    resp = await http.get(url, params=params)
                    if resp.status_code == 200:
                        ig = resp.json().get("instagram_business_account")
                        if ig and ig.get("id") and str(ig["id"]) not in ig_map:
                            ig_map[str(ig["id"])] = {
                                "id": str(ig["id"]),
                                "username": ig.get("username", ""),
                                "profile_pic": ig.get("profile_picture_url", ""),
                            }
            except Exception:
                pass

    # 3. Instagram via Business Manager
    biz_id = business_id or await _get_business_id(access_token, ad_account_id)
    if biz_id:
        try:
            url = f"{GRAPH_API_BASE}/{biz_id}/instagram_accounts"
            params = {
                "access_token": access_token,
                "fields": "id,username,profile_picture_url",
                "limit": "100",
            }
            async with httpx.AsyncClient(timeout=15.0) as http:
                resp = await http.get(url, params=params)
                if resp.status_code == 200:
                    for ig in resp.json().get("data", []):
                        if ig.get("id") and str(ig["id"]) not in ig_map:
                            ig_map[str(ig["id"])] = {
                                "id": str(ig["id"]),
                                "username": ig.get("username", ""),
                                "profile_pic": ig.get("profile_picture_url", ""),
                            }
        except Exception as e:
            logger.warning(f"Erro em instagram_accounts do business {biz_id}: {e}")

    # 4. Fallback legado act_{id}/instagram_accounts
    try:
        url = f"{GRAPH_API_BASE}/{act_id}/instagram_accounts"
        params = {
            "access_token": access_token,
            "fields": "id,username,profile_picture_url",
            "limit": "100",
        }
        async with httpx.AsyncClient(timeout=10.0) as http:
            resp = await http.get(url, params=params)
            if resp.status_code == 200:
                for ig in resp.json().get("data", []):
                    if ig.get("id") and str(ig["id"]) not in ig_map:
                        ig_map[str(ig["id"])] = {
                            "id": str(ig["id"]),
                            "username": ig.get("username", ""),
                            "profile_pic": ig.get("profile_picture_url", ""),
                        }
    except Exception:
        pass

    # 5. Fallback: extrair instagram de criativos recentes
    if not ig_map:
        try:
            url = f"{GRAPH_API_BASE}/{act_id}/adcreatives"
            params = {
                "access_token": access_token,
                "fields": "id,instagram_actor_id,object_story_spec",
                "limit": "25",
            }
            async with httpx.AsyncClient(timeout=10.0) as http:
                resp = await http.get(url, params=params)
                if resp.status_code == 200:
                    for c in resp.json().get("data", []):
                        ig_id = (
                            c.get("instagram_actor_id")
                            or c.get("object_story_spec", {}).get("instagram_actor_id")
                        )
                        if ig_id and str(ig_id) not in ig_map:
                            ig_str = str(ig_id)
                            ig_map[ig_str] = {
                                "id": ig_str,
                                "username": f"Instagram ({ig_str})",
                                "profile_pic": "",
                            }
        except Exception:
            pass

    return list(ig_map.values())


async def search_interests(
    access_token: str,
    query: str,
    locale: str = "pt_BR",
) -> list[dict]:
    """Busca interesses para targeting via /search."""
    url = f"{GRAPH_API_BASE}/search"
    params = {
        "access_token": access_token,
        "type": "adinterest",
        "q": query,
        "locale": locale,
        "limit": "50",
    }
    async with httpx.AsyncClient(timeout=15.0) as http:
        response = await http.get(url, params=params)
        if response.status_code != 200:
            logger.warning(f"Interest search error: {response.text}")
            return []
        data = response.json()

    logger.info(f"Interest search '{query}': {len(data.get('data', []))} results")
    return [
        {
            "id": item.get("id"),
            "name": item.get("name"),
            "audience_size": item.get("audience_size_upper_bound", 0),
            "path": item.get("path", []),
        }
        for item in data.get("data", [])
    ]
