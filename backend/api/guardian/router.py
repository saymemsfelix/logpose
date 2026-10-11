"""
Endpoints do Guardião de Lucro (Regras Automatizadas & Stop-Loss).
Monitora conjuntos de anúncios e campanhas em tempo real, executando ações automáticas
ou emitindo alertas contra desperdício de verba.
"""
import json
import logging
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database.core.connection import get_db
from database.core.timezone import now_sp, today_sp_str
from database.models.guardian_rule import GuardianRule
from database.models.guardian_log import GuardianLog
from database.models.facebook_account import FacebookAccount
from database.models.transaction import Transaction, TransactionStatus
from api.auth.deps import get_current_user
from integrations.meta_ads.service import MetaAdsService
from integrations.meta_ads.manage import update_adset_details, update_campaign_details

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/guardian", tags=["guardian"])


class RuleCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None
    entity_type: str = "adset"  # adset | campaign
    condition_type: str  # spend_without_sales | cpa_above | roas_above | ctr_below | frequency_above
    threshold_value: float
    secondary_threshold: float = 0.0
    action: str = "pause"  # pause | notify | increase_budget | decrease_budget
    action_value: float = 0.0
    is_active: bool = True


class RuleUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    entity_type: Optional[str] = None
    condition_type: Optional[str] = None
    threshold_value: Optional[float] = None
    secondary_threshold: Optional[float] = None
    action: Optional[str] = None
    action_value: Optional[float] = None
    is_active: Optional[bool] = None


DEFAULT_RULES = [
    {
        "name": "Stop-Loss Anti-Prejuízo (Zero Vendas)",
        "description": "Pausa automaticamente o conjunto se gastar mais de R$ 80,00 no dia sem gerar nenhuma venda.",
        "entity_type": "adset",
        "condition_type": "spend_without_sales",
        "threshold_value": 80.0,
        "secondary_threshold": 0.0,
        "action": "pause",
        "action_value": 0.0,
        "is_active": True,
    },
    {
        "name": "Teto de CPA Excedido (Bid Cap Guard)",
        "description": "Pausa ou alerta se o CPA médio do conjunto ultrapassar R$ 90,00 (após pelo menos 1 venda).",
        "entity_type": "adset",
        "condition_type": "cpa_above",
        "threshold_value": 90.0,
        "secondary_threshold": 1.0,
        "action": "pause",
        "action_value": 0.0,
        "is_active": True,
    },
    {
        "name": "Detector de Escala (Winner / ROAS 2.5x+)",
        "description": "Alerta oportunidade de escala quando o conjunto bater ROAS acima de 2.5x com pelo menos 2 vendas.",
        "entity_type": "adset",
        "condition_type": "roas_above",
        "threshold_value": 2.5,
        "secondary_threshold": 2.0,
        "action": "notify",
        "action_value": 20.0,
        "is_active": True,
    },
    {
        "name": "Alerta de CTR Crítico (Criativo Ineficiente)",
        "description": "Notifica quando o CTR ficar abaixo de 0.8% após gastar pelo menos R$ 40,00 no dia.",
        "entity_type": "adset",
        "condition_type": "ctr_below",
        "threshold_value": 0.8,
        "secondary_threshold": 40.0,
        "action": "notify",
        "action_value": 0.0,
        "is_active": True,
    },
]


def _ensure_default_rules(db: Session):
    count = db.query(GuardianRule).count()
    if count == 0:
        for r_data in DEFAULT_RULES:
            rule = GuardianRule(**r_data)
            db.add(rule)
        db.commit()


