"""
Tool universal que executa múltiplas consultas em um único request.
Reduz o consumo de API do Gemini para 2 calls por pergunta (decidir + responder).
"""
import asyncio
from langchain_core.tools import tool
from datetime import datetime, timedelta

from database.core.connection import SessionLocal
from database.core.timezone import now_sp, SP_ZONE
from database.models.transaction import Transaction, TransactionStatus
from database.models.facebook_account import FacebookAccount
from integrations.meta_ads.service import MetaAdsService
from api.dashboard.kpis import calc_kpis
from api.campaigns.helpers import (
    parse_utm_campaign, parse_utm_content, safe_division,
)


def _get_fb_credentials(db):
    """Obtém credenciais da primeira conta Facebook com token válido."""
    account = db.query(FacebookAccount).filter(
        FacebookAccount.token_valid.is_(True)
    ).first()
    if not account:
        return None, None
    return account.access_token, account.account_id


async def _fetch_meta_data(access_token, account_id, ds, de, level="campaign"):
    """Busca dados do Meta Ads de forma async."""
    service = MetaAdsService(access_token, account_id)
    try:
        if level == "adset":
            return await service.get_adsets(ds, de)
        elif level == "ad":
            return await service.get_ads(ds, de)
        elif level == "account":
            return await service.get_account_summary(ds, de)
        else:
            return await service.get_campaigns(ds, de)
    finally:
        await service.close()


def _run_meta(access_token, account_id, ds, de, level="campaign"):
    """Executa busca Meta Ads de forma sync-safe dentro de FastAPI."""
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None

    coro = _fetch_meta_data(access_token, account_id, ds, de, level)

    if loop and loop.is_running():
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor() as pool:
            return pool.submit(asyncio.run, coro).result()
    else:
        return asyncio.run(coro)


def _parse_dates(query: dict):
    """Extrai date_start e date_end do query dict."""
    ds = query.get("date_start", "")
    de = query.get("date_end", "")
    now = now_sp()

    if ds and de:
        try:
            start = datetime.strptime(ds, "%Y-%m-%d")
            end = datetime.strptime(de, "%Y-%m-%d").replace(
                hour=23, minute=59, second=59
            )
            return start, end
        except ValueError:
            pass

    days = int(query.get("days_back", 30))
    return now - timedelta(days=days), now


_HANDLER_CACHE = {}


def _get_handlers():
    if _HANDLER_CACHE:
        return _HANDLER_CACHE

    from ai.tools.handlers import (
        _handle_creatives, _handle_recovery, _handle_funnel,
    )
    from ai.tools.handlers_db import (
        _handle_products, _handle_customers, _handle_refunds,
    )

    _HANDLER_CACHE.update({
        "transactions": _handle_transactions,
        "kpis": _handle_kpis,
        "meta_campaigns": _handle_meta_campaigns,
        "creatives": _handle_creatives,
        "recovery": _handle_recovery,
        "funnel": _handle_funnel,
        "products": _handle_products,
        "customers": _handle_customers,
        "refunds": _handle_refunds,
        "hourly_performance": _handle_hourly_performance,
        "hourly_profit": _handle_hourly_performance,
    })
    return _HANDLER_CACHE


# ── Handlers inline ─────────────────────────────────────────────────

def _handle_transactions(db, date_start, date_end, **kwargs):
    status_filter = kwargs.get("status", "")
    utm = kwargs.get("utm_campaign", "")

    query = db.query(Transaction).filter(
        Transaction.created_at >= date_start,
        Transaction.created_at <= date_end,
    )
    if status_filter:
        try:
            query = query.filter(
                Transaction.status == TransactionStatus(status_filter)
            )
        except ValueError:
            pass
    if utm:
        query = query.filter(Transaction.utm_campaign.ilike(f"%{utm}%"))

    rows = query.limit(500).all()
    approved = [t for t in rows if t.status == TransactionStatus.APPROVED]
    pending = [t for t in rows if t.status == TransactionStatus.PENDING]
    refunded = [t for t in rows if t.status == TransactionStatus.REFUNDED]
    cbs = [t for t in rows if t.status == TransactionStatus.CHARGEBACK]
    trials = [t for t in rows if t.status == TransactionStatus.TRIAL]

    revenue = sum(t.amount for t in approved)
    avg = revenue / len(approved) if approved else 0
    rate = (len(approved) / len(rows) * 100) if rows else 0

    return (
        f"Total: {len(rows)} | Aprovadas: {len(approved)} "
        f"(R$ {revenue:,.2f}) | Pendentes: {len(pending)} | "
        f"Reembolsos: {len(refunded)} | Chargebacks: {len(cbs)} | "
        f"Trials: {len(trials)} | "
        f"Ticket: R$ {avg:,.2f} | Aprovação: {rate:.1f}%"
    )


