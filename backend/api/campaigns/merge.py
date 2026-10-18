"""
Lógica de merge entre dados do Meta Ads e transações do banco.
Cruza por ID (confiável), por nome, por substring/tokens e por atribuição inteligente de tráfego.
"""
from __future__ import annotations
from collections import defaultdict
from typing import Any, Optional
import re
import unicodedata

from database.models.transaction import Transaction
from integrations.meta_ads.schemas import CampaignInsights, AdSetInsights, AdInsights
from api.campaigns.helpers import (
    parse_utm_campaign, parse_utm_medium, parse_utm_content, parse_utm_term, safe_division, clean_utm_text,
)


def _normalize_key(s: str) -> str:
    """Normaliza texto removendo acentos, pontuação, hífens, travessões e espaços."""
    if not s:
        return ""
    # Remove acentos
    nfkd = unicodedata.normalize("NFKD", s)
    no_accents = "".join([c for c in nfkd if not unicodedata.combining(c)])
    # Remove qualquer caracter não alfanumérico
    return re.sub(r"[^a-zA-Z0-9]", "", no_accents.lower())


def _extract_tokens(s: str) -> set[str]:
    """Retorna conjunto de palavras significativas com 3+ caracteres."""
    if not s:
        return set()
    nfkd = unicodedata.normalize("NFKD", s)
    no_accents = "".join([c for c in nfkd if not unicodedata.combining(c)]).lower()
    words = re.findall(r"[a-z0-9]+", no_accents)
    stopwords = {
        "de", "da", "do", "para", "com", "em", "um", "uma", "os", "as", "new", "offer",
        "bidcap", "cbo", "abo", "bid", "cap", "teste", "test", "ad", "ads", "copy",
        "criativo", "feed", "geral", "aberto", "broad", "interesses", "lookalike", "lla"
    }
    return {w for w in words if len(w) >= 2 and w not in stopwords}


NICHES = [
    {"keys": ["cartongesso", "carto", "gesso", "drywall"]},
    {"keys": ["hardware", "software", "scheda madre", "pc", "computador", "notebook", "multimetro", "elettronica"]},
    {"keys": ["idraulic", "idrosanitari", "scarico", "ventilazione", "tubi", "collaudi", "pressio", "anomalie", "diametri", "portate", "perdite"]},
    {"keys": ["saldatura", "saldare", "saldatrice"]},
    {"keys": ["tornitura", "fresatura", "meccanica"]},
    {"keys": ["haccp", "alimentar"]},
    {"keys": ["rilievo", "topografico"]},
]


def are_products_compatible(campaign_name: str, product_name: str) -> bool:
    """Verifica se a campanha e o produto são do mesmo nicho para evitar contaminação cruzada."""
    if not campaign_name or not product_name:
        return False
    c_low = campaign_name.lower()
    p_low = product_name.lower()

    for niche in NICHES:
        in_camp = any(k in c_low for k in niche["keys"])
        in_prod = any(k in p_low for k in niche["keys"])
        if in_camp and in_prod:
            return True
        if in_camp and not in_prod:
            return False
        if in_prod and not in_camp:
            return False

    c_tokens = _extract_tokens(campaign_name)
    p_tokens = _extract_tokens(product_name)
    return bool(c_tokens.intersection(p_tokens))


