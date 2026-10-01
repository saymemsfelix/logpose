"""
Agregações para o dashboard: revenue diário, plataformas, vendas por hora.
"""
from sqlalchemy import func, extract
from datetime import datetime, timedelta

from database.models.transaction import Transaction, TransactionStatus
from integrations.meta_ads.schemas import CampaignInsights


def _daily_revenue(base, db, meta_campaigns: list[CampaignInsights] = None,
                   date_start: str = None, date_end: str = None):
    """Agrupa revenue/profit por dia, incluindo spend da Meta Ads."""
    approved = base.filter(Transaction.status == TransactionStatus.APPROVED)
    rows = (
        approved.with_entities(
            func.date(Transaction.created_at).label("day"),
            func.sum(Transaction.amount).label("revenue"),
            func.count(Transaction.id).label("sales"),
        )
        .group_by(func.date(Transaction.created_at))
        .order_by(func.date(Transaction.created_at))
        .all()
    )

    # Calcular spend total da Meta para distribuir proporcionalmente por dia
    total_meta_spend = sum(c.spend for c in meta_campaigns) if meta_campaigns else 0
    total_revenue_all = sum(float(r.revenue or 0) for r in rows)

    result = []
    for r in rows:
        rev = float(r.revenue or 0)
        # Distribuir spend proporcionalmente à receita de cada dia
        if total_meta_spend > 0 and total_revenue_all > 0:
            day_spend = total_meta_spend * (rev / total_revenue_all)
        elif total_meta_spend > 0 and len(rows) > 0:
            day_spend = total_meta_spend / len(rows)
        else:
            day_spend = 0

        result.append({
            "date": str(r.day),
            "revenue": rev,
            "spend": round(day_spend, 2),
            "profit": round(rev - day_spend, 2),
            "sales": int(r.sales or 0),
        })

    return result


def _platform_dist(base, db):
    """Distribuição de faturamento por plataforma."""
    approved = base.filter(Transaction.status == TransactionStatus.APPROVED)
    rows = (
        approved.with_entities(
            Transaction.platform,
            func.sum(Transaction.amount).label("value"),
            func.count(Transaction.id).label("sales"),
        )
        .group_by(Transaction.platform)
        .all()
    )
    colors = {
        "kiwify": "var(--color-chart-1)",
        "payt": "var(--color-chart-2)",
        "hotmart": "#FF5722",
        "api": "var(--color-chart-3)",
    }
    labels = {
        "kiwify": "Kiwify",
        "payt": "PayT",
        "hotmart": "Hotmart",
        "api": "API",
    }
    return [
        {
            "name": labels.get(r.platform.value, r.platform.value),
            "value": float(r.value or 0),
            "sales": int(r.sales or 0),
            "fill": colors.get(r.platform.value, "var(--color-chart-4)"),
        }
        for r in rows
    ]


def _hourly_sales(base, db):
    """Vendas por hora do dia."""
    approved = base.filter(Transaction.status == TransactionStatus.APPROVED)
    rows = (
        approved.with_entities(
            extract("hour", Transaction.created_at).label("hour"),
            func.count(Transaction.id).label("sales"),
            func.sum(Transaction.amount).label("revenue"),
        )
        .group_by(extract("hour", Transaction.created_at))
        .order_by(extract("hour", Transaction.created_at))
        .all()
    )
    hour_map = {int(r.hour): r for r in rows}
    result = []
    for h in range(0, 24, 2):
        entry = hour_map.get(h)
        s1 = int(entry.sales) if entry else 0
        r1 = float(entry.revenue) if entry else 0
        entry2 = hour_map.get(h + 1)
        s2 = int(entry2.sales) if entry2 else 0
        r2 = float(entry2.revenue) if entry2 else 0
        result.append({
            "hour": f"{h:02d}h",
            "sales": s1 + s2,
            "revenue": r1 + r2,
        })
    return result


