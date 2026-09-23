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
    total_spend = meta_summary.spend if meta_summary else 0
    total_clicks = meta_summary.clicks if meta_summary else 0

    # Métricas calculadas
    profit = total_revenue - total_spend
    roas = round(total_revenue / total_spend, 2) if total_spend > 0 else 0.0
    roi = round(profit / total_spend, 2) if total_spend > 0 else 0.0
    cpa = round(total_spend / total_sales, 2) if total_sales > 0 else 0.0
    profit_margin = round((profit / total_revenue) * 100, 2) if total_revenue > 0 else 0.0
    conversion_rate = (
        round((total_sales / total_clicks) * 100, 2) if total_clicks > 0 else 0.0
    )

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
        "chargeback_amount": chargeback_amount,
        "chargeback_rate": round(chargeback_rate, 2),
        "refunded_count": len(refunded),
        "refunded_amount": refunded_amount,
        "pending_count": len(pending),
        "pending_amount": pending_amount,
        "chargeback_count": len(chargebacks),
    }
