"""
Endpoint que executa ações sugeridas pelo Ninja AI no chat (imediatas ou agendadas).
Recebe o tipo de ação + entity_id e executa via Meta Ads API, com suporte a agendamento automático.
"""
from datetime import datetime
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from database.core.connection import get_db
from database.core.timezone import now_sp
from database.models.facebook_account import FacebookAccount
from database.models.campaign_action import ActionType
from database.models.scheduled_campaign_action import ScheduledCampaignAction
from api.auth.deps import get_current_user
from api.campaigns.actions import record_campaign_action
from integrations.meta_ads.manage import toggle_entity_status, update_budget, resolve_meta_entity

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/campaigns", tags=["campaigns"])


class AiActionRequest(BaseModel):
    action: str  # increase_budget | decrease_budget | set_budget | pause | activate
    entity_id: str
    entity_type: str = "campaign"  # campaign | adset
    entity_name: str
    value: float = 0  # valor do orçamento (para budget actions)
    current_budget: float = 0  # orçamento atual
    scheduled_at: Optional[str] = None  # YYYY-MM-DD HH:MM:SS ou ISO
    schedule_label: Optional[str] = None  # "amanhã às 05:30"
    metrics: dict = {}


async def execute_single_scheduled_action(db: Session, item: ScheduledCampaignAction):
    """Executa uma ação agendada via Meta Ads API."""
    try:
        fb_account = db.query(FacebookAccount).filter(
            FacebookAccount.token_valid.is_(True)
        ).first()
        if not fb_account:
            item.status = "failed"
            item.result_message = "Nenhuma conta Facebook Ads configurada ou token inválido"
            db.commit()
            return

        # Resolução inteligente de IDs
        real_id, real_type, meta_current_budget = await resolve_meta_entity(
            access_token=fb_account.access_token,
            account_id=fb_account.account_id,
            entity_id=item.entity_id,
            entity_name=item.entity_name,
            entity_type=item.entity_type,
        )

        effective_current_budget = item.current_budget
        if meta_current_budget and meta_current_budget > 0:
            effective_current_budget = meta_current_budget

        action = item.action
        new_budget = effective_current_budget
        action_type = ActionType.PAUSE

        if action in ("pause", "activate"):
            new_status = "ACTIVE" if action == "activate" else "PAUSED"
            result = await toggle_entity_status(
                access_token=fb_account.access_token,
                entity_id=real_id,
                entity_type=real_type,
                new_status=new_status,
            )
            if not result.get("success"):
                item.status = "failed"
                item.result_message = result.get("error", "Erro ao alterar status no Meta Ads")
                db.commit()
                return

            action_type = ActionType.ACTIVATE if action == "activate" else ActionType.PAUSE
            item.result_message = f"{'Ativada' if action == 'activate' else 'Pausada'} com sucesso no Meta Ads"

        elif action in ("increase_budget", "decrease_budget", "set_budget"):
            if action == "increase_budget":
                new_budget = effective_current_budget + item.value
            elif action == "decrease_budget":
                new_budget = max(6.0, effective_current_budget - item.value)
            else:
                new_budget = item.value
            new_budget = max(6.0, new_budget)

            result = await update_budget(
                access_token=fb_account.access_token,
                entity_id=real_id,
                entity_type=real_type,
                daily_budget_reais=new_budget,
            )
            if not result.get("success"):
                item.status = "failed"
                item.result_message = result.get("error", "Erro ao atualizar orçamento no Meta Ads")
                db.commit()
                return

            action_type = (
                ActionType.BUDGET_INCREASE if new_budget > effective_current_budget
                else ActionType.BUDGET_DECREASE
            )
            item.result_message = f"Orçamento ajustado no Meta Ads: R${effective_current_budget:.0f} → R${new_budget:.0f}"

        item.status = "executed"
        item.executed_at = now_sp()
        db.commit()

        # Registrar no histórico de aprendizado do CEO
        try:
            record_campaign_action(
                db=db,
                entity_id=real_id,
                entity_type=real_type,
                entity_name=item.entity_name,
                action_type=action_type,
                metrics={},
                budget_before=effective_current_budget,
                budget_after=new_budget if action not in ("pause", "activate") else effective_current_budget,
            )
        except Exception:
            pass
        logger.info(f"✅ [Ninja AI] Ação agendada executada com sucesso: {item.entity_name} ({item.action})")
    except Exception as exc:
        logger.error(f"Erro ao executar ação agendada ID {item.id}: {exc}")
        item.status = "failed"
        item.result_message = str(exc)
        db.commit()


