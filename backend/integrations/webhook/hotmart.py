from typing import Any, Dict, Optional
import uuid
import logging
from integrations.webhook.schemas import StandardizedWebhookEvent
from database.models.transaction import TransactionStatus, PaymentPlatform

logger = logging.getLogger(__name__)

def _map_hotmart_status(event_name: str, purchase_status: str) -> TransactionStatus:
    """
    Mapeia os eventos e status da Hotmart 1.0 e 2.0 para TransactionStatus.
    """
    ev = (event_name or "").upper().strip()
    st = (purchase_status or "").upper().strip()

    if ev in ["PURCHASE_APPROVED", "PURCHASE_COMPLETE"] or st in ["APPROVED", "COMPLETE", "APROVADO", "COMPLETO"]:
        return TransactionStatus.APPROVED
    elif ev in ["PURCHASE_REFUNDED"] or st in ["REFUNDED", "REFUND", "REEMBOLSADO"]:
        return TransactionStatus.REFUNDED
    elif ev in ["PURCHASE_CHARGEBACK", "PURCHASE_PROTEST"] or st in ["CHARGEBACK", "DISPUTE", "CHARGE_BACK"]:
        return TransactionStatus.CHARGEBACK
    elif ev in ["PURCHASE_TRIAL"] or st in ["TRIAL"]:
        return TransactionStatus.TRIAL

    # Abandono de carrinho, boleto/PIX aguardando pagamento, cancelamentos
    return TransactionStatus.PENDING


