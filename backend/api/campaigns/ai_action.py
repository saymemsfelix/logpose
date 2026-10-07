"""
Endpoint que executa ações sugeridas pela AI no chat.
Recebe o tipo de ação + entity_id e executa via Meta Ads API.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database.core.connection import get_db
from database.models.facebook_account import FacebookAccount
from database.models.campaign_action import ActionType
from api.auth.deps import get_current_user
from api.campaigns.actions import record_campaign_action
from integrations.meta_ads.manage import toggle_entity_status, update_budget, resolve_meta_entity

router = APIRouter(prefix="/campaigns", tags=["campaigns"])


class AiActionRequest(BaseModel):
    action: str  # increase_budget | decrease_budget | set_budget | pause | activate
    entity_id: str
    entity_type: str = "campaign"  # campaign | adset
    entity_name: str
    value: float = 0  # valor do orçamento (para budget actions)
    current_budget: float = 0  # orçamento atual
    metrics: dict = {}


@router.post("/ai-action")
async def execute_ai_action(
    payload: AiActionRequest,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """Executa uma ação sugerida pela AI com resolução inteligente de IDs."""
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

    # Se ainda for um placeholder não resolvido (ex: "ID_DA_CAMPANHA_BIDCAP_1")
    if not (real_id.isdigit() and len(real_id) >= 6):
        raise HTTPException(
            status_code=400,
            detail=f"Não foi possível localizar a campanha '{payload.entity_name}' no seu Facebook Ads. Verifique se o nome confere com o Gerenciador de Anúncios."
        )

    effective_current_budget = payload.current_budget
    if meta_current_budget and meta_current_budget > 0:
        effective_current_budget = meta_current_budget
    elif not effective_current_budget or effective_current_budget <= 0:
        effective_current_budget = 0.0

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

        # Garantir valor mínimo de R$ 6,00 (mínimo exigido pelo Meta Ads)
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
