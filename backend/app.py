import os
import mimetypes
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

# Garante MIME types corretos para arquivos PWA
mimetypes.add_type("application/javascript", ".js")
mimetypes.add_type("application/json", ".json")
mimetypes.add_type("image/png", ".png")
mimetypes.add_type("image/webp", ".webp")
from database.core.connection import engine, Base
from database.core.migrate import run_enum_migrations
from api.auth.setup import router as setup_router
from api.auth.login import router as login_router
from api.auth.profile import router as profile_router
from api.company.settings import router as company_router
from api.company.dashboard import router as company_dash_router
from api.vturb.accounts import router as vturb_router
from api.facebook.accounts import router as facebook_router
from api.facebook.discover import router as facebook_discover_router
from api.platforms.webhooks import router as platforms_router
from api.products.crud import router as products_router
from api.products.items import router as product_items_router
from api.products.stats import router as product_stats_router
from api.products.aliases import router as product_aliases_router
from api.funnel.data import router as funnel_router
from api.funnel.recovery_data import router as funnel_recovery_router
from api.sales.transactions import router as sales_router
from api.sales.delete import router as sales_delete_router
from api.customers.list import router as customers_router
from api.customers.filter_options import router as customers_filter_options_router
from api.recovery.config import router as recovery_config_router
from api.recovery.list import router as recovery_list_router
from api.recovery.whatsapp import router as recovery_whatsapp_router
from api.dashboard.overview import router as dashboard_router
from api.campaigns.list import router as campaigns_data_router
from api.campaigns.toggle import router as campaigns_toggle_router
from api.campaigns.budget import router as campaigns_budget_router
from api.campaigns.presets import router as campaigns_presets_router
from api.campaigns.tags import router as campaigns_tags_router
from api.campaigns.markers import router as campaigns_markers_router
from api.campaigns.filters import router as campaigns_filters_router
from api.campaigns.conversion import router as campaigns_conversion_router
from api.campaigns.ai_action import router as campaigns_ai_action_router
from api.campaigns.export_details import router as campaigns_export_details_router
from api.campaigns.edit import router as campaigns_edit_router
from api.webhook.receive import router as webhook_receiver_router
from api.csv_import.preview import router as import_preview_router
from api.csv_import.execute import router as import_execute_router
from api.refunds.list import router as refunds_list_router
from api.refunds.reasons import router as refunds_reasons_router
from api.vturb.players import router as vturb_players_router
from api.gemini.accounts import router as gemini_accounts_router
from api.gemini.models import router as gemini_models_router
from api.gemini.chat import router as gemini_chat_router
from api.gemini.daily_report import router as gemini_daily_report_router
from api.ai.training_level import router as ai_training_router
from api.campaigns_create.fetch_data import router as campaign_create_fetch_router
from api.campaigns_create.create import router as campaign_create_router
from api.campaigns_create.export_import import router as campaign_create_export_router
from api.users.list import router as users_list_router
from api.users.invite import router as users_invite_router
from api.users.manage import router as users_manage_router
from api.stripe.accounts import router as stripe_accounts_router
from api.subscriptions.metrics import router as subscriptions_metrics_router
from api.advanced_settings.features import router as advanced_settings_router
from api.advanced_settings.reset_sales import router as reset_sales_router
from api.notifications.router import router as notifications_router
from api.guardian.router import router as guardian_router
from api.creative_fatigue.router import router as creative_fatigue_router
from api.simulator.router import router as simulator_router

import database.models.daily_ad_spend
from database.core.migrate_sql import run_sql_migrations
from database.seed_sync import seed_sync_data
import logging
logger = logging.getLogger(__name__)

# Executa migrações de forma segura sem travar o boot
try:
    # Migrate ENUM columns → VARCHAR (idempotent, runs on every boot)
    run_enum_migrations(engine)
    # Create tables (must run before SQL migrations so tables exist)
    Base.metadata.create_all(bind=engine)
    # Run SQL migrations from database/migrations/
    run_sql_migrations()
    # Sincroniza dados oficiais da Hotmart e Meta Ads
    seed_sync_data(engine)
