import logging
from typing import Optional
from fastapi import APIRouter, Depends, Request, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database.core.connection import get_db
from database.models.push_subscription import PushSubscription
from services.push_service import (
    get_vapid_public_key,
    send_test_push_notification,
    send_daily_profit_push_notification,
)
from api.auth.deps import get_optional_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/notifications", tags=["notifications"])


class SubscriptionKeys(BaseModel):
    p256dh: str
    auth: str


class PushSubscriptionRequest(BaseModel):
    endpoint: str
    keys: SubscriptionKeys
    expirationTime: Optional[float] = None
    user_agent: Optional[str] = None


class UnsubscribeRequest(BaseModel):
    endpoint: str


@router.get("/vapid-key")
def get_public_vapid_key():
    """Retorna a chave pública VAPID para registro do Service Worker no celular."""
    return {"public_key": get_vapid_public_key()}


@router.post("/subscribe")
def subscribe_device(
    payload: PushSubscriptionRequest,
    request: Request,
    db: Session = Depends(get_db),
    user=Depends(get_optional_current_user),
):
    """
    Registra um dispositivo (celular Android, iOS PWA ou Desktop)
    para receber pop-ups nativos quando sair uma venda.
    """
    ua = payload.user_agent or request.headers.get("user-agent", "Unknown Device")
    admin_id = user.id if user else None

    # Verifica se já existe esse endpoint
    existing = (
        db.query(PushSubscription)
        .filter(PushSubscription.endpoint == payload.endpoint)
        .first()
    )

    if existing:
        existing.p256dh = payload.keys.p256dh
        existing.auth = payload.keys.auth
        existing.user_agent = ua
        if admin_id:
            existing.admin_id = admin_id
        db.commit()
        db.refresh(existing)
        logger.info(f"Dispositivo atualizado para Web Push: id={existing.id}")
        return {"status": "updated", "id": existing.id}

    new_sub = PushSubscription(
        admin_id=admin_id,
        endpoint=payload.endpoint,
        p256dh=payload.keys.p256dh,
        auth=payload.keys.auth,
        user_agent=ua,
    )
    db.add(new_sub)
    db.commit()
    db.refresh(new_sub)

    logger.info(f"🎉 Novo dispositivo celular registrado para Web Push! id={new_sub.id}")
    return {"status": "subscribed", "id": new_sub.id}


@router.post("/unsubscribe")
def unsubscribe_device(
    payload: UnsubscribeRequest,
    db: Session = Depends(get_db),
):
    """Remove um dispositivo da lista de notificações."""
    sub = (
        db.query(PushSubscription)
        .filter(PushSubscription.endpoint == payload.endpoint)
        .first()
    )
    if sub:
        db.delete(sub)
        db.commit()
        return {"status": "unsubscribed"}
    return {"status": "not_found"}


@router.get("/status")
def get_notification_status(
    db: Session = Depends(get_db),
    user=Depends(get_optional_current_user),
):
    """Retorna a contagem de dispositivos cadastrados."""
    count = db.query(PushSubscription).count()
    user_count = 0
    if user:
        user_count = (
            db.query(PushSubscription)
            .filter(PushSubscription.admin_id == user.id)
            .count()
        )
    return {
        "total_devices": count,
        "user_devices": user_count,
        "is_active": count > 0,
    }


class TestPushRequest(BaseModel):
    test_type: Optional[str] = "sale"  # "sale", "recovery", "profit"


@router.post("/test")
def trigger_test_notification(
    payload: Optional[TestPushRequest] = None,
    db: Session = Depends(get_db),
    user=Depends(get_optional_current_user),
):
    """
    Dispara um pop-up de teste imediato para o celular/navegador cadastrado.
    Suporta: 'sale' (Venda), 'recovery' (Essa quase foi), 'profit' (Hoje deu bom, patrão).
    """
    admin_id = user.id if user else None
    test_type = payload.test_type if payload and payload.test_type else "sale"
    sent = send_test_push_notification(db, admin_id=admin_id, test_type=test_type)
    if sent == 0:
        return {
            "status": "warning",
            "message": "Nenhum dispositivo cadastrado no momento. Abra o Ninja Tracker no celular e clique em 'Permitir Notificações'.",
            "sent_count": 0,
        }

    label_map = {
        "recovery": "Essa quase foi 😬 (Recuperação)",
        "profit": "Hoje deu bom, patrão 😎 (Lucro do dia)",
        "sale": "Venda Aprovada 💰",
    }
    label = label_map.get(test_type, "Notificação")
    return {
        "status": "success",
        "message": f"🎉 Pop-up '{label}' enviado para {sent} dispositivo(s)! Verifique a tela do seu celular.",
        "sent_count": sent,
    }


@router.post("/send-profit-summary")
def trigger_daily_profit_summary(
    db: Session = Depends(get_db),
    user=Depends(get_optional_current_user),
):
    """Dispara o resumo de lucro diário oficial para todos os celulares."""
    admin_id = user.id if user else None
    sent = send_daily_profit_push_notification(db, admin_id=admin_id)
    return {
        "status": "success",
        "message": f"Resumo de lucro diário enviado para {sent} dispositivo(s).",
        "sent_count": sent,
    }
