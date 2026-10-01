from typing import Any, Dict, Optional
import logging
from integrations.webhook.schemas import StandardizedWebhookEvent
from database.models.transaction import TransactionStatus, PaymentPlatform

logger = logging.getLogger(__name__)

def _map_status(webhook_status: str) -> TransactionStatus:
    # Kiwify order_status or status
    status_map = {
        "paid": TransactionStatus.APPROVED,
        "refunded": TransactionStatus.REFUNDED,
        "chargedback": TransactionStatus.CHARGEBACK,
        "chargeback": TransactionStatus.CHARGEBACK,
        "waiting_payment": TransactionStatus.PENDING,
        "abandoned": TransactionStatus.PENDING,
        "refused": TransactionStatus.PENDING,
        "canceled": TransactionStatus.PENDING,
        "trial": TransactionStatus.TRIAL,
    }
    return status_map.get(webhook_status.lower(), TransactionStatus.PENDING)

def parse_kiwify_webhook(payload: Dict[str, Any]) -> Optional[StandardizedWebhookEvent]:
    """
    Parsea o payload bruto da Kiwify e retorna um formato padronizado.
    Lida com payloads diferentes (ex: order_approved vs abandono).
    """
    try:
        # Existe diferença brutal estrutural entre abandono e pago/recusado.
        
        # Abandono
        if payload.get("status") == "abandoned":
            status = _map_status("abandoned")
            return StandardizedWebhookEvent(
                external_id=payload.get("id", ""),
                platform=PaymentPlatform.KIWIFY,
                status=status,
                amount=0.0,  # abandono as vezes nao traz price total
                original_status="abandoned",
                payment_method="",
                payment_status="abandoned",
                product_external_id=payload.get("product_id", ""),
                product_name=payload.get("product_name", ""),
                customer_email=payload.get("email", ""),
                customer_name=payload.get("name", ""),
                customer_cpf=payload.get("cpf", ""),
                customer_phone=payload.get("phone", ""),
                utm_source=None,
                utm_medium=None,
                utm_campaign=None,
                utm_content=None,
                src=None,
                checkout_url=f"https://pay.kiwify.com.br/{payload.get('checkout_link')}" if payload.get("checkout_link") else None,
                order_bumps=[]
            )

        # Paid, Refunded, Chargeback, Waiting_payment, etc..
        order_status = payload.get("order_status", "pending")
        status = _map_status(order_status)
        
        # 1. Valor que o produtor recebe (my_commission) do produto principal
        commissions = payload.get("Commissions", {})
        if not isinstance(commissions, dict):
            commissions = {}

        amount_cents = commissions.get("my_commission")
        if amount_cents is None:
            # Fallback se vier direto na raiz
            amount_cents = payload.get("my_commission") or 0.0
        amount = float(amount_cents) / 100.0 if float(amount_cents) > 0 else 0.0

        # 2. Somar comissões/valores de Order Bumps se houver no payload
        raw_order_bumps = payload.get("order_bumps") or commissions.get("order_bumps") or []
        order_bumps = []
        if isinstance(raw_order_bumps, list):
            for ob in raw_order_bumps:
                if not isinstance(ob, dict):
                    continue
                order_bumps.append(ob)
                # Verifica se o order bump traz comissão explícita
                ob_comm = ob.get("my_commission")
                if ob_comm is None:
                    ob_comm = ob.get("commission")
                
                if ob_comm is not None:
                    try:
                        val = float(ob_comm)
                        # Se veio em centavos (> 200) ou reais
                        amount += (val / 100.0) if val > 200 else val
                    except (ValueError, TypeError):
                        pass
                else:
                    # Fallback por preço se não vier comissão explícita
                    ob_price = ob.get("product_price") or ob.get("price") or ob.get("amount")
                    if ob_price is not None:
                        try:
                            val = float(ob_price)
                            price_real = (val / 100.0) if val > 200 else val
                            # Aplica taxa média líquida da Kiwify (~8.99% + R$ 2,49)
                            estimated_net = max(0.0, round(price_real * 0.91 - 2.49, 2))
                            amount += estimated_net
                        except (ValueError, TypeError):
                            pass

        # 3. Caso o payload traga um valor líquido total explícito na raiz (ex: net_amount / total_net)
        if payload.get("net_amount"):
            try:
                net = float(payload.get("net_amount"))
                if net > 0:
                    amount = (net / 100.0) if net > 200 else net
            except (ValueError, TypeError):
                pass

        product_info = payload.get("Product", {})
        if not isinstance(product_info, dict):
            product_info = {}
            
        customer_info = payload.get("Customer", {})
        if not isinstance(customer_info, dict):
            customer_info = {}

        # 4. Rastreamento de UTMs: Kiwify envia em TrackingParameters, mas com tolerância a variações
        tracking = payload.get("TrackingParameters") or payload.get("tracking_parameters") or payload.get("tracking") or {}
        if not isinstance(tracking, dict):
            tracking = {}

        utm_source = tracking.get("utm_source") or payload.get("utm_source") or tracking.get("src") or payload.get("src")
        utm_medium = tracking.get("utm_medium") or payload.get("utm_medium")
        utm_campaign = tracking.get("utm_campaign") or payload.get("utm_campaign")
        utm_content = tracking.get("utm_content") or payload.get("utm_content")
        utm_term = tracking.get("utm_term") or payload.get("utm_term")
        src = tracking.get("src") or tracking.get("sck") or payload.get("src") or payload.get("sck")

        # Preço real do produto (em centavos, dentro de Commissions.product_base_price)
        product_price_cents = commissions.get("product_base_price", 0)
        product_price = float(product_price_cents) / 100.0 if product_price_cents else 0.0

        return StandardizedWebhookEvent(
            external_id=str(payload.get("order_id", "") or payload.get("id", "")),
            platform=PaymentPlatform.KIWIFY,
            status=status,
            amount=round(amount, 2),
            original_status=order_status,
            payment_method=payload.get("payment_method", ""),
            payment_status=order_status,
            product_external_id=product_info.get("product_id", ""),
            product_name=product_info.get("product_name", ""),
            product_price=product_price,
            customer_email=customer_info.get("email", ""),
            customer_name=customer_info.get("full_name", ""),
            customer_cpf=customer_info.get("CPF", ""),
            customer_phone=customer_info.get("mobile", ""),
            utm_source=utm_source,
            utm_medium=utm_medium,
            utm_campaign=utm_campaign,
            utm_content=utm_content,
            utm_term=utm_term,
            src=src,
            checkout_url=f"https://pay.kiwify.com.br/{payload.get('checkout_link')}" if payload.get("checkout_link") else None,
            order_bumps=order_bumps
        )

    except Exception as e:
        logger.error(f"Erro ao parsear webhook da Kiwify: {e}", exc_info=True)
        return None
