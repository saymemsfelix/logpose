import logging
from typing import Optional, List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
import httpx

from database.core.connection import get_db
from database.core.timezone import today_sp_str
from database.models.tiktok_account import TikTokAccount
from api.auth.deps import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tiktok", tags=["tiktok"])


class TikTokConnectRequest(BaseModel):
    label: str
    advertiser_id: str
    access_token: str
    app_id: Optional[str] = None
    secret: Optional[str] = None


class TikTokAccountResponse(BaseModel):
    id: int
    label: str
    advertiser_id: str
    token_valid: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TikTokOverviewResponse(BaseModel):
    connected: bool
    accounts: List[TikTokAccountResponse]
    total_accounts: int
    last_synced: Optional[str] = None


@router.get("/overview", response_model=TikTokOverviewResponse)
def get_tiktok_overview(
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """Retorna o status geral das contas TikTok Ads conectadas."""
    try:
        accounts = db.query(TikTokAccount).order_by(TikTokAccount.id.desc()).all()
    except Exception as e:
        logger.warning(f"Tabela tiktok_accounts ainda não inicializada ou erro: {e}")
        accounts = []

    return TikTokOverviewResponse(
        connected=len(accounts) > 0,
        accounts=accounts,
        total_accounts=len(accounts),
        last_synced=today_sp_str(),
    )


@router.post("/connect", response_model=TikTokAccountResponse)
def connect_tiktok_account(
    payload: TikTokConnectRequest,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """Conecta ou atualiza uma conta do TikTok Ads com access token de longo prazo."""
    advertiser_id = payload.advertiser_id.strip()
    if not advertiser_id:
        raise HTTPException(status_code=400, detail="Advertiser ID do TikTok é obrigatório")

    existing = db.query(TikTokAccount).filter(TikTokAccount.advertiser_id == advertiser_id).first()
    if existing:
        existing.label = payload.label.strip()
        existing.access_token = payload.access_token.strip()
        existing.app_id = payload.app_id.strip() if payload.app_id else existing.app_id
        existing.secret = payload.secret.strip() if payload.secret else existing.secret
        existing.token_valid = True
        db.commit()
        db.refresh(existing)
        return existing

    new_acc = TikTokAccount(
        label=payload.label.strip(),
        advertiser_id=advertiser_id,
        access_token=payload.access_token.strip(),
        app_id=payload.app_id.strip() if payload.app_id else None,
        secret=payload.secret.strip() if payload.secret else None,
        token_valid=True,
    )
    db.add(new_acc)
    db.commit()
    db.refresh(new_acc)
    return new_acc


@router.delete("/accounts/{account_id}")
def delete_tiktok_account(
    account_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """Desconecta e remove uma conta TikTok Ads cadastrada."""
    acc = db.query(TikTokAccount).filter(TikTokAccount.id == account_id).first()
    if not acc:
        raise HTTPException(status_code=404, detail="Conta TikTok não encontrada")

    db.delete(acc)
    db.commit()
    return {"status": "ok", "message": f"Conta TikTok '{acc.label}' desconectada com sucesso!"}


@router.post("/sync")
async def sync_tiktok_spend(
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """
    Sincroniza os gastos e métricas do TikTok Ads consumindo a Marketing API v1.3.
    """
    accounts = db.query(TikTokAccount).filter(TikTokAccount.token_valid.is_(True)).all()
    if not accounts:
        return {
            "status": "warning",
            "message": "Nenhuma conta TikTok Ads configurada. Conecte sua conta para sincronizar.",
            "synced_accounts": 0,
        }

    synced_count = 0
    errors = []

    for acc in accounts:
        try:
            # Endpoint oficial de relatórios da TikTok Business API
            # https://business-api.tiktok.com/open_api/v1.3/report/integrated/get/
            headers = {"Access-Token": acc.access_token}
            params = {
                "advertiser_id": acc.advertiser_id,
                "report_type": "BASIC",
                "data_level": "AUCTION_ADVERTISER",
                "dimensions": '["stat_time_day"]',
                "metrics": '["spend","impressions","clicks","conversion","cpc","cpm"]',
                "start_date": today_sp_str(),
                "end_date": today_sp_str(),
            }
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(
                    "https://business-api.tiktok.com/open_api/v1.3/report/integrated/get/",
                    headers=headers,
                    params=params,
                )
                if resp.status_code == 200:
                    data = resp.json()
                    if data.get("code") == 0:
                        synced_count += 1
                    else:
                        errors.append(f"{acc.label}: {data.get('message', 'Erro API TikTok')}")
                else:
                    errors.append(f"{acc.label}: Status HTTP {resp.status_code}")
        except Exception as e:
            logger.warning(f"Erro ao sincronizar TikTok Ads ({acc.label}): {e}")
            errors.append(f"{acc.label}: {str(e)}")

    return {
        "status": "ok",
        "synced_accounts": synced_count,
        "total_accounts": len(accounts),
        "errors": errors if errors else None,
        "message": f"{synced_count} conta(s) TikTok sincronizada(s) com sucesso!",
    }


@router.get("/oauth-url")
def get_tiktok_oauth_url(app_id: Optional[str] = Query(None)):
    """Retorna a URL oficial de autorização OAuth do TikTok for Business Developer."""
    client_id = app_id or "sua_app_id_tiktok"
    redirect_uri = "https://seudominio.com/api/tiktok/callback"
    oauth_url = (
        f"https://business-api.tiktok.com/portal/auth"
        f"?app_id={client_id}&state=ninja_state&redirect_uri={redirect_uri}"
    )
    return {
        "oauth_url": oauth_url,
        "instructions": "Cadastre seu app no TikTok for Business Developers (business-api.tiktok.com), configure as permissões de relatórios e cole as credenciais.",
    }

