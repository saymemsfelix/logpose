"""
Modelo de Logs de Auditoria do Guardião de Lucro.
Registra as verificações, alertas e ações executadas automaticamente ou manualmente.
"""
from sqlalchemy import Column, Integer, String, DateTime, Text
from database.core.connection import Base
from database.core.timezone import now_sp


class GuardianLog(Base):
    __tablename__ = "guardian_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)

    rule_id = Column(Integer, nullable=True)
    rule_name = Column(String, nullable=False)

    entity_id = Column(String, nullable=False, index=True)
    entity_type = Column(String, default="adset")  # adset | campaign | ad
    entity_name = Column(String, nullable=False)

    # Ação tomada: paused | notified | budget_increased | budget_decreased
    action_taken = Column(String, nullable=False)

    message = Column(Text, nullable=False)
    metrics_snapshot = Column(Text, nullable=True)  # JSON com métricas

    created_at = Column(DateTime(timezone=True), default=now_sp, index=True)
