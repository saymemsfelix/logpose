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
        "title": f"💰 Venda Aprovada: {formatted_amount}",
        "body": f"{flag} {product_name} • {formatted_amount}\n🎨 Criativo: {creative}",
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


def send_recovery_push_notification(db: Session, event: StandardizedWebhookEvent) -> int:
    """
    Dispara notificação de 'Quase Venda' (estilo Nexofy) para recuperação imediata:
    'Essa quase foi 😬 - Venda de R$ 74,33 recusada. Clique para tentar recuperar.'
    """
    subscriptions = db.query(PushSubscription).all()
    if not subscriptions:
        return 0

    amount = float(event.amount) if event.amount is not None else 0.0
    formatted_amount = f"R$ {amount:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")

    # Detecção se é PIX pendente ou Cartão recusado
    from database.models.transaction import TransactionStatus
    if event.status == TransactionStatus.WAITING_PAYMENT:
        title = "Quase lá! PIX Gerado ⌛"
        body = f"PIX de {formatted_amount} gerado. Clique para acompanhar."
        tag = f"ninja-pix-{event.external_id}"
    else:
        title = "Essa quase foi 😬"
        body = f"Venda de {formatted_amount} recusada. Clique para tentar recuperar."
        tag = f"ninja-recusada-{event.external_id}"

    payload = {
        "title": title,
        "body": body,
        "icon": "/icons/pwa-192.png",
        "badge": "/icons/pwa-192.png",
        "tag": tag,
        "renotify": True,
        "requireInteraction": True,
        "vibrate": [300, 100, 300, 100, 400],
        "data": {
            "url": "/recovery",
            "type": "recovery",
            "external_id": event.external_id,
            "amount": amount,
            "customer_name": event.customer_name,
            "customer_email": event.customer_email,
        },
    }

    sent = 0
    for sub in subscriptions:
        if send_web_push(sub, payload, db=db):
            sent += 1

    logger.info(f"🚨 Pop-up de recuperação disparado para {sent} dispositivos: {title}")
    return sent


def get_today_profit_metrics(db: Session) -> dict:
    """Calcula faturamento, gasto de ads e lucro líquido do dia (timezone São Paulo)."""
    from database.core.timezone import today_sp_str
    from database.models.transaction import Transaction, TransactionStatus
    from database.models.daily_ad_spend import DailyAdSpend

    today_str = today_sp_str()
    txs = db.query(Transaction).filter(
        Transaction.status == TransactionStatus.APPROVED,
        Transaction.created_at >= today_str,
        Transaction.created_at <= f"{today_str} 23:59:59",
    ).all()
    today_revenue = sum(float(t.amount or 0.0) for t in txs)
    today_sales = len(txs)

    spends = db.query(DailyAdSpend).filter(
        DailyAdSpend.date == today_str
    ).all()
    today_spend = sum(float(s.spend or 0.0) for s in spends)

    profit = round(today_revenue - today_spend, 2)
    return {
        "revenue": today_revenue,
        "spend": today_spend,
        "profit": profit,
        "sales": today_sales,
    }


def send_daily_profit_push_notification(db: Session, admin_id: int | None = None) -> int:
    """
    Dispara notificação de lucro do dia (estilo Nexofy):
    'Hoje deu bom, patrão 😎 - R$ 230,15 de lucro até agora.'
    """
    metrics = get_today_profit_metrics(db)
    profit = metrics["profit"]
    formatted_profit = f"R$ {abs(profit):,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")

    if profit >= 0:
        title = "Hoje deu bom, patrão 😎"
        body = f"{formatted_profit} de lucro até agora."
    else:
        title = "Atenção aos números! ⚠️"
        body = f"-{formatted_profit} de prejuízo hoje. Verifique seus anúncios."

    payload = {
        "title": title,
        "body": body,
        "icon": "/icons/pwa-192.png",
        "badge": "/icons/pwa-192.png",
        "tag": "ninja-daily-profit",
        "renotify": True,
        "requireInteraction": True,
        "vibrate": [200, 100, 200, 100, 300],
        "data": {
            "url": "/dashboard",
            "type": "daily_profit",
            "profit": profit,
        },
    }

    subscriptions = db.query(PushSubscription).all()
    sent = 0
    for sub in subscriptions:
        if send_web_push(sub, payload, db=db):
            sent += 1

    logger.info(f"📊 Notificação de lucro diário enviada para {sent} dispositivos: {body}")
    return sent


def send_test_push_notification(db: Session, admin_id: int | None = None, test_type: str = "sale") -> int:
    """
    Envia um push de teste imediato para validar o pop-up no celular.
    Tipos suportados:
    - 'sale': 💰 Venda Aprovada
    - 'recovery': 😬 Essa quase foi (Recuperação)
    - 'profit': 😎 Hoje deu bom, patrão (Lucro do dia)
    """
    query = db.query(PushSubscription)
    if admin_id is not None:
        subs = query.filter(PushSubscription.admin_id == admin_id).all()
        if not subs:
            subs = query.all()
    else:
        subs = query.all()

    if not subs:
        return 0

    if test_type == "recovery":
        payload = {
            "title": "Essa quase foi 😬",
            "body": "Venda de R$ 74,33 recusada. Clique para tentar recuperar.",
            "icon": "/icons/pwa-192.png",
            "badge": "/icons/pwa-192.png",
            "tag": "ninja-test-recovery",
            "renotify": True,
            "requireInteraction": True,
            "vibrate": [300, 100, 300, 100, 400],
            "data": {
                "url": "/recovery",
                "test": True,
                "type": "recovery",
            },
        }
    elif test_type == "profit":
        metrics = get_today_profit_metrics(db)
        profit_val = metrics["profit"] if metrics["profit"] > 0 else 230.15
        formatted_profit = f"R$ {profit_val:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
        payload = {
            "title": "Hoje deu bom, patrão 😎",
            "body": f"{formatted_profit} de lucro até agora.",
            "icon": "/icons/pwa-192.png",
            "badge": "/icons/pwa-192.png",
            "tag": "ninja-test-profit",
            "renotify": True,
            "requireInteraction": True,
            "vibrate": [200, 100, 200, 100, 300],
            "data": {
                "url": "/dashboard",
                "test": True,
                "type": "daily_profit",
            },
        }
    else:
        payload = {
            "title": "💰 NINJA TRACKER: Venda Aprovada!",
            "body": "🇧🇷 R$ 97,00 • 120 Diagnosi Visive\n🎨 Criativo: CBO teste criativo",
            "icon": "/icons/pwa-192.png",
            "badge": "/icons/pwa-192.png",
            "tag": "ninja-test-sale",
            "renotify": True,
            "requireInteraction": True,
            "vibrate": [300, 100, 300, 100, 400],
            "data": {
                "url": "/dashboard",
                "test": True,
                "type": "sale",
            },
        }

    sent = 0
    for sub in subs:
        if send_web_push(sub, payload, db=db):
            sent += 1
    return sent