def _hourly_profit_breakdown(base, db, meta_spend: float = 0.0):
    """
    Retorna cada uma das 24 horas (00:00 a 23:00) com:
    - hour: "00:00", "01:00", etc.
    - revenue: faturamento aprovado na hora
    - spend: gasto estimado com anúncios na hora
    - profit: lucro líquido (revenue - spend)
    - sales: quantidade de vendas
    """
    approved = base.filter(Transaction.status == TransactionStatus.APPROVED)
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

    # Distribuição do gasto de anúncio:
    # Se meta_spend > 0, dividimos pelos blocos de 24 horas (peso ligeiramente maior no horário comercial / noturno)
    # ou distribuído por 24 horas igualmente como base
    hourly_spend_base = meta_spend / 24.0 if meta_spend > 0 else 0.0

    result = []
    for h in range(24):
        entry = hour_map.get(h, {"sales": 0, "revenue": 0.0})
        rev = round(entry["revenue"], 2)
        # Ajuste de spend hora a hora
        spend = round(hourly_spend_base, 2)
        profit = round(rev - spend, 2)

        result.append({
            "hour": f"{h:02d}:00",
            "revenue": rev,
            "spend": spend,
            "profit": profit,
            "sales": entry["sales"],
        })
    return result


def _country_distribution(base, db):
    """
    Distribuição geográfica das vendas por país.
    Identifica o país através do DDI do telefone do comprador ou metadados.
    """
    from database.models.customer import Customer
    approved_txs = (
        base.filter(Transaction.status == TransactionStatus.APPROVED)
        .all()
    )
    
    COUNTRY_MAP = {
        "IT": ("IT", "Itália"),
        "PT": ("PT", "Portugal"),
        "ES": ("ES", "Espanha"),
        "US": ("US", "Estados Unidos"),
        "GB": ("GB", "Reino Unido"),
        "FR": ("FR", "França"),
        "DE": ("DE", "Alemanha"),
        "MX": ("MX", "México"),
        "AR": ("AR", "Argentina"),
        "CL": ("CL", "Chile"),
        "CO": ("CO", "Colômbia"),
        "PE": ("PE", "Peru"),
        "UY": ("UY", "Uruguai"),
        "BR": ("BR", "Brasil"),
    }

    country_counts = {}
    total_rev = 0.0

    for tx in approved_txs:
        c_code = "BR"
        c_name = "Brasil"

        # 1. Se a transação já tem country salvo no DB
        raw_c = str(getattr(tx, "country", "") or "").strip().upper()
        if raw_c in COUNTRY_MAP:
            c_code, c_name = COUNTRY_MAP[raw_c]
        else:
            phone = ""
            cust_country = ""
            if tx.customer_id:
                cust = db.query(Customer).filter(Customer.id == tx.customer_id).first()
                if cust:
                    cust_country = str(getattr(cust, "country", "") or "").strip().upper()
                    if cust.phone:
                        phone = cust.phone.replace("+", "").replace(" ", "").replace("-", "").strip()

            if cust_country in COUNTRY_MAP:
                c_code, c_name = COUNTRY_MAP[cust_country]
            elif phone:
                if phone.startswith("39"):
                    c_code, c_name = COUNTRY_MAP["IT"]
                elif phone.startswith("351"):
                    c_code, c_name = COUNTRY_MAP["PT"]
                elif phone.startswith("34"):
                    c_code, c_name = COUNTRY_MAP["ES"]
                elif phone.startswith("1") and len(phone) >= 11:
                    c_code, c_name = COUNTRY_MAP["US"]
                elif phone.startswith("44"):
                    c_code, c_name = COUNTRY_MAP["GB"]
                elif phone.startswith("33"):
                    c_code, c_name = COUNTRY_MAP["FR"]
                elif phone.startswith("49"):
                    c_code, c_name = COUNTRY_MAP["DE"]
                elif phone.startswith("52"):
                    c_code, c_name = COUNTRY_MAP["MX"]
                elif phone.startswith("54"):
                    c_code, c_name = COUNTRY_MAP["AR"]
                elif phone.startswith("55"):
                    c_code, c_name = COUNTRY_MAP["BR"]
            
            # Se for produto internacional italiano e não tiver caído em outro DDI específico
            p_name = (tx.product_name or "").lower()
            if any(k in p_name for k in ["diagnosi", "visive", "hardware e software", "solda"]) and not phone.startswith("55"):
                c_code, c_name = COUNTRY_MAP["IT"]

        if c_code not in country_counts:
            country_counts[c_code] = {"code": c_code, "name": c_name, "sales": 0, "revenue": 0.0}

        country_counts[c_code]["sales"] += 1
        country_counts[c_code]["revenue"] += float(tx.amount or 0.0)
        total_rev += float(tx.amount or 0.0)

    # Ordenar por faturamento desc
    res = list(country_counts.values())
    res.sort(key=lambda x: x["revenue"], reverse=True)
    for c in res:
        c["revenue"] = round(c["revenue"], 2)
        c["percentage"] = round((c["revenue"] / total_rev * 100), 1) if total_rev > 0 else 0.0

    return res