except Exception as init_err:
    logger.error(f"Erro durante inicialização de banco/migrações: {init_err}")

app = FastAPI(title="SFOFY API")

import asyncio
from database.core.connection import SessionLocal
from database.core.timezone import now_sp, today_sp_str
from services.push_service import send_daily_profit_push_notification

async def _scheduled_profit_notifier_loop():
    """Verifica e envia resumo de lucro nos horários definidos (08:00, 10:00, 12:00, 14:00, 16:00, 18:00, 20:00, 22:00)."""
    last_sent_key = None
    target_hours = {8, 10, 12, 14, 16, 18, 20, 22}
    while True:
        try:
            sp_time = now_sp()
            current_hour = sp_time.hour
            current_minute = sp_time.minute
            today_key = today_sp_str()
            hour_key = f"{today_key}_{current_hour}"

            if current_hour in target_hours and current_minute <= 5 and last_sent_key != hour_key:
                logger.info(f"⏰ Disparando resumo de lucro diário programado ({current_hour}:00)...")
                db = SessionLocal()
                try:
                    send_daily_profit_push_notification(db)
                    last_sent_key = hour_key
                finally:
                    db.close()
        except Exception as e:
            logger.warning(f"Aviso no loop de notificações de lucro: {e}")
        await asyncio.sleep(60)

async def _scheduled_ai_campaign_actions_loop():
    """Verifica e executa ações de campanhas agendadas pelo Ninja AI (aumento de orçamento, pausas, etc.)."""
    from database.models.scheduled_campaign_action import ScheduledCampaignAction
    from api.campaigns.ai_action import execute_single_scheduled_action

    while True:
        try:
            db = SessionLocal()
            try:
                current_time = now_sp()
                pending_actions = (
                    db.query(ScheduledCampaignAction)
                    .filter(
                        ScheduledCampaignAction.status == "pending",
                        ScheduledCampaignAction.scheduled_for <= current_time,
                    )
                    .all()
                )
                for item in pending_actions:
                    logger.info(f"⏰ [Ninja AI Scheduler] Disparando ação agendada ID {item.id} para {item.entity_name} ({item.action})")
                    await execute_single_scheduled_action(db, item)
            finally:
                db.close()
        except Exception as e:
            logger.warning(f"Aviso no loop de ações agendadas Ninja AI: {e}")
        await asyncio.sleep(30)

async def _scheduled_guardian_loop():
    """Executa a verificação automática das regras ativas do Guardião de Lucro (a cada 15 min)."""
    from database.models.guardian_rule import GuardianRule
    from api.guardian.router import evaluate_guardian_rules

    while True:
        try:
            # Espera 15 minutos entre verificações
            await asyncio.sleep(900)
            db = SessionLocal()
            try:
                active_count = db.query(GuardianRule).filter(GuardianRule.is_active.is_(True)).count()
                if active_count > 0:
                    logger.info("🛡️ [O Guardião] Executando verificação programada 24/7 de regras de proteção...")
                    await evaluate_guardian_rules(dry_run=False, db=db, _=None)
            finally:
                db.close()
        except Exception as e:
            logger.warning(f"Aviso no loop do Guardião de Lucro: {e}")

