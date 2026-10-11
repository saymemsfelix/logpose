"""
Endpoints do Simulador de Breakeven & Escala Preditiva.
Calcula o CPA limite de equilíbrio e projeta o Lucro Líquido Real em múltiplos cenários de investimento.
"""
import logging
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database.core.connection import get_db
from database.core.timezone import today_sp_str
from database.models.transaction import Transaction, TransactionStatus
from database.models.daily_ad_spend import DailyAdSpend
from api.auth.deps import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/simulator", tags=["simulator"])


class SimulatorCalculateRequest(BaseModel):
    product_price: float = 197.0
    gateway_fee_percent: float = 8.99  # Kiwify padrão
    gateway_fee_fixed: float = 2.49    # Kiwify fixo
    tax_percent: float = 6.0           # Simples Nacional
    extra_costs_per_sale: float = 0.0  # Custo de suporte/área de membros
    refund_rate_percent: float = 2.5
    estimated_cpa: Optional[float] = None
    daily_budget: float = 500.0


@router.get("/metrics")
def get_simulator_reference_metrics(
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """
    Retorna métricas reais dos últimos 30 dias para calibrar o simulador
    com a realidade exata da operação do usuário.
    """
    today_dt = datetime.strptime(today_sp_str(), "%Y-%m-%d")
    month_ago_dt = today_dt - timedelta(days=30)

    txs = (
        db.query(Transaction)
        .filter(Transaction.created_at >= month_ago_dt)
        .all()
    )

    approved = [t for t in txs if t.status == TransactionStatus.APPROVED]
    refunded = [t for t in txs if t.status == TransactionStatus.REFUNDED]

    total_approved = len(approved)
    total_revenue = sum(t.amount or 0.0 for t in approved)
    average_ticket = (total_revenue / total_approved) if total_approved > 0 else 197.0

    refund_rate = (len(refunded) / len(txs) * 100) if txs else 2.5

    # Gasto de tráfego dos últimos 30 dias
    month_ago_str = month_ago_dt.strftime("%Y-%m-%d")
    ad_spends = (
        db.query(DailyAdSpend)
        .filter(DailyAdSpend.date >= month_ago_str)
        .all()
    )
    total_spend = sum(s.spend or 0.0 for s in ad_spends)

    average_cpa = (total_spend / total_approved) if (total_approved > 0 and total_spend > 0) else 45.0
    roas = (total_revenue / total_spend) if total_spend > 0 else 0.0

    return {
        "status": "ok",
        "average_ticket": round(average_ticket, 2),
        "total_sales_30d": total_approved,
        "total_revenue_30d": round(total_revenue, 2),
        "total_spend_30d": round(total_spend, 2),
        "average_cpa": round(average_cpa, 2),
        "average_roas": round(roas, 2),
        "refund_rate": round(refund_rate, 2),
    }


@router.post("/calculate")
def calculate_breakeven_and_scale(
    payload: SimulatorCalculateRequest,
    _=Depends(get_current_user),
):
    """
    Calcula na hora o Ponto de Equilíbrio (Breakeven) e a Matriz de Escala Preditiva.
    """
    price = payload.product_price
    gateway_fee = (price * (payload.gateway_fee_percent / 100.0)) + payload.gateway_fee_fixed
    tax_fee = price * (payload.tax_percent / 100.0)
    extra_costs = payload.extra_costs_per_sale
    refund_deduction = price * (payload.refund_rate_percent / 100.0)

    # Receita Líquida real que sobra por venda
    net_revenue_per_sale = price - gateway_fee - tax_fee - extra_costs - refund_deduction
    net_revenue_per_sale = max(0.0, net_revenue_per_sale)

    # Ponto de Equilíbrio: O CPA máximo permitido para não ter prejuízo
    breakeven_cpa = net_revenue_per_sale
    breakeven_roas = (price / breakeven_cpa) if breakeven_cpa > 0 else 1.0
    contribution_margin_percent = (net_revenue_per_sale / price * 100.0) if price > 0 else 0.0

    # CPA de trabalho (se não informado, considera margem de 40% de lucro sobre o breakeven)
    target_cpa = payload.estimated_cpa if payload.estimated_cpa is not None else (breakeven_cpa * 0.5)
    target_cpa = max(1.0, target_cpa)

    # Cenários de Escala Diária
    scale_budgets = [
        {"name": "Conservador", "daily_spend": 200.0},
        {"name": "Moderado", "daily_spend": 500.0},
        {"name": "Escala Agressiva", "daily_spend": 1500.0},
        {"name": "Escala Pesada", "daily_spend": 3000.0},
        {"name": "Escala Ninja", "daily_spend": 6000.0},
    ]

    scenarios = []
    for sc in scale_budgets:
        spend = sc["daily_spend"]
        sales_per_day = spend / target_cpa
        gross_rev_day = sales_per_day * price
        net_rev_day = sales_per_day * net_revenue_per_sale
        daily_profit = net_rev_day - spend
        monthly_profit = daily_profit * 30
        margin_percent = (daily_profit / gross_rev_day * 100.0) if gross_rev_day > 0 else 0.0
        projected_roas = (gross_rev_day / spend) if spend > 0 else 0.0

        scenarios.append({
            "name": sc["name"],
            "daily_spend": spend,
            "sales_per_day": round(sales_per_day, 1),
            "monthly_sales": int(sales_per_day * 30),
            "gross_revenue_month": round(gross_rev_day * 30, 2),
            "daily_profit": round(daily_profit, 2),
            "monthly_profit": round(monthly_profit, 2),
            "projected_roas": round(projected_roas, 2),
            "net_margin_percent": round(margin_percent, 1),
        })

    # Projeção no orçamento específico do input
    custom_sales = payload.daily_budget / target_cpa
    custom_gross = custom_sales * price
    custom_net = custom_sales * net_revenue_per_sale
    custom_profit = custom_net - payload.daily_budget

    return {
        "status": "ok",
        "inputs": payload.dict(),
        "breakeven": {
            "net_revenue_per_sale": round(net_revenue_per_sale, 2),
            "breakeven_cpa": round(breakeven_cpa, 2),
            "breakeven_roas": round(breakeven_roas, 2),
            "contribution_margin_percent": round(contribution_margin_percent, 1),
            "deductions_per_sale": {
                "gateway": round(gateway_fee, 2),
                "tax": round(tax_fee, 2),
                "refund_provision": round(refund_deduction, 2),
                "extra": round(extra_costs, 2),
            },
        },
        "target_projection": {
            "daily_spend": payload.daily_budget,
            "target_cpa": round(target_cpa, 2),
            "sales_per_day": round(custom_sales, 1),
            "gross_revenue_daily": round(custom_gross, 2),
            "net_profit_daily": round(custom_profit, 2),
            "net_profit_monthly": round(custom_profit * 30, 2),
            "projected_roas": round(custom_gross / payload.daily_budget, 2) if payload.daily_budget > 0 else 0.0,
            "net_margin_percent": round((custom_profit / custom_gross * 100.0), 1) if custom_gross > 0 else 0.0,
        },
        "scenarios": scenarios,
    }
