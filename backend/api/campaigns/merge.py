"""
Lógica de merge entre dados do Meta Ads e transações do banco.
Cruza por ID (confiável), por nome, por substring/tokens e por atribuição inteligente de tráfego.
"""
from collections import defaultdict
from typing import Any
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
    stopwords = {"de", "da", "do", "para", "com", "em", "um", "uma", "os", "as", "new", "offer"}
    return {w for w in words if len(w) >= 2 and w not in stopwords}


def _group_transactions_by_level(transactions: list[Transaction]) -> dict:
    """
    Agrupa transações por campaign_id, adset_id e ad_id.
    Usa o formato name|id com suporte flexível a variações de UTMs, src e sck.
    """
    by_campaign_id: dict[str, list[Transaction]] = defaultdict(list)
    by_campaign_name: dict[str, list[Transaction]] = defaultdict(list)
    by_adset_id: dict[str, list[Transaction]] = defaultdict(list)
    by_adset_name: dict[str, list[Transaction]] = defaultdict(list)
    by_ad_id: dict[str, list[Transaction]] = defaultdict(list)
    by_ad_name: dict[str, list[Transaction]] = defaultdict(list)
    all_tx_list: list[Transaction] = []

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

        # Suporte a SRC direto com o ID do anúncio
        if tx.src:
            clean_src = tx.src.strip()
            if clean_src.isdigit():
                ad_id = clean_src

        if ad_id:
            by_ad_id[ad_id].append(tx)
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
) -> tuple[list[Transaction], int]:
    """
    Tenta match por:
    1. ID exato (mais confiável)
    2. Nome normalizado exato
    3. Substring (se o nome da UTM está contido no nome da campanha ou vice-versa)
    4. Sobreposição de tokens significativos
    """
    matched_ids = set()
    matched_txs = []

    # 1. Match por ID
    for tx in grouped[id_key].get(str(entity_id), []):
        if tx.id not in matched_ids:
            matched_ids.add(tx.id)
            matched_txs.append(tx)

    norm_entity = _normalize_key(entity_name)
    entity_tokens = _extract_tokens(entity_name)

    # 2. Match por Nome Exato ou Substring
    for stored_key, tx_list in grouped[name_key].items():
        is_match = False

        if stored_key == norm_entity or stored_key == entity_name.lower().strip():
            is_match = True
        elif len(stored_key) >= 4 and len(norm_entity) >= 4:
            # Substring match (ex: 'cbotestecriativo' in 'cbotestecriativonewoffer')
            if stored_key in norm_entity or norm_entity in stored_key:
                is_match = True
            else:
                # Token overlap (ex: cbo, teste, criativo)
                stored_tokens = _extract_tokens(stored_key)
                if stored_tokens and entity_tokens:
                    intersection = stored_tokens.intersection(entity_tokens)
                    if len(intersection) >= 2 or (len(stored_tokens) == 1 and intersection == stored_tokens):
                        is_match = True

        if is_match:
            for tx in tx_list:
                if tx.id not in matched_ids:
                    matched_ids.add(tx.id)
                    matched_txs.append(tx)

    no_id_count = sum(1 for tx in matched_txs if not getattr(tx, "utm_campaign", None) or "|" not in getattr(tx, "utm_campaign", ""))
    return matched_txs, no_id_count


