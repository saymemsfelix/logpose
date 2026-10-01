from sqlalchemy import Column, Integer, Float, Date, DateTime
from database.core.connection import Base
from database.core.timezone import CREATED_AT_DEFAULT


class DailyAdSpend(Base):
    """
    Armazena gastos manuais ou sincronizados com anúncios por data.
    Usado quando a conta Meta Ads não está vinculada com permissões da API.
    """
    __tablename__ = "daily_ad_spends"

    id = Column(Integer, primary_key=True, autoincrement=True)
    spend_date = Column(Date, unique=True, nullable=False, index=True)
    spend = Column(Float, nullable=False, default=0.0)
    clicks = Column(Integer, nullable=False, default=0)
    impressions = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, server_default=CREATED_AT_DEFAULT)
