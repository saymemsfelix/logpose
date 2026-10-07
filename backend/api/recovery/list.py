from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from pydantic import BaseModel

from database.core.connection import get_db
from database.core.timezone import now_sp
from database.models.recovery import Recovery
from database.models.customer import Customer
from database.models.transaction import Transaction, TransactionStatus
from database.models.recovery_channel_config import RecoveryChannelConfig
from api.auth.deps import get_current_user
from api.funnel.date_helpers import resolve_date_range

router = APIRouter(prefix="/recovery", tags=["recovery"])


def _resolve_amount(amount: float | None, product_name: str | None) -> float:
    if amount and amount > 0:
        return float(amount)
    if not product_name:
        return 97.00
    pn_lower = product_name.lower()
    if any(k in pn_lower for k in ["diagnosi", "visive", "hardware", "software"]):
        return 75.18
    elif any(k in pn_lower for k in ["bump", "multimetro", "connettori", "pinout"]):
        return 25.06
    elif "ecografici" in pn_lower:
        return 19.46
    return 97.00


def _get_channel_configs(db: Session) -> list[RecoveryChannelConfig]:
    return db.query(RecoveryChannelConfig).all()


def _classify_src(src: str | None, configs: list[RecoveryChannelConfig]) -> str:
    """Classifica canal baseado no src usando as configs salvas."""
    if not src:
        return "other"
    src_lower = src.lower()
    for cfg in configs:
        if cfg.keyword and cfg.keyword.lower() in src_lower:
            return cfg.channel
    return "other"


def _build_approved_with_src_query(db: Session, configs, dt_start, dt_end):
    """
    Busca transações APPROVED que tenham src correspondente a alguma
    keyword configurada. Essas são vendas recuperadas via canais.
    """
    if not configs:
        return None

    keyword_filters = []
    for cfg in configs:
        if cfg.keyword:
            keyword_filters.append(
                func.lower(Transaction.src).contains(cfg.keyword.lower())
            )

    if not keyword_filters:
        return None

    q = db.query(
        Transaction,
        Customer.name.label("customer_name"),
        Customer.phone.label("customer_phone"),
        Customer.country.label("customer_country"),
    ).outerjoin(
        Customer, Transaction.customer_id == Customer.id,
    ).filter(
        Transaction.status == TransactionStatus.APPROVED,
        Transaction.src.isnot(None),
        Transaction.src != "",
        or_(*keyword_filters),
    )

    if dt_start:
        q = q.filter(Transaction.created_at >= dt_start)
    if dt_end:
        q = q.filter(Transaction.created_at <= dt_end)

    return q


def _build_recoveries_query(db: Session, recovered: bool, dt_start, dt_end):
    """Busca registros na tabela recoveries com join em customers para telefone e país."""
    q = db.query(
        Recovery,
        func.coalesce(Recovery.customer_phone, Customer.phone).label("cust_phone"),
        func.coalesce(Recovery.customer_country, Customer.country).label("cust_country"),
    ).outerjoin(
        Customer,
        or_(
            Recovery.customer_id == Customer.id,
            Recovery.customer_email == Customer.email,
        ),
    ).filter(Recovery.recovered.is_(recovered))

    if dt_start:
        q = q.filter(Recovery.created_at >= dt_start)
    if dt_end:
        q = q.filter(Recovery.created_at <= dt_end)

    return q


class UpdateRecoveryStatusRequest(BaseModel):
    recovered: bool
    channel: str | None = None