def _group_transactions_by_level(
    transactions: list[Transaction],
    meta_campaigns: list = None,
    meta_adsets: list = None,
    meta_ads: list = None,
) -> dict:
    """
    Agrupa transações por campaign_id, adset_id e ad_id.
    Usa o formato name|id com suporte flexível a variações de UTMs, src e sck.
    Vincula automaticamente Ad IDs aos seus AdSets e Campanhas pais.
    """
    by_campaign_id: dict[str, list[Transaction]] = defaultdict(list)
    by_campaign_name: dict[str, list[Transaction]] = defaultdict(list)
    by_adset_id: dict[str, list[Transaction]] = defaultdict(list)
    by_adset_name: dict[str, list[Transaction]] = defaultdict(list)
    by_ad_id: dict[str, list[Transaction]] = defaultdict(list)
    by_ad_name: dict[str, list[Transaction]] = defaultdict(list)
    all_tx_list: list[Transaction] = []

    # Mapas de hierarquia do Meta Ads para atribuição direta via Ad ID / AdSet ID
    ad_to_camp = {str(ad.id): str(ad.campaign_id) for ad in (meta_ads or []) if getattr(ad, "campaign_id", None)}
    ad_to_adset = {str(ad.id): str(ad.ad_set_id) for ad in (meta_ads or []) if getattr(ad, "ad_set_id", None)}
    adset_to_camp = {str(as_.id): str(as_.campaign_id) for as_ in (meta_adsets or []) if getattr(as_, "campaign_id", None)}
    valid_camp_ids = {str(c.id) for c in (meta_campaigns or []) if getattr(c, "id", None)}

    for tx in transactions:
        all_tx_list.append(tx)

        # 1. Campaign level
        camp_raw = tx.utm_campaign
        # Fallback para src se utm_campaign estiver vazio
        if not camp_raw and tx.src:
            camp_raw = tx.src

        camp_name, camp_id = parse_utm_campaign(camp_raw)
        if camp_id:
            by_campaign_id[camp_id].append(tx)
            if camp_id in ad_to_camp:
                by_campaign_id[ad_to_camp[camp_id]].append(tx)
        if camp_name:
            norm = _normalize_key(camp_name)
            if norm:
                by_campaign_name[norm].append(tx)
            by_campaign_name[camp_name.lower().strip()].append(tx)

        # 2. AdSet level
        adset_name, adset_id = parse_utm_medium(tx.utm_medium)
        if not adset_id and not adset_name and tx.utm_content and tx.utm_term:
            adset_name, adset_id = parse_utm_content(tx.utm_content)

        if adset_id:
            by_adset_id[adset_id].append(tx)
            if adset_id in adset_to_camp:
                by_campaign_id[adset_to_camp[adset_id]].append(tx)
        if adset_name:
            norm_as = _normalize_key(adset_name)
            if norm_as:
                by_adset_name[norm_as].append(tx)
            by_adset_name[adset_name.lower().strip()].append(tx)

        # 3. Ad level
        ad_name, ad_id = parse_utm_content(tx.utm_content)
        if tx.utm_term:
            term_name, term_id = parse_utm_term(tx.utm_term)
            if term_id:
                ad_id = term_id
            elif term_name:
                ad_name = term_name

        # Suporte a SRC direto com o ID do anúncio ou da campanha
        if tx.src:
            clean_src = tx.src.strip()
            if clean_src.isdigit():
                ad_id = clean_src
                if clean_src in valid_camp_ids:
                    by_campaign_id[clean_src].append(tx)

        if ad_id:
            by_ad_id[ad_id].append(tx)
            # Vinculação direta hierárquica automática
            if ad_id in ad_to_camp:
                by_campaign_id[ad_to_camp[ad_id]].append(tx)
            if ad_id in ad_to_adset:
                by_adset_id[ad_to_adset[ad_id]].append(tx)

        if ad_name:
            norm_ad = _normalize_key(ad_name)
            if norm_ad:
                by_ad_name[norm_ad].append(tx)
            by_ad_name[ad_name.lower().strip()].append(tx)

    return {
        "campaign_id": dict(by_campaign_id),
        "campaign_name": dict(by_campaign_name),
        "adset_id": dict(by_adset_id),
        "adset_name": dict(by_adset_name),
        "ad_id": dict(by_ad_id),
        "ad_name": dict(by_ad_name),
        "all_transactions": all_tx_list,
    }


def _calc_sales_metrics(txs: list[Transaction]) -> dict:
    """Calcula métricas de vendas a partir de transações."""
    sales = len(txs)
    revenue = sum(float(t.amount or 0.0) for t in txs)
    return {"sales": sales, "revenue": round(revenue, 2)}


