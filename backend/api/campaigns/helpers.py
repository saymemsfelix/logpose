"""
Helpers para parsear UTMs no formato name|id e cruzar
dados do Meta Ads com transações do banco de dados.
"""
from typing import Optional


def parse_utm_field(raw: Optional[str]) -> tuple[Optional[str], Optional[str]]:
    """
    Parseia campo UTM no formato 'name|id'.
    Retorna (name, id). Se for apenas dígitos, retorna (None, id).
    Se não tem pipe, retorna (raw, None).
    """
    if not raw:
        return None, None
    clean = raw.strip()
    if "|" in clean:
        parts = clean.rsplit("|", 1)
        name = parts[0].strip() or None
        uid = parts[1].strip() or None
        return name, uid
    if clean.isdigit():
        return None, clean
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
