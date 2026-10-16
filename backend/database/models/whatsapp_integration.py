from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey
from database.core.connection import Base
from database.core.timezone import CREATED_AT_DEFAULT, UPDATED_AT_DEFAULT, now_sp


class WhatsAppConfig(Base):
    """
    Configuração de integração com a Evolution API para recuperação via WhatsApp.
    Permite envio automatizado, testes de instância e cadências com delay.
    """
    __tablename__ = "whatsapp_configs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    base_url = Column(String(255), nullable=False, default="")
    api_key = Column(String(255), nullable=False, default="")
    instance_name = Column(String(100), nullable=False, default="")
    is_active = Column(Boolean, nullable=False, default=True)
    auto_dispatch_enabled = Column(Boolean, nullable=False, default=False)
    cadence_delays_minutes = Column(String(100), nullable=False, default="5,120,1440")
    created_at = Column(DateTime, server_default=CREATED_AT_DEFAULT)
    updated_at = Column(
        DateTime,
        server_default=UPDATED_AT_DEFAULT,
        onupdate=UPDATED_AT_DEFAULT,
    )


class RecoveryDispatch(Base):
    """
    Registro e agendamento de mensagens de recuperação via WhatsApp/Omnichannel.
    Suporta cadências (Passo 1, 2, 3), status de entrega e cancelamento automático
    caso o cliente complete a compra antes do próximo envio.
    """
    __tablename__ = "recovery_dispatches"

    id = Column(Integer, primary_key=True, autoincrement=True)
    recovery_id = Column(
        Integer,
        ForeignKey("recoveries.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    customer_name = Column(String(255), nullable=True)
    customer_phone = Column(String(50), nullable=False)
    customer_email = Column(String(255), nullable=True, index=True)
    product_name = Column(String(255), nullable=True)
    step_number = Column(Integer, default=1)
    strategy = Column(String(50), default="support")  # support | discount | urgency | custom
    message_text = Column(Text, nullable=False)
    scheduled_at = Column(DateTime, nullable=False, index=True)
    sent_at = Column(DateTime, nullable=True)
    # Status: pending | sent | failed | cancelled
    status = Column(String(50), default="pending", index=True)
    error_message = Column(Text, nullable=True)
    evolution_message_id = Column(String(100), nullable=True)
    created_at = Column(DateTime, server_default=CREATED_AT_DEFAULT)
    updated_at = Column(
        DateTime,
        server_default=UPDATED_AT_DEFAULT,
        onupdate=UPDATED_AT_DEFAULT,
    )