@router.post("/ai-action")
async def execute_ai_action(
    payload: AiActionRequest,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """Executa ou agenda uma ação sugerida pelo Ninja AI com resolução inteligente de IDs."""
    fb_account = db.query(FacebookAccount).filter(
        FacebookAccount.token_valid.is_(True)
    ).first()
    if not fb_account:
        raise HTTPException(
            status_code=404,
            detail="Nenhuma conta Facebook Ads configurada ou token de acesso inválido. Conecte sua conta em Integrações."
        )

    # 1. Resolução inteligente do ID e tipo real no Meta Ads
    real_id, real_type, meta_current_budget = await resolve_meta_entity(
        access_token=fb_account.access_token,
        account_id=fb_account.account_id,
        entity_id=payload.entity_id,
        entity_name=payload.entity_name,
        entity_type=payload.entity_type,
    )

    effective_current_budget = payload.current_budget
    if meta_current_budget and meta_current_budget > 0:
        effective_current_budget = meta_current_budget
    elif not effective_current_budget or effective_current_budget <= 0:
        effective_current_budget = 0.0

    # 2. Se a ação possui agendamento programado (scheduled_at no futuro)
    if payload.scheduled_at:
        try:
            target_str = payload.scheduled_at.replace("T", " ").strip()
            if len(target_str) == 16:  # YYYY-MM-DD HH:MM
                target_str += ":00"
            target_dt = datetime.strptime(target_str[:19], "%Y-%m-%d %H:%M:%S")

            if target_dt > now_sp():
                scheduled_item = ScheduledCampaignAction(
                    entity_id=real_id or payload.entity_id,
                    entity_type=real_type or payload.entity_type,
                    entity_name=payload.entity_name,
                    action=payload.action,
                    value=payload.value,
                    current_budget=effective_current_budget,
                    scheduled_for=target_dt,
                    schedule_label=payload.schedule_label or target_dt.strftime("%d/%m às %H:%M"),
                    status="pending",
                )
                db.add(scheduled_item)
                db.commit()
                db.refresh(scheduled_item)

                label = payload.schedule_label or target_dt.strftime("%d/%m às %H:%M")
                return {
                    "status": "scheduled",
                    "scheduled": True,
                    "scheduled_id": scheduled_item.id,
                    "scheduled_for": str(target_dt),
                    "schedule_label": label,
                    "message": f"⏰ Ação agendada com sucesso para {label} ({payload.entity_name})! O Ninja AI executará a alteração diretamente no Meta Ads no horário programado."
                }
        except Exception as schedule_err:
            logger.warning(f"Falha ao agendar ação, prosseguindo com execução imediata: {schedule_err}")

    # 3. Execução imediata no Meta Ads
    if not (real_id.isdigit() and len(real_id) >= 6):
        raise HTTPException(
            status_code=400,
            detail=f"Não foi possível localizar a campanha '{payload.entity_name}' no seu Facebook Ads. Verifique se o nome confere com o Gerenciador de Anúncios."
        )

    action = payload.action
    result_msg = ""
    new_budget = effective_current_budget
    action_type = ActionType.PAUSE

    if action in ("pause", "activate"):
        new_status = "ACTIVE" if action == "activate" else "PAUSED"
        result = await toggle_entity_status(
            access_token=fb_account.access_token,
            entity_id=real_id,
            entity_type=real_type,
            new_status=new_status,
        )
        if not result["success"]:
            raise HTTPException(
                status_code=400,
                detail=result.get("error", f"Falha ao alterar status da campanha {payload.entity_name} no Meta Ads")
            )

        action_type = ActionType.ACTIVATE if action == "activate" else ActionType.PAUSE
        result_msg = f"{'Ativada' if action == 'activate' else 'Pausada'} com sucesso no Meta Ads: {payload.entity_name}"

    elif action in ("increase_budget", "decrease_budget", "set_budget"):
        if action == "increase_budget":
            new_budget = effective_current_budget + payload.value
        elif action == "decrease_budget":
            new_budget = max(6.0, effective_current_budget - payload.value)
        else:
            new_budget = payload.value

        new_budget = max(6.0, new_budget)

        result = await update_budget(
            access_token=fb_account.access_token,
            entity_id=real_id,
            entity_type=real_type,
            daily_budget_reais=new_budget,
        )
        if not result["success"]:
            raise HTTPException(
                status_code=400,
                detail=result.get("error", f"Falha ao atualizar orçamento de {payload.entity_name} no Meta Ads")
            )

        note = f" ({result['note']})" if result.get("note") else ""
        action_type = (
            ActionType.BUDGET_INCREASE if new_budget > effective_current_budget
            else ActionType.BUDGET_DECREASE
        )
        result_msg = (
            f"Orçamento de {payload.entity_name} ajustado no Meta Ads: "
            f"R${effective_current_budget:.0f} → R${new_budget:.0f}{note}"
        )

    else:
        raise HTTPException(status_code=400, detail=f"Ação desconhecida: {action}")

    # Registrar ação para histórico de aprendizado do CEO
    try:
        record_campaign_action(
            db=db,
            entity_id=real_id,
            entity_type=real_type,
            entity_name=payload.entity_name,
            action_type=action_type,
            metrics=payload.metrics,
            budget_before=effective_current_budget,
            budget_after=new_budget if action not in ("pause", "activate") else effective_current_budget,
        )
    except Exception:
        pass

    return {"status": "ok", "message": result_msg}


@router.get("/scheduled-actions")
def list_scheduled_actions(
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """Lista as ações agendadas do Ninja AI."""
    actions = (
        db.query(ScheduledCampaignAction)
        .order_by(ScheduledCampaignAction.created_at.desc())
        .limit(30)
        .all()
    )
    return [
        {
            "id": a.id,
            "entity_name": a.entity_name,
            "action": a.action,
            "value": a.value,
            "scheduled_for": a.scheduled_for.strftime("%Y-%m-%d %H:%M:%S") if a.scheduled_for else None,
            "schedule_label": a.schedule_label,
            "status": a.status,
            "result_message": a.result_message,
            "created_at": a.created_at.strftime("%Y-%m-%d %H:%M:%S") if a.created_at else None,
        }
        for a in actions
    ]
