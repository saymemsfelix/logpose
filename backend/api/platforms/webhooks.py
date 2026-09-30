import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime

from database.core.connection import get_db
from database.models.webhook_endpoint import WebhookEndpoint, WebhookPlatform
from database.models.transaction import Transaction, TransactionStatus, PaymentPlatform
from integrations.webhook.schemas import StandardizedWebhookEvent
from integrations.webhook.processor import process_webhook_event
from api.auth.deps import get_current_user

router = APIRouter(prefix="/platforms", tags=["platforms"])


class WebhookCreate(BaseModel):
    platform: str
    name: str


class WebhookResponse(BaseModel):
    id: int
    slug: str
    platform: str
    name: str
    created_at: datetime | None = None
    has_events: bool = False
    events_count: int = 0

    class Config:
        from_attributes = True


class SimulateWebhookRequest(BaseModel):
    platform: str = "hotmart"
    slug: str
    amount: float = 97.00
    product_name: str = "Produto Teste Hotmart"


@router.get("/webhooks", response_model=list[WebhookResponse])
def list_webhooks(
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    endpoints = db.query(WebhookEndpoint).order_by(WebhookEndpoint.id.desc()).all()

    # Garante que a integração da Hotmart esteja sempre pré-configurada e visível
    if not any(ep.platform == WebhookPlatform.HOTMART for ep in endpoints):
        hotmart_ep = WebhookEndpoint(
            slug="uq_GVXf_vUiq9m0wAyUeb4SND0EjmQl8",
            platform=WebhookPlatform.HOTMART,
            name="Hotmart",
        )
        db.add(hotmart_ep)
        try:
            db.commit()
            db.refresh(hotmart_ep)
            endpoints.insert(0, hotmart_ep)
        except Exception:
            db.rollback()
            endpoints = db.query(WebhookEndpoint).order_by(WebhookEndpoint.id.desc()).all()

    # Mapear contagem de transações por slug e plataforma
    tx_counts: dict[str, int] = {}
    for tx in db.query(Transaction.webhook_slug, Transaction.platform).all():
        if tx.webhook_slug:
            tx_counts[tx.webhook_slug] = tx_counts.get(tx.webhook_slug, 0) + 1
        if tx.platform:
            p_val = tx.platform.value if hasattr(tx.platform, "value") else str(tx.platform)
            tx_counts[f"plat_{p_val}"] = tx_counts.get(f"plat_{p_val}", 0) + 1

    return [
        WebhookResponse(
            id=ep.id,
            slug=ep.slug,
            platform=ep.platform.value,
            name=ep.name,
            created_at=ep.created_at,
            has_events=bool(tx_counts.get(ep.slug, 0) > 0 or tx_counts.get(f"plat_{ep.platform.value}", 0) > 0),
            events_count=tx_counts.get(ep.slug, 0) or tx_counts.get(f"plat_{ep.platform.value}", 0),
        )
        for ep in endpoints
    ]


@router.post("/webhooks", response_model=WebhookResponse, status_code=201)
def create_webhook(
    payload: WebhookCreate,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    platform_value = payload.platform.lower()
    if platform_value not in [p.value for p in WebhookPlatform]:
        raise HTTPException(status_code=400, detail="Plataforma inválida")

    slug = uuid.uuid4().hex[:8]

    endpoint = WebhookEndpoint(
        slug=slug,
        platform=WebhookPlatform(platform_value),
        name=payload.name,
    )
    db.add(endpoint)
    db.commit()
    db.refresh(endpoint)

    return WebhookResponse(
        id=endpoint.id,
        slug=endpoint.slug,
        platform=endpoint.platform.value,
        name=endpoint.name,
        created_at=endpoint.created_at,
        has_events=False,
        events_count=0,
    )


@router.post("/webhooks/simulate-test")
def simulate_test_event(
    payload: SimulateWebhookRequest,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """
    Simula uma venda real de teste da plataforma (ex: Hotmart) para validar
    end-to-end que o webhook, as transações e o dashboard estão recebendo e calculando dados.
    """
    platform_lower = payload.platform.lower()
    try:
        platform_enum = PaymentPlatform(platform_lower)
    except ValueError:
        platform_enum = PaymentPlatform.HOTMART

    test_tx_id = f"HP_SIM_{uuid.uuid4().hex[:8].upper()}"

    simulated_event = StandardizedWebhookEvent(
        external_id=test_tx_id,
        platform=platform_enum,
        status=TransactionStatus.APPROVED,
        amount=payload.amount,
        original_status="PURCHASE_APPROVED",
        payment_method="pix",
        payment_status="APPROVED",
        product_external_id="prod_hotmart_test",
        product_name=payload.product_name,
        product_price=payload.amount,
        customer_email="comprador.teste@sfy.com",
        customer_name="Comprador Teste SFY",
        customer_cpf="12345678900",
        customer_phone="5511999998888",
        utm_source="facebook",
        utm_medium="cpc",
        utm_campaign="Campanha Teste | 123456",
        utm_content="Criativo 01 | 789101",
        utm_term="aberto",
        src="fb",
        webhook_slug=payload.slug,
        checkout_url="https://pay.hotmart.com/teste",
        order_bumps=[],
    )

    tx = process_webhook_event(db, simulated_event)

    return {
        "status": "ok",
        "message": f"Venda teste de R$ {payload.amount:.2f} processada com sucesso!",
        "transaction_id": tx.id,
        "external_id": test_tx_id,
    }


@router.delete("/webhooks/{webhook_id}", status_code=204)
def delete_webhook(
    webhook_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    endpoint = db.query(WebhookEndpoint).filter(WebhookEndpoint.id == webhook_id).first()
    if not endpoint:
        raise HTTPException(status_code=404, detail="Webhook não encontrado")
    db.delete(endpoint)
    db.commit()