def _match_transactions_advanced(
    entity_id: str,
    entity_name: str,
    grouped: dict,
    id_key: str,
    name_key: str,
    campaign_name: Optional[str] = None,
) -> tuple[list[Transaction], int]:
    """
    Tenta match por:
    1. ID exato (mais confiável)
    2. Nome normalizado exato
    3. Substring (se o nome da UTM está contido no nome da campanha ou vice-versa)
    4. Sobreposição de tokens significativos
    Blindagem Absoluta: descarta transações se o produto não for compatível com a campanha.
    """
    matched_ids = set()
    matched_txs = []
    matched_by_id = set()
    check_camp_name = campaign_name or entity_name

    # 1. Match por ID
    for tx in grouped[id_key].get(str(entity_id), []):
        p_name = getattr(tx, "product_name", "") or ""
        if check_camp_name and not are_products_compatible(check_camp_name, p_name):
            continue
        if tx.id not in matched_ids:
            matched_ids.add(tx.id)
            matched_txs.append(tx)
            matched_by_id.add(tx.id)

    norm_entity = _normalize_key(entity_name)
    entity_tokens = _extract_tokens(entity_name)

    # 2. Match por Nome Exato ou Substring
    for stored_key, tx_list in grouped[name_key].items():
        is_match = False

        if stored_key == norm_entity or stored_key == entity_name.lower().strip():
            is_match = True
        elif len(stored_key) >= 3 and len(norm_entity) >= 3:
            # Substring match (ex: 'cbo' in 'cbotestedeoferta')
            if stored_key in norm_entity or norm_entity in stored_key:
                is_match = True
            else:
                # Token overlap (ex: cbo, teste, criativo)
                stored_tokens = _extract_tokens(stored_key)
                if stored_tokens and entity_tokens:
                    intersection = stored_tokens.intersection(entity_tokens)
                    if len(intersection) >= 2 or (len(stored_tokens) == 1 and intersection == stored_tokens) or (len(entity_tokens) == 1 and intersection == entity_tokens):
                        is_match = True

        if is_match:
            for tx in tx_list:
                p_name = getattr(tx, "product_name", "") or ""
                if check_camp_name and not are_products_compatible(check_camp_name, p_name):
                    continue
                if tx.id not in matched_ids:
                    matched_ids.add(tx.id)
                    matched_txs.append(tx)

    # Vendas sem ID são apenas as que não foram vinculadas por ID e não possuem ID decodificável na UTM
    no_id_count = 0
    for tx in matched_txs:
        if tx.id in matched_by_id:
            continue
        camp_raw = getattr(tx, "utm_campaign", None) or getattr(tx, "src", None)
        _, camp_id = parse_utm_campaign(camp_raw)
        if not camp_id:
            no_id_count += 1

    return matched_txs, no_id_count