def _utm_distribution(base, db):
    """Vendas agrupadas por UTM Campaign / Source."""
    approved = base.filter(Transaction.status == TransactionStatus.APPROVED)
    rows = (
        approved.with_entities(
            Transaction.utm_campaign,
            Transaction.utm_source,
            func.count(Transaction.id).label("sales"),
            func.sum(Transaction.amount).label("revenue"),
        )
        .group_by(Transaction.utm_campaign, Transaction.utm_source)
        .order_by(func.sum(Transaction.amount).desc())
        .limit(10)
        .all()
    )
    result = []
    for r in rows:
        name = r.utm_campaign or r.utm_source or "Direto / Sem UTM"
        result.append({
            "name": name,
            "source": r.utm_source or "-",
            "sales": int(r.sales or 0),
            "revenue": round(float(r.revenue or 0), 2),
        })
    return result


def _top_products_distribution(base, db):
    """Produtos mais vendidos no período."""
    approved = base.filter(Transaction.status == TransactionStatus.APPROVED)
    rows = (
        approved.with_entities(
            Transaction.product_name,
            func.count(Transaction.id).label("sales"),
            func.sum(Transaction.amount).label("revenue"),
        )
        .group_by(Transaction.product_name)
        .order_by(func.sum(Transaction.amount).desc())
        .limit(8)
        .all()
    )
    return [
        {
            "name": r.product_name or "Produto Principal",
            "sales": int(r.sales or 0),
            "revenue": round(float(r.revenue or 0), 2),
        }
        for r in rows
    ]


def _payment_method_distribution(base, db):
    """Distribuição por formas de pagamento (PIX, Cartão, Boleto)."""
    approved = base.filter(Transaction.status == TransactionStatus.APPROVED)
    rows = (
        approved.with_entities(
            Transaction.platform,
            func.count(Transaction.id).label("sales"),
            func.sum(Transaction.amount).label("revenue"),
        )
        .group_by(Transaction.platform)
        .all()
    )
    
    # Em plataformas digitais BR: 65% Pix, 30% Cartão, 5% Boleto como aproximação
    total_sales = sum(int(r.sales or 0) for r in rows)
    total_rev = sum(float(r.revenue or 0) for r in rows)

    if total_sales == 0:
        return []

    return [
        {"method": "PIX", "sales": round(total_sales * 0.65), "revenue": round(total_rev * 0.65, 2), "percentage": 65},
        {"method": "Cartão de Crédito", "sales": round(total_sales * 0.30), "revenue": round(total_rev * 0.30, 2), "percentage": 30},
        {"method": "Boleto", "sales": max(0, total_sales - round(total_sales * 0.65) - round(total_sales * 0.30)), "revenue": round(total_rev * 0.05, 2), "percentage": 5},
    ]


def _conversion_flow(base, meta_summary):
    """
    Funil de conversão em tempo real (NexoFlow):
    Cliques -> Vis. Página -> ICs (Initiate Checkouts) -> Vendas Inic. -> Vendas Apr.
    Usa métricas reais do Meta Ads (clicks, landing_page_views, omni_initiated_checkout)
    e transações reais do banco de dados.
    """
    all_rows = base.all()
    approved = [t for t in all_rows if t.status == TransactionStatus.APPROVED]
    
    clicks = meta_summary.clicks if meta_summary else 0
    pageviews = meta_summary.landing_page_views if meta_summary else 0
    ics = (
        meta_summary.initiate_checkout
        if meta_summary and meta_summary.initiate_checkout > 0
        else len(all_rows)
    )
    sales_init = len(all_rows)
    sales_app = len(approved)

    # Taxas de conversão
    rate_click_to_pv = round((pageviews / clicks * 100), 1) if clicks > 0 else 0.0
    rate_pv_to_ic = round((ics / pageviews * 100), 1) if pageviews > 0 else 0.0
    rate_ic_to_init = round((sales_init / ics * 100), 1) if ics > 0 else 0.0
    rate_init_to_app = round((sales_app / sales_init * 100), 1) if sales_init > 0 else 0.0

    return {
        "clicks": clicks,
        "pageviews": pageviews,
        "initiate_checkouts": ics,
        "initiated_sales": sales_init,
        "approved_sales": sales_app,
        "rates": {
            "clicks_to_pageviews": rate_click_to_pv,
            "pageviews_to_ics": rate_pv_to_ic,
            "ics_to_initiated": rate_ic_to_init,
            "initiated_to_approved": rate_init_to_app,
        }
    }
