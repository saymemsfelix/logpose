"""
Helpers para parsear dados de actions/action_values
retornados pela Meta Marketing API.
"""
from typing import Any


def extract_action_value(
    actions: list[dict[str, Any]] | None,
    action_type: str,
) -> float:
    """
    Extrai o value de um action_type específico da lista de actions.
    Suporta fallbacks inteligentes para variações da Meta Marketing API.
    Ex: extract_action_value(actions, "landing_page_view") -> 3980.0
    """
    if not actions:
        return 0.0

    # 1. Match exato
    for action in actions:
        if action.get("action_type") == action_type:
            return float(action.get("value", 0))

    # 2. Variações para Initiate Checkout (Suporta pixel padrão e customizado)
    if "initiate" in action_type:
        ic_candidates = [
            "omni_initiated_checkout",
            "initiate_checkout",
            "offsite_conversion.fb_pixel_initiate_checkout",
            "onsite_web_initiated_checkout",
        ]
        # Prioriza candidatos conhecidos
        for c in ic_candidates:
            for action in actions:
                if action.get("action_type") == c:
                    return float(action.get("value", 0))

        # Fallback para custom conversions (ex: offsite_conversion.custom.123456.initiate_checkout)
        max_ic = 0.0
        for action in actions:
            act_name = str(action.get("action_type") or "").lower()
            if "initiate" in act_name and "checkout" in act_name:
                val = safe_float(action.get("value", 0))
                if val > max_ic:
                    max_ic = val
        if max_ic > 0:
            return max_ic

    # 3. Variações para Landing Page Views e PageViews (Suporta LPV nativo e Pixel ViewContent)
    if "landing_page" in action_type or "page" in action_type:
        lpv_candidates = [
            "landing_page_view",
            "omni_landing_page_view",
            "offsite_conversion.fb_pixel_landing_page_view",
        ]
        for c in lpv_candidates:
            for action in actions:
                if action.get("action_type") == c:
                    val = safe_float(action.get("value", 0))
                    if val > 0:
                        return val

        # Fallback para view_content / PageView padrão do pixel
        pv_candidates = [
            "view_content",
            "omni_view_content",
            "offsite_conversion.fb_pixel_view_content",
            "page_view",
            "pageview",
        ]
        for c in pv_candidates:
            for action in actions:
                if action.get("action_type") == c:
                    val = safe_float(action.get("value", 0))
                    if val > 0:
                        return val

        max_lpv = 0.0
        for action in actions:
            act_name = str(action.get("action_type") or "").lower()
            if "landing_page" in act_name or "view_content" in act_name:
                val = safe_float(action.get("value", 0))
                if val > max_lpv:
                    max_lpv = val
        if max_lpv > 0:
            return max_lpv

    return 0.0


def safe_float(value: Any, default: float = 0.0) -> float:
    """Converte para float com segurança."""
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def safe_int(value: Any, default: int = 0) -> int:
    """Converte para int com segurança."""
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return default


def calc_connect_rate(
    landing_page_views: int,
    clicks: int,
) -> float:
    """
    Taxa de conexão = LPV / Clicks * 100
    Indica % de clicks que realmente carregaram a landing page.
    """
    if clicks <= 0:
        return 0.0
    return round((landing_page_views / clicks) * 100, 1)


def calc_profit(revenue: float, spend: float) -> float:
    """Lucro simples = receita - investimento."""
    return round(revenue - spend, 2)
