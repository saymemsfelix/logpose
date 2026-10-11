"""
Modelo de Regras Automatizadas do Guardião de Lucro (Stop-Loss & Otimização).
Inspirado nas ferramentas de proteção da UTMify, Nexofy e Revealbot.
"""
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text
from database.core.connection import Base
from database.core.timezone import now_sp


class GuardianRule(Base):
    __tablename__ = "guardian_rules"

    id = Column(Integer, primary_key=True, autoincrement=True)

    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)

    # Tipo de entidade alvo: adset | campaign
    entity_type = Column(String, default="adset")

    # Condição:
    # - spend_without_sales (Gasto sem vendas)
    # - cpa_above (CPA acima do teto)
    # - roas_above (ROAS acima da meta)
    # - ctr_below (CTR abaixo do mínimo)
    # - frequency_above (Frequência acima do teto)
    condition_type = Column(String, nullable=False)

    # Valor de corte principal (ex: 80.0 para gasto, 90.0 para CPA, 2.5 para ROAS)
    threshold_value = Column(Float, nullable=False)

    # Valor de corte secundário (ex: min_sales = 1, min_spend = 50.0)
    secondary_threshold = Column(Float, default=0.0)

    # Ação:
    # - pause (Pausar no Meta Ads)
    # - notify (Registrar alerta no dashboard)
    # - increase_budget (Aumentar orçamento em X%)
    # - decrease_budget (Diminuir orçamento em X%)
    action = Column(String, default="pause")
    action_value = Column(Float, default=0.0)

    is_active = Column(Boolean, default=True)

    last_run_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=now_sp)
    updated_at = Column(DateTime(timezone=True), default=now_sp, onupdate=now_sp)
