from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from database.core.connection import Base
from database.core.timezone import now_sp


class PushSubscription(Base):
    __tablename__ = "push_subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    admin_id = Column(Integer, ForeignKey("admins.id", ondelete="CASCADE"), nullable=True)
    endpoint = Column(Text, unique=True, nullable=False, index=True)
    p256dh = Column(Text, nullable=False)
    auth = Column(Text, nullable=False)
    user_agent = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=now_sp)
