"""
Tool: Retorna os KPIs principais do negócio combinando transações com Meta Ads.
"""
import asyncio
from langchain_core.tools import tool
from datetime import timedelta

from database.core.connection import SessionLocal
from database.core.timezone import now_sp
from database.models.transaction import Transaction
from database.models.facebook_account import FacebookAccount
from integrations.meta_ads.service import MetaAdsService
from api.dashboard.kpis import calc_kpis


@tool
def query_kpis(days_back: int = 30) -> str:
    """Retorna KPIs principais: revenue, spend, profit, ROAS, CPA, ticket médio.
    Use para responder sobre saúde financeira, performance geral do negócio.

    Args:
        days_back: Quantidade de dias para trás (default 30)
    """
    db = SessionLocal()
    try:
        now = now_sp()
        date_start = now - timedelta(days=days_back)
        ds = date_start.strftime("%Y-%m-%d")
        de = now.strftime("%Y-%m-%d")

        base = db.query(Transaction).filter(Transaction.created_at >= date_start)

        meta_summary = None
        account = db.query(FacebookAccount).filter(
            FacebookAccount.token_valid.is_(True)
        ).first()
        if account:
            service = MetaAdsService(account.access_token, account.account_id)
            loop = asyncio.new_event_loop()
            try:
                meta_summary = loop.run_until_complete(
                    service.get_account_summary(ds, de)
                )
            finally:
                loop.run_until_complete(service.close())
                loop.close()

        kpis = calc_kpis(base, meta_summary)

        return (
            f"📊 KPIs dos últimos {days_back} dias (Padrão UTMify):\n"
            f"💰 Faturamento: R$ {kpis['total_revenue']:,.2f}\n"
            f"📢 Investimento (Ads): R$ {kpis['total_spend']:,.2f}\n"
            f"💵 Lucro Líquido: R$ {kpis['profit']:,.2f}\n"
            f"📈 ROAS: {kpis['roas']}x | ROI: {kpis['roi']}x\n"
            f"🎯 CPA: R$ {kpis['cpa']:,.2f}\n"
            f"🎫 Ticket Médio: R$ {kpis['average_ticket']:,.2f}\n"
            f"📊 Margem de Lucro: {kpis['profit_margin']}%\n"
            f"🛒 Vendas Aprovadas: {kpis['total_sales']} (Aprovação: {kpis['approval_rate']}%)\n"
            f"👁️ Impressões: {kpis['total_impressions']:,} | CPM: R$ {kpis['cpm']:,.2f}\n"
            f"🖱️ Cliques: {kpis['total_clicks']:,} | CPC: R$ {kpis['cpc']:,.2f} | CTR: {kpis['ctr']}%\n"
            f"📄 Visualizações de Página (LPV): {kpis['pageviews']:,} | CPV: R$ {kpis['cpv']:,.2f}\n"
            f"🔗 Connect Rate: {kpis['connect_rate']}%\n"
            f"🛍️ Início de Checkout (IC): {kpis['initiate_checkout']:,} | Custo por IC: R$ {kpis['cost_per_ic']:,.2f}\n"
            f"⚡ Taxa Checkout (LPV→IC): {kpis['checkout_rate']}% | Conv. Checkout→Venda: {kpis['checkout_conversion_rate']}%\n"
            f"🔄 Taxa de Conversão Global: {kpis['conversion_rate']}%\n"
            f"⚠️ Chargebacks: {kpis['chargeback_count']} "
            f"(R$ {kpis['chargeback_amount']:,.2f} — {kpis['chargeback_rate']}%)\n"
            f"↩️ Reembolsos: {kpis['refunded_count']}"
        )

    finally:
        db.close()
