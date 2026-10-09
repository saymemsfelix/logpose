import asyncio
import json
import logging
from typing import Optional
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

COUNTRY_FLAG_MAP = {
    "IT": "🇮🇹", "CH": "🇨🇭", "PT": "🇵🇹", "ES": "🇪🇸", "US": "🇺🇸",
    "GB": "🇬🇧", "FR": "🇫🇷", "DE": "🇩🇪", "MX": "🇲🇽", "CO": "🇨🇴",
    "AR": "🇦🇷", "CL": "🇨🇱", "PE": "🇵🇪", "UY": "🇺🇾", "EC": "🇪🇨",
    "BO": "🇧🇴", "PY": "🇵🇾", "VE": "🇻🇪", "CR": "🇨🇷", "PA": "🇵🇦",
    "GT": "🇬🇹", "DO": "🇩🇴", "BR": "🇧🇷",
}

COUNTRY_NAME_MAP = {
    "IT": "Itália", "CH": "Suíça", "PT": "Portugal", "ES": "Espanha", "US": "Estados Unidos",
    "GB": "Reino Unido", "FR": "França", "DE": "Alemanha", "MX": "México", "CO": "Colômbia",
    "AR": "Argentina", "CL": "Chile", "PE": "Peru", "UY": "Uruguai", "EC": "Equador",
    "BO": "Bolívia", "PY": "Paraguai", "VE": "Venezuela", "CR": "Costa Rica", "PA": "Panamá",
    "GT": "Guatemala", "DO": "República Dominicana", "BR": "Brasil",
}


class SalesEventBroadcaster:
    """Gerencia listeners SSE conectados ao dashboard para entrega instantânea (< 300ms)."""

    def __init__(self):
        self._listeners: list[asyncio.Queue] = []

    def subscribe(self) -> asyncio.Queue:
        q = asyncio.Queue(maxsize=100)
        self._listeners.append(q)
        logger.info(f"SSE listener conectado. Total ativos: {len(self._listeners)}")
        return q

    def unsubscribe(self, q: asyncio.Queue):
        if q in self._listeners:
            self._listeners.remove(q)
            logger.info(f"SSE listener desconectado. Total ativos: {len(self._listeners)}")

    def broadcast_sync(self, data: dict):
        """Envia para todos os ouvintes de forma segura a partir de contexto síncrono ou assíncrono."""
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.create_task(self.broadcast(data))
            else:
                loop.run_until_complete(self.broadcast(data))
        except RuntimeError:
            # Sem loop na thread atual, roda em nova thread ou ignora
            pass

    async def broadcast(self, data: dict):
        if not self._listeners:
            return
        payload_str = json.dumps(data)
        for q in list(self._listeners):
            try:
                q.put_nowait(payload_str)
            except asyncio.QueueFull:
                try:
                    q.get_nowait()
                    q.put_nowait(payload_str)
                except Exception:
                    pass
            except Exception as e:
                logger.warning(f"Erro ao entregar SSE para fila: {e}")


sales_broadcaster = SalesEventBroadcaster()


