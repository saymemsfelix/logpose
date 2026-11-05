from sqlalchemy import Column, Integer, String, Boolean, DateTime
from database.core.connection import Base
from database.core.timezone import CREATED_AT_DEFAULT


class TikTokAccount(Base):
    """
    Conta do TikTok Ads conectada via TikTok for Business Marketing API.
    Armazena access_token e advertiser_id para sincronizar métricas e gastos.
    """
    __tablename__ = "tiktok_accounts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    label = Column(String(255), nullable=False)
    advertiser_id = Column(String(100), unique=True, nullable=False)
    app_id = Column(String(100), nullable=True)
    secret = Column(String(255), nullable=True)
    access_token = Column(String(500), nullable=False)
    token_valid = Column(Boolean, nullable=False, default=True, server_default="true")
    created_at = Column(DateTime, server_default=CREATED_AT_DEFAULT)

