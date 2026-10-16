from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta
import logging

from database.core.connection import get_db
from database.core.timezone import now_sp
from database.models.recovery import Recovery, RecoveryChannel
from database.models.whatsapp_integration import WhatsAppConfig, RecoveryDispatch
from database.models.customer import Customer
from api.auth.deps import get_current_user
from services import evolution_service

logger = logging.getLogger("recovery_whatsapp")

router = APIRouter(prefix="/recovery/whatsapp", tags=["recovery-whatsapp"])


# ── Schemas ───────────────────────────────────────────────
class WhatsAppConfigSchema(BaseModel):
    base_url: str = ""
    api_key: str = ""
    instance_name: str = ""
    is_active: bool = True
    auto_dispatch_enabled: bool = False
    cadence_delays_minutes: str = "5,120,1440"

    class Config:
        from_attributes = True


class SendWhatsAppRequest(BaseModel):
    phone: Optional[str] = None
    text: str
    strategy: Optional[str] = "support"
    media_url: Optional[str] = None
    media_type: Optional[str] = "text"


class DirectSendWhatsAppRequest(BaseModel):
    phone: str
    text: str
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    product_name: Optional[str] = None
    strategy: Optional[str] = "support"


class ScheduleCadenceRequest(BaseModel):
    phone: str
    customer_name: Optional[str] = None
    product_name: Optional[str] = None
    checkout_link: Optional[str] = None
    lang: Optional[str] = "auto"


def _detect_country_lang(phone: str, country: str = "", requested_lang: str = "auto") -> str:
    """Detecta automaticamente o idioma correto do lead baseado no DDI do telefone ou país da Hotmart."""
    if requested_lang and requested_lang.lower() not in ("auto", ""):
        return requested_lang.lower()

    clean = "".join(filter(str.isdigit, phone or ""))
    c = (country or "").strip().upper()

    if c == "FR" or clean.startswith("33") or clean.startswith("0033"):
        return "fr"
    if c == "ES" or clean.startswith("34") or clean.startswith("0034"):
        return "es"
    if c == "BR" or clean.startswith("55") or clean.startswith("0055"):
        return "pt"
    if c in ("US", "GB", "CA", "AU") or clean.startswith("1") or clean.startswith("44"):
        return "en"
    if c == "IT" or clean.startswith("39") or clean.startswith("0039"):
        return "it"
    return "it"