def format_currency_brl(val: float) -> str:
    return f"R$ {val:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def format_currency_eur(val: float) -> str:
    return f"€ {val:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def format_currency_usd(val: float) -> str:
    return f"$ {val:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def format_smart_sale(t, db: Optional[Session] = None) -> dict:
    """
    Analisa a transação e enriquece com inteligência operacional completa:
    - Multi-moeda (Euro / Dólar / Real) com valor original e conversão
    - Posição no funil (Front-end, Order Bump, Upsell VIP, Downsell)
    - Criativo, Campanha e Conjunto decodificados
    - KPIs agregados de hoje (venda # do dia, faturamento acumulado, status de criativo campeão)
    """
    from database.core.timezone import now_sp
    from database.models.transaction import Transaction, TransactionStatus

    # 1. Identificação do País
    raw_country = getattr(t, "country", None)
    p_name = (t.product_name or "").lower()
    
    if not raw_country:
        if any(k in p_name for k in ["diagnosi", "visive", "hardware", "software", "pinout", "multimetro", "solda", "saldatura", "tornitura", "fresatura", "navigazione", "mappe"]):
            country = "IT"
        elif any(k in p_name for k in ["atlas", "escrituras", "latam"]):
            country = "ES"
        else:
            country = "BR"
    else:
        country = str(raw_country).upper()

    flag = COUNTRY_FLAG_MAP.get(country, "🌍")
    country_name = COUNTRY_NAME_MAP.get(country, country)

    # 2. Inteligência de Moeda e Valores
    amount_brl = float(t.amount or 0.0)
    
    if country in ["IT", "ES", "PT", "FR", "DE"]:
        currency = "EUR"
        currency_symbol = "€"
        # O webhook converteu por 5.1865
        original_amount = round(amount_brl / 5.1865, 2) if amount_brl > 0 else 0.0
        formatted_original = format_currency_eur(original_amount)
        formatted_brl = format_currency_brl(amount_brl)
        display_amount = f"{formatted_original} ({formatted_brl})"
        voice_amount = f"{original_amount:,.2f} euros".replace(".", ",").replace(",00", "")
    elif country in ["US", "MX", "CO", "CL", "PE"]:
        currency = "USD"
        currency_symbol = "$"
        original_amount = round(amount_brl / 5.45, 2) if amount_brl > 0 else 0.0
        formatted_original = format_currency_usd(original_amount)
        formatted_brl = format_currency_brl(amount_brl)
        display_amount = f"{formatted_original} ({formatted_brl})"
        voice_amount = f"{original_amount:,.2f} dólares".replace(".", ",").replace(",00", "")
    elif country == "CH":
        currency = "CHF"
        currency_symbol = "CHF"
        original_amount = round(amount_brl / 5.50, 2) if amount_brl > 0 else 0.0
        formatted_original = f"CHF {original_amount:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
        formatted_brl = format_currency_brl(amount_brl)
        display_amount = f"{formatted_original} ({formatted_brl})"
        voice_amount = f"{original_amount:,.2f} francos suíços".replace(".", ",").replace(",00", "")
    else:
        currency = "BRL"
        currency_symbol = "R$"
        original_amount = amount_brl
        formatted_original = format_currency_brl(amount_brl)
        formatted_brl = formatted_original
        display_amount = formatted_original
        voice_amount = f"{amount_brl:,.2f} reais".replace(".", ",").replace(",00", "")

    # 3. Posição no Funil
    if any(k in p_name for k in ["upsell", "vip", "avanzat", "plus", "completo"]):
        offer_type = "upsell"
        offer_badge = "🚀 Upsell VIP"
    elif any(k in p_name for k in ["downsell", "base", "essenziale", "starter"]):
        offer_type = "downsell"
        offer_badge = "💎 Downsell"
    elif (getattr(t, "order_bumps", None) and len(t.order_bumps) > 0) or any(k in p_name for k in ["bump", "order bump", "+"]):
        offer_type = "order_bump"
        offer_badge = "⚡ Order Bump"
    else:
        offer_type = "front_end"
        offer_badge = "🛒 Front-End"

    # 4. Decodificação do Criativo e Origem
    utm_c = str(t.utm_content or "").strip()
    utm_camp = str(t.utm_campaign or "").strip()
    src = str(t.src or "").strip()

    cleaned_c = utm_c.replace("{{ad.name}}", "").replace("{{ad.id}}", "").strip()
    creative_name = ""
    campaign_name = utm_camp.replace("{{campaign.name}}", "").replace("{{campaign.id}}", "").strip()

    if "|" in cleaned_c:
        parts = [p.strip() for p in cleaned_c.split("|") if p.strip()]
        for p in parts:
            if not p.isdigit() and len(p) > 2:
                creative_name = p
                break
        if not creative_name and len(parts) > 0:
            creative_name = parts[0]
    elif cleaned_c and not cleaned_c.isdigit():
        creative_name = cleaned_c
    elif cleaned_c.isdigit():
        creative_name = f"Anúncio #{cleaned_c[-4:]}"

    if not creative_name and src:
        src_parts = [p.strip() for p in src.split("|") if p.strip()]
        if len(src_parts) >= 3:
            creative_name = src_parts[2]
            if not campaign_name:
                campaign_name = src_parts[0]
        elif len(src_parts) >= 1 and not src_parts[0].isdigit():
            creative_name = src_parts[0]

    if not creative_name:
        creative_name = "Criativo Direto"

    # 5. Métricas do Dia e Insights Inteligentes
    today_sales_count = 0
    today_revenue_brl = 0.0
    creative_today_sales = 1
    smart_insight = "Nova Venda Aprovada"

    if db:
        try:
            now = now_sp()
            today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            today_end = now.replace(hour=23, minute=59, second=59, microsecond=999999)

            today_txs = db.query(Transaction).filter(
                Transaction.status == TransactionStatus.APPROVED,
                Transaction.created_at >= today_start,
                Transaction.created_at <= today_end,
            ).all()

            today_sales_count = len(today_txs)
            today_revenue_brl = round(sum(float(x.amount or 0.0) for x in today_txs), 2)

            # Quantas vezes este criativo converteu hoje
            if utm_c:
                creative_today_sales = sum(
                    1 for x in today_txs if str(x.utm_content or "").strip() == utm_c
                )
            
            if creative_today_sales >= 3:
                smart_insight = f"🔥 Criativo Campeão ({creative_today_sales}ª venda hoje!)"
            elif creative_today_sales == 2:
                smart_insight = f"⚡ Criativo em Alta (2ª venda hoje)"
            elif today_sales_count == 1:
                smart_insight = "🎯 1ª Venda do Dia!"
            elif today_sales_count in (5, 10, 15, 20, 30, 50):
                smart_insight = f"🏆 Marco de {today_sales_count} vendas hoje!"
            else:
                smart_insight = f"📊 Venda #{today_sales_count} de hoje"
        except Exception as err:
            logger.warning(f"Aviso ao calcular live metrics da venda: {err}")

    return {
        "id": t.id,
        "external_id": t.external_id,
        "amount": amount_brl,
        "original_amount": original_amount,
        "currency": currency,
        "currency_symbol": currency_symbol,
        "formatted_original": formatted_original,
        "formatted_brl": formatted_brl,
        "display_amount": display_amount,
        "voice_amount": voice_amount,
        "product_name": t.product_name or "Produto Digital",
        "customer_email": t.customer_email,
        "country": country,
        "country_flag": flag,
        "country_name": country_name,
        "country_display": f"{flag} {country_name}",
        "offer_type": offer_type,
        "offer_badge": offer_badge,
        "ad_name": creative_name,
        "creative_name": creative_name,
        "campaign_name": campaign_name or "Campanha Direta",
        "utm_content": t.utm_content,
        "utm_campaign": t.utm_campaign,
        "utm_source": t.utm_source,
        "today_sales_count": today_sales_count,
        "today_revenue_brl": today_revenue_brl,
        "today_revenue_formatted": format_currency_brl(today_revenue_brl),
        "creative_today_sales": creative_today_sales,
        "smart_insight": smart_insight,
        "created_at": t.created_at.isoformat() if getattr(t, "created_at", None) else None,
    }


async def broadcast_new_sale(t, db: Optional[Session] = None):
    """Envia o evento para todos os clientes conectados ao SSE."""
    event_data = format_smart_sale(t, db=db)
    await sales_broadcaster.broadcast(event_data)