def parse_hotmart_webhook(payload: Dict[str, Any]) -> Optional[StandardizedWebhookEvent]:
    """
    Parsea o payload do Webhook da Hotmart (formato 2.0 / 1.0 Postback)
    e retorna no formato StandardizedWebhookEvent do SFY.
    """
    try:
        event_name = str(payload.get("event") or "").strip()
        data = payload.get("data")
        if not isinstance(data, dict):
            data = payload

        purchase = data.get("purchase")
        if not isinstance(purchase, dict):
            purchase = {}

        buyer = data.get("buyer")
        if not isinstance(buyer, dict):
            buyer = {}

        product = data.get("product")
        if not isinstance(product, dict):
            product = {}

        tracking = purchase.get("tracking") or data.get("tracking")
        if not isinstance(tracking, dict):
            tracking = {}

        # 1. Status
        purchase_status = (
            purchase.get("status")
            or data.get("status")
            or payload.get("status")
            or ""
        )
        status = _map_hotmart_status(event_name, str(purchase_status))

        # 2. Identificador único da transação
        external_id = (
            purchase.get("transaction")
            or payload.get("id")
            or data.get("transaction")
            or payload.get("transaction")
            or payload.get("trans")
            or payload.get("transaction_id")
            or payload.get("order_id")
            or ""
        )

        # Se for teste / ping da Hotmart sem ID de transação real
        is_test = (
            event_name.upper() in ["TEST", "PING", "TESTE"]
            or payload.get("test") is True
            or str(payload.get("test") or "").lower() == "true"
            or "hottok" in payload
            or not external_id
        )

        if not external_id:
            if is_test:
                external_id = f"HOTMART_TEST_{uuid.uuid4().hex[:10]}"
            else:
                logger.warning("Webhook da Hotmart recebido sem transaction_id")
                return None

        # 3. Valor monetário (amount = comissão do produtor ou preço da compra)
        amount = 0.0
        commissions = data.get("commissions") or payload.get("commissions") or []
        if isinstance(commissions, list):
            for comm in commissions:
                if isinstance(comm, dict) and str(comm.get("source", "")).upper() in ["PRODUCER", "COPRODUCER"]:
                    try:
                        amount = float(comm.get("value") or 0.0)
                        break
                    except Exception:
                        pass

        price_obj = purchase.get("price") or data.get("price") or payload.get("price") or {}
        price_val = 0.0
        if isinstance(price_obj, dict):
            try:
                price_val = float(price_obj.get("value") or 0.0)
            except Exception:
                price_val = 0.0
        elif isinstance(price_obj, (int, float, str)):
            try:
                price_val = float(str(price_obj).replace(",", "."))
            except Exception:
                price_val = 0.0

        if amount == 0.0:
            if price_val > 0.0:
                amount = price_val
            elif "cms_vendor" in payload:
                try:
                    amount = float(str(payload["cms_vendor"]).replace(",", "."))
                except Exception:
                    pass
            elif "recorrencia_valor" in payload:
                try:
                    amount = float(str(payload["recorrencia_valor"]).replace(",", "."))
                except Exception:
                    pass

        # 4. Dados do Comprador
        email = str(
            buyer.get("email")
            or data.get("email")
            or payload.get("email")
            or "cliente@hotmart.com"
        ).strip()

        name = (
            buyer.get("name")
            or data.get("name")
            or payload.get("name")
            or payload.get("first_name")
            or "Cliente Hotmart"
        )

        phone = (
            buyer.get("checkout_phone")
            or buyer.get("phone")
            or data.get("phone")
            or payload.get("phone_number")
            or payload.get("phone")
            or None
        )

        cpf = None
        documents = buyer.get("documents") or data.get("documents") or []
        if isinstance(documents, list):
            for doc in documents:
                if isinstance(doc, dict) and str(doc.get("type", "")).upper() in ["CPF", "CNPJ"]:
                    cpf = doc.get("value")
                    break
        if not cpf:
            cpf = buyer.get("cpf") or data.get("doc") or payload.get("doc") or payload.get("cpf")

        # 5. Dados do Produto
        prod_id = str(
            product.get("id")
            or product.get("ucode")
            or data.get("prod")
            or payload.get("prod")
            or "hotmart_prod"
        )
        prod_name = str(
            product.get("name")
            or data.get("prod_name")
            or payload.get("prod_name")
            or "Produto Hotmart"
        )

        # 6. Rastreamento e UTMs
        src = tracking.get("source") or data.get("src") or payload.get("src") or payload.get("source")
        sck = tracking.get("source_sck") or data.get("sck") or payload.get("sck")

        utm_source = tracking.get("utm_source") or data.get("utm_source") or payload.get("utm_source") or src
        utm_medium = tracking.get("utm_medium") or data.get("utm_medium") or payload.get("utm_medium")
        utm_campaign = tracking.get("utm_campaign") or data.get("utm_campaign") or payload.get("utm_campaign")
        utm_content = tracking.get("utm_content") or data.get("utm_content") or payload.get("utm_content")
        utm_term = tracking.get("utm_term") or data.get("utm_term") or payload.get("utm_term")

        # Se vier no padrão concatenado no SCK (ex: Campanha|Conjunto|Criativo)
        if sck and "|" in sck:
            parts = sck.split("|")
            if not utm_campaign and len(parts) >= 1:
                utm_campaign = parts[0]
            if not utm_content and len(parts) >= 2:
                utm_content = parts[1]

        # Método de pagamento
        payment_info = purchase.get("payment") or data.get("payment") or {}
        payment_method = str(
            (payment_info.get("type") if isinstance(payment_info, dict) else None)
            or (payment_info.get("method") if isinstance(payment_info, dict) else None)
            or payload.get("payment_type")
            or payload.get("payment_mode")
            or ""
        ).lower()

        return StandardizedWebhookEvent(
            external_id=str(external_id),
            platform=PaymentPlatform.HOTMART,
            status=status,
            amount=amount,
            original_status=event_name or str(purchase_status),
            payment_method=payment_method,
            payment_status=str(purchase_status),
            product_external_id=prod_id,
            product_name=prod_name,
            product_price=price_val if price_val > 0 else amount,
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
            checkout_url=data.get("checkout_url") or payload.get("checkout_url"),
            order_bumps=[]
        )

    except Exception as e:
        logger.error(f"Erro ao parsear webhook da Hotmart: {e}", exc_info=True)
        return None
