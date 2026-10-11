"""
Endpoints do Radar de Fadiga de Criativos (Creative Fatigue & Saturation Analyzer).
Monitora Frequência, CTR, CPC e CPA dos anúncios para detectar saturação antes do prejuízo.
"""
import logging
from typing import Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database.core.connection import get_db
from database.core.timezone import today_sp_str, now_sp
from database.models.facebook_account import FacebookAccount
from database.models.transaction import Transaction, TransactionStatus
from api.auth.deps import get_current_user
from integrations.meta_ads.service import MetaAdsService
from integrations.meta_ads.manage import toggle_entity_status

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/creative-fatigue", tags=["creative-fatigue"])


class PauseAdRequest(BaseModel):
    account_id: Optional[int] = None
    ad_id: str
    status: str = "PAUSED"  # PAUSED | ACTIVE


@router.get("/analysis")
async def get_creative_fatigue_analysis(
    date_start: Optional[str] = Query(None),
    date_end: Optional[str] = Query(None),
    account_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """
    Analisa os anúncios da conta Meta Ads e calcula o índice de fadiga/saturação de criativos.
    """
    if not date_end:
        date_end = today_sp_str()
    if not date_start:
        # Padrão: últimos 7 dias para capturar curva de frequência real
        dt_end = datetime.strptime(date_end, "%Y-%m-%d")
        dt_start = dt_end - timedelta(days=7)
        date_start = dt_start.strftime("%Y-%m-%d")

    query = db.query(FacebookAccount).filter(FacebookAccount.token_valid.is_(True))
    if account_id:
        query = query.filter(FacebookAccount.id == account_id)
    fb_accounts = query.all()

    if not fb_accounts:
        return {
            "summary": {"total_ads": 0, "healthy_count": 0, "warning_count": 0, "critical_count": 0},
            "ads": [],
            "date_range": {"start": date_start, "end": date_end},
        }

    # Transações aprovadas do período para computar vendas por criativo
    dt_period_start = datetime.strptime(date_start, "%Y-%m-%d")
    txs = (
        db.query(Transaction)
        .filter(
            Transaction.status == TransactionStatus.APPROVED,
            Transaction.created_at >= dt_period_start,
        )
        .all()
    )

    ad_sales_map = {}
    ad_revenue_map = {}
    for t in txs:
        key = t.utm_content or ""
        if key:
            ad_sales_map[key] = ad_sales_map.get(key, 0) + 1
            ad_revenue_map[key] = ad_revenue_map.get(key, 0.0) + (t.amount or 0.0)

    analyzed_ads = []
    healthy_count = 0
    warning_count = 0
    critical_count = 0

    for fb_acc in fb_accounts:
        try:
            service = MetaAdsService(fb_acc.access_token, fb_acc.account_id)
            ads_insights = await service.get_ads_insights(date_start, date_end)
        except Exception as e:
            logger.warning(f"Erro ao buscar insights de anúncios para fadiga: {e}")
            continue

        for ad in ads_insights:
            # Consideramos anúncios que tiveram impressões ou gasto no período
            if ad.impressions <= 0 and ad.spend <= 0:
                continue

            sales = ad_sales_map.get(ad.id, 0) or ad_sales_map.get(ad.name, 0)
            revenue = ad_revenue_map.get(ad.id, 0.0) or ad_revenue_map.get(ad.name, 0.0)
            if sales > 0 and revenue == 0.0:
                revenue = sales * 197.0

            spend = ad.spend
            freq = ad.frequency or 1.0
            ctr = ad.ctr or 0.0
            cpc = ad.cpc or 0.0
            cpa = (spend / sales) if sales > 0 else (spend if spend > 0 else 0.0)
            roas = (revenue / spend) if spend > 0 else 0.0

            # Cálculo de Pontuação de Fadiga (0 a 100)
            score = 15
            if freq <= 1.4:
                score = 15
            elif freq <= 1.8:
                score = 35
            elif freq <= 2.2:
                score = 60
            elif freq <= 2.6:
                score = 80
            else:
                score = 95

            # Fator CTR: se CTR baixo para tráfego direto, penaliza
            if ctr < 0.7:
                score += 15
            elif ctr < 1.0:
                score += 8
            elif ctr > 2.0:
                score -= 10

            # Fator Conversão / ROAS
            if spend > 80 and sales == 0:
                score += 15
            elif roas >= 2.5:
                score -= 20

            score = max(5, min(100, score))

            if score < 45:
                fatigue_status = "healthy"
                healthy_count += 1
                recommendation = f"Criativo saudável com tração positiva (Frequência {freq:.2f}). Seguro para manter ou aumentar orçamento."
            elif score < 75:
                fatigue_status = "warning"
                warning_count += 1
                recommendation = f"Frequência em elevação ({freq:.2f}) e CTR moderado ({ctr:.2f}%). Prepare criativos substitutos para evitar subida brusca de CPA."
            else:
                fatigue_status = "critical"
                critical_count += 1
                recommendation = f"Saturação severa detectada (Frequência {freq:.2f}, CTR {ctr:.2f}%). Recomenda-se pausar este anúncio ou testar novo gancho/abertura imediatamente."

            analyzed_ads.append({
                "id": ad.id,
                "name": ad.name,
                "campaign_name": ad.campaign_name,
                "adset_name": ad.adset_name,
                "account_id": fb_acc.id,
                "status": ad.status,
                "spend": round(spend, 2),
                "impressions": ad.impressions,
                "reach": ad.reach,
                "frequency": round(freq, 2),
                "clicks": ad.clicks,
                "ctr": round(ctr, 2),
                "cpc": round(cpc, 2),
                "sales": sales,
                "cpa": round(cpa, 2),
                "roas": round(roas, 2),
                "fatigue_score": score,
                "fatigue_status": fatigue_status,
                "recommendation": recommendation,
            })

    # Ordena por score decrescente (mais saturados primeiro)
    analyzed_ads.sort(key=lambda x: x["fatigue_score"], reverse=True)

    return {
        "summary": {
            "total_ads": len(analyzed_ads),
            "healthy_count": healthy_count,
            "warning_count": warning_count,
            "critical_count": critical_count,
        },
        "ads": analyzed_ads,
        "date_range": {"start": date_start, "end": date_end},
    }


@router.post("/toggle-ad")
async def toggle_ad(
    payload: PauseAdRequest,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """Pausa ou ativa um anúncio diretamente pelo Radar de Fadiga."""
    query = db.query(FacebookAccount).filter(FacebookAccount.token_valid.is_(True))
    if payload.account_id:
        query = query.filter(FacebookAccount.id == payload.account_id)
    fb_acc = query.first()

    if not fb_acc:
        raise HTTPException(status_code=404, detail="Conta Facebook Ads não encontrada")

    res = await toggle_entity_status(
        access_token=fb_acc.access_token,
        entity_id=payload.ad_id,
        new_status=payload.status,
    )

    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("error", "Erro ao alterar status no Meta Ads"))

    return {
        "status": "ok",
        "ad_id": payload.ad_id,
        "new_status": payload.status,
        "message": f"Anúncio {'pausado' if payload.status == 'PAUSED' else 'ativado'} com sucesso no Meta Ads!",
    }