def merge_campaigns(
    meta_campaigns: list[CampaignInsights],
    meta_adsets: list[AdSetInsights],
    meta_ads: list[AdInsights],
    transactions: list[Transaction],
) -> list[dict[str, Any]]:
    """Cruza campanhas do Meta com transações do DB garantindo roll-up total de filhos."""
    grouped = _group_transactions_by_level(transactions, meta_campaigns, meta_adsets, meta_ads)
    results = []
    attributed_tx_ids = set()

    for camp in meta_campaigns:
        txs, no_id_count = _match_transactions_advanced(
            camp.id, camp.name, grouped, "campaign_id", "campaign_name", campaign_name=camp.name,
        )
        camp_adsets = [a for a in meta_adsets if a.campaign_id == camp.id]
        adsets_merged = _merge_adsets_for_campaign(
            camp_adsets, meta_ads, grouped, campaign_name=camp.name,
        )

        # UNIR as transações dos adsets e anúncios filhos à campanha (Roll-up garantido)
        camp_tx_ids = {t.id for t in txs}
        for as_res in adsets_merged:
            for as_tx in as_res.get("_txs", []):
                if as_tx.id not in camp_tx_ids:
                    camp_tx_ids.add(as_tx.id)
                    txs.append(as_tx)

        for t in txs:
            attributed_tx_ids.add(t.id)

        sales_data = _calc_sales_metrics(txs)

        profit = sales_data["revenue"] - camp.spend
        roas = safe_division(sales_data["revenue"], camp.spend)
        cpa = safe_division(camp.spend, sales_data["sales"]) if sales_data["sales"] > 0 else 0.0

        is_cbo = camp.budget > 0
        budget_type = "CBO" if is_cbo else "ABO"

        # CPC e CTR com fallbacks seguros
        cpc = camp.cpc or (round(camp.spend / camp.clicks, 2) if camp.clicks > 0 and camp.spend > 0 else 0.0)
        ctr = camp.ctr or (round(camp.clicks / camp.impressions * 100, 2) if camp.impressions > 0 and camp.clicks > 0 else 0.0)
        cpm = getattr(camp, "cpm", 0.0) or (round((camp.spend / camp.impressions) * 1000, 2) if camp.impressions > 0 and camp.spend > 0 else 0.0)
        cpv = getattr(camp, "cpv", 0.0) or (round(camp.spend / camp.landing_page_views, 2) if camp.landing_page_views > 0 and camp.spend > 0 else 0.0)
        cost_per_ic = getattr(camp, "cost_per_ic", 0.0) or (round(camp.spend / camp.initiate_checkout, 2) if camp.initiate_checkout > 0 and camp.spend > 0 else 0.0)
        checkout_rate = getattr(camp, "checkout_rate", 0.0) or (round((camp.initiate_checkout / camp.landing_page_views) * 100, 2) if camp.landing_page_views > 0 else 0.0)
        checkout_to_sale_rate = round((sales_data["sales"] / camp.initiate_checkout) * 100, 2) if camp.initiate_checkout > 0 else 0.0
        conversion_rate = round((sales_data["sales"] / camp.clicks) * 100, 2) if camp.clicks > 0 else 0.0

        results.append({
            "id": camp.id,
            "name": camp.name,
            "status": camp.status,
            "objective": camp.objective,
            "bid_strategy": camp.bid_strategy,
            "budget_type": budget_type,
            "budget": camp.budget,
            "spend": camp.spend,
            "clicks": camp.clicks,
            "impressions": camp.impressions,
            "cpc": cpc,
            "cpm": cpm,
            "ctr": ctr,
            "landing_page_views": camp.landing_page_views,
            "cpv": cpv,
            "initiate_checkout": camp.initiate_checkout,
            "cost_per_ic": cost_per_ic,
            "connect_rate": camp.connect_rate,
            "checkout_rate": checkout_rate,
            "checkout_conversion": checkout_to_sale_rate,
            "conversion_rate": conversion_rate,
            "video_views": camp.video_views,
            "video_p25": camp.video_p25,
            "video_p50": camp.video_p50,
            "video_p100": camp.video_p100,
            "hook_rate": camp.hook_rate,
            "body_rate": camp.body_rate,
            **sales_data,
            "profit": round(profit, 2),
            "roas": roas,
            "cpa": cpa,
            "no_id_sales": no_id_count,
            "views_vsl": 0,
            "plays_vsl": 0,
            "play_rate": 0,
            "adsets": adsets_merged,
            "_txs": txs,
            "_attributed_tx_ids": list(camp_tx_ids),
        })

    # Atribuição Inteligente Segura: vincula APENAS se o PRODUTO for comprovadamente compatível com a campanha
    unattributed_txs = [t for t in transactions if t.id not in attributed_tx_ids]

    if unattributed_txs and results:
        for tx in unattributed_txs:
            p_name = tx.product_name or ""
            # Buscar campanhas compatíveis com este produto específico
            compatible_camps = [
                c for c in results
                if are_products_compatible(c["name"], p_name) and (c["spend"] > 0 or c["status"] == "active")
            ]
            if not compatible_camps:
                # Tentar campanhas compatíveis mesmo sem gasto ativo
                compatible_camps = [c for c in results if are_products_compatible(c["name"], p_name)]

            if compatible_camps:
                # Se houver campanhas compatíveis, prioriza a que teve gasto no período
                compatible_camps.sort(key=lambda x: x["spend"], reverse=True)
                target_camp = compatible_camps[0]

                target_camp["sales"] += 1
                target_camp["revenue"] = round(target_camp["revenue"] + float(tx.amount or 0.0), 2)
                target_camp["profit"] = round(target_camp["revenue"] - target_camp["spend"], 2)
                target_camp["roas"] = safe_division(target_camp["revenue"], target_camp["spend"])
                target_camp["cpa"] = safe_division(target_camp["spend"], target_camp["sales"]) if target_camp["sales"] > 0 else 0.0
                target_camp["no_id_sales"] += 1
                attributed_tx_ids.add(tx.id)
                if "_attributed_tx_ids" in target_camp:
                    target_camp["_attributed_tx_ids"].append(tx.id)
                if "_txs" in target_camp:
                    target_camp["_txs"].append(tx)

                if target_camp.get("adsets"):
                    active_adset = max(target_camp["adsets"], key=lambda a: a["spend"], default=target_camp["adsets"][0])
                    active_adset["sales"] += 1
                    active_adset["revenue"] = round(active_adset["revenue"] + float(tx.amount or 0.0), 2)
                    active_adset["profit"] = round(active_adset["revenue"] - active_adset["spend"], 2)
                    active_adset["roas"] = safe_division(active_adset["revenue"], active_adset["spend"])
                    active_adset["cpa"] = safe_division(active_adset["spend"], active_adset["sales"]) if active_adset["sales"] > 0 else 0.0

    return results