def _handle_kpis(db, date_start, date_end, **kwargs):
    base = db.query(Transaction).filter(
        Transaction.created_at >= date_start,
        Transaction.created_at <= date_end,
    )
    ds = date_start.strftime("%Y-%m-%d")
    de = date_end.strftime("%Y-%m-%d")

    meta_summary = None
    token, acct_id = _get_fb_credentials(db)
    if token:
        try:
            meta_summary = _run_meta(token, acct_id, ds, de, "account")
        except Exception:
            pass

    k = calc_kpis(base, meta_summary)
    return (
        f"Revenue: R${k['total_revenue']:,.2f} | "
        f"Spend: R${k['total_spend']:,.2f} | "
        f"Profit: R${k['profit']:,.2f} | ROAS: {k['roas']}x | "
        f"CPA: R${k['cpa']:,.2f} | Ticket: R${k['average_ticket']:,.2f} | "
        f"Margem: {k['profit_margin']}% | "
        f"Vendas: {k['total_sales']} (Aprovação: {k['approval_rate']}%) | "
        f"Impressões: {k['total_impressions']:,} | CPM: R${k['cpm']:,.2f} | "
        f"Cliques: {k['total_clicks']:,} | CPC: R${k['cpc']:,.2f} | CTR: {k['ctr']}% | "
        f"LPV (Pageviews): {k['pageviews']:,} | CPV: R${k['cpv']:,.2f} | Connect Rate: {k['connect_rate']}% | "
        f"IC: {k['initiate_checkout']:,} | Custo por IC: R${k['cost_per_ic']:,.2f} | "
        f"Taxa Checkout: {k['checkout_rate']}% | Conv. Checkout: {k['checkout_conversion_rate']}% | "
        f"Chargebacks: {k['chargeback_count']} ({k['chargeback_rate']}%)"
    )


def _handle_meta_campaigns(db, date_start, date_end, **kwargs):
    level = kwargs.get("level", "campaign")
    status_filter = kwargs.get("status", "all")
    token, acct_id = _get_fb_credentials(db)
    if not token:
        return "Sem conta Facebook Ads."

    ds = date_start.strftime("%Y-%m-%d")
    de = date_end.strftime("%Y-%m-%d")
    data = _run_meta(token, acct_id, ds, de, level)

    if not data:
        return f"Sem dados de {level}."

    if status_filter == "active":
        data = [i for i in data if getattr(i, "status", "") == "active"]

    if not data:
        return f"Sem dados de {level} (filtro: {status_filter})."

    data.sort(key=lambda x: x.spend, reverse=True)
    lines = []
    for item in data[:15]:
        st = "(ATIVA) 🟢" if getattr(item, "status", "") == "active" else "(DESATIVADA) 🟡"
        cpm = getattr(item, "cpm", 0.0) or (round((item.spend / item.impressions) * 1000, 2) if item.impressions > 0 and item.spend > 0 else 0.0)
        cpv = getattr(item, "cpv", 0.0) or (round(item.spend / item.landing_page_views, 2) if item.landing_page_views > 0 and item.spend > 0 else 0.0)
        lines.append(
            f"{st} [ID:{item.id}] {item.name} | "
            f"Budget: R${item.budget:,.0f} | Spend: R${item.spend:,.2f} | "
            f"Impr: {item.impressions:,} | CPM: R${cpm:,.2f} | "
            f"Clicks: {item.clicks} | CPC: R${item.cpc:,.2f} | "
            f"CTR: {item.ctr:.2f}% | LPV: {item.landing_page_views} | "
            f"CPV: R${cpv:,.2f} | Connect: {item.connect_rate:.1f}% | "
            f"Init Checkout: {item.initiate_checkout}"
        )
    total = sum(i.spend for i in data)
    lines.append(f"Total spend: R${total:,.2f} | Total: {len(data)}")
    return "\n".join(lines)


def _handle_hourly_performance(db, date_start, date_end, **kwargs):
    """Retorna análise de vendas e faturamento por hora do dia (00h às 23h)."""
    from sqlalchemy import extract, func
    approved = db.query(Transaction).filter(
        Transaction.created_at >= date_start,
        Transaction.created_at <= date_end,
        Transaction.status == TransactionStatus.APPROVED,
    )
    rows = (
        approved.with_entities(
            extract("hour", Transaction.created_at).label("hour"),
            func.count(Transaction.id).label("sales"),
            func.sum(Transaction.amount).label("revenue"),
        )
        .group_by(extract("hour", Transaction.created_at))
        .all()
    )
    hour_map = {int(r.hour): {"sales": int(r.sales or 0), "revenue": float(r.revenue or 0)} for r in rows}

    total_sales = sum(h["sales"] for h in hour_map.values())
    total_rev = sum(h["revenue"] for h in hour_map.values())

    sorted_hours = sorted(
        [(h, hour_map.get(h, {"sales": 0, "revenue": 0.0})) for h in range(24)],
        key=lambda x: (x[1]["revenue"], x[1]["sales"]),
        reverse=True,
    )

    peak_hours = [f"{h:02d}:00 (R$ {d['revenue']:,.2f} - {d['sales']} vendas)" for h, d in sorted_hours[:5] if d["sales"] > 0]
    dead_hours = [f"{h:02d}:00" for h, d in sorted_hours[-8:] if d["sales"] == 0]

    lines = [
        f"📊 ANÁLISE DE HORÁRIOS & HEATMAP DE CONVERSÃO ({date_start.strftime('%d/%m')} a {date_end.strftime('%d/%m')}):",
        f"• Total Aprovado no período analisado: {total_sales} vendas (R$ {total_rev:,.2f})",
        f"• 🔥 Picos de Venda (Golden Hours): {', '.join(peak_hours) if peak_hours else 'Sem vendas suficientes registradas'}",
        f"• ❄️ Horários de Baixa Conversão (Economizar Orçamento): {', '.join(dead_hours) if dead_hours else 'Nenhum horário zerado'}",
        "",
        "Distribuição Completa Hora a Hora (00:00 às 23:00):",
    ]

    for h in range(24):
        d = hour_map.get(h, {"sales": 0, "revenue": 0.0})
        is_peak = d["sales"] >= (total_sales / 24 * 1.4 if total_sales > 0 else 1) and d["sales"] > 0
        is_zero = d["sales"] == 0
        icon = "🔥" if is_peak else ("❄️" if is_zero else "⚡")
        lines.append(f"{icon} {h:02d}:00 → R$ {d['revenue']:,.2f} ({d['sales']} vendas)")

    return "\n".join(lines)