# ── Helper Copies para Cadência Automática ────────────────
def _generate_auto_copy(
    step: int,
    name: str,
    product: str,
    link: str = "",
    lang: str = "it",
    phone: str = "",
    country: str = "",
) -> str:
    first_name = (name or "Cliente").strip().split(" ")[0]
    prod = product or "corso"
    final_lang = _detect_country_lang(phone=phone, country=country, requested_lang=lang)

    # 1. ITALIANO (IT)
    if final_lang == "it":
        link_cta = f"\n\n👉 Ecco il link sicuro: {link}" if link else ""
        footer = "\n\n_ℹ️ Notifica automatica del sistema pagamenti. Per supporto o domande, scrivi a supporto via email._"
        if step == 1:
            return (
                f"Ciao {first_name}! 👋 Ti contatto dal supporto di *{prod}*.\n\n"
                f"Ho visto che il tuo ordine è rimasto in sospeso. Nella maggior parte dei casi in Italia "
                f"si tratta solo della notifica *3D Secure* da autorizzare nell'app della tua banca (PostePay, Intesa, UniCredit, ecc.).{link_cta}\n\n"
                f"Hai riscontrato qualche difficoltà? Se hai dubbi sono a tua completa disposizione!\n_Equipe Info Courses_{footer}"
            )
        elif step == 2:
            return (
                f"Ciao {first_name}! 🎉 So quanto ci tenevi ad accedere a *{prod}*.\n\n"
                f"Per venirti incontro, ho fatto abilitare un coupon esclusivo con il *10% DI SCONTO* valido solo per le prossime 2 ore!{link_cta}\n\n"
                f"Approfitta dell'offerta riservata prima della chiusura. Qualsiasi dubbio sono qui! 🏷️\n_Equipe Info Courses_{footer}"
            )
        else:
            return (
                f"Ciao {first_name}, ti scrivo rapidamente: la tua prenotazione per *{prod}* sta per scadere "
                f"e il posto promozionale verrà riassegnato alla lista d'attesa.{link_cta}\n\n"
                f"Volevo darti la precedenza prima che il prezzo torni regolare. Posso aiutarti a completare? ⚡\n_Equipe Info Courses_{footer}"
            )

    # 2. FRANCÊS (FR)
    if final_lang == "fr":
        link_cta = f"\n\n👉 Voici votre lien sécurisé: {link}" if link else ""
        footer = "\n\n_ℹ️ Notification automatique du système de paiement. Pour toute assistance après-vente, écrivez au support par email._"
        if step == 1:
            return (
                f"Bonjour {first_name} ! 👋 Je vous contacte du support officiel de *{prod}*.\n\n"
                f"J'ai remarqué que votre commande est restée en attente. En France, il s'agit souvent de la validation *3D Secure* "
                f"à confirmer sur l'application de votre banque (BoursoBank, BNP, Crédit Agricole, etc.).{link_cta}\n\n"
                f"Avez-vous rencontré une difficulté ? Je reste à votre entière disposition !\n_Équipe Support_{footer}"
            )
        elif step == 2:
            return (
                f"Bonjour {first_name} ! 🎉 Afin de vous permettre de rejoindre *{prod}*, nous avons activé un coupon exclusif de *10% DE RÉDUCTION* valable pendant 2 heures !{link_cta}\n\n"
                f"Profitez de ce tarif préférentiel avant expiration ! 🏷️\n_Équipe Support_{footer}"
            )
        else:
            return (
                f"Bonjour {first_name}, votre réservation pour *{prod}* arrive à expiration sous peu.{link_cta}\n\n"
                f"C'est le dernier rappel avant la réattribution de votre place au tarif régulier. ⚡\n_Équipe Support_{footer}"
            )

    # 3. ESPANHOL (ES)
    if final_lang == "es":
        link_cta = f"\n\n👉 Aquí tienes tu enlace seguro: {link}" if link else ""
        footer = "\n\n_ℹ️ Notificación automática del sistema de pagos. Para atención post-venta contacte por correo electrónico._"
        if step == 1:
            return (
                f"¡Hola {first_name}! 👋 Te contacto del soporte oficial de *{prod}*.\n\n"
                f"Vi que tu pedido quedó pendiente. En la mayoría de los casos se trata de la autorización *3D Secure* "
                f"en la app de tu banco (BBVA, Santander, CaixaBank, etc.).{link_cta}\n\n"
                f"¿Tuviste alguna dificultad? ¡Estoy aquí para ayudarte a completar tu acceso!\n_Equipo de Soporte_{footer}"
            )
        elif step == 2:
            return (
                f"¡Hola {first_name}! 🎉 Para ayudarte a ingresar a *{prod}*, te habilité un cupón exclusivo con *10% DE DESCUENTO* válido solo por las próximas 2 horas.{link_cta}\n\n"
                f"¡Aprovecha antes de que finalice! 🏷️\n_Equipo de Soporte_{footer}"
            )
        else:
            return (
                f"Hola {first_name}, tu reserva especial para *{prod}* está por vencer.{link_cta}\n\n"
                f"Queríamos darte prioridad antes de que el precio vuelva a su valor habitual. ¿Te ayudo a finalizar? ⚡\n_Equipo de Soporte_{footer}"
            )

    # 4. PORTUGUÊS (PT)
    if final_lang == "pt":
        link_cta = f"\n\n👉 Link seguro de finalização: {link}" if link else ""
        footer = "\n\n_ℹ️ Notificação automática do sistema. Para suporte pós-venda, entre em contato via e-mail._"
        if step == 1:
            return (
                f"Olá {first_name}! 👋 Vi que seu pedido de *{prod}* ficou pendente.{link_cta}\n\n"
                f"Teve alguma dúvida ou dificuldade no pagamento? Estou à disposição para te ajudar a garantir seu acesso! 🚀{footer}"
            )
        elif step == 2:
            return (
                f"Oi {first_name}! Separei um *CUPOM ESPECIAL DE 10% OFF* válido pelas próximas 2 horas para você garantir seu acesso a *{prod}*!{link_cta}\n\n"
                f"Aproveite a condição exclusiva antes do encerramento! 🏷️{footer}"
            )
        else:
            return (
                f"Olá {first_name}, sua vaga promocional para *{prod}* expira em instantes!{link_cta}\n\n"
                f"Se precisar de ajuda para garantir antes do preço voltar ao valor normal, me avise aqui. ⚡{footer}"
            )

    # 5. INGLÊS (EN / DEFAULT)
    link_cta = f"\n\n👉 Secure checkout link: {link}" if link else ""
    footer = "\n\n_ℹ️ Automated payment system notification. For post-sales inquiries, please contact email support._"
    if step == 1:
        return (
            f"Hello {first_name}! 👋 This is official payment support for *{prod}*.\n\n"
            f"We noticed your order is still pending. Usually this is just the *3D Secure* authorization required in your banking app.{link_cta}\n\n"
            f"Did you run into any issues? I'm here to help you get started! 🚀{footer}"
        )
    elif step == 2:
        return (
            f"Hi {first_name}! To help you join *{prod}*, we've activated a special *10% DISCOUNT* coupon valid for the next 2 hours!{link_cta}\n\n"
            f"Take advantage of this reserved offer before it expires! 🏷️{footer}"
        )
    else:
        return (
            f"Hello {first_name}, your promotional reservation for *{prod}* is about to expire.{link_cta}\n\n"
            f"Last call before the slot is released at regular pricing. Let us know if you need assistance! ⚡{footer}"
        )