@router.put("/{recovery_id}/status")
def update_recovery_status(
    recovery_id: str,
    payload: UpdateRecoveryStatusRequest,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """Permite marcar uma recuperação como Recuperado ou Pendente."""
    raw_id = recovery_id
    if raw_id.startswith("r-"):
        raw_id = raw_id[2:]
    elif raw_id.startswith("t-"):
        return {"success": True, "message": "Transação aprovada já consta como recuperada"}

    try:
        rec_id = int(raw_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="ID de recuperação inválido")

    rec = db.query(Recovery).filter(Recovery.id == rec_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Recuperação não encontrada")

    rec.recovered = payload.recovered
    if payload.recovered:
        rec.recovered_at = now_sp()
        if payload.channel:
            try:
                from database.models.recovery import RecoveryChannel
                rec.channel = RecoveryChannel(payload.channel)
            except Exception:
                pass
    else:
        rec.recovered_at = None

    db.commit()
    return {
        "success": True,
        "id": f"r-{rec.id}",
        "recovered": rec.recovered,
        "recovered_at": rec.recovered_at.isoformat() if rec.recovered_at else None,
    }


@router.get("/list")
def list_recoveries(
    preset: str = Query("30d"),
    date_start: str | None = Query(None),
    date_end: str | None = Query(None),
    type_filter: str = Query("all"),
    status_filter: str = Query("all"),
    channel_filter: str = Query("all"),
    product_id: int | None = Query(None),
    upsell_id: int | None = Query(None),
    search: str | None = Query(None),
    account_slug: str | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(12, ge=1, le=200),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    from api.products.alias_helper import get_product_names_for_filter, get_upsell_name_for_filter

    dt_start, dt_end = resolve_date_range(preset, date_start, date_end)
    configs = _get_channel_configs(db)

    upsell_name: str | None = None
    product_names: list[str] | None = None
    
    if upsell_id:
        upsell_name = get_upsell_name_for_filter(db, upsell_id)
    elif product_id:
        product_names = get_product_names_for_filter(db, product_id)

    items = []

    # ── Pendentes (da tabela recoveries) ──
    if status_filter in ("all", "pending"):
        if type_filter != "unidentified":
            pending_q = _build_recoveries_query(db, recovered=False, dt_start=dt_start, dt_end=dt_end)
            if type_filter != "all":
                pending_q = pending_q.filter(Recovery.type == type_filter)
            if upsell_name:
                pending_q = pending_q.filter(Recovery.product_name.ilike(f"%{upsell_name}%"))
            elif product_names is not None:
                pending_q = pending_q.filter(Recovery.product_name.in_(product_names))
            if search:
                term = f"%{search}%"
                pending_q = pending_q.filter(
                    or_(
                        Recovery.customer_name.ilike(term),
                        Recovery.customer_email.ilike(term),
                    )
                )
            for r, phone, country in pending_q.all():
                channel = _classify_src(r.src, configs)
                if channel_filter != "all" and channel != channel_filter:
                    continue
                if account_slug and account_slug != "all" and r.webhook_slug != account_slug:
                    continue
                items.append(_recovery_to_row(r, channel, phone, country))

    # ── Recuperados (da tabela recoveries com recovered=True) ──
    if status_filter in ("all", "recovered"):
        if type_filter != "unidentified":
            rec_q = _build_recoveries_query(db, recovered=True, dt_start=dt_start, dt_end=dt_end)
            if type_filter != "all":
                rec_q = rec_q.filter(Recovery.type == type_filter)
            if upsell_name:
                rec_q = rec_q.filter(Recovery.product_name.ilike(f"%{upsell_name}%"))
            elif product_names is not None:
                rec_q = rec_q.filter(Recovery.product_name.in_(product_names))
            if search:
                term = f"%{search}%"
                rec_q = rec_q.filter(
                    or_(
                        Recovery.customer_name.ilike(term),
                        Recovery.customer_email.ilike(term),
                    )
                )
            for r, phone, country in rec_q.all():
                channel = _classify_src(r.src, configs)
                if channel_filter != "all" and channel != channel_filter:
                    continue
                if account_slug and account_slug != "all" and r.webhook_slug != account_slug:
                    continue
                items.append(_recovery_to_row(r, channel, phone, country))

    # ── Recuperados (transações aprovadas com src matching) ──
    if status_filter in ("all", "recovered"):
        if type_filter in ("all", "unidentified"):
            approved_q = _build_approved_with_src_query(
                db, configs, dt_start, dt_end,
            )
            if approved_q is not None:
                if upsell_name:
                    approved_q = approved_q.filter(Transaction.product_name.ilike(f"%{upsell_name}%"))
                elif product_names is not None:
                    approved_q = approved_q.filter(Transaction.product_name.in_(product_names))
                if search:
                    term = f"%{search}%"
                    approved_q = approved_q.filter(
                        or_(
                            Transaction.customer_email.ilike(term),
                            Transaction.product_name.ilike(term),
                        )
                    )
                if account_slug and account_slug != "all":
                    approved_q = approved_q.filter(Transaction.webhook_slug == account_slug)
                for tx, cust_name, cust_phone, cust_country in approved_q.all():
                    channel = _classify_src(tx.src, configs)
                    if channel_filter != "all" and channel != channel_filter:
                        continue
                    items.append(_tx_to_row(tx, channel, cust_name, cust_phone, cust_country))

    # ── Ordenar por data (mais recente primeiro) ──
    items.sort(key=lambda x: x.get("date") or "", reverse=True)

    total = len(items)
    start = (page - 1) * per_page
    paginated = items[start: start + per_page]

    return {
        "total": total,
        "page": page,
        "per_page": per_page,
        "items": paginated,
    }


def _recovery_to_row(r: Recovery, channel: str, phone: str | None = None, country: str | None = None) -> dict:
    resolved_amount = _resolve_amount(r.amount, r.product_name)
    resolved_country = country or getattr(r, "customer_country", None) or None
    raw_type = r.type.value if r.type else "abandoned_cart"
    # Se o cliente for internacional ou produto italiano, não existe PIX
    if (resolved_country or "").strip().upper() not in ["", "BR"] and raw_type == "unpaid_pix":
        raw_type = "declined_card"
    return {
        "id": f"r-{r.id}",
        "rawId": r.id,
        "date": r.created_at.isoformat() if r.created_at else None,
        "customerName": r.customer_name or "—",
        "customerEmail": r.customer_email or "—",
        "customerPhone": phone or getattr(r, "customer_phone", None) or None,
        "customerCountry": resolved_country,
        "product": r.product_name or "—",
        "type": raw_type,
        "amount": resolved_amount,
        "recovered": bool(r.recovered),
        "channel": channel,
        "recoveredAt": r.recovered_at.isoformat() if r.recovered_at else None,
    }


def _tx_to_row(tx: Transaction, channel: str, customer_name: str | None = None, phone: str | None = None, country: str | None = None) -> dict:
    resolved_amount = _resolve_amount(tx.amount, tx.product_name)
    return {
        "id": f"t-{tx.id}",
        "rawId": tx.id,
        "date": tx.created_at.isoformat() if tx.created_at else None,
        "customerName": customer_name or tx.customer_email or "—",
        "customerEmail": tx.customer_email or "—",
        "customerPhone": phone,
        "customerCountry": country or tx.country or None,
        "product": tx.product_name or "—",
        "type": "unidentified",
        "amount": resolved_amount,
        "recovered": True,
        "channel": channel,
        "recoveredAt": tx.created_at.isoformat() if tx.created_at else None,
    }


@router.get("/summary")
def recovery_summary(
    preset: str = Query("30d"),
    date_start: str | None = Query(None),
    date_end: str | None = Query(None),
    type_filter: str = Query("all"),
    status_filter: str = Query("all"),
    channel_filter: str = Query("all"),
    product_id: int | None = Query(None),
    upsell_id: int | None = Query(None),
    search: str | None = Query(None),
    account_slug: str | None = Query(None),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """KPIs agregados da recuperação, calculados sobre o dataset completo (sem paginação)."""
    from api.products.alias_helper import get_product_names_for_filter, get_upsell_name_for_filter

    dt_start, dt_end = resolve_date_range(preset, date_start, date_end)
    configs = _get_channel_configs(db)

    upsell_name: str | None = None
    product_names: list[str] | None = None
    if upsell_id:
        upsell_name = get_upsell_name_for_filter(db, upsell_id)
    elif product_id:
        product_names = get_product_names_for_filter(db, product_id)

    all_rows: list[dict] = []

    # ── Pendentes (da tabela recoveries) ──
    if status_filter in ("all", "pending"):
        if type_filter != "unidentified":
            pending_q = _build_recoveries_query(db, recovered=False, dt_start=dt_start, dt_end=dt_end)
            if type_filter != "all":
                pending_q = pending_q.filter(Recovery.type == type_filter)
            if upsell_name:
                pending_q = pending_q.filter(Recovery.product_name.ilike(f"%{upsell_name}%"))
            elif product_names is not None:
                pending_q = pending_q.filter(Recovery.product_name.in_(product_names))
            if search:
                term = f"%{search}%"
                pending_q = pending_q.filter(
                    or_(
                        Recovery.customer_name.ilike(term),
                        Recovery.customer_email.ilike(term),
                    )
                )
            for r, _, _ in pending_q.all():
                channel = _classify_src(r.src, configs)
                if channel_filter != "all" and channel != channel_filter:
                    continue
                if account_slug and account_slug != "all" and r.webhook_slug != account_slug:
                    continue
                resolved = _resolve_amount(r.amount, r.product_name)
                all_rows.append({"recovered": False, "amount": resolved, "channel": channel})

    # ── Recuperados (da tabela recoveries com recovered=True) ──
    if status_filter in ("all", "recovered"):
        if type_filter != "unidentified":
            rec_q = _build_recoveries_query(db, recovered=True, dt_start=dt_start, dt_end=dt_end)
            if type_filter != "all":
                rec_q = rec_q.filter(Recovery.type == type_filter)
            if upsell_name:
                rec_q = rec_q.filter(Recovery.product_name.ilike(f"%{upsell_name}%"))
            elif product_names is not None:
                rec_q = rec_q.filter(Recovery.product_name.in_(product_names))
            if search:
                term = f"%{search}%"
                rec_q = rec_q.filter(
                    or_(
                        Recovery.customer_name.ilike(term),
                        Recovery.customer_email.ilike(term),
                    )
                )
            for r, _, _ in rec_q.all():
                channel = _classify_src(r.src, configs)
                if channel_filter != "all" and channel != channel_filter:
                    continue
                if account_slug and account_slug != "all" and r.webhook_slug != account_slug:
                    continue
                resolved = _resolve_amount(r.amount, r.product_name)
                all_rows.append({"recovered": True, "amount": resolved, "channel": channel})

    # ── Recuperados (transações aprovadas com src matching) ──
    if status_filter in ("all", "recovered"):
        if type_filter in ("all", "unidentified"):
            approved_q = _build_approved_with_src_query(db, configs, dt_start, dt_end)
            if approved_q is not None:
                if upsell_name:
                    approved_q = approved_q.filter(Transaction.product_name.ilike(f"%{upsell_name}%"))
                elif product_names is not None:
                    approved_q = approved_q.filter(Transaction.product_name.in_(product_names))
                if search:
                    term = f"%{search}%"
                    approved_q = approved_q.filter(
                        or_(
                            Transaction.customer_email.ilike(term),
                            Transaction.product_name.ilike(term),
                        )
                    )
                for tx, _, _, _ in approved_q.all():
                    channel = _classify_src(tx.src, configs)
                    if channel_filter != "all" and channel != channel_filter:
                        continue
                    if account_slug and account_slug != "all" and tx.webhook_slug != account_slug:
                        continue
                    resolved = _resolve_amount(tx.amount, tx.product_name)
                    all_rows.append({"recovered": True, "amount": resolved, "channel": channel})

    total = len(all_rows)
    recovered_rows = [r for r in all_rows if r["recovered"]]
    pending_rows = [r for r in all_rows if not r["recovered"]]

    recovered_count = len(recovered_rows)
    pending_count = len(pending_rows)
    recovery_rate = round((recovered_count / total * 100), 1) if total > 0 else 0.0
    recovered_amount = sum(r["amount"] for r in recovered_rows)
    lost_amount = sum(r["amount"] for r in pending_rows)

    # Contagem recuperados por canal
    def _count_channel(channel: str) -> int:
        return sum(1 for r in recovered_rows if r["channel"] == channel)

    return {
        "total": total,
        "recovered": recovered_count,
        "pending": pending_count,
        "recovery_rate": recovery_rate,
        "recovered_amount": round(recovered_amount, 2),
        "lost_amount": round(lost_amount, 2),
        "by_channel": {
            "whatsapp": _count_channel("whatsapp"),
            "email": _count_channel("email"),
            "sms": _count_channel("sms"),
            "back_redirect": _count_channel("back_redirect"),
            "other": _count_channel("other"),
        },
    }

