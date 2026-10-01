"""
Busca dados da Meta Ads para o dashboard.
Reutiliza MetaAdsService configurado em campanhas.
Captura erros de autenticação e invalida tokens no banco.
"""
import logging
from typing import Optional
from sqlalchemy.orm import Session

from database.models.facebook_account import FacebookAccount
from integrations.meta_ads.service import MetaAdsService
from integrations.meta_ads.client import MetaAuthError
from integrations.meta_ads.schemas import AccountInsightsSummary, CampaignInsights

logger = logging.getLogger(__name__)


def get_fb_accounts(db: Session, account_id: Optional[int] = None) -> list[FacebookAccount]:
    """Retorna contas FB com token válido (filtrada por id ou todas)."""
    if account_id:
        acc = db.query(FacebookAccount).filter(
            FacebookAccount.id == account_id,
            FacebookAccount.token_valid.is_(True),
        ).first()
        return [acc] if acc else []
    return (
        db.query(FacebookAccount)
        .filter(FacebookAccount.token_valid.is_(True))
        .all()
    )


def _mark_token_invalid(db: Session, account: FacebookAccount) -> None:
    """Marca a conta como token inválido para suprimir futuras chamadas."""
    account.token_valid = False
    db.commit()
    logger.warning(
        f"Token da conta Facebook '{account.label}' ({account.account_id}) "
        "marcado como inválido. Atualize o token na página de integrações."
    )


async def fetch_meta_account_summary(
    db: Session,
    date_start: str,
    date_end: str,
    account_id: Optional[int] = None,
) -> tuple[Optional[AccountInsightsSummary], Optional[str]]:
    """
    Busca métricas agregadas das contas Meta Ads válidas.
    Soma spend, clicks, etc., de todas as contas ativas caso account_id não seja especificado.
    Retorna (summary, error_message).
    """
    accounts = get_fb_accounts(db, account_id)
    if not accounts:
        # Verifica se existe conta cadastrada mas com token inválido
        has_any = db.query(FacebookAccount).first()
        if has_any:
            return None, "token_invalid"
        return None, None

    total_spend = 0.0
    total_clicks = 0
    total_impressions = 0
    total_lpv = 0
    total_ic = 0
    any_success = False
    last_error = None

    for fb in accounts:
        service = MetaAdsService(fb.access_token, fb.account_id)
        try:
            summary = await service.get_account_summary(date_start, date_end)
            if summary:
                total_spend += summary.spend
                total_clicks += summary.clicks
                total_impressions += summary.impressions
                total_lpv += summary.landing_page_views
                total_ic += summary.initiate_checkout
                any_success = True
        except MetaAuthError as mae:
            _mark_token_invalid(db, fb)
            if getattr(mae, "error_code", 0) in (200, 10, 294) or "permission" in str(mae).lower():
                last_error = "missing_permissions"
            else:
                last_error = "token_invalid"
        except Exception as e:
            logger.error(f"Erro ao buscar account summary da conta {fb.label}: {e}")
            last_error = "missing_permissions" if "permission" in str(e).lower() else str(e)
        finally:
            await service.close()

    if not any_success:
        return None, last_error

    cpc = round(total_spend / total_clicks, 2) if total_clicks > 0 else 0.0
    ctr = round((total_clicks / total_impressions) * 100, 2) if total_impressions > 0 else 0.0

    return AccountInsightsSummary(
        spend=round(total_spend, 2),
        clicks=total_clicks,
        impressions=total_impressions,
        cpc=cpc,
        ctr=ctr,
        landing_page_views=total_lpv,
        initiate_checkout=total_ic,
    ), None


async def fetch_meta_campaigns_for_dashboard(
    db: Session,
    date_start: str,
    date_end: str,
    account_id: Optional[int] = None,
) -> list[CampaignInsights]:
    """Busca campanhas da Meta Ads para top campaigns do dashboard em todas as contas ativas."""
    accounts = get_fb_accounts(db, account_id)
    if not accounts:
        return []

    all_campaigns: list[CampaignInsights] = []
    for fb in accounts:
        service = MetaAdsService(fb.access_token, fb.account_id)
        try:
            campaigns = await service.get_campaigns(date_start, date_end)
            if campaigns:
                all_campaigns.extend(campaigns)
        except MetaAuthError:
            _mark_token_invalid(db, fb)
        except Exception as e:
            logger.error(f"Erro ao buscar campanhas da conta {fb.label}: {e}")
        finally:
            await service.close()

    return all_campaigns