@router.get("/rules")
def get_rules(db: Session = Depends(get_db), _=Depends(get_current_user)):
    """Retorna todas as regras configuradas no Guardião (inicia padrões se vazio)."""
    _ensure_default_rules(db)
    rules = db.query(GuardianRule).order_id(GuardianRule.id.asc()) if hasattr(GuardianRule, "order_id") else db.query(GuardianRule).order_by(GuardianRule.id.asc()).all()
    return {
        "rules": [
            {
                "id": r.id,
                "name": r.name,
                "description": r.description,
                "entity_type": r.entity_type,
                "condition_type": r.condition_type,
                "threshold_value": r.threshold_value,
                "secondary_threshold": r.secondary_threshold,
                "action": r.action,
                "action_value": r.action_value,
                "is_active": r.is_active,
                "last_run_at": r.last_run_at.isoformat() if r.last_run_at else None,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in rules
        ]
    }


@router.post("/rules")
def create_rule(
    payload: RuleCreateRequest,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """Cria uma nova regra para o Guardião."""
    rule = GuardianRule(
        name=payload.name,
        description=payload.description,
        entity_type=payload.entity_type,
        condition_type=payload.condition_type,
        threshold_value=payload.threshold_value,
        secondary_threshold=payload.secondary_threshold,
        action=payload.action,
        action_value=payload.action_value,
        is_active=payload.is_active,
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return {"status": "ok", "rule_id": rule.id, "message": "Regra criada com sucesso"}


@router.put("/rules/{rule_id}")
def update_rule(
    rule_id: int,
    payload: RuleUpdateRequest,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """Atualiza ou ativa/desativa uma regra existente."""
    rule = db.query(GuardianRule).filter(GuardianRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Regra não encontrada")

    update_data = payload.dict(exclude_unset=True)
    for field, val in update_data.items():
        setattr(rule, field, val)

    db.commit()
    return {"status": "ok", "message": "Regra atualizada com sucesso"}


@router.delete("/rules/{rule_id}")
def delete_rule(
    rule_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """Exclui uma regra do Guardião."""
    rule = db.query(GuardianRule).filter(GuardianRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Regra não encontrada")
    db.delete(rule)
    db.commit()
    return {"status": "ok", "message": "Regra excluída com sucesso"}


@router.get("/logs")
def get_logs(
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """Retorna o histórico de ações e alertas do Guardião."""
    logs = (
        db.query(GuardianLog)
        .order_by(GuardianLog.id.desc())
        .limit(limit)
        .all()
    )
    return {
        "logs": [
            {
                "id": log.id,
                "rule_id": log.rule_id,
                "rule_name": log.rule_name,
                "entity_id": log.entity_id,
                "entity_type": log.entity_type,
                "entity_name": log.entity_name,
                "action_taken": log.action_taken,
                "message": log.message,
                "metrics_snapshot": json.loads(log.metrics_snapshot) if log.metrics_snapshot else None,
                "created_at": log.created_at.isoformat() if log.created_at else None,
            }
            for log in logs
        ]
    }


@router.delete("/logs")
def clear_logs(db: Session = Depends(get_db), _=Depends(get_current_user)):
    """Limpa o histórico de logs do Guardião."""
    db.query(GuardianLog).delete()
    db.commit()
    return {"status": "ok", "message": "Histórico de logs limpo com sucesso"}


@router.post("/evaluate")
async def evaluate_guardian_rules(
    dry_run: bool = Query(False, description="Se True, apenas simula sem pausar ou alterar no Meta"),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """
    Executa a verificação completa das regras ativas do Guardião contra os conjuntos
    e campanhas atuais do Meta Ads.
    """
    _ensure_default_rules(db)
    active_rules = db.query(GuardianRule).filter(GuardianRule.is_active.is_(True)).all()
    if not active_rules:
        return {"status": "ok", "evaluated_entities": 0, "actions_taken": 0, "message": "Nenhuma regra ativa no momento"}

    fb_accounts = db.query(FacebookAccount).filter(FacebookAccount.token_valid.is_(True)).all()
    if not fb_accounts:
        return {"status": "ok", "evaluated_entities": 0, "actions_taken": 0, "message": "Nenhuma conta de anúncios conectada"}

    today_str = today_sp_str()
    actions_count = 0
    evaluated_count = 0
    executed_logs = []

    for fb_acc in fb_accounts:
        try:
            service = MetaAdsService(fb_acc.access_token, fb_acc.account_id)
            # Busca adsets e campanhas de hoje
            adsets = await service.get_adsets_insights(today_str, today_str)
            campaigns = await service.get_campaigns_insights(today_str, today_str)
        except Exception as e:
            logger.warning(f"Erro ao buscar insights do Meta para conta {fb_acc.account_id}: {e}")
            continue

        # Mapeia transações aprovadas de hoje para cruzar vendas por conjunto
        today_start_dt = datetime.strptime(today_str, "%Y-%m-%d")
        txs = (
            db.query(Transaction)
            .filter(
                Transaction.status == TransactionStatus.APPROVED,
                Transaction.created_at >= today_start_dt,
            )
            .all()
        )

        adset_sales_map = {}
        for t in txs:
            content = t.utm_content or ""
            term = t.utm_term or ""
            adset_sales_map[content] = adset_sales_map.get(content, 0) + 1
            adset_sales_map[term] = adset_sales_map.get(term, 0) + 1

        for adset in adsets:
            evaluated_count += 1
            # Apenas conjuntos que estão rodando ou gastaram algo
            if adset.status != "ACTIVE" and adset.spend <= 0:
                continue

            sales = adset_sales_map.get(adset.id, 0) or adset_sales_map.get(adset.name, 0)
            spend = adset.spend
            cpa = (spend / sales) if sales > 0 else (spend if spend > 0 else 0)
            revenue = sales * 197.0  # estimativa base se não houver receita exata
            roas = (revenue / spend) if spend > 0 else 0
            ctr = adset.ctr
            impressions = adset.impressions

            snapshot = {
                "spend": round(spend, 2),
                "sales": sales,
                "cpa": round(cpa, 2),
                "roas": round(roas, 2),
                "ctr": round(ctr, 2),
                "impressions": impressions,
                "status": adset.status,
            }

            for rule in active_rules:
                if rule.entity_type != "adset":
                    continue

                triggered = False
                trigger_reason = ""

                # 1. spend_without_sales
                if rule.condition_type == "spend_without_sales":
                    if spend >= rule.threshold_value and sales == 0:
                        triggered = True
                        trigger_reason = f"Gastou R$ {spend:.2f} sem nenhuma venda (limite: R$ {rule.threshold_value:.2f})"

                # 2. cpa_above
                elif rule.condition_type == "cpa_above":
                    min_sales = rule.secondary_threshold or 1.0
                    if sales >= min_sales and cpa > rule.threshold_value:
                        triggered = True
                        trigger_reason = f"CPA de R$ {cpa:.2f} excedeu o teto de R$ {rule.threshold_value:.2f} ({sales} vendas)"

                # 3. roas_above
                elif rule.condition_type == "roas_above":
                    min_sales = rule.secondary_threshold or 2.0
                    if sales >= min_sales and roas >= rule.threshold_value:
                        triggered = True
                        trigger_reason = f"ROAS de {roas:.2f}x superou a meta de {rule.threshold_value:.2f}x ({sales} vendas - Potencial de Escala!)"

                # 4. ctr_below
                elif rule.condition_type == "ctr_below":
                    min_spend = rule.secondary_threshold or 30.0
                    if spend >= min_spend and ctr < rule.threshold_value:
                        triggered = True
                        trigger_reason = f"CTR de {ctr:.2f}% está abaixo do mínimo de {rule.threshold_value:.2f}% (após R$ {spend:.2f} investidos)"

                if triggered:
                    actions_count += 1
                    action_taken = "notified"

                    if rule.action == "pause" and not dry_run:
                        action_taken = "paused"
                        # Executa pausa no Meta Ads
                        try:
                            await update_adset_details(
                                access_token=fb_acc.access_token,
                                adset_id=adset.id,
                                status="PAUSED",
                            )
                            logger.info(f"🛡️ [O Guardião] Conjunto {adset.name} ({adset.id}) foi PAUSADO: {trigger_reason}")
                        except Exception as p_err:
                            logger.error(f"Erro ao pausar conjunto {adset.id}: {p_err}")
                            action_taken = "pause_failed"

                    log_entry = GuardianLog(
                        rule_id=rule.id,
                        rule_name=rule.name,
                        entity_id=adset.id,
                        entity_type="adset",
                        entity_name=adset.name,
                        action_taken=action_taken,
                        message=f"{'SIMULAÇÃO: ' if dry_run else ''}{rule.name}: {trigger_reason}",
                        metrics_snapshot=json.dumps(snapshot),
                    )
                    db.add(log_entry)
                    rule.last_run_at = now_sp()
                    executed_logs.append({
                        "rule_name": rule.name,
                        "entity_name": adset.name,
                        "action": action_taken,
                        "message": trigger_reason,
                    })

    db.commit()

    return {
        "status": "ok",
        "dry_run": dry_run,
        "evaluated_entities": evaluated_count,
        "actions_taken": actions_count,
        "executed_logs": executed_logs,
        "message": f"Verificação concluída: {evaluated_count} conjuntos avaliados, {actions_count} ocorrências identificadas.",
    }
