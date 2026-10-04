"""
Busca insights agregados da conta inteira (nível account).
Usado nos KPIs do dashboard principal.
"""
from integrations.meta_ads.client import MetaAdsClient
from integrations.meta_ads.schemas import AccountInsightsSummary
from integrations.meta_ads.helpers import (
    extract_action_value, safe_float, safe_int,
)

ACCOUNT_FIELDS = ",".join([
    "spend",
    "impressions",
    "inline_link_clicks",
    "inline_link_click_ctr",
    "cost_per_unique_inline_link_click",
    "cpm",
    "actions",
])


async def fetch_account_insights(
    client: MetaAdsClient,
    date_start: str,
    date_end: str,
) -> AccountInsightsSummary:
    """
    Busca métricas agregadas da conta inteira no período.
    Retorna spend total, clicks, impressions, CPM, CPC, etc.
    """
    data = await client._get(
        f"{client.account_id}/insights",
        params={
            "fields": ACCOUNT_FIELDS,
            "time_range": f'{{"since":"{date_start}","until":"{date_end}"}}',
        },
    )

    rows = data.get("data", [])
    if not rows:
        return AccountInsightsSummary()

    row = rows[0]
    actions = row.get("actions", [])

    spend = safe_float(row.get("spend", 0))
    clicks = safe_int(row.get("inline_link_clicks", 0))
    impressions = safe_int(row.get("impressions", 0))
    
    # CPC e CTR
    cpc = safe_float(row.get("cost_per_unique_inline_link_click", 0))
    if cpc == 0.0 and clicks > 0 and spend > 0:
        cpc = round(spend / clicks, 2)

    ctr = safe_float(row.get("inline_link_click_ctr", 0))
    if ctr == 0.0 and impressions > 0 and clicks > 0:
        ctr = round((clicks / impressions) * 100, 2)

    # CPM da Meta ou calculado (Spend / Impressões * 1000)
    cpm = safe_float(row.get("cpm", 0))
    if cpm == 0.0 and impressions > 0 and spend > 0:
        cpm = round((spend / impressions) * 1000, 2)

    lpv = safe_int(extract_action_value(actions, "landing_page_view"))
    initiate = safe_int(extract_action_value(actions, "omni_initiated_checkout"))

    cpv = round(spend / lpv, 2) if lpv > 0 and spend > 0 else 0.0
    cost_per_ic = round(spend / initiate, 2) if initiate > 0 and spend > 0 else 0.0
    connect_rate = round((lpv / clicks) * 100, 2) if clicks > 0 and lpv > 0 else 0.0
    checkout_rate = round((initiate / lpv) * 100, 2) if lpv > 0 and initiate > 0 else 0.0

    return AccountInsightsSummary(
        spend=spend,
        clicks=clicks,
        impressions=impressions,
        cpc=cpc,
        cpm=cpm,
        ctr=ctr,
        landing_page_views=lpv,
        cpv=cpv,
        initiate_checkout=initiate,
        cost_per_ic=cost_per_ic,
        connect_rate=connect_rate,
        checkout_rate=checkout_rate,
    )

