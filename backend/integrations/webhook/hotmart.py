from typing import Any, Dict, Optional
import logging
from integrations.webhook.schemas import StandardizedWebhookEvent
from database.models.transaction import TransactionStatus, PaymentPlatform

logger = logging.getLogger(__name__)

def _map_hotmart_status(event_name: str, purchase_status: str) -> TransactionStatus:
    """
    Mapeia os eventos e status da Hotmart 2.0 para TransactionStatus.
    """
    ev = (event_name or "").upper()
    st = (purchase_status or "").upper()

    if ev in ["PURCHASE_APPROVED", "PURCHASE_COMPLETE"] or st in ["APPROVED", "COMPLETE"]:
        return TransactionStatus.APPROVED
    elif ev == "PURCHASE_REFUNDED" or st in ["REFUNDED", "REFUND"]:
        return TransactionStatus.REFUNDED
    elif ev in ["PURCHASE_CHARGEBACK", "PURCHASE_PROTEST"] or st in ["CHARGEBACK", "DISPUTE"]:
        return TransactionStatus.CHARGEBACK
    elif ev == "PURCHASE_TRIAL" or st == "TRIAL":
        return TransactionStatus.TRIAL

    # Abandono de carrinho, boleto/PIX aguardando pagamento, cancelamentos
    return TransactionStatus.PENDING


def parse_hotmart_webhook(payload: Dict[str, Any]) -> Optional[StandardizedWebhookEvent]:
    """
    Parsea o payload do Webhook da Hotmart (formato 2.0 / Postback)
    e retorna no formato StandardizedWebhookEvent do Log Pose.
    """
    try:
        event_name = payload.get("event") or ""
        data = payload.get("data") or payload

        purchase = data.get("purchase") or {}
        buyer = data.get("buyer") or {}
        product = data.get("product") or {}
        tracking = purchase.get("tracking") or data.get("tracking") or {}

        # 1. Status
        purchase_status = purchase.get("status") or data.get("status") or ""
        status = _map_hotmart_status(event_name, purchase_status)

        # 2. Identificador único da transação
        external_id = (
            purchase.get("transaction")
            or payload.get("id")
            or data.get("transaction")
            or ""
        )
        if not external_id:
            logger.warning("Webhook da Hotmart recebido sem transaction_id")
            return None

        # 3. Valor monetário (amount = comissão do produtor ou preço da compra)
        amount = 0.0
        commissions = data.get("commissions") or []
        for comm in commissions:
            if str(comm.get("source", "")).upper() in ["PRODUCER", "COPRODUCER"]:
                amount = float(comm.get("value") or 0.0)
                break

        # Se não achou na comissão, pega o valor total da compra
        price_obj = purchase.get("price") or {}
        price_val = float(price_obj.get("value") or 0.0)
        if amount == 0.0:
            amount = price_val

        # 4. Dados do Comprador
        email = (buyer.get("email") or "").strip()
        name = buyer.get("name") or None
        phone = buyer.get("checkout_phone") or buyer.get("phone") or None

        cpf = None
        documents = buyer.get("documents") or []
        if isinstance(documents, list):
            for doc in documents:
                if str(doc.get("type", "")).upper() in ["CPF", "CNPJ"]:
                    cpf = doc.get("value")
                    break

        # 5. Dados do Produto
        prod_id = str(product.get("id") or product.get("ucode") or "hotmart_prod")
        prod_name = product.get("name") or "Produto Hotmart"

        # 6. Rastreamento e UTMs
        src = tracking.get("source") or data.get("src") or payload.get("src")
        sck = tracking.get("source_sck") or data.get("sck") or payload.get("sck")

        utm_source = tracking.get("utm_source") or data.get("utm_source") or payload.get("utm_source") or src
        utm_medium = tracking.get("utm_medium") or data.get("utm_medium") or payload.get("utm_medium")
        utm_campaign = tracking.get("utm_campaign") or data.get("utm_campaign") or payload.get("utm_campaign")
        utm_content = tracking.get("utm_content") or data.get("utm_content") or payload.get("utm_content")
        utm_term = tracking.get("utm_term") or data.get("utm_term") or payload.get("utm_term")

        # Se vier no padrão concatenado no SCK (ex: Campanha|Conjunto|Criativo)
        if not utm_campaign and sck and "|" in sck:
            parts = sck.split("|")
            if len(parts) >= 1:
                utm_campaign = parts[0]
            if len(parts) >= 2:
                utm_content = parts[1]

        # Método de pagamento
        payment_info = purchase.get("payment") or {}
        payment_method = str(payment_info.get("type") or payment_info.get("method") or "").lower()

        return StandardizedWebhookEvent(
            external_id=str(external_id),
            platform=PaymentPlatform.HOTMART,
            status=status,
            amount=amount,
            original_status=event_name or purchase_status,
            payment_method=payment_method,
            payment_status=purchase_status,
            product_external_id=prod_id,
            product_name=prod_name,
            product_price=price_val,
            customer_email=email,
            customer_name=name,
            customer_cpf=cpf,
            customer_phone=phone,
            utm_source=utm_source,
            utm_medium=utm_medium,
            utm_campaign=utm_campaign,
            utm_content=utm_content,
            utm_term=utm_term,
            src=src,
            checkout_url=data.get("checkout_url"),
            order_bumps=[]
        )

    except Exception as e:
        logger.error(f"Erro ao parsear webhook da Hotmart: {e}", exc_info=True)
        return None
