"""
Cálculo dos KPIs do dashboard com dados de transações + Meta Ads.
"""
from typing import Optional

from database.models.transaction import Transaction, TransactionStatus
from integrations.meta_ads.schemas import AccountInsightsSummary


def calc_kpis(base, meta_summary: Optional[AccountInsightsSummary]) -> dict:
    """
    Calcula KPIs combinando transações do DB com métricas da Meta Ads.
    
    Transações: revenue, sales, chargebacks, refunds, ticket médio
    Meta Ads: spend, clicks, impressions → profit, ROAS, CPA, conversion_rate
    """
    all_rows = base.all()
    approved = [t for t in all_rows if t.status == TransactionStatus.APPROVED]
    refunded = [t for t in all_rows if t.status == TransactionStatus.REFUNDED]
    chargebacks = [t for t in all_rows if t.status == TransactionStatus.CHARGEBACK]
    pending = [t for t in all_rows if t.status == TransactionStatus.PENDING]

    total_revenue = sum(t.amount for t in approved)
    total_sales = len(approved)
    total_orders = len(all_rows) if len(all_rows) > 0 else total_sales
    approval_rate = round((total_sales / total_orders * 100), 2) if total_orders > 0 else 0.0

    refunded_amount = sum(t.amount for t in refunded)
    pending_amount = sum(t.amount for t in pending)
    chargeback_amount = sum(t.amount for t in chargebacks)

    unique_customers = len(set(t.customer_email for t in approved if t.customer_email))
    arpu = round(total_revenue / unique_customers, 2) if unique_customers > 0 else 0.0

    avg_ticket = total_revenue / total_sales if total_sales > 0 else 0
    chargeback_rate = (
        (len(chargebacks) / total_sales * 100) if total_sales > 0 else 0
    )

    # Dados da Meta Ads
    total_spend = meta_summary.spend if meta_summary else 0.0
    total_clicks = meta_summary.clicks if meta_summary else 0
    total_impressions = meta_summary.impressions if meta_summary else 0
    pageviews = meta_summary.landing_page_views if meta_summary else 0
    initiate_checkout = meta_summary.initiate_checkout if meta_summary else 0

    # Métricas calculadas padrão UTMify / NexoFy
    profit = total_revenue - total_spend
    roas = round(total_revenue / total_spend, 2) if total_spend > 0 else 0.0
    roi = round(profit / total_spend, 2) if total_spend > 0 else 0.0
    cpa = round(total_spend / total_sales, 2) if total_sales > 0 else 0.0
    profit_margin = round((profit / total_revenue) * 100, 2) if total_revenue > 0 else 0.0

    # Tráfego & Leilão
    cpc = meta_summary.cpc if (meta_summary and meta_summary.cpc > 0) else (round(total_spend / total_clicks, 2) if total_clicks > 0 and total_spend > 0 else 0.0)
    ctr = meta_summary.ctr if (meta_summary and meta_summary.ctr > 0) else (round((total_clicks / total_impressions) * 100, 2) if total_impressions > 0 and total_clicks > 0 else 0.0)
    cpm = meta_summary.cpm if (meta_summary and meta_summary.cpm > 0) else (round((total_spend / total_impressions) * 1000, 2) if total_impressions > 0 and total_spend > 0 else 0.0)

    # Funil & Páginas
    cpv = meta_summary.cpv if (meta_summary and meta_summary.cpv > 0) else (round(total_spend / pageviews, 2) if pageviews > 0 and total_spend > 0 else 0.0)
    connect_rate = meta_summary.connect_rate if (meta_summary and meta_summary.connect_rate > 0) else (round((pageviews / total_clicks) * 100, 2) if total_clicks > 0 and pageviews > 0 else 0.0)
    cost_per_ic = meta_summary.cost_per_ic if (meta_summary and meta_summary.cost_per_ic > 0) else (round(total_spend / initiate_checkout, 2) if initiate_checkout > 0 and total_spend > 0 else 0.0)
    checkout_rate = meta_summary.checkout_rate if (meta_summary and meta_summary.checkout_rate > 0) else (round((initiate_checkout / pageviews) * 100, 2) if pageviews > 0 and initiate_checkout > 0 else 0.0)
    checkout_conversion_rate = round((total_sales / initiate_checkout) * 100, 2) if initiate_checkout > 0 else 0.0
    page_conversion_rate = round((total_sales / pageviews) * 100, 2) if pageviews > 0 else 0.0
    conversion_rate = round((total_sales / total_clicks) * 100, 2) if total_clicks > 0 else 0.0

    return {
        "total_revenue": total_revenue,
        "total_spend": total_spend,
        "profit": profit,
        "total_sales": total_sales,
        "total_orders": total_orders,
        "approval_rate": approval_rate,
        "average_ticket": round(avg_ticket, 2),
        "cpa": cpa,
        "roas": roas,
        "roi": roi,
        "arpu": arpu,
        "profit_margin": round(profit_margin, 2),
        "conversion_rate": conversion_rate,
        "total_clicks": total_clicks,
        "total_impressions": total_impressions,
        "cpm": cpm,
        "cpc": cpc,
        "ctr": ctr,
        "pageviews": pageviews,
        "landing_page_views": pageviews,
        "cpv": cpv,
        "connect_rate": connect_rate,
        "initiate_checkout": initiate_checkout,
        "cost_per_ic": cost_per_ic,
        "checkout_rate": checkout_rate,
        "checkout_conversion_rate": checkout_conversion_rate,
        "page_conversion_rate": page_conversion_rate,
        "chargeback_amount": chargeback_amount,
        "chargeback_rate": round(chargeback_rate, 2),
        "refunded_count": len(refunded),
        "refunded_amount": refunded_amount,
        "pending_count": len(pending),
        "pending_amount": pending_amount,
        "chargeback_count": len(chargebacks),
    }