def _merge_adsets_for_campaign(
    meta_adsets: list[AdSetInsights],
    meta_ads: list[AdInsights],
    grouped: dict,
    campaign_name: Optional[str] = None,
) -> list[dict[str, Any]]:
    """Merge adsets level com roll-up de anúncios filhos."""
    results = []
    for adset in meta_adsets:
        txs, no_id_count = _match_transactions_advanced(
            adset.id, adset.name, grouped, "adset_id", "adset_name", campaign_name=campaign_name,
        )
        adset_ads = [a for a in meta_ads if a.ad_set_id == adset.id]
        ads_merged = merge_ads(adset_ads, grouped, campaign_name=campaign_name)

        # UNIR as transações dos anúncios filhos ao adset
        adset_tx_ids = {t.id for t in txs}
        for ad_res in ads_merged:
            for ad_tx in ad_res.get("_txs", []):
                if ad_tx.id not in adset_tx_ids:
                    adset_tx_ids.add(ad_tx.id)
                    txs.append(ad_tx)

        sales_data = _calc_sales_metrics(txs)

        profit = sales_data["revenue"] - adset.spend
        roas = safe_division(sales_data["revenue"], adset.spend)
        cpa = safe_division(adset.spend, sales_data["sales"]) if sales_data["sales"] > 0 else 0.0

        cpc = adset.cpc or (round(adset.spend / adset.clicks, 2) if adset.clicks > 0 and adset.spend > 0 else 0.0)
        ctr = adset.ctr or (round(adset.clicks / adset.impressions * 100, 2) if adset.impressions > 0 and adset.clicks > 0 else 0.0)
        cpm = getattr(adset, "cpm", 0.0) or (round((adset.spend / adset.impressions) * 1000, 2) if adset.impressions > 0 and adset.spend > 0 else 0.0)
        cpv = getattr(adset, "cpv", 0.0) or (round(adset.spend / adset.landing_page_views, 2) if adset.landing_page_views > 0 and adset.spend > 0 else 0.0)
        cost_per_ic = getattr(adset, "cost_per_ic", 0.0) or (round(adset.spend / adset.initiate_checkout, 2) if adset.initiate_checkout > 0 and adset.spend > 0 else 0.0)
        checkout_rate = getattr(adset, "checkout_rate", 0.0) or (round((adset.initiate_checkout / adset.landing_page_views) * 100, 2) if adset.landing_page_views > 0 else 0.0)
        checkout_to_sale_rate = round((sales_data["sales"] / adset.initiate_checkout) * 100, 2) if adset.initiate_checkout > 0 else 0.0
        conversion_rate = round((sales_data["sales"] / adset.clicks) * 100, 2) if adset.clicks > 0 else 0.0

        results.append({
            "id": adset.id,
            "campaign_id": adset.campaign_id,
            "name": adset.name,
            "status": adset.status,
            "budget": adset.budget,
            "bid_amount": adset.bid_amount,
            "bid_strategy": adset.bid_strategy,
            "spend": adset.spend,
            "clicks": adset.clicks,
            "impressions": adset.impressions,
            "cpc": cpc,
            "cpm": cpm,
            "ctr": ctr,
            "landing_page_views": adset.landing_page_views,
            "cpv": cpv,
            "initiate_checkout": adset.initiate_checkout,
            "cost_per_ic": cost_per_ic,
            "connect_rate": adset.connect_rate,
            "checkout_rate": checkout_rate,
            "checkout_conversion": checkout_to_sale_rate,
            "conversion_rate": conversion_rate,
            "video_views": adset.video_views,
            "video_p25": adset.video_p25,
            "video_p50": adset.video_p50,
            "video_p100": adset.video_p100,
            "hook_rate": adset.hook_rate,
            "body_rate": adset.body_rate,
            **sales_data,
            "profit": round(profit, 2),
            "roas": roas,
            "cpa": cpa,
            "no_id_sales": no_id_count,
            "views_vsl": 0,
            "plays_vsl": 0,
            "play_rate": 0,
            "ads": ads_merged,
            "_txs": txs,
            "_attributed_tx_ids": list(adset_tx_ids),
        })

    return results


