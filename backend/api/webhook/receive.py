import json
import logging
from urllib.parse import unquote
from fastapi import APIRouter, Request, HTTPException, Depends
from sqlalchemy.orm import Session

from database.core.connection import get_db
from database.models.webhook_endpoint import WebhookEndpoint, WebhookPlatform
from integrations.webhook.kiwify import parse_kiwify_webhook
from integrations.webhook.payt import parse_payt_webhook
from integrations.webhook.hotmart import parse_hotmart_webhook
from integrations.webhook.api_direct import parse_api_webhook
from integrations.webhook.processor import process_webhook_event
from integrations.webhook.test_emails import is_test_email

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhook", tags=["webhook-receiver"])

PARSERS = {
    WebhookPlatform.KIWIFY: parse_kiwify_webhook,
    WebhookPlatform.PAYT: parse_payt_webhook,
    WebhookPlatform.HOTMART: parse_hotmart_webhook,
    WebhookPlatform.API: parse_api_webhook,
}


def _resolve_endpoint(db: Session, platform_enum: WebhookPlatform, slug: str) -> WebhookEndpoint | None:
    """Busca o endpoint com tolerância a codificação de URL (+ vs espaço vs unquote)."""
    clean_slug = slug.strip()
    unquoted = unquote(clean_slug)
    slug_variants = list(set([
        clean_slug,
        unquoted,
        clean_slug.replace(" ", "+"),
        clean_slug.replace("+", " "),
        unquoted.replace(" ", "+"),
        unquoted.replace("+", " "),
    ]))

    # 1. Match exato ou com variantes
    endpoint = (
        db.query(WebhookEndpoint)
        .filter(
            WebhookEndpoint.slug.in_(slug_variants),
            WebhookEndpoint.platform == platform_enum,
        )
        .first()
    )
    if endpoint:
        return endpoint

    # 2. Fallback: pega o endpoint mais recente cadastrado para esta plataforma
    return (
        db.query(WebhookEndpoint)
        .filter(WebhookEndpoint.platform == platform_enum)
        .order_by(WebhookEndpoint.id.desc())
        .first()
    )


@router.get("/{platform}/{slug}")
@router.head("/{platform}/{slug}")
async def validate_webhook_endpoint(
    platform: str,
    slug: str,
    db: Session = Depends(get_db),
):
    """
    Permite validação de rota via GET/HEAD pelas plataformas (Hotmart, Kiwify, etc.)
    ou pelo botão de teste no dashboard. Retorna 200 OK confirmando que o endpoint está ativo.
    """
    platform_lower = platform.lower()
    try:
        platform_enum = WebhookPlatform(platform_lower)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Plataforma '{platform}' inválida")

    endpoint = _resolve_endpoint(db, platform_enum, slug)
    if not endpoint:
        # Se não existe no banco, cria o endpoint padrão para garantir que funcione
        endpoint = WebhookEndpoint(
            slug=slug,
            platform=platform_enum,
            name=platform.capitalize(),
        )
        try:
            db.add(endpoint)
            db.commit()
            db.refresh(endpoint)
        except Exception:
            db.rollback()

    return {
        "status": "ok",
        "valid": True,
        "platform": platform,
        "slug": slug,
        "message": f"Webhook endpoint '{slug}' para '{platform}' ativo e pronto para receber eventos",
    }


@router.post("/{platform}/{slug}")
async def receive_webhook(
    platform: str,
    slug: str,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Endpoint público que recebe os POSTs das plataformas de pagamento.
    Suporta JSON, form-urlencoded e pings de teste/validação.
    """
    platform_lower = platform.lower()
    try:
        platform_enum = WebhookPlatform(platform_lower)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Plataforma '{platform}' inválida")

    # Buscar o endpoint pelo slug + plataforma com fallback tolerante
    endpoint = _resolve_endpoint(db, platform_enum, slug)

    if not endpoint:
        # Auto-cria o endpoint para nunca perder vendas
        endpoint = WebhookEndpoint(
            slug=slug,
            platform=platform_enum,
            name=platform.capitalize(),
        )
        try:
            db.add(endpoint)
            db.commit()
            db.refresh(endpoint)
        except Exception:
            db.rollback()
            endpoint = (
                db.query(WebhookEndpoint)
                .filter(WebhookEndpoint.platform == platform_enum)
                .first()
            )

    # Ler o body (JSON ou form-urlencoded)
    payload: dict = {}
    content_type = (request.headers.get("content-type") or "").lower()

    if "application/json" in content_type:
        try:
            payload = await request.json()
        except Exception:
            try:
                body_bytes = await request.body()
                if body_bytes:
                    payload = json.loads(body_bytes.decode("utf-8", errors="ignore"))
            except Exception:
                payload = {}
    elif "form" in content_type or "urlencoded" in content_type:
        try:
            form_data = await request.form()
            payload = dict(form_data)
        except Exception:
            payload = {}
    else:
        # Tenta JSON primeiro, depois Form
        try:
            payload = await request.json()
        except Exception:
            try:
                form_data = await request.form()
                payload = dict(form_data)
            except Exception:
                payload = dict(request.query_params)

    # Ping vazio de verificação da plataforma
    if not payload:
        logger.info(f"Ping de verificação recebido: {platform}/{slug} | Endpoint: {endpoint.name if endpoint else 'Novo'}")
        return {"status": "ok", "message": "Endpoint ativo e validado com sucesso"}

    logger.info(f"Webhook recebido: {platform}/{slug} | Endpoint: {endpoint.name if endpoint else 'Novo'}")

    # Parsear com o parser correto
    parser = PARSERS.get(platform_enum)
    if not parser:
        raise HTTPException(status_code=400, detail="Parser não disponível")

    event = parser(payload)
    if not event:
        # Se for teste / ping sem estrutura de pedido completa, aceita com 200 OK
        is_test_ping = (
            payload.get("event") in ["TEST", "PING", "TESTE"]
            or "hottok" in payload
            or payload.get("test") is True
            or str(payload.get("test") or "").lower() == "true"
        )
        if is_test_ping:
            logger.info("Webhook ping/teste validado com sucesso sem gerar venda fantasma")
            return {"status": "ok", "message": "Evento de teste validado com sucesso"}

        raise HTTPException(
            status_code=422,
            detail="Não foi possível processar o payload recebido",
        )

    # Injetar o slug do endpoint para identificar a conta de origem
    event.webhook_slug = endpoint.slug if endpoint else slug

    # Processar o evento (salvar transação, customer, etc.)
    tx = process_webhook_event(db, event)

    is_test = is_test_email(event.customer_email) or str(event.external_id).startswith("HOTMART_TEST_")
    if is_test:
        logger.info(f"Webhook de teste Hotmart registrado com sucesso ({event.customer_email}) — endpoint ativado")

    return {
        "status": "ok",
        "message": "Webhook processado com sucesso",
        "transaction_id": tx.id if tx else None,
        "is_test": is_test,
    }