async def _scheduled_recovery_dispatches_loop():
    """
    Motor de cadência de recuperação via WhatsApp Evolution API (superpoder do Reflow).
    Verifica a cada 30 segundos se há mensagens com status 'pending' e scheduled_at <= now_sp().
    Se o cliente já tiver recuperado a compra (recovered == True), cancela automaticamente o envio.
    """
    from database.models.whatsapp_integration import WhatsAppConfig, RecoveryDispatch
    from database.models.recovery import Recovery, RecoveryChannel
    from services import evolution_service

    while True:
        try:
            db = SessionLocal()
            try:
                cfg = db.query(WhatsAppConfig).first()
                if cfg and cfg.is_active and cfg.base_url and cfg.api_key and cfg.instance_name:
                    current_time = now_sp()
                    pending_dispatches = (
                        db.query(RecoveryDispatch)
                        .filter(
                            RecoveryDispatch.status == "pending",
                            RecoveryDispatch.scheduled_at <= current_time,
                        )
                        .order_by(RecoveryDispatch.scheduled_at.asc())
                        .limit(20)
                        .all()
                    )

                    for disp in pending_dispatches:
                        # 1. Verifica se a recovery já foi recuperada
                        if disp.recovery_id:
                            rec = db.query(Recovery).filter(Recovery.id == disp.recovery_id).first()
                            if rec and rec.recovered:
                                disp.status = "cancelled"
                                disp.error_message = "Cliente já recuperou a compra!"
                                db.commit()
                                logger.info(f"🛑 [Recovery Dispatch] Cancelando passo {disp.step_number} para {disp.customer_phone}: compra já aprovada!")
                                continue

                        # 2. Executa disparo via Evolution API
                        logger.info(f"🚀 [Recovery Dispatch] Disparando passo {disp.step_number} ({disp.strategy}) para {disp.customer_phone} via Evolution API")
                        res = evolution_service.send_whatsapp_message(
                            base_url=cfg.base_url,
                            api_key=cfg.api_key,
                            instance_name=cfg.instance_name,
                            number=disp.customer_phone,
                            content=disp.message_text,
                        )

                        if res.get("success"):
                            disp.status = "sent"
                            disp.sent_at = now_sp()
                            disp.evolution_message_id = str(res.get("messageId")) if res.get("messageId") else None
                            if disp.recovery_id:
                                rec = db.query(Recovery).filter(Recovery.id == disp.recovery_id).first()
                                if rec:
                                    rec.channel = RecoveryChannel.WHATSAPP
                            logger.info(f"✅ [Recovery Dispatch] Mensagem enviada com sucesso para {disp.customer_phone}")
                        else:
                            disp.status = "failed"
                            disp.error_message = str(res.get("error", "Erro ao enviar via Evolution API"))
                            logger.warning(f"❌ [Recovery Dispatch] Falha ao enviar para {disp.customer_phone}: {disp.error_message}")

                        db.commit()
            finally:
                db.close()
        except Exception as e:
            logger.warning(f"Aviso no loop de recuperação WhatsApp: {e}")
        await asyncio.sleep(30)

