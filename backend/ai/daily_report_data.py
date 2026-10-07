"""
Coleta dados do dia para o relatório diário automático da AI.
Busca KPIs, campanhas top/bottom, e dados de aprendizado.
"""
from sqlalchemy.orm import Session
from datetime import timedelta

from database.core.timezone import now_sp
from database.models.transaction import Transaction, TransactionStatus
from database.models.facebook_account import FacebookAccount
from api.dashboard.kpis import calc_kpis
from api.campaigns.actions import fetch_learning_data
from ai.tools.universal import _run_meta


def collect_daily_data(db: Session) -> dict:
    """Coleta todos os dados necessários para o relatório diário."""
    now = now_sp()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    ds = today_start.strftime("%Y-%m-%d")
    de = now.strftime("%Y-%m-%d")

    # KPIs de hoje
    today_kpis = _calc_period_kpis(db, today_start, now, ds, de)

    # KPIs de ontem (para comparativo)
    yesterday_start = today_start - timedelta(days=1)
    yesterday_end = today_start
    yd_ds = yesterday_start.strftime("%Y-%m-%d")
    yd_de = yesterday_start.strftime("%Y-%m-%d")
    yesterday_kpis = _calc_period_kpis(db, yesterday_start, yesterday_end, yd_ds, yd_de)

    # KPIs últimos 7 dias (para média)
    week_start = today_start - timedelta(days=7)
    w_ds = week_start.strftime("%Y-%m-%d")
    week_kpis = _calc_period_kpis(db, week_start, now, w_ds, de)

    # Campanhas do Meta Ads hoje
    campaigns_text = _fetch_campaigns_today(db, ds, de)

    # Dados de aprendizado (ações do usuário)
    learning = fetch_learning_data(db)

    return {
        "today_kpis": today_kpis,
        "yesterday_kpis": yesterday_kpis,
        "week_kpis": week_kpis,
        "campaigns_text": campaigns_text,
        "learning_data": learning,
        "total_spend_today": today_kpis.get("total_spend", 0),
    }


def _calc_period_kpis(db: Session, start, end, ds: str, de: str) -> dict:
    """Calcula KPIs para um período."""
    base = db.query(Transaction).filter(
        Transaction.created_at >= start,
        Transaction.created_at <= end,
    )

    meta_summary = None
    account = db.query(FacebookAccount).filter(
        FacebookAccount.token_valid.is_(True)
    ).first()
    if account:
        try:
            meta_summary = _run_meta(
                account.access_token, account.account_id, ds, de, "account"
            )
        except Exception:
            pass

    return calc_kpis(base, meta_summary)


def _fetch_campaigns_today(db: Session, ds: str, de: str) -> str:
    """Busca campanhas do Meta Ads com métricas de hoje."""
    account = db.query(FacebookAccount).filter(
        FacebookAccount.token_valid.is_(True)
    ).first()
    if not account:
        return "Sem conta Facebook Ads configurada."

    try:
        data = _run_meta(
            account.access_token, account.account_id, ds, de, "campaign"
        )
    except Exception as e:
        return f"Erro ao buscar campanhas: {str(e)}"

    if not data:
        return "Sem dados de campanhas hoje."

    data.sort(key=lambda x: x.spend, reverse=True)
    lines = []
    for item in data[:20]:
        st = "(ATIVA) 🟢" if getattr(item, "status", "") == "active" else "(DESATIVADA) 🟡"
        cpm = getattr(item, "cpm", 0.0) or (round((item.spend / item.impressions) * 1000, 2) if item.impressions > 0 and item.spend > 0 else 0.0)
        cpv = getattr(item, "cpv", 0.0) or (round(item.spend / item.landing_page_views, 2) if item.landing_page_views > 0 and item.spend > 0 else 0.0)
        lines.append(
            f"{st} [ID:{item.id}] {item.name} | Budget: R${item.budget:.0f}"
            f" | Spend: R${item.spend:.2f}"
            f" | Impr: {item.impressions:,}"
            f" | CPM: R${cpm:.2f}"
            f" | Clicks: {item.clicks}"
            f" | CPC: R${item.cpc:.2f}"
            f" | CTR: {item.ctr:.2f}%"
            f" | LPV: {item.landing_page_views}"
            f" | CPV: R${cpv:.2f}"
            f" | IC: {item.initiate_checkout}"
        )

    total_spend = sum(i.spend for i in data)
    lines.append(f"\nTotal spend: R${total_spend:,.2f} | Total: {len(data)} campanhas")
    return "\n".join(lines)


def format_daily_context(data: dict) -> str:
    """Formata os dados coletados em texto para o prompt da AI."""
    k = data["today_kpis"]
    yk = data["yesterday_kpis"]
    wk = data["week_kpis"]

    sections = [
        "# DADOS DO DIA ATUAL (Padrão Ninja Tracker)",
        f"Faturamento: R${k['total_revenue']:,.2f} | "
        f"Gastos Ads: R${k['total_spend']:,.2f} | "
        f"Lucro Líquido: R${k['profit']:,.2f} | ROAS: {k['roas']}x | ROI: {k.get('roi', 0)}x | "
        f"CPA: R${k['cpa']:,.2f} | Vendas: {k['total_sales']} (Aprovação: {k.get('approval_rate', 0)}%) | "
        f"Impressões: {k.get('total_impressions', 0):,} | CPM: R${k.get('cpm', 0):,.2f} | "
        f"Cliques: {k.get('total_clicks', 0):,} | CPC: R${k.get('cpc', 0):,.2f} | CTR: {k.get('ctr', 0)}% | "
        f"LPV (Pageviews): {k.get('pageviews', 0):,} | CPV: R${k.get('cpv', 0):,.2f} | "
        f"Connect Rate: {k.get('connect_rate', 0)}% | IC: {k.get('initiate_checkout', 0):,} | "
        f"Ticket: R${k['average_ticket']:,.2f} | "
        f"Chargebacks: {k['chargeback_count']} ({k['chargeback_rate']}%)",
        "",
        "# DADOS DE ONTEM (comparativo)",
        f"Faturamento: R${yk['total_revenue']:,.2f} | "
        f"Gastos: R${yk['total_spend']:,.2f} | "
        f"Lucro: R${yk['profit']:,.2f} | ROAS: {yk['roas']}x | "
        f"Vendas: {yk['total_sales']}",

        "",
        "# MÉDIA 7 DIAS",
        f"Faturamento: R${wk['total_revenue']:,.2f} | "
        f"Gastos: R${wk['total_spend']:,.2f} | "
        f"Lucro: R${wk['profit']:,.2f} | ROAS: {wk['roas']}x | "
        f"Vendas: {wk['total_sales']}",
        "",
        "# CAMPANHAS HOJE",
        data["campaigns_text"],
    ]

    if data["learning_data"]:
        sections.extend([
            "",
            "# HISTÓRICO DE AÇÕES DO CEO (aprendizado)",
            "Estes são registros das ações que o CEO tomou recentemente.",
            "Use para entender os padrões e critérios de decisão dele.",
            data["learning_data"],
        ])

    return "\n".join(sections)