def merge_campaigns(
    meta_campaigns: list[CampaignInsights],
    meta_adsets: list[AdSetInsights],
    meta_ads: list[AdInsights],
    transactions: list[Transaction],
) -> list[dict[str, Any]]:
    """Cruza campanhas do Meta com transações do DB."""
    grouped = _group_transactions_by_level(transactions)
    results = []
    attributed_tx_ids = set()

    for camp in meta_campaigns:
        txs, no_id_count = _match_transactions_advanced(
            camp.id, camp.name, grouped, "campaign_id", "campaign_name",
        )
        for t in txs:
            attributed_tx_ids.add(t.id)

        sales_data = _calc_sales_metrics(txs)
        camp_adsets = [a for a in meta_adsets if a.campaign_id == camp.id]
        adsets_merged = _merge_adsets_for_campaign(
            camp_adsets, meta_ads, grouped,
        )

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
        })


    # Atribuição Inteligente para Vendas Sem UTM / Transações Não Atribuídas
    unattributed_txs = [t for t in transactions if t.id not in attributed_tx_ids]

    if unattributed_txs and results:
        # Campanhas com gasto ativo no período
        camps_with_spend = [c for c in results if c["spend"] > 0 or c["status"] == "active"]
        camps_with_spend.sort(key=lambda x: x["spend"], reverse=True)

        if camps_with_spend:
            top_camp = camps_with_spend[0]
            total_spend_all = sum(c["spend"] for c in camps_with_spend)

            # Se a campanha principal representa mais de 70% do gasto total ou se só há 1 com gasto significativo (> R$ 10)
            if top_camp["spend"] >= 10.0 and (total_spend_all == 0 or (top_camp["spend"] / total_spend_all) >= 0.70 or len(camps_with_spend) == 1):
                # Atribui as vendas não identificadas à campanha que concentrou o tráfego pago
                extra_data = _calc_sales_metrics(unattributed_txs)
                top_camp["sales"] += extra_data["sales"]
                top_camp["revenue"] = round(top_camp["revenue"] + extra_data["revenue"], 2)
                top_camp["profit"] = round(top_camp["revenue"] - top_camp["spend"], 2)
                top_camp["roas"] = safe_division(top_camp["revenue"], top_camp["spend"])
                top_camp["cpa"] = safe_division(top_camp["spend"], top_camp["sales"]) if top_camp["sales"] > 0 else 0.0
                top_camp["no_id_sales"] += extra_data["sales"]

                # Também propaga para o conjunto e anúncio ativo dessa campanha se houver
                if top_camp.get("adsets"):
                    active_adset = max(top_camp["adsets"], key=lambda a: a["spend"], default=top_camp["adsets"][0])
                    active_adset["sales"] += extra_data["sales"]
                    active_adset["revenue"] = round(active_adset["revenue"] + extra_data["revenue"], 2)
                    active_adset["profit"] = round(active_adset["revenue"] - active_adset["spend"], 2)
                    active_adset["roas"] = safe_division(active_adset["revenue"], active_adset["spend"])
                    active_adset["cpa"] = safe_division(active_adset["spend"], active_adset["sales"]) if active_adset["sales"] > 0 else 0.0

                    if active_adset.get("ads"):
                        active_ad = max(active_adset["ads"], key=lambda ad: ad["spend"], default=active_adset["ads"][0])
                        active_ad["sales"] += extra_data["sales"]
                        active_ad["revenue"] = round(active_ad["revenue"] + extra_data["revenue"], 2)
                        active_ad["profit"] = round(active_ad["revenue"] - active_ad["spend"], 2)
                        active_ad["roas"] = safe_division(active_ad["revenue"], active_ad["spend"])
                        active_ad["cpa"] = safe_division(active_ad["spend"], active_ad["sales"]) if active_ad["sales"] > 0 else 0.0

    return results


def _merge_adsets_for_campaign(
    meta_adsets: list[AdSetInsights],
    meta_ads: list[AdInsights],
    grouped: dict,
) -> list[dict[str, Any]]:
    """Merge adsets level."""
    results = []
    for adset in meta_adsets:
        txs, no_id_count = _match_transactions_advanced(
            adset.id, adset.name, grouped, "adset_id", "adset_name",
        )
        sales_data = _calc_sales_metrics(txs)
        adset_ads = [a for a in meta_ads if a.ad_set_id == adset.id]
        ads_merged = merge_ads(adset_ads, grouped)

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
        })

    return results


def merge_ads(
    meta_ads: list[AdInsights],
    grouped: dict,
) -> list[dict[str, Any]]:
    """Merge ads level."""
    results = []
    for ad in meta_ads:
        txs, no_id_count = _match_transactions_advanced(
            ad.id, ad.name, grouped, "ad_id", "ad_name",
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
        })


    return results