def _get_or_create_config(db: Session) -> WhatsAppConfig:
    cfg = db.query(WhatsAppConfig).first()
    if not cfg:
        cfg = WhatsAppConfig(
            base_url="https://evolution-api-production-87f6.up.railway.app",
            api_key="1f815cfe8072172908de28aaa6d15cf66829808e4d36181472c6db8d94a240a4",
            instance_name="ninja_recuperador",
            is_active=True,
            auto_dispatch_enabled=False,
            cadence_delays_minutes="5,120,1440",
        )
        db.add(cfg)
        db.commit()
        db.refresh(cfg)
    elif not cfg.base_url:
        # Preenche se estiver em branco
        cfg.base_url = "https://evolution-api-production-87f6.up.railway.app"
        cfg.api_key = "1f815cfe8072172908de28aaa6d15cf66829808e4d36181472c6db8d94a240a4"
        cfg.instance_name = "ninja_recuperador"
        db.commit()
        db.refresh(cfg)
    return cfg


# ── Rotas de Configuração ─────────────────────────────────
@router.get("/config", response_model=WhatsAppConfigSchema)
def get_whatsapp_config(
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """Retorna as configurações da Evolution API para envio de WhatsApp."""
    return _get_or_create_config(db)


@router.post("/config", response_model=WhatsAppConfigSchema)
def save_whatsapp_config(
    payload: WhatsAppConfigSchema,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """Atualiza as configurações da Evolution API."""
    cfg = _get_or_create_config(db)
    cfg.base_url = payload.base_url.strip()
    cfg.api_key = payload.api_key.strip()
    cfg.instance_name = payload.instance_name.strip()
    cfg.is_active = payload.is_active
    cfg.auto_dispatch_enabled = payload.auto_dispatch_enabled
    cfg.cadence_delays_minutes = payload.cadence_delays_minutes.strip() or "5,120,1440"

    db.commit()
    db.refresh(cfg)
    return cfg


@router.post("/test")
def test_whatsapp_connection(
    payload: Optional[WhatsAppConfigSchema] = None,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """Testa a conexão com a Evolution API e valida a instância informada."""
    if payload and (payload.base_url or payload.api_key):
        base_url = payload.base_url
        api_key = payload.api_key
        instance_name = payload.instance_name
    else:
        cfg = _get_or_create_config(db)
        base_url = cfg.base_url
        api_key = cfg.api_key
        instance_name = cfg.instance_name

    if not base_url or not api_key:
        return {
            "success": False,
            "connected": False,
            "error": "URL ou API Key da Evolution API não foram informadas.",
        }

    return evolution_service.test_connection(base_url, api_key, instance_name)


@router.get("/instances")
def list_whatsapp_instances(
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """Lista todas as instâncias existentes na Evolution API."""
    cfg = _get_or_create_config(db)
    if not cfg.base_url or not cfg.api_key:
        return {"success": False, "error": "Evolution API não configurada.", "instances": []}

    return evolution_service.fetch_instances(cfg.base_url, cfg.api_key)


@router.get("/qrcode")
def get_whatsapp_qrcode(
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """Retorna o QR Code em Base64 para conectar o WhatsApp na Evolution API."""
    cfg = _get_or_create_config(db)
    if not cfg.base_url or not cfg.api_key or not cfg.instance_name:
        return {"success": False, "error": "Evolution API não configurada."}

    return evolution_service.get_instance_qr_code(cfg.base_url, cfg.api_key, cfg.instance_name)


# ── Envio Imediato de Mensagem ─────────────────────────────
@router.post("/{recovery_id}/send")
def send_recovery_whatsapp(
    recovery_id: str,
    payload: SendWhatsAppRequest,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """
    Envia uma mensagem de WhatsApp instantaneamente via Evolution API
    associada a um lead de recuperação.
    """
    raw_id = recovery_id
    if raw_id.startswith("r-"):
        raw_id = raw_id[2:]
    elif raw_id.startswith("t-"):
        raw_id = raw_id[2:]

    try:
        rec_id = int(raw_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="ID de recuperação inválido.")

    rec = db.query(Recovery).filter(Recovery.id == rec_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Lead de recuperação não encontrado.")

    # Obter telefone: payload > rec > customer
    phone = payload.phone or rec.customer_phone
    if not phone and rec.customer_id:
        cust = db.query(Customer).filter(Customer.id == rec.customer_id).first()
        if cust and cust.phone:
            phone = cust.phone

    clean_digits = "".join(filter(str.isdigit, phone or ""))
    if not clean_digits:
        raise HTTPException(
            status_code=400,
            detail="Número de telefone não informado ou inválido.",
        )

    cfg = _get_or_create_config(db)
    if not cfg.base_url or not cfg.api_key or not cfg.instance_name:
        raise HTTPException(
            status_code=400,
            detail="Evolution API não está configurada (preencha URL, API Key e Nome da Instância nas Configurações).",
        )

    # Disparar envio via Evolution API
    res = evolution_service.send_whatsapp_message(
        base_url=cfg.base_url,
        api_key=cfg.api_key,
        instance_name=cfg.instance_name,
        number=clean_digits,
        content=payload.text,
        media_url=payload.media_url or "",
        media_type=payload.media_type or "text",
    )

    now = now_sp()
    is_success = res.get("success", False)
    msg_id = res.get("messageId")

    # Registrar log de disparo
    dispatch = RecoveryDispatch(
        recovery_id=rec.id,
        customer_name=rec.customer_name,
        customer_phone=clean_digits,
        customer_email=rec.customer_email,
        product_name=rec.product_name,
        step_number=1,
        strategy=payload.strategy or "support",
        message_text=payload.text,
        scheduled_at=now,
        sent_at=now if is_success else None,
        status="sent" if is_success else "failed",
        error_message=None if is_success else str(res.get("error")),
        evolution_message_id=str(msg_id) if msg_id else None,
    )
    db.add(dispatch)

    if is_success:
        rec.channel = RecoveryChannel.WHATSAPP
        if not rec.customer_phone:
            rec.customer_phone = clean_digits

    db.commit()

    if not is_success:
        return {
            "success": False,
            "error": res.get("error", "Falha desconhecida no envio via Evolution API."),
            "code": res.get("code"),
        }

    return {
        "success": True,
        "message": f"Mensagem enviada com sucesso para +{clean_digits} via WhatsApp!",
        "messageId": msg_id,
        "dispatchId": dispatch.id,
    }


@router.post("/direct-send")
def direct_send_whatsapp(
    payload: DirectSendWhatsAppRequest,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """Disparo avulso de mensagem de WhatsApp informando o número diretamente."""
    clean_digits = "".join(filter(str.isdigit, payload.phone or ""))
    if not clean_digits:
        raise HTTPException(status_code=400, detail="Número de telefone inválido.")

    cfg = _get_or_create_config(db)
    if not cfg.base_url or not cfg.api_key or not cfg.instance_name:
        raise HTTPException(
            status_code=400,
            detail="Evolution API não está configurada.",
        )

    res = evolution_service.send_whatsapp_message(
        base_url=cfg.base_url,
        api_key=cfg.api_key,
        instance_name=cfg.instance_name,
        number=clean_digits,
        content=payload.text,
    )

    now = now_sp()
    is_success = res.get("success", False)
    msg_id = res.get("messageId")

    dispatch = RecoveryDispatch(
        customer_name=payload.customer_name,
        customer_phone=clean_digits,
        customer_email=payload.customer_email,
        product_name=payload.product_name,
        step_number=1,
        strategy=payload.strategy or "custom",
        message_text=payload.text,
        scheduled_at=now,
        sent_at=now if is_success else None,
        status="sent" if is_success else "failed",
        error_message=None if is_success else str(res.get("error")),
        evolution_message_id=str(msg_id) if msg_id else None,
    )
    db.add(dispatch)
    db.commit()

    return {
        "success": is_success,
        "messageId": msg_id,
        "error": res.get("error") if not is_success else None,
    }


# ── Agendamento de Cadência Completa (Superpoder do Reflow) ───
@router.post("/{recovery_id}/schedule-cadence")
def schedule_cadence_for_recovery(
    recovery_id: str,
    payload: ScheduleCadenceRequest,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """
    Agenda uma sequência de recuperação inteligente (Passo 1 em 5 min, Passo 2 em 2 horas, Passo 3 em 24 horas).
    Caso o cliente compre (webhook de aprovado), os passos agendados futuros são cancelados automaticamente!
    """
    raw_id = recovery_id.replace("r-", "").replace("t-", "")
    try:
        rec_id = int(raw_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="ID de recuperação inválido.")

    rec = db.query(Recovery).filter(Recovery.id == rec_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Lead não encontrado.")

    clean_digits = "".join(filter(str.isdigit, payload.phone or rec.customer_phone or ""))
    if not clean_digits:
        raise HTTPException(status_code=400, detail="Telefone com DDI é obrigatório para agendamento.")

    cfg = _get_or_create_config(db)
    delays_str = cfg.cadence_delays_minutes or "5,120,1440"
    delay_minutes = []
    for d in delays_str.split(","):
        try:
            delay_minutes.append(int(d.strip()))
        except ValueError:
            pass

    if not delay_minutes:
        delay_minutes = [5, 120, 1440]

    strategies = ["support", "discount", "urgency"]
    now = now_sp()
    created_dispatches = []

    # Cancela agendamentos anteriores pendentes para evitar duplicatas
    db.query(RecoveryDispatch).filter(
        RecoveryDispatch.recovery_id == rec.id,
        RecoveryDispatch.status == "pending",
    ).update({"status": "cancelled", "error_message": "Substituído por nova cadência"})

    for i, minutes in enumerate(delay_minutes[:3]):
        step_num = i + 1
        strat = strategies[i] if i < len(strategies) else "support"
        scheduled_time = now + timedelta(minutes=minutes)
        text = _generate_auto_copy(
            step=step_num,
            name=payload.customer_name or rec.customer_name or "",
            product=payload.product_name or rec.product_name or "",
            link=payload.checkout_link or "",
            lang=payload.lang or "auto",
            phone=clean_digits,
            country=rec.customer_country or "",
        )

        disp = RecoveryDispatch(
            recovery_id=rec.id,
            customer_name=rec.customer_name,
            customer_phone=clean_digits,
            customer_email=rec.customer_email,
            product_name=rec.product_name,
            step_number=step_num,
            strategy=strat,
            message_text=text,
            scheduled_at=scheduled_time,
            status="pending",
        )
        db.add(disp)
        created_dispatches.append(disp)

    db.commit()

    return {
        "success": True,
        "message": f"Cadência de {len(created_dispatches)} mensagens agendada com sucesso!",
        "steps": [
            {
                "step": d.step_number,
                "strategy": d.strategy,
                "scheduledAt": d.scheduled_at.isoformat(),
            }
            for d in created_dispatches
        ],
    }


# ── Listagem e Gerenciamento de Disparos ───────────────────
@router.get("/dispatches")
def list_recovery_dispatches(
    recovery_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """Lista o histórico de mensagens enviadas ou agendadas pelo robô de recuperação."""
    q = db.query(RecoveryDispatch)

    if recovery_id:
        raw_id = recovery_id.replace("r-", "").replace("t-", "")
        try:
            q = q.filter(RecoveryDispatch.recovery_id == int(raw_id))
        except ValueError:
            pass

    if status and status != "all":
        q = q.filter(RecoveryDispatch.status == status)

    dispatches = q.order_by(RecoveryDispatch.created_at.desc()).limit(limit).all()

    return [
        {
            "id": d.id,
            "recoveryId": f"r-{d.recovery_id}" if d.recovery_id else None,
            "customerName": d.customer_name,
            "customerPhone": d.customer_phone,
            "customerEmail": d.customer_email,
            "productName": d.product_name,
            "stepNumber": d.step_number,
            "strategy": d.strategy,
            "messageText": d.message_text,
            "scheduledAt": d.scheduled_at.isoformat() if d.scheduled_at else None,
            "sentAt": d.sent_at.isoformat() if d.sent_at else None,
            "status": d.status,
            "errorMessage": d.error_message,
            "evolutionMessageId": d.evolution_message_id,
            "createdAt": d.created_at.isoformat() if d.created_at else None,
        }
        for d in dispatches
    ]


@router.delete("/dispatches/{dispatch_id}")
def cancel_recovery_dispatch(
    dispatch_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """Cancela um disparo agendado que ainda está com status 'pending'."""
    disp = db.query(RecoveryDispatch).filter(RecoveryDispatch.id == dispatch_id).first()
    if not disp:
        raise HTTPException(status_code=404, detail="Disparo não encontrado.")

    if disp.status != "pending":
        raise HTTPException(
            status_code=400,
            detail=f"Não é possível cancelar disparo com status '{disp.status}'.",
        )

    disp.status = "cancelled"
    disp.error_message = "Cancelado manualmente pelo usuário"
    db.commit()

    return {"success": True, "message": "Disparo cancelado com sucesso."}


def schedule_auto_cadence_for_lead(
    db: Session,
    recovery: Recovery,
    clean_digits: str,
    lang: str = "it",
    checkout_link: str = "",
) -> list[RecoveryDispatch]:
    """Helper chamado internamente (ex: em webhooks de abandono/recusa) para agendar cadência automática."""
    if not clean_digits:
        return []

    cfg = _get_or_create_config(db)
    if not cfg.auto_dispatch_enabled or not cfg.is_active or not cfg.base_url or not cfg.instance_name:
        return []

    delays_str = cfg.cadence_delays_minutes or "5,120,1440"
    delay_minutes = []
    for d in delays_str.split(","):
        try:
            delay_minutes.append(int(d.strip()))
        except ValueError:
            pass

    if not delay_minutes:
        delay_minutes = [5, 120, 1440]

    strategies = ["support", "discount", "urgency"]
    now = now_sp()
    dispatches = []

    # Cancela agendamentos anteriores para este mesmo lead
    db.query(RecoveryDispatch).filter(
        RecoveryDispatch.recovery_id == recovery.id,
        RecoveryDispatch.status == "pending",
    ).update({"status": "cancelled", "error_message": "Substituído por novo evento de abandono"})

    for i, minutes in enumerate(delay_minutes[:3]):
        step_num = i + 1
        strat = strategies[i] if i < len(strategies) else "support"
        scheduled_time = now + timedelta(minutes=minutes)
        text = _generate_auto_copy(
            step=step_num,
            name=recovery.customer_name or "",
            product=recovery.product_name or "",
            link=checkout_link,
            lang=lang or "auto",
            phone=clean_digits,
            country=recovery.customer_country or "",
        )

        disp = RecoveryDispatch(
            recovery_id=recovery.id,
            customer_name=recovery.customer_name,
            customer_phone=clean_digits,
            customer_email=recovery.customer_email,
            product_name=recovery.product_name,
            step_number=step_num,
            strategy=strat,
            message_text=text,
            scheduled_at=scheduled_time,
            status="pending",
        )
        db.add(disp)
        dispatches.append(disp)

    db.commit()
    logger.info(f"🤖 [Auto Cadence] Agendados {len(dispatches)} passos automáticos para lead {recovery.id} (+{clean_digits})")
    return dispatches


def cancel_pending_cadences_for_customer(
    db: Session,
    customer_email: str,
    product_name: Optional[str] = None,
) -> int:
    """Cancela todos os envios de recuperação pendentes para um cliente que concluiu a compra."""
    if not customer_email:
        return 0

    q = db.query(RecoveryDispatch).filter(
        RecoveryDispatch.customer_email == customer_email,
        RecoveryDispatch.status == "pending",
    )
    if product_name:
        q = q.filter(RecoveryDispatch.product_name == product_name)

    cancelled_count = q.update(
        {"status": "cancelled", "error_message": "Compra aprovada! Disparo cancelado automaticamente."},
        synchronize_session=False,
    )
    if cancelled_count > 0:
        db.commit()
        logger.info(f"🛑 [Auto Cadence] Cancelados {cancelled_count} envios pendentes para {customer_email} após aprovação da compra.")
    return cancelled_count
