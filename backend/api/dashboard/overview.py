from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional

from database.core.timezone import now_sp, SP_ZONE

from database.core.connection import get_db
from database.models.transaction import Transaction, TransactionStatus, PaymentPlatform
from api.auth.deps import get_current_user
from api.dashboard.aggregations import (
    _daily_revenue, _platform_dist, _hourly_sales,
    _hourly_profit_breakdown, _country_distribution,
    _utm_distribution, _top_products_distribution,
    _payment_method_distribution, _conversion_flow,
)
from api.dashboard.meta_data import (
    fetch_meta_account_summary, fetch_meta_campaigns_for_dashboard,
)
from api.dashboard.kpis import calc_kpis
from api.dashboard.top_campaigns import build_top_campaigns
from pydantic import BaseModel
from database.models.daily_ad_spend import DailyAdSpend
from integrations.meta_ads.schemas import AccountInsightsSummary
from api.products.alias_helper import get_product_names_for_filter, get_upsell_name_for_filter

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def _parse_date_range(preset: str, start: Optional[str], end: Optional[str]):
    now = now_sp()
    end_of_day = now.replace(hour=23, minute=59, second=59, microsecond=999999)
    if preset == "today":
        return now.replace(hour=0, minute=0, second=0, microsecond=0), end_of_day
    elif preset == "yesterday":
        yesterday = now - timedelta(days=1)
        return yesterday.replace(hour=0, minute=0, second=0, microsecond=0), yesterday.replace(hour=23, minute=59, second=59, microsecond=999999)
    elif preset == "3d":
        return (now - timedelta(days=3)).replace(hour=0, minute=0, second=0, microsecond=0), end_of_day
    elif preset == "7d":
        return (now - timedelta(days=7)).replace(hour=0, minute=0, second=0, microsecond=0), end_of_day
    elif preset == "14d":
        return (now - timedelta(days=14)).replace(hour=0, minute=0, second=0, microsecond=0), end_of_day
    elif preset == "30d":
        return (now - timedelta(days=30)).replace(hour=0, minute=0, second=0, microsecond=0), end_of_day
    elif preset == "90d":
        return (now - timedelta(days=90)).replace(hour=0, minute=0, second=0, microsecond=0), end_of_day
    elif preset == "custom" and start and end:
        try:
            s = datetime.strptime(start, "%Y-%m-%d")
            e = datetime.strptime(end, "%Y-%m-%d").replace(
                hour=23, minute=59, second=59
            )
            return s, e
        except ValueError:
            return None, None
    return None, None


def _apply_filters(query, db, preset, start, end, platform, product_id, account_slug=None, upsell_id=None):
    d_start, d_end = _parse_date_range(preset, start, end)
    if d_start:
        query = query.filter(Transaction.created_at >= d_start)
    if d_end:
        query = query.filter(Transaction.created_at <= d_end)
    if platform and platform != "all":
        try:
            query = query.filter(Transaction.platform == PaymentPlatform(platform))
        except ValueError:
            pass
    if upsell_id:
        upsell_name = get_upsell_name_for_filter(db, upsell_id)
        if upsell_name:
            query = query.filter(Transaction.product_name.ilike(f"%{upsell_name}%"))
    elif product_id:
        names = get_product_names_for_filter(db, product_id)
        if names:
            query = query.filter(Transaction.product_name.in_(names))
    if account_slug and account_slug != "all":
        query = query.filter(Transaction.webhook_slug == account_slug)
    return query


def _date_range_strings(preset, start, end):
    """Retorna date strings YYYY-MM-DD para a Meta API."""
    d_start, d_end = _parse_date_range(preset, start, end)
    if not d_start or not d_end:
        now = now_sp()
        d_start = now - timedelta(days=30)
        d_end = now
    return d_start.strftime("%Y-%m-%d"), d_end.strftime("%Y-%m-%d")


