"""
Helpers para parsear UTMs no formato name|id e cruzar
dados do Meta Ads com transações do banco de dados.
"""
from typing import Optional
from urllib.parse import unquote_plus
import re


def clean_utm_text(raw: Optional[str]) -> str:
    """Decodifica URL encoding e remove macros e ruídos."""
    if not raw:
        return ""
    try:
        decoded = unquote_plus(str(raw).strip())
    except Exception:
        decoded = str(raw).strip()
    
    # Se for uma macro não substituída como {{campaign.name}}
    if decoded.startswith("{{") and decoded.endswith("}}"):
        return ""
    return decoded


def parse_utm_field(raw: Optional[str]) -> tuple[Optional[str], Optional[str]]:
    """
    Parseia campo UTM no formato 'name|id' ou variações flexíveis.
    Retorna (name, id). Se for apenas dígitos, retorna (None, id).
    Se não tem pipe, retorna (name, None) ou (None, id) se for ID numérico.
    """
    if not raw:
        return None, None
    clean = clean_utm_text(raw)
    if not clean:
        return None, None

    if "|" in clean:
        parts = clean.rsplit("|", 1)
        name = parts[0].strip() or None
        uid = parts[1].strip() or None
        # Limpar macros residuais
        if uid and (uid.startswith("{{") or not any(c.isdigit() for c in uid)):
            uid = None
        if name and name.startswith("{{"):
            name = None
        return name, uid

    # Se for puramente numérico (ID de campanha/anúncio da Meta com 9+ dígitos)
    clean_digits = re.sub(r"\D", "", clean)
    if clean.isdigit() or (len(clean_digits) >= 10 and clean.startswith("act_")):
        return None, clean_digits or clean

    return clean, None


def parse_utm_campaign(utm_campaign: Optional[str]) -> tuple[Optional[str], Optional[str]]:
    """Extrai (campaign_name, campaign_id) do utm_campaign."""
    return parse_utm_field(utm_campaign)


def parse_utm_medium(utm_medium: Optional[str]) -> tuple[Optional[str], Optional[str]]:
    """Extrai (adset_name, adset_id) do utm_medium."""
    return parse_utm_field(utm_medium)


def parse_utm_content(utm_content: Optional[str]) -> tuple[Optional[str], Optional[str]]:
    """Extrai (ad_name, ad_id) do utm_content."""
    return parse_utm_field(utm_content)


def parse_utm_term(utm_term: Optional[str]) -> tuple[Optional[str], Optional[str]]:
    """Extrai (ad_name, ad_id) do utm_term."""
    return parse_utm_field(utm_term)


def safe_division(numerator: float, denominator: float, default: float = 0.0) -> float:
    """Divisão segura evitando ZeroDivisionError."""
    if denominator <= 0:
        return default
    return round(numerator / denominator, 2)
