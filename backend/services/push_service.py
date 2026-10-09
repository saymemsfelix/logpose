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


def get_country_flag(country_code: str) -> str:
    """Retorna o emoji da bandeira para qualquer código ISO de 2 letras do mundo."""
    if not country_code or len(country_code) != 2:
        return "🌍"
    code = country_code.upper()
    try:
        return chr(0x1F1E6 + ord(code[0]) - ord('A')) + chr(0x1F1E6 + ord(code[1]) - ord('A'))
    except Exception:
        return "🌍"


def send_sale_push_notification(db: Session, event: StandardizedWebhookEvent) -> int:
    """
    Dispara o pop-up nativo de Venda Aprovada (estilo Nexofy / Hotmart) para todos
    os celulares e computadores conectados ao Ninja Tracker.
    """
    subscriptions = db.query(PushSubscription).all()
    if not subscriptions:
        logger.info("Nenhum dispositivo cadastrado para Web Push no momento.")
        return 0

    # 1. Formatação Inteligente de Moeda e País
    country = getattr(event, "customer_country", "") or getattr(event, "country", "") or "BR"
    p_name = (event.product_name or "").lower()
    amount_brl = float(event.amount) if event.amount is not None else 0.0

    if not country or country == "BR":
        if any(k in p_name for k in ["diagnosi", "visive", "hardware", "software", "pinout", "multimetro", "solda", "saldatura", "tornitura", "fresatura"]):
            country = "IT"

    flag = get_country_flag(country)

    if country in ["IT", "ES", "PT", "FR", "DE"]:
        orig_val = round(amount_brl / 5.1865, 2) if amount_brl > 0 else 0.0
        formatted_orig = f"€ {orig_val:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
        formatted_brl = f"R$ {amount_brl:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
        title_amount = f"{formatted_orig} ({formatted_brl})"
        body_amount = formatted_orig
    elif country in ["US", "MX", "CO", "CL", "PE"]:
        orig_val = round(amount_brl / 5.45, 2) if amount_brl > 0 else 0.0
        formatted_orig = f"$ {orig_val:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
        formatted_brl = f"R$ {amount_brl:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
        title_amount = f"{formatted_orig} ({formatted_brl})"
        body_amount = formatted_orig
    else:
        formatted_brl = f"R$ {amount_brl:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
        title_amount = formatted_brl
        body_amount = formatted_brl

    # 2. Posição no Funil
    if any(k in p_name for k in ["upsell", "vip", "avanzat", "plus", "completo"]):
        badge = "🚀 Upsell VIP"
    elif any(k in p_name for k in ["downsell", "base", "essenziale", "starter"]):
        badge = "💎 Downsell"
    elif getattr(event, "order_bumps", None) or any(k in p_name for k in ["bump", "+"]):
        badge = "⚡ Order Bump"
    else:
        badge = "🛒 Front-End"

    # 3. Criativo e Produto
    raw_creative = event.utm_content or event.utm_campaign or event.src or "Anúncio Direto"
    creative = raw_creative.replace("{{ad.name}}", "").replace("{{ad.id}}", "").strip()
    if "|" in creative:
        parts = [p.strip() for p in creative.split("|") if p.strip()]
        for p in parts:
            if not p.isdigit() and len(p) > 2:
                creative = p
                break
        if not creative and len(parts) > 0:
            creative = parts[0]
    elif creative.isdigit():
        creative = f"Anúncio #{creative[-4:]}"

    product_name = event.product_name or "Produto Digital"

    # 4. Estatísticas acumuladas de hoje (estilo UTMify em tempo real)
    today_stats_suffix = ""
    try:
        from database.core.timezone import now_sp
        from database.models.transaction import Transaction, TransactionStatus
        now = now_sp()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = now.replace(hour=23, minute=59, second=59, microsecond=999999)
        today_txs = db.query(Transaction).filter(
            Transaction.status == TransactionStatus.APPROVED,
            Transaction.created_at >= today_start,
            Transaction.created_at <= today_end,
        ).all()
        t_count = len(today_txs)
        t_rev = sum(float(t.amount or 0.0) for t in today_txs)
        formatted_t_rev = f"R$ {t_rev:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
        today_stats_suffix = f" • Hoje: #{t_count} ({formatted_t_rev})"
    except Exception:
        pass

    # 5. Monta o Payload do Pop-up Nativo do Celular
    payload = {
        "title": f"💰 Venda Aprovada: {title_amount}",
        "body": f"{flag} {badge} • {product_name} • {body_amount}{today_stats_suffix}\n🎨 Criativo: {creative}",
        "icon": "/icons/pwa-192.png",
        "badge": "/icons/pwa-192.png",
        "tag": f"ninja-sale-{event.external_id}",
        "renotify": True,
        "requireInteraction": True,
        "vibrate": [300, 100, 300, 100, 400],
        "data": {
            "url": "/dashboard",
            "sale_id": event.external_id,
            "amount": amount_brl,
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

    orig = (event.original_status or "").lower()
    pm = (event.payment_method or "").lower()
    ps = (event.payment_status or "").lower()

    if pm == "pix" or "waiting" in orig or "waiting" in ps or "pix" in orig:
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


def _fetch_meta_sync(access_token: str, account_id: str, ds: str, de: str, level: str = "campaign"):
    """Executa busca direta na Meta Ads via MetaAdsService de forma sync-safe sem depender de langchain."""
    import asyncio
    import concurrent.futures
    from integrations.meta_ads.service import MetaAdsService

    async def _runner():
        service = MetaAdsService(access_token, account_id)
        try:
            if level == "account":
                return await service.get_account_summary(ds, de)
            else:
                return await service.get_campaigns(ds, de)
        finally:
            await service.close()

    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None

    coro = _runner()
    if loop and loop.is_running():
        with concurrent.futures.ThreadPoolExecutor() as pool:
            return pool.submit(asyncio.run, coro).result()
    else:
        return asyncio.run(coro)


def get_today_profit_metrics(db: Session, force_live: bool = True) -> dict:
    """
    Calcula faturamento, gasto de ads em tempo real e lucro líquido do dia em perfeita sincronia com o Dashboard (São Paulo).
    Quando force_live=True, limpa o cache em memória para consultar a Meta Ads ao vivo, sincronizando campanhas ativas.
    """
    from database.core.timezone import now_sp, today_sp, today_sp_str
    from database.models.transaction import Transaction, TransactionStatus
    from database.models.facebook_account import FacebookAccount
    from database.models.daily_ad_spend import DailyAdSpend
    from integrations.meta_ads.cache import clear_all_cache

    try:
        # Se force_live=True, limpa o cache da Meta para ler 100% ao vivo sem defasagem
        if force_live:
            try:
                clear_all_cache()
            except Exception as c_err:
                logger.warning(f"Aviso ao limpar cache para métricas em tempo real: {c_err}")

        now = now_sp()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = now.replace(hour=23, minute=59, second=59, microsecond=999999)
        today_date = today_sp()
        today_str = today_sp_str()

        # 1. Transações reais aprovadas de hoje (mesmo filtro exato de horário do Dashboard)
        txs = db.query(Transaction).filter(
            Transaction.status == TransactionStatus.APPROVED,
            Transaction.created_at >= today_start,
            Transaction.created_at <= today_end,
        ).all()
        # Filtra transações com valor real > 0 para faturamento
        valid_sales = [t for t in txs if float(t.amount or 0.0) > 0]
        today_revenue = round(sum(float(t.amount or 0.0) for t in valid_sales), 2)
        today_sales = len(valid_sales)

        # 2. Busca gastos reais da Meta Ads ao vivo nas contas ativas (Conta + Campanhas para capturar o maior valor em tempo real)
        fb_accounts = db.query(FacebookAccount).filter(FacebookAccount.token_valid.is_(True)).all()
        meta_spend = 0.0
        meta_clicks = 0
        meta_impr = 0
        meta_lpv = 0
        meta_ic = 0
        has_meta = False

        for acc in fb_accounts:
            try:
                summary = _fetch_meta_sync(acc.access_token, acc.account_id, today_str, today_str, "account")
                campaigns = _fetch_meta_sync(acc.access_token, acc.account_id, today_str, today_str, "campaign")

                acc_spend = float(summary.spend or 0.0) if summary else 0.0
                camp_spend = sum(float(c.spend or 0.0) for c in campaigns) if campaigns else 0.0

                # Meta Ads atualiza o nível de campanhas mais rapidamente do que o agregado da conta.
                # Utilizamos o maior valor para garantir que novos gastos com tráfego nunca fiquem para trás.
                real_acc_spend = max(acc_spend, camp_spend)
                if real_acc_spend > 0:
                    meta_spend += real_acc_spend
                    has_meta = True

                acc_clicks = summary.clicks if summary else 0
                camp_clicks = sum(c.clicks for c in campaigns) if campaigns else 0
                meta_clicks += max(acc_clicks, camp_clicks)

                acc_impr = summary.impressions if summary else 0
                camp_impr = sum(c.impressions for c in campaigns) if campaigns else 0
                meta_impr += max(acc_impr, camp_impr)

                acc_lpv = summary.landing_page_views if summary else 0
                camp_lpv = sum(c.landing_page_views for c in campaigns) if campaigns else 0
                meta_lpv += max(acc_lpv, camp_lpv)

                acc_ic = summary.initiate_checkout if summary else 0
                camp_ic = sum(c.initiate_checkout for c in campaigns) if campaigns else 0
                meta_ic += max(acc_ic, camp_ic)
            except Exception as meta_err:
                logger.warning(f"Aviso ao consultar Meta Ads hoje para conta {acc.label}: {meta_err}")

        # 3. Fallback estrito para gasto manual apenas do dia de hoje (sem pegar gastos de outros dias)
        manual_row = db.query(DailyAdSpend).filter(DailyAdSpend.spend_date == today_date).first()
        manual_spend = float(manual_row.spend or 0.0) if manual_row else 0.0
        
        if not has_meta or meta_spend == 0.0:
            total_spend = manual_spend
            total_clicks = manual_row.clicks if manual_row else meta_clicks
            total_impr = manual_row.impressions if manual_row else meta_impr
        else:
            total_spend = meta_spend
            total_clicks = meta_clicks
            total_impr = meta_impr

        total_spend = round(total_spend, 2)

        # 4. Métricas consolidadas padrão UTMify / NexoFy
        profit = round(today_revenue - total_spend, 2)
        roas = round(today_revenue / total_spend, 2) if total_spend > 0 else 0.0
        roi = round(profit / total_spend, 2) if total_spend > 0 else 0.0
        cpa = round(total_spend / today_sales, 2) if today_sales > 0 else 0.0
        cpm = round((total_spend / total_impr) * 1000, 2) if total_impr > 0 and total_spend > 0 else 0.0
        cpc = round(total_spend / total_clicks, 2) if total_clicks > 0 and total_spend > 0 else 0.0
        ctr = round((total_clicks / total_impr) * 100, 2) if total_impr > 0 and total_clicks > 0 else 0.0
        cpv = round(total_spend / meta_lpv, 2) if meta_lpv > 0 and total_spend > 0 else 0.0
        connect_rate = round((meta_lpv / total_clicks) * 100, 2) if total_clicks > 0 and meta_lpv > 0 else 0.0

        return {
            "revenue": today_revenue,
            "spend": total_spend,
            "profit": profit,
            "sales": today_sales,
            "roas": roas,
            "roi": roi,
            "cpa": cpa,
            "clicks": total_clicks,
            "impressions": total_impr,
            "cpm": cpm,
            "cpc": cpc,
            "ctr": ctr,
            "lpv": meta_lpv,
            "cpv": cpv,
            "connect_rate": connect_rate,
            "ic": meta_ic,
        }
    except Exception as e:
        logger.warning(f"Erro ao calcular métricas de hoje: {e}")
        return {
            "revenue": 0.0,
            "spend": 0.0,
            "profit": 0.0,
            "sales": 0,
            "roas": 0.0,
            "roi": 0.0,
            "cpa": 0.0,
            "clicks": 0,
            "impressions": 0,
            "cpm": 0.0,
            "cpc": 0.0,
            "ctr": 0.0,
            "lpv": 0,
            "cpv": 0.0,
            "connect_rate": 0.0,
            "ic": 0,
        }


def send_daily_profit_push_notification(db: Session, admin_id: int | None = None) -> int:
    """
    Dispara notificação inteligente de lucro/performance do dia (estilo Nexofy & UTMify).
    Avalia a saúde real: se estiver gastando sem vender, alerta! Se estiver no lucro, celebra!
    """
    metrics = get_today_profit_metrics(db, force_live=True)
    profit = metrics["profit"]
    revenue = metrics["revenue"]
    spend = metrics["spend"]
    sales = metrics["sales"]
    roas = metrics["roas"]
    clicks = metrics["clicks"]
    cpm = metrics["cpm"]

    formatted_profit = f"R$ {abs(profit):,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    formatted_rev = f"R$ {revenue:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    formatted_spend = f"R$ {spend:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")

    # ─── MOTOR DE INTELIGÊNCIA NATIVO (Zero mensagens enganosas) ───
    if sales == 0 and spend > 0:
        # Prejuízo sem vendas: Alerta crítico com cliques e CPM
        title = f"🚨 Alerta de Tráfego: {formatted_spend} gastos sem vendas!"
        body = f"Você investiu {formatted_spend} hoje ({clicks} cliques) e ainda não saiu nenhuma venda. Verifique seus anúncios!"
        tag = "ninja-alert-no-sales"
    elif sales > 0 and profit < 0:
        # Prejuízo com vendas: Gastos superaram faturamento
        title = f"⚠️ Atenção aos números (-{formatted_profit})"
        body = f"Prejuízo de {formatted_profit} hoje. Faturamento: {formatted_rev} ({sales} vendas) | Gasto: {formatted_spend} | ROAS: {roas:.2f}x."
        tag = "ninja-negative-profit"
    elif sales > 0 and profit > 0:
        # Lucro Real positivo!
        title = f"Hoje deu bom, patrão! 😎 (+{formatted_profit})"
        body = f"Lucro líquido: {formatted_profit} até agora! Faturamento: {formatted_rev} ({sales} vendas) | Gasto: {formatted_spend} (ROAS {roas:.2f}x)."
        tag = "ninja-daily-profit"
    elif sales > 0 and spend == 0 and revenue > 0:
        # Vendas orgânicas sem custos de ads hoje com faturamento real
        title = f"Hoje deu bom, patrão! 😎 (+{formatted_rev})"
        body = f"Lucro 100% orgânico: {formatted_rev} em {sales} venda(s) hoje (sem gastos com anúncios)!"
        tag = "ninja-organic-sales"
    elif sales > 0 and revenue == 0:
        # Pedidos sem valor financeiro (trials ou testes)
        title = f"Pedidos do Dia: {sales} registrado(s)"
        body = f"{sales} pedido(s) sem faturamento direto hoje."
        tag = "ninja-zero-rev-sales"
    else:
        # Sem movimentação no dia (0 gastos e 0 vendas): Não dispara falso alarme de lucro
        logger.info("Resumo de lucro diário não disparado: R$ 0,00 gastos e 0 vendas até o momento.")
        return 0

    payload = {
        "title": title,
        "body": body,
        "icon": "/icons/pwa-192.png",
        "badge": "/icons/pwa-192.png",
        "tag": tag,
        "renotify": True,
        "requireInteraction": True,
        "vibrate": [200, 100, 200, 100, 300],
        "data": {
            "url": "/dashboard",
            "type": "daily_profit",
            "profit": profit,
            "revenue": revenue,
            "spend": spend,
            "sales": sales,
            "roas": roas,
            "cpm": cpm,
        },
    }

    subscriptions = db.query(PushSubscription).all()
    sent = 0
    for sub in subscriptions:
        if send_web_push(sub, payload, db=db):
            sent += 1

    logger.info(f"📊 Pop-up inteligente de lucro/performance enviado para {sent} dispositivos: {title} | {body}")
    return sent


def send_test_push_notification(db: Session, admin_id: int | None = None, test_type: str = "sale") -> int:
    """
    Envia um push de teste imediato para validar o pop-up no celular.
    Tipos suportados:
    - 'sale': 💰 Venda Aprovada
    - 'recovery': 😬 Essa quase foi (Recuperação)
    - 'profit': 😎 Pop-up Inteligente de Performance / Lucro
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
        metrics = get_today_profit_metrics(db, force_live=True)
        sales = metrics["sales"]
        spend = metrics["spend"]
        profit = metrics["profit"]
        revenue = metrics["revenue"]
        roas = metrics["roas"]

        # Se houver dados reais hoje, monta o pop-up com a inteligência real do dia
        if sales > 0 or spend > 0:
            formatted_profit = f"R$ {abs(profit):,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
            formatted_rev = f"R$ {revenue:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
            formatted_spend = f"R$ {spend:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")

            if sales == 0 and spend > 0:
                title = f"🚨 Alerta de Tráfego: {formatted_spend} gastos sem vendas!"
                body = f"Você investiu {formatted_spend} hoje ({metrics['clicks']} cliques) e ainda não saiu nenhuma venda. Verifique seus anúncios!"
            elif profit < 0:
                title = f"⚠️ Atenção aos números (-{formatted_profit})"
                body = f"Prejuízo de {formatted_profit} hoje. Faturamento: {formatted_rev} ({sales} vendas) | Gasto: {formatted_spend} | ROAS: {roas:.2f}x."
            else:
                title = f"Hoje deu bom, patrão! 😎 (+{formatted_profit})"
                body = f"Lucro líquido: {formatted_profit} até agora! Faturamento: {formatted_rev} ({sales} vendas) | Gasto: {formatted_spend} (ROAS {roas:.2f}x)."
        else:
            # Demonstração honesta de teste sem inventar vendas falsas
            title = "Hoje deu bom, patrão! 😎 [TESTE]"
            body = "Teste de Pop-up de Lucro Real: Este pop-up é enviado nos horários programados com o lucro líquido e faturamento real do seu Dashboard."

        payload = {
            "title": title,
            "body": body,
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
                "profit": profit,
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

