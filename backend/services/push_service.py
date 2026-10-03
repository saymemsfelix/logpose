import os
import json
import logging
from typing import Any
from sqlalchemy.orm import Session
from pywebpush import webpush, WebPushException
from py_vapid import Vapid

from database.models.push_subscription import PushSubscription
from integrations.webhook.schemas import StandardizedWebhookEvent

logger = logging.getLogger(__name__)

# Chaves VAPID permanentes para Web Push (PWA / Mobile Chrome / Android / iOS)
DEFAULT_VAPID_PUBLIC_KEY = os.getenv(
    "VAPID_PUBLIC_KEY",
    "BKWyX9ClOrUuXmK4Fsf3DM2PN6GugRlUe_wocijExV4KLeGMMpPEpmiXjM012EC8LHbv-IN59icl-lQxrATrUNU",
)

DEFAULT_VAPID_PRIVATE_KEY_PEM = os.getenv(
    "VAPID_PRIVATE_KEY",
    """-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgBE7ST3BNooTbbKz7
uUK+xzB+ljPQuAwvtpPSDJHMuV2hRANCAASlsl/QpTq1Ll5iuBbH9wzNjzehroEZ
VHv8KHIoxMVeCi3hjDKTxKZol4zNNdhAvCx27/iDefYnJfpUMawE61DV
-----END PRIVATE KEY-----""",
)

VAPID_CLAIMS = {
    "sub": os.getenv("VAPID_CLAIM_EMAIL", "mailto:contato@ninjastracker.com")
}


def get_vapid_public_key() -> str:
    """Retorna a chave pública VAPID para o frontend registrar o Service Worker Push."""
    return DEFAULT_VAPID_PUBLIC_KEY


def _get_vapid_instance() -> Vapid:
    """Gera a instância Vapid a partir do PEM da chave privada."""
    pem_bytes = DEFAULT_VAPID_PRIVATE_KEY_PEM.strip().encode("utf-8")
    return Vapid.from_pem(pem_bytes)


def send_web_push(sub: PushSubscription, payload: dict, db: Session | None = None) -> bool:
    """
    Envia uma notificação Web Push direta para o dispositivo registrado (celular/desktop).
    Se o token estiver expirado (410 ou 404), remove do banco de dados automaticamente.
    """
    try:
        vapid_inst = _get_vapid_instance()
        subscription_info = {
            "endpoint": sub.endpoint,
            "keys": {
                "p256dh": sub.p256dh,
                "auth": sub.auth,
            },
        }

        webpush(
            subscription_info=subscription_info,
            data=json.dumps(payload),
            vapid_private_key=vapid_inst,
            vapid_claims=VAPID_CLAIMS,
            ttl=86400,  # 24 horas no buffer do FCM se o celular estiver desligado
        )
        logger.info(f"✅ Web Push entregue com sucesso para o dispositivo id={sub.id}")
        return True
    except WebPushException as ex:
        logger.warning(f"Aviso Web Push para o dispositivo {sub.id}: {ex}")
        # Código 410 (Gone) ou 404 (Not Found) = usuário desinstalou ou limpou dados do navegador
        if ex.response is not None and ex.response.status_code in (404, 410):
            if db:
                try:
                    logger.info(f"Removendo inscrição expirada id={sub.id}")
                    db.delete(sub)
                    db.commit()
                except Exception as del_err:
                    logger.error(f"Erro ao deletar subscription expirada: {del_err}")
        return False
    except Exception as e:
        logger.error(f"Erro inesperado no envio de Web Push para id={sub.id}: {e}")
        return False


def send_sale_push_notification(db: Session, event: StandardizedWebhookEvent) -> int:
    """
    Dispara o pop-up nativo de Venda Aprovada (estilo Nexofy / Hotmart) para todos
    os celulares e computadores conectados ao Ninja Tracker.
    """
    subscriptions = db.query(PushSubscription).all()
    if not subscriptions:
        logger.info("Nenhum dispositivo cadastrado para Web Push no momento.")
        return 0

    # 1. Formatação de Moeda
    amount = float(event.amount) if event.amount is not None else 0.0
    formatted_amount = f"R$ {amount:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")

    # 2. Bandeira do País
    country = getattr(event, "customer_country", "") or getattr(event, "country", "") or "BR"
    flags = {
        "IT": "🇮🇹",
        "CH": "🇨🇭",
        "ES": "🇪🇸",
        "MX": "🇲🇽",
        "US": "🇺🇸",
        "PT": "🇵🇹",
        "BR": "🇧🇷",
    }
    flag = flags.get(country.upper(), "🌍")

    # 3. Criativo e Produto
    creative = event.utm_content or event.utm_campaign or "Anúncio Direto"
    product_name = event.product_name or "Produto Digital"

    # 4. Monta o Payload do Pop-up Nativo do Celular
    payload = {
        "title": f"💰 NINJA TRACKER: Venda Aprovada!",
        "body": f"{flag} {formatted_amount} • {product_name}\n🎨 Criativo: {creative}",
        "icon": "/icons/pwa-192.png",
        "badge": "/icons/pwa-192.png",
        "tag": f"ninja-sale-{event.external_id}",
        "renotify": True,
        "requireInteraction": True,
        "vibrate": [300, 100, 300, 100, 400],
        "data": {
            "url": "/dashboard",
            "sale_id": event.external_id,
            "amount": amount,
        },
    }

    sent_count = 0
    for sub in subscriptions:
        if send_web_push(sub, payload, db=db):
            sent_count += 1

    logger.info(f"🚀 Pop-up de venda enviado para {sent_count}/{len(subscriptions)} dispositivos!")
    return sent_count


def send_test_push_notification(db: Session, admin_id: int | None = None) -> int:
    """Envia um push de teste imediato para validar o pop-up no celular."""
    query = db.query(PushSubscription)
    if admin_id is not None:
        # Se especificado, prioriza os dispositivos do admin logado
        subs = query.filter(PushSubscription.admin_id == admin_id).all()
        if not subs:
            subs = query.all()
    else:
        subs = query.all()

    if not subs:
        return 0

    payload = {
        "title": "🎯 NINJA TRACKER: Pop-up Ativo!",
        "body": "💰 Venda Aprovada R$ 97,00 • Teste Ninja Tracker\n🎨 Criativo: CBO Escala • Alertas no celular funcionando 100%!",
        "icon": "/icons/pwa-192.png",
        "badge": "/icons/pwa-192.png",
        "tag": "ninja-test-popup",
        "renotify": True,
        "requireInteraction": True,
        "vibrate": [300, 100, 300, 100, 400],
        "data": {
            "url": "/dashboard",
            "test": True,
        },
    }

    sent = 0
    for sub in subs:
        if send_web_push(sub, payload, db=db):
            sent += 1
    return sent