@router.get("/overview")
async def dashboard_overview(
    preset: str = Query("30d"),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    platform: Optional[str] = Query(None),
    product_id: Optional[int] = Query(None),
    upsell_id: Optional[int] = Query(None),
    account_slug: Optional[str] = Query(None),
    account_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    base = db.query(Transaction)
    base = _apply_filters(base, db, preset, start_date, end_date, platform, product_id, account_slug, upsell_id=upsell_id)

    # Datas formatadas para a Meta API
    ds, de = _date_range_strings(preset, start_date, end_date)

    # Buscar dados da Meta Ads em paralelo
    meta_summary, meta_error = await fetch_meta_account_summary(db, ds, de, account_id=account_id)
    meta_campaigns = await fetch_meta_campaigns_for_dashboard(db, ds, de, account_id=account_id)

    # Se a Meta não retornou spend (>0), buscar da tabela daily_ad_spends para o período
    if not meta_summary or meta_summary.spend == 0.0:
        d_start, d_end = _parse_date_range(preset, start_date, end_date)
        manual_q = db.query(DailyAdSpend)
        if d_start and d_end:
            manual_q = manual_q.filter(
                DailyAdSpend.spend_date >= d_start.date(),
                DailyAdSpend.spend_date <= d_end.date(),
            )
        manual_rows = manual_q.all()
        # Se não encontrou por data exata (ex: preset customizado ou all), pega o último registro cadastrado como fallback
        if not manual_rows:
            latest = db.query(DailyAdSpend).order_by(DailyAdSpend.spend_date.desc()).first()
            if latest:
                manual_rows = [latest]

        if manual_rows:
            tot_spend = sum(m.spend for m in manual_rows)
            tot_clicks = sum(m.clicks for m in manual_rows)
            tot_imp = sum(m.impressions for m in manual_rows)
            if tot_spend > 0:
                meta_summary = AccountInsightsSummary(
                    spend=tot_spend,
                    clicks=tot_clicks,
                    impressions=tot_imp,
                    cpc=round(tot_spend / tot_clicks, 2) if tot_clicks > 0 else 0.0,
                    ctr=round((tot_clicks / tot_imp) * 100, 2) if tot_imp > 0 else 0.0,
                    cpm=round((tot_spend / tot_imp) * 1000, 2) if tot_imp > 0 else 0.0,
                )


    # KPIs com dados da Meta ou Gasto Manual
    kpis = calc_kpis(base, meta_summary)

    # Daily revenue com spend diário da Meta
    daily = _daily_revenue(base, db, meta_campaigns, ds, de)

    platforms = _platform_dist(base, db)
    top_campaigns = build_top_campaigns(base, meta_campaigns)
    hourly = _hourly_sales(base, db)

    # Dados adicionais padrão NexoFy
    hourly_profit = _hourly_profit_breakdown(base, db, meta_spend=float(kpis.get("total_spend", 0.0)))
    countries = _country_distribution(base, db)
    utm_origins = _utm_distribution(base, db)
    top_products = _top_products_distribution(base, db)
    payment_methods = _payment_method_distribution(base, db)
    conversion_flow = _conversion_flow(base, meta_summary)

    return {
        "kpis": kpis,
        "daily_revenue": daily,
        "platform_distribution": platforms,
        "top_campaigns": top_campaigns,
        "hourly_sales": hourly,
        "hourly_profit": hourly_profit,
        "countries": countries,
        "utm_origins": utm_origins,
        "top_products": top_products,
        "payment_methods": payment_methods,
        "conversion_flow": conversion_flow,
        "meta_error": meta_error,
    }


class ManualSpendInput(BaseModel):
    spend: float
    clicks: Optional[int] = 0
    impressions: Optional[int] = 0
    spend_date: Optional[str] = None  # YYYY-MM-DD


@router.get("/manual-spend")
def get_current_manual_spend(db: Session = Depends(get_db), _=Depends(get_current_user)):
    today_date = now_sp().date()
    row = db.query(DailyAdSpend).filter(DailyAdSpend.spend_date == today_date).first()
    if not row:
        row = db.query(DailyAdSpend).order_by(DailyAdSpend.spend_date.desc()).first()
    return {
        "spend": row.spend if row else 0.0,
        "clicks": row.clicks if row else 0,
        "impressions": row.impressions if row else 0,
        "spend_date": str(row.spend_date) if row else str(today_date),
    }


@router.post("/manual-spend")
def set_manual_spend(req: ManualSpendInput, db: Session = Depends(get_db), _=Depends(get_current_user)):
    try:
        DailyAdSpend.__table__.create(db.get_bind(), checkfirst=True)
    except Exception:
        pass

    target_date = now_sp().date()
    if req.spend_date:
        try:
            target_date = datetime.strptime(req.spend_date, "%Y-%m-%d").date()
        except ValueError:
            pass

    try:
        row = db.query(DailyAdSpend).filter(DailyAdSpend.spend_date == target_date).first()
        if not row:
            row = DailyAdSpend(
                spend_date=target_date,
                spend=float(req.spend),
                clicks=int(req.clicks or 0),
                impressions=int(req.impressions or 0),
            )
            db.add(row)
        else:
            row.spend = float(req.spend)
            if req.clicks is not None:
                row.clicks = int(req.clicks)
            if req.impressions is not None:
                row.impressions = int(req.impressions)
        db.commit()
        db.refresh(row)
        return {
            "status": "ok",
            "spend": row.spend,
            "clicks": row.clicks,
            "impressions": row.impressions,
            "spend_date": str(row.spend_date),
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao salvar gasto: {str(e)}")