def merge_ads(
    meta_ads: list[AdInsights],
    grouped: dict,
    campaign_name: Optional[str] = None,
) -> list[dict[str, Any]]:
    """Merge ads level."""
    results = []
    for ad in meta_ads:
        txs, no_id_count = _match_transactions_advanced(
            ad.id, ad.name, grouped, "ad_id", "ad_name", campaign_name=campaign_name,
        )
        sales_data = _calc_sales_metrics(txs)

        profit = sales_data["revenue"] - ad.spend
        roas = safe_division(sales_data["revenue"], ad.spend)
        cpa = safe_division(ad.spend, sales_data["sales"]) if sales_data["sales"] > 0 else 0.0

        cpc = ad.cpc or (round(ad.spend / ad.clicks, 2) if ad.clicks > 0 and ad.spend > 0 else 0.0)
        ctr = ad.ctr or (round(ad.clicks / ad.impressions * 100, 2) if ad.impressions > 0 and ad.clicks > 0 else 0.0)
        cpm = getattr(ad, "cpm", 0.0) or (round((ad.spend / ad.impressions) * 1000, 2) if ad.impressions > 0 and ad.spend > 0 else 0.0)
        cpv = getattr(ad, "cpv", 0.0) or (round(ad.spend / ad.landing_page_views, 2) if ad.landing_page_views > 0 and ad.spend > 0 else 0.0)
        cost_per_ic = getattr(ad, "cost_per_ic", 0.0) or (round(ad.spend / ad.initiate_checkout, 2) if ad.initiate_checkout > 0 and ad.spend > 0 else 0.0)
        checkout_rate = getattr(ad, "checkout_rate", 0.0) or (round((ad.initiate_checkout / ad.landing_page_views) * 100, 2) if ad.landing_page_views > 0 else 0.0)
        checkout_to_sale_rate = round((sales_data["sales"] / ad.initiate_checkout) * 100, 2) if ad.initiate_checkout > 0 else 0.0
        conversion_rate = round((sales_data["sales"] / ad.clicks) * 100, 2) if ad.clicks > 0 else 0.0

        results.append({
            "id": ad.id,
            "ad_set_id": ad.ad_set_id,
            "name": ad.name,
            "status": ad.status,
            "creative_id": ad.creative_id,
            "budget": ad.budget,
            "spend": ad.spend,
            "clicks": ad.clicks,
            "impressions": ad.impressions,
            "cpc": cpc,
            "cpm": cpm,
            "ctr": ctr,
            "landing_page_views": ad.landing_page_views,
            "cpv": cpv,
            "initiate_checkout": ad.initiate_checkout,
            "cost_per_ic": cost_per_ic,
            "connect_rate": ad.connect_rate,
            "checkout_rate": checkout_rate,
            "checkout_conversion": checkout_to_sale_rate,
            "conversion_rate": conversion_rate,
            "video_views": ad.video_views,
            "video_p25": ad.video_p25,
            "video_p50": ad.video_p50,
            "video_p100": ad.video_p100,
            "hook_rate": ad.hook_rate,
            "body_rate": ad.body_rate,
            **sales_data,
            "profit": round(profit, 2),
            "roas": roas,
            "cpa": cpa,
            "no_id_sales": no_id_count,
            "views_vsl": 0,
            "plays_vsl": 0,
            "play_rate": 0,
            "_txs": txs,
            "_attributed_tx_ids": [t.id for t in txs],
        })

    return results
