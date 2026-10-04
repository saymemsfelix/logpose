"""
Top campanhas do dashboard: cruza Meta Ads com transações.
Reutiliza a lógica de merge de campanhas.
"""
from collections import defaultdict
from typing import Optional

from database.models.transaction import Transaction, TransactionStatus
from integrations.meta_ads.schemas import CampaignInsights
from api.campaigns.helpers import parse_utm_campaign, safe_division


def build_top_campaigns(
    base,
    meta_campaigns: list[CampaignInsights],
    limit: int = 3,
) -> list[dict]:
    """
    Monta top campanhas cruzando Meta Ads com transações.
    Se não houver Meta Ads, faz fallback para transações puras.
    """
    if not meta_campaigns:
        return _top_campaigns_from_db(base, limit)

    return _top_campaigns_merged(base, meta_campaigns, limit)


def _top_campaigns_merged(
    base,
    meta_campaigns: list[CampaignInsights],
    limit: int,
) -> list[dict]:
    """Cruza campanhas da Meta com transações usando a mesma lógica inteligente da aba Campanhas."""
    approved = base.filter(
        Transaction.status == TransactionStatus.APPROVED,
    ).all()

    from api.campaigns.merge import merge_campaigns
    merged = merge_campaigns(meta_campaigns, [], [], approved)

    results = [
        {
            "name": c["name"],
            "spend": c["spend"],
            "revenue": c["revenue"],
            "sales": c["sales"],
            "profit": c["profit"],
            "roas": c["roas"],
            "cpa": c["cpa"],
            "cpm": c.get("cpm", 0.0),
            "cpc": c.get("cpc", 0.0),
            "ctr": c.get("ctr", 0.0),
            "clicks": c.get("clicks", 0),
            "impressions": c.get("impressions", 0),
            "landing_page_views": c.get("landing_page_views", 0),
            "initiate_checkout": c.get("initiate_checkout", 0),
            "connect_rate": c.get("connect_rate", 0.0),
            "cpv": c.get("cpv", 0.0),
            "cost_per_ic": c.get("cost_per_ic", 0.0),
        }
        for c in merged
    ]

    # Ordenar por faturamento desc e depois por gasto desc
    results.sort(key=lambda x: (x["revenue"], x["spend"]), reverse=True)
    return results[:limit]



def _top_campaigns_from_db(base, limit: int) -> list[dict]:
    """Fallback: top campanhas apenas por transações (sem Meta Ads)."""
    from sqlalchemy import func

    approved = base.filter(
        Transaction.status == TransactionStatus.APPROVED,
        Transaction.utm_campaign.isnot(None),
        Transaction.utm_campaign != "",
    )
    rows = (
        approved.with_entities(
            Transaction.utm_campaign,
            func.sum(Transaction.amount).label("revenue"),
            func.count(Transaction.id).label("sales"),
        )
        .group_by(Transaction.utm_campaign)
        .order_by(func.sum(Transaction.amount).desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "name": r.utm_campaign,
            "spend": 0,
            "revenue": float(r.revenue or 0),
            "sales": int(r.sales or 0),
            "profit": float(r.revenue or 0),
            "roas": 0,
            "cpa": 0,
        }
        for r in rows
    ]
