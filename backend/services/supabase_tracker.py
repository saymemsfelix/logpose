import os
import logging
from typing import Dict, Any, Optional
from datetime import datetime
import httpx
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://sxwgicatatmvivgizxwg.supabase.co").strip().rstrip("/")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
DEFAULT_AREA_ID = os.getenv("SUPABASE_AREA_ID", "e46b9dc1-6ddb-4046-b66e-ff33bbce06fb").strip()


def _get_headers() -> Dict[str, str]:
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }


async def log_event_to_supabase(
    event_name: str,
    user_id: str,
    area_id: Optional[str] = None,
    utm_source: Optional[str] = None,
    utm_medium: Optional[str] = None,
    utm_campaign: Optional[str] = None,
    utm_term: Optional[str] = None,
    utm_content: Optional[str] = None,
    ip: Optional[str] = None,
    geo_country: Optional[str] = None,
    geo_region: Optional[str] = None,
    geo_city: Optional[str] = None
) -> bool:
    """Dispara a gravação de evento diretamente no RPC log_event do Supabase."""
    if not SUPABASE_KEY:
        logger.warning("[supabase_tracker] SUPABASE_SERVICE_ROLE_KEY não configurada no .env")
        return False

    url = f"{SUPABASE_URL}/rest/v1/rpc/log_event"
    payload = {
        "p_area_id": area_id or DEFAULT_AREA_ID,
        "p_user_id": user_id,
        "p_event_name": event_name,
        "p_utm_source": utm_source,
        "p_utm_medium": utm_medium,
        "p_utm_campaign": utm_campaign,
        "p_utm_term": utm_term,
        "p_utm_content": utm_content,
        "p_ip": ip,
        "p_geo_country": geo_country,
        "p_geo_region": geo_region,
        "p_geo_city": geo_city
    }
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(url, json=payload, headers=_get_headers())
            return resp.status_code in (200, 204)
    except Exception as e:
        logger.error(f"[supabase_tracker] Erro ao gravar evento {event_name}: {e}")
        return False


async def get_supabase_funnel_counts(
    from_dt: Optional[datetime] = None,
    to_dt: Optional[datetime] = None,
    area_id: Optional[str] = None
) -> Dict[str, int]:
    """
    Obtém a contagem real de page_views e initiate_checkouts gravadas no Supabase.
    Retorna {'views': N, 'checkouts': N}.
    """
    counts = {"views": 0, "checkouts": 0}
    if not SUPABASE_KEY:
        return counts

    target_area = area_id or DEFAULT_AREA_ID
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Range-Unit": "items"
    }

    base_url = f"{SUPABASE_URL}/rest/v1/events_log"
    params_view = [f"area_id=eq.{target_area}", "event_name=eq.page_view", "select=id"]
    params_checkout = [f"area_id=eq.{target_area}", "event_name=eq.initiate_checkout", "select=id"]

    if from_dt:
        params_view.append(f"created_at=gte.{from_dt.isoformat()}")
        params_checkout.append(f"created_at=gte.{from_dt.isoformat()}")
    if to_dt:
        params_view.append(f"created_at=lte.{to_dt.isoformat()}")
        params_checkout.append(f"created_at=lte.{to_dt.isoformat()}")

    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            h_count = dict(headers)
            h_count["Prefer"] = "count=exact"
            
            url_v = f"{base_url}?{'&'.join(params_view)}&limit=1"
            res_v = await client.get(url_v, headers=h_count)
            content_range_v = res_v.headers.get("content-range", "")
            if "/" in content_range_v:
                total_v = content_range_v.split("/")[-1]
                counts["views"] = int(total_v) if total_v.isdigit() else 0

            url_c = f"{base_url}?{'&'.join(params_checkout)}&limit=1"
            res_c = await client.get(url_c, headers=h_count)
            content_range_c = res_c.headers.get("content-range", "")
            if "/" in content_range_c:
                total_c = content_range_c.split("/")[-1]
                counts["checkouts"] = int(total_c) if total_c.isdigit() else 0

    except Exception as e:
        logger.error(f"[supabase_tracker] Erro ao obter contagens de funil: {e}")

    return counts
