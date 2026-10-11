"""
Endpoints para edição de Campanhas e Conjuntos de Anúncios no Meta Ads:
- Alteração rápida de Lance / Bid Cap (ex: R$ 40 -> R$ 90)
- Edição completa de Conjunto (nome, orçamento, bid cap, status)
- Edição completa de Campanha (nome, orçamento CBO, status)
- Duplicação de Conjunto com novo lance e anúncios vinculados
- Criação de novo Conjunto em campanha existente
"""
import logging
from typing import Optional, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database.core.connection import get_db
from database.models.facebook_account import FacebookAccount
from api.auth.deps import get_current_user
from integrations.meta_ads.manage import (
    update_bid_amount,
    update_adset_details,
    update_campaign_details,
    duplicate_adset_in_campaign,
    create_new_adset_for_campaign,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/campaigns", tags=["campaigns-edit"])


class EditBidCapRequest(BaseModel):
    account_id: int
    adset_id: str
    bid_amount: float  # valor do lance em reais (ex: 90.0)
    adset_name: str = ""


class EditAdSetRequest(BaseModel):
    account_id: int
    adset_id: str
    name: Optional[str] = None
    daily_budget: Optional[float] = None
    bid_amount: Optional[float] = None
    status: Optional[str] = None  # "ACTIVE" | "PAUSED"


class EditCampaignRequest(BaseModel):
    account_id: int
    campaign_id: str
    name: Optional[str] = None
    daily_budget: Optional[float] = None
    status: Optional[str] = None  # "ACTIVE" | "PAUSED"


class DuplicateAdSetRequest(BaseModel):
    account_id: int
    source_adset_id: str
    new_name: Optional[str] = None
    new_bid_amount: Optional[float] = None
    new_daily_budget: Optional[float] = None
    status: str = "PAUSED"


class CreateAdSetInCampaignRequest(BaseModel):
    account_id: int
    campaign_id: str
    name: str
    bid_strategy: str = "BID_CAP"
    bid_amount: Optional[float] = None
    daily_budget: Optional[float] = None
    pixel_id: str = ""
    targeting: Optional[dict[str, Any]] = None
    copy_ads_from_adset_id: Optional[str] = None
    status: str = "PAUSED"


def _get_account_or_404(db: Session, account_id: int) -> FacebookAccount:
    fb_account = db.query(FacebookAccount).filter(
        FacebookAccount.id == account_id
    ).first()
    if not fb_account:
        raise HTTPException(status_code=404, detail="Conta Facebook não encontrada")
    if not fb_account.access_token:
        raise HTTPException(status_code=400, detail="Conta Facebook sem access_token configurado")
    return fb_account


@router.post("/edit-bid-cap")
async def api_edit_bid_cap(
    payload: EditBidCapRequest,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """
    Atualiza rapidamente o teto de lance (Bid Cap) de um conjunto de anúncios.
    Exemplo: R$ 42,00 -> R$ 90,00.
    """
    fb_account = _get_account_or_404(db, payload.account_id)

    res = await update_bid_amount(
        access_token=fb_account.access_token,
        adset_id=payload.adset_id,
        bid_amount_reais=payload.bid_amount,
    )

    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("error", "Erro ao atualizar lance no Meta Ads"))

    return {
        "status": "ok",
        "adset_id": payload.adset_id,
        "bid_amount": payload.bid_amount,
        "message": f"Bid Cap atualizado para R$ {payload.bid_amount:.2f} com sucesso!",
    }


@router.post("/edit-adset")
async def api_edit_adset(
    payload: EditAdSetRequest,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """
    Atualiza dados de um conjunto de anúncios (nome, orçamento ABO, lance/bid cap, status).
    """
    fb_account = _get_account_or_404(db, payload.account_id)

    res = await update_adset_details(
        access_token=fb_account.access_token,
        adset_id=payload.adset_id,
        name=payload.name,
        daily_budget_reais=payload.daily_budget,
        bid_amount_reais=payload.bid_amount,
        status=payload.status,
    )

    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("error", "Erro ao atualizar conjunto no Meta Ads"))

    return {"status": "ok", "message": "Conjunto atualizado com sucesso no Meta Ads!"}


@router.post("/edit-campaign")
async def api_edit_campaign(
    payload: EditCampaignRequest,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """
    Atualiza dados de uma campanha existente (nome, orçamento CBO, status).
    """
    fb_account = _get_account_or_404(db, payload.account_id)

    res = await update_campaign_details(
        access_token=fb_account.access_token,
        campaign_id=payload.campaign_id,
        name=payload.name,
        daily_budget_reais=payload.daily_budget,
        status=payload.status,
    )

    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("error", "Erro ao atualizar campanha no Meta Ads"))

    return {"status": "ok", "message": "Campanha atualizada com sucesso no Meta Ads!"}


@router.post("/duplicate-adset")
async def api_duplicate_adset(
    payload: DuplicateAdSetRequest,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """
    Duplica um conjunto de anúncios na mesma campanha mantendo anúncios/criativos,
    permitindo novo nome e lance (Bid Cap).
    """
    fb_account = _get_account_or_404(db, payload.account_id)

    res = await duplicate_adset_in_campaign(
        access_token=fb_account.access_token,
        account_id=fb_account.account_id,
        source_adset_id=payload.source_adset_id,
        new_name=payload.new_name,
        new_bid_amount_reais=payload.new_bid_amount,
        new_daily_budget_reais=payload.new_daily_budget,
        status=payload.status,
    )

    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("error", "Erro ao duplicar conjunto no Meta Ads"))

    return {
        "status": "ok",
        "adset_id": res.get("adset_id"),
        "message": "Conjunto duplicado com sucesso no Meta Ads!",
    }


@router.post("/create-adset")
async def api_create_adset_in_campaign(
    payload: CreateAdSetInCampaignRequest,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """
    Cria um novo conjunto de anúncios diretamente dentro de uma campanha existente.
    """
    fb_account = _get_account_or_404(db, payload.account_id)

    res = await create_new_adset_for_campaign(
        access_token=fb_account.access_token,
        account_id=fb_account.account_id,
        campaign_id=payload.campaign_id,
        name=payload.name,
        bid_strategy=payload.bid_strategy,
        bid_amount_reais=payload.bid_amount,
        daily_budget_reais=payload.daily_budget,
        pixel_id=payload.pixel_id,
        targeting=payload.targeting,
        copy_ads_from_adset_id=payload.copy_ads_from_adset_id,
        status=payload.status,
    )

    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("error", "Erro ao criar conjunto no Meta Ads"))

    return {
        "status": "ok",
        "adset_id": res.get("adset_id"),
        "message": "Novo conjunto criado com sucesso no Meta Ads!",
    }