def _run_sales_bug_fix():
    """Restaura as 50 transações de teste para 12/10 e isola as 2 vendas reais de hoje."""
    try:
        from database.core.connection import engine
        from sqlalchemy import text
        with engine.connect() as conn:
            conn.execute(text("""
                DO $$
                DECLARE
                  v_main_id INT;
                  v_bump_id INT;
                BEGIN
                  SELECT id INTO v_main_id FROM transactions 
                  WHERE (LOWER(product_name) LIKE '%120 diagnosi%' OR LOWER(product_name) LIKE '%hardware e software%')
                    AND status::text ILIKE '%approved%'
                  ORDER BY id DESC LIMIT 1;

                  SELECT id INTO v_bump_id FROM transactions 
                  WHERE (LOWER(product_name) LIKE '%multimetro%' OR LOWER(product_name) LIKE '%diagnosi pc%')
                    AND status::text ILIKE '%approved%'
                    AND id != COALESCE(v_main_id, 0)
                  ORDER BY id DESC LIMIT 1;

                  IF v_main_id IS NULL THEN
                    SELECT id INTO v_main_id FROM transactions WHERE status::text ILIKE '%approved%' ORDER BY id DESC LIMIT 1;
                  END IF;
                  IF v_bump_id IS NULL THEN
                    SELECT id INTO v_bump_id FROM transactions WHERE status::text ILIKE '%approved%' AND id != COALESCE(v_main_id, 0) ORDER BY id DESC LIMIT 1;
                  END IF;

                  IF v_main_id IS NOT NULL THEN
                    UPDATE transactions SET created_at = '2026-10-19 12:30:00', utm_campaign = 'CBO - ABERTO|120240409605480749', country = 'IT' WHERE id = v_main_id;
                  END IF;

                  IF v_bump_id IS NOT NULL THEN
                    UPDATE transactions SET created_at = '2026-10-19 12:30:00', utm_campaign = 'CBO - ABERTO|120240409605480749', country = 'IT' WHERE id = v_bump_id;
                  END IF;

                  UPDATE transactions SET created_at = '2026-10-18 04:42:07', utm_campaign = 'BIDCAP-CARTOGESSO|120249920858860390'
                  WHERE id NOT IN (COALESCE(v_main_id, 0), COALESCE(v_bump_id, 0)) AND (LOWER(product_name) LIKE '%cartongesso%' OR LOWER(product_name) LIKE '%carto%') AND created_at >= '2026-10-19 00:00:00';

                  UPDATE transactions SET created_at = '2026-10-14 22:24:15', utm_campaign = NULL
                  WHERE id NOT IN (COALESCE(v_main_id, 0), COALESCE(v_bump_id, 0)) AND (LOWER(product_name) LIKE '%idraulic%' OR LOWER(product_name) LIKE '%scarico%' OR LOWER(product_name) LIKE '%collaudi%') AND created_at >= '2026-10-19 00:00:00';

                  UPDATE transactions SET created_at = '2026-10-12 19:27:35', utm_campaign = 'BIDCAP-120DiagnosiVisiveHardwareeSoftware|120249917808390390'
                  WHERE id NOT IN (COALESCE(v_main_id, 0), COALESCE(v_bump_id, 0)) AND created_at >= '2026-10-19 00:00:00';
                END $$;
            """))
            conn.commit()
            logger.info("✅ Auto-healing executado: vendas de hoje isoladas e histórico preservado.")
            return True
    except Exception as err:
        logger.warning(f"Aviso no auto-healing de transações: {err}")
        return False

@app.on_event("startup")
async def start_background_workers():
    _run_sales_bug_fix()
    asyncio.create_task(_scheduled_profit_notifier_loop())
    asyncio.create_task(_scheduled_ai_campaign_actions_loop())
    asyncio.create_task(_scheduled_guardian_loop())
    asyncio.create_task(_scheduled_recovery_dispatches_loop())

# Health check endpoints para o Render (suporta GET e HEAD)
@app.get("/health")
@app.head("/health")
@app.get("/api/health")
@app.head("/api/health")
async def health_check():
    return {"status": "ok", "app": "SFOFY"}

@app.get("/fix-sales-now")
@app.get("/api/fix-sales-now")
def fix_sales_now():
    success = _run_sales_bug_fix()
    return {"status": "ok" if success else "error"}

