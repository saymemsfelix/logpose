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
    Suporta nomes de campanha com pipes (ex: 'CBO | TESTE DE OFERTA |' ou 'CBO | TESTE DE OFERTA ||1202394829384').
    """
    if not raw:
        return None, None
    clean = clean_utm_text(raw)
    if not clean:
        return None, None

    # Se for puramente numérico (ID de campanha/anúncio da Meta com 8+ dígitos)
    clean_digits = re.sub(r"\D", "", clean)
    if clean.isdigit() or (len(clean_digits) >= 8 and clean.startswith("act_")):
        return None, clean_digits or clean

    # Se contém ID numérico longo (8+ dígitos) em qualquer lugar da string
    id_match = re.search(r"\b\d{8,20}\b", clean)
    if id_match:
        uid = id_match.group()
        # O nome é o que vem antes do ID (removendo pipes à direita)
        name_candidate = clean[:id_match.start()].rstrip("|").strip()
        if not name_candidate:
            # Caso o ID esteja no começo (ex: "123456789|Nome")
            name_candidate = clean[id_match.end():].lstrip("|").strip()

        # Limpar macros residuais se houver
        if name_candidate and (name_candidate.startswith("{{") or name_candidate.endswith("}}")):
            name_candidate = None

        return name_candidate or None, uid

    if "|" in clean:
        parts = clean.rsplit("|", 1)
        name = parts[0].strip() or None
        uid = parts[1].strip() or None
        if uid and (uid.startswith("{{") or not any(c.isdigit() for c in uid)):
            uid = None
        if name and name.startswith("{{"):
            name = None

        # Se uid não é numérico e name terminou com pipe, na verdade o nome continha pipe!
        if not uid:
            return clean.strip(), None

        return name, uid

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
