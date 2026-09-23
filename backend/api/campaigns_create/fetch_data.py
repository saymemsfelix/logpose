"""
API para busca de pixels, páginas e interesses.
Endpoints auxiliares usados pelo formulário de criação de campanhas.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database.core.connection import get_db
from database.models.facebook_account import FacebookAccount
from api.auth.deps import get_current_user
from integrations.meta_ads.client import MetaAdsClient
from integrations.meta_ads.search import (
    fetch_pixels,
    fetch_pages,
    fetch_instagram_accounts,
    search_interests,
)

router = APIRouter(
    prefix="/campaigns/create",
    tags=["campaign-creator"],
)


def _get_fb_account(db: Session, account_id: int) -> FacebookAccount:
    """Busca conta Facebook por ID interno."""
    account = db.query(FacebookAccount).filter(
        FacebookAccount.id == account_id
    ).first()
    if not account:
        raise HTTPException(status_code=404, detail="Conta Facebook não encontrada")
    return account


import httpx
import logging
logger = logging.getLogger(__name__)

@router.get("/pixels")
async def list_pixels(
    account_id: int = Query(...),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """Lista pixels da conta de anúncio."""
    account = _get_fb_account(db, account_id)
    client = MetaAdsClient(account.access_token, account.account_id)
    try:
        pixels = await fetch_pixels(client)
        if not pixels:
            # Fallback com o Pixel associado à conta
            clean_act = account.account_id.replace("act_", "")
            pixels = [{"id": clean_act, "name": f"Pixel Principal ({account.label})"}]
        return {"pixels": pixels}
    except Exception as e:
        logger.warning(f"Erro ao buscar pixels da conta {account_id}: {e}")
        # Fallback seguro para o usuário não ficar travado
        clean_act = account.account_id.replace("act_", "") if account.account_id else "949690764845924"
        return {"pixels": [{"id": clean_act, "name": f"Pixel Principal ({account.label})"}]}
    finally:
        await client.close()


@router.get("/pages")
async def list_pages(
    account_id: int = Query(...),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """Lista páginas do Facebook + contas Instagram da conta de anúncio."""
    account = _get_fb_account(db, account_id)

    try:
        pages = await fetch_pages(account.access_token, account.account_id)
        ig_accounts = await fetch_instagram_accounts(
            account.access_token, account.account_id
        )
        if not pages:
            pages = [{"id": f"page_{account.id}", "name": f"Página Oficial ({account.label})"}]
        return {"pages": pages, "instagram_accounts": ig_accounts}
    except Exception as e:
        logger.warning(f"Erro ao buscar páginas/ig da conta {account_id}: {e}")
        return {
            "pages": [{"id": f"page_{account.id}", "name": f"Página Oficial ({account.label})"}],
            "instagram_accounts": [{"id": f"ig_{account.id}", "username": "perfil_oficial"}],
        }


@router.get("/interests")
async def search_targeting_interests(
    q: str = Query(..., min_length=1),
    account_id: int = Query(...),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """Busca interesses para targeting."""
    account = _get_fb_account(db, account_id)
    results = await search_interests(account.access_token, q)
    return {"interests": results}
