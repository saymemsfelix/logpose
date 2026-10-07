"""
Modelo de Ações Agendadas de Campanhas no Meta Ads via Ninja AI.
Permite programar alterações de orçamento ou status para horários específicos (ex: virada do dia, 05:00 da manhã).
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from database.core.connection import Base
from database.core.timezone import now_sp


class ScheduledCampaignAction(Base):
    __tablename__ = "scheduled_campaign_actions"

    id = Column(Integer, primary_key=True, autoincrement=True)

    # Identificação da entidade
    entity_id = Column(String, nullable=False, index=True)
    entity_type = Column(String, default="campaign")  # campaign | adset
    entity_name = Column(String, nullable=False)

    # Tipo de ação: increase_budget | decrease_budget | set_budget | pause | activate
    action = Column(String, nullable=False)
    value = Column(Float, default=0)
    current_budget = Column(Float, default=0)

    # Agendamento
    scheduled_for = Column(DateTime(timezone=True), nullable=False, index=True)
    schedule_label = Column(String, nullable=True)  # ex: "amanhã às 05:30"

    # Status: pending | executed | failed | cancelled
    status = Column(String, default="pending", index=True)
    result_message = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), default=now_sp)
    executed_at = Column(DateTime(timezone=True), nullable=True)