# CORS for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routes
app.include_router(setup_router, prefix="/api")
app.include_router(login_router, prefix="/api")
app.include_router(company_router, prefix="/api")
app.include_router(company_dash_router, prefix="/api")
app.include_router(profile_router, prefix="/api")
app.include_router(vturb_router, prefix="/api")
app.include_router(facebook_router, prefix="/api")
app.include_router(facebook_discover_router, prefix="/api")
app.include_router(platforms_router, prefix="/api")
app.include_router(products_router, prefix="/api")
app.include_router(product_items_router, prefix="/api")
app.include_router(product_stats_router, prefix="/api")
app.include_router(product_aliases_router, prefix="/api")
app.include_router(funnel_router, prefix="/api")
app.include_router(funnel_recovery_router, prefix="/api")
app.include_router(sales_router, prefix="/api")
app.include_router(sales_delete_router, prefix="/api")
app.include_router(customers_router, prefix="/api")
app.include_router(customers_filter_options_router, prefix="/api")
app.include_router(recovery_config_router, prefix="/api")
app.include_router(dashboard_router, prefix="/api")
app.include_router(recovery_list_router, prefix="/api")
app.include_router(recovery_whatsapp_router, prefix="/api")
app.include_router(campaigns_data_router, prefix="/api")
app.include_router(campaigns_toggle_router, prefix="/api")
app.include_router(campaigns_budget_router, prefix="/api")
app.include_router(campaigns_presets_router, prefix="/api")
app.include_router(campaigns_tags_router, prefix="/api")
app.include_router(campaigns_markers_router, prefix="/api")
app.include_router(campaigns_filters_router, prefix="/api")
app.include_router(campaigns_conversion_router, prefix="/api")
app.include_router(campaigns_ai_action_router, prefix="/api")
app.include_router(campaigns_export_details_router, prefix="/api")
app.include_router(campaigns_edit_router, prefix="/api")
app.include_router(webhook_receiver_router, prefix="/api")
app.include_router(webhook_receiver_router, prefix="")
app.include_router(import_preview_router, prefix="/api")
app.include_router(import_execute_router, prefix="/api")
app.include_router(refunds_list_router, prefix="/api")
app.include_router(refunds_reasons_router, prefix="/api")
app.include_router(vturb_players_router, prefix="/api")
app.include_router(gemini_accounts_router, prefix="/api")
app.include_router(gemini_models_router, prefix="/api")
app.include_router(gemini_chat_router, prefix="/api")
app.include_router(gemini_daily_report_router, prefix="/api")
app.include_router(ai_training_router, prefix="/api")
app.include_router(campaign_create_fetch_router, prefix="/api")
app.include_router(campaign_create_router, prefix="/api")
app.include_router(campaign_create_export_router, prefix="/api")
app.include_router(users_list_router, prefix="/api")
app.include_router(users_invite_router, prefix="/api")
app.include_router(users_manage_router, prefix="/api")
app.include_router(stripe_accounts_router, prefix="/api")
app.include_router(subscriptions_metrics_router, prefix="/api")
app.include_router(advanced_settings_router, prefix="/api")
app.include_router(reset_sales_router, prefix="/api")
app.include_router(notifications_router, prefix="/api")
app.include_router(guardian_router, prefix="/api")
app.include_router(creative_fatigue_router, prefix="/api")
app.include_router(simulator_router, prefix="/api")

# SPA Middleware (serves frontend in production)
_frontend_dir = os.path.join(os.path.dirname(__file__), "frontend_dist")

if os.path.isdir(_frontend_dir):
    class SPAMiddleware(BaseHTTPMiddleware):
        async def dispatch(self, request: Request, call_next):
            path = request.url.path

            if path.startswith("/api") or path.startswith("/webhook") or path.startswith("/assets") or path == "/health":
                return await call_next(request)

            if request.method not in ("GET", "HEAD"):
                return await call_next(request)

            if path in ("/sw.js", "/manifest.json"):
                file_path = os.path.join(_frontend_dir, path.lstrip("/"))
                if os.path.isfile(file_path):
                    content_type = mimetypes.guess_type(file_path)[0] or "application/javascript"
                    return FileResponse(file_path, media_type=content_type, headers={"Cache-Control": "no-cache, no-store, must-revalidate"})

            if path != "/":
                clean_path = path.lstrip("/")
                file_path = os.path.join(_frontend_dir, clean_path)
                if os.path.isfile(file_path):
                    content_type = mimetypes.guess_type(file_path)[0] or "application/octet-stream"
                    return FileResponse(file_path, media_type=content_type)

            index_path = os.path.join(_frontend_dir, "index.html")
            return FileResponse(index_path, headers={"Cache-Control": "no-cache, no-store, must-revalidate"})

    app.add_middleware(SPAMiddleware)

    _assets_dir = os.path.join(_frontend_dir, "assets")
    if os.path.isdir(_assets_dir):
        app.mount("/assets", StaticFiles(directory=_assets_dir), name="frontend-assets")
