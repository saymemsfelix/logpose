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
        pixels = await fetch_pixels(client, business_id=account.business_id)
        return {"pixels": pixels or []}
    except Exception as e:
        logger.warning(f"Erro ao buscar pixels da conta {account_id}: {e}")
        return {"pixels": []}
    finally:
        await client.close()


@router.get("/pages")
async def list_pages(
    account_id: int = Query(...),
    business_id: str | None = Query(None),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """Lista páginas do Facebook + contas Instagram da conta de anúncio."""
    account = _get_fb_account(db, account_id)
    target_biz_id = business_id.strip() if business_id and business_id.strip() else account.business_id

    try:
        pages = await fetch_pages(
            account.access_token,
            account.account_id,
            business_id=target_biz_id,
        )
        ig_accounts = await fetch_instagram_accounts(
            account.access_token,
            account.account_id,
            business_id=target_biz_id,
            pages=pages,
        )
        return {"pages": pages or [], "instagram_accounts": ig_accounts or []}
    except Exception as e:
        logger.warning(f"Erro ao buscar páginas/ig da conta {account_id}: {e}")
        return {"pages": [], "instagram_accounts": []}


@router.get("/search-meta")
async def search_meta_assets(
    account_id: int = Query(...),
    query: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """
    Busca rápida de Páginas ou Pixels diretamente na Meta pelo ID da BM, ID da Página ou termo.
    Permite ao pop-up consultar qualquer BM ou Página inserida pelo usuário em tempo real.
    """
    account = _get_fb_account(db, account_id)
    q = query.strip()
    pages = []
    pixels = []

    # 1. Se for numérico, pode ser ID de BM, ID de Página ou ID de Pixel
    if q.isdigit():
        # Busca páginas pertencentes a esse ID como Business Manager (BM)
        for edge in ("owned_pages", "client_pages"):
            try:
                url = f"{GRAPH_API_BASE}/{q}/{edge}"
                async with httpx.AsyncClient(timeout=12.0) as http:
                    resp = await http.get(
                        url,
                        params={
                            "access_token": account.access_token,
                            "fields": "id,name,picture{url}",
                            "limit": "100",
                        },
                    )
                    if resp.status_code == 200:
                        for p in resp.json().get("data", []):
                            if p.get("id"):
                                pages.append(p)
            except Exception as e:
                logger.warning(f"Tentativa de ler {edge} de {q}: {e}")

        # Busca datasets/pixels pertencentes a esse ID como BM
        for edge in ("datasets", "adspixels", "owned_pixels"):
            try:
                url = f"{GRAPH_API_BASE}/{q}/{edge}"
                async with httpx.AsyncClient(timeout=12.0) as http:
                    resp = await http.get(
                        url,
                        params={
                            "access_token": account.access_token,
                            "fields": "id,name,last_fired_time",
                            "limit": "100",
                        },
                    )
                    if resp.status_code == 200:
                        for p in resp.json().get("data", []):
                            if p.get("id"):
                                pixels.append(p)
            except Exception as e:
                logger.warning(f"Tentativa de ler {edge} de {q}: {e}")

        # Se não retornou páginas da BM, tenta verificar se o ID é de uma Página direta
        if not pages:
            try:
                url = f"{GRAPH_API_BASE}/{q}"
                async with httpx.AsyncClient(timeout=10.0) as http:
                    resp = await http.get(
                        url,
                        params={
                            "access_token": account.access_token,
                            "fields": "id,name,picture{url},link,username",
                        },
                    )
                    if resp.status_code == 200:
                        d = resp.json()
                        if d.get("id") and d.get("name"):
                            pages.append(d)
            except Exception as e:
                logger.warning(f"Tentativa de ler página direta {q}: {e}")

        # Se não retornou pixels de BM, tenta verificar se o ID é de um Pixel direto
        if not pixels:
            try:
                url = f"{GRAPH_API_BASE}/{q}"
                async with httpx.AsyncClient(timeout=10.0) as http:
                    resp = await http.get(
                        url,
                        params={
                            "access_token": account.access_token,
                            "fields": "id,name,last_fired_time",
                        },
                    )
                    if resp.status_code == 200:
                        d = resp.json()
                        if d.get("id"):
                            pixels.append(d)
            except Exception:
                pass

    # Deduplicar resultados por ID
    unique_pages = {str(p["id"]): p for p in pages if p.get("id")}
    unique_pixels = {str(p["id"]): p for p in pixels if p.get("id")}

    return {
        "pages": list(unique_pages.values()),
        "pixels": list(unique_pixels.values()),
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
