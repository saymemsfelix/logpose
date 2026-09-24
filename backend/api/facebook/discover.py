"""
Descobre e sincroniza contas de anúncio de Business Managers (BM) e perfis da Meta.
- overview: retorna perfil do usuário, BMs e todas as contas de anúncio com status ativo/inativo
- toggle: ativa ou desativa uma conta no SFY com um simples switch
- disconnect: remove contas conectadas
- oauth: gera URL de conexão oficial de 1 clique
"""
import os
from datetime import datetime
import logging
import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from api.auth.deps import get_current_user
from database.core.connection import get_db
from database.models.facebook_account import FacebookAccount

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/facebook", tags=["facebook"])

GRAPH_API_VERSION = os.getenv("META_GRAPH_API_VERSION", "v25.0")
GRAPH_API_BASE = f"https://graph.facebook.com/{GRAPH_API_VERSION}"


class DiscoverRequest(BaseModel):
    access_token: str
    business_id: str


class DiscoveredAccount(BaseModel):
    account_id: str
    name: str


class DiscoverResponse(BaseModel):
    accounts: list[DiscoveredAccount]
    total: int


class SyncResult(BaseModel):
    added: int
    skipped: int
    total_found: int


class FacebookUserProfile(BaseModel):
    id: str
    name: str
    picture: str | None = None


class OverviewAccount(BaseModel):
    account_id: str
    name: str
    currency: str = "BRL"
    status: str = "ACTIVE"
    is_active: bool = False
    business_id: str | None = None


class OverviewBusiness(BaseModel):
    id: str
    name: str
    accounts_count: int
    accounts: list[OverviewAccount]


class FacebookOverviewResponse(BaseModel):
    connected: bool
    access_token: str | None = None
    user: FacebookUserProfile | None = None
    last_synced: str | None = None
    businesses: list[OverviewBusiness] = []
    total_accounts: int = 0
    active_accounts: int = 0


class ToggleAccountRequest(BaseModel):
    account_id: str
    name: str
    access_token: str
    business_id: str | None = None
    active: bool = True


class OAuthUrlResponse(BaseModel):
    oauth_url: str
    configured: bool
    app_id: str | None = None


class TokenOverviewRequest(BaseModel):
    access_token: str | None = None


@router.get("/oauth/url", response_model=OAuthUrlResponse)
def get_oauth_url():
    """Retorna URL para autorização oficial de 1 clique no Facebook."""
    app_id = os.getenv("META_APP_ID")
    redirect_uri = os.getenv("META_REDIRECT_URI", "https://logpose-1zuu.onrender.com/integrations")
    if not app_id:
        return OAuthUrlResponse(oauth_url="", configured=False, app_id=None)

    url = (
        f"https://www.facebook.com/{GRAPH_API_VERSION}/dialog/oauth?"
        f"client_id={app_id}&"
        f"redirect_uri={redirect_uri}&"
        f"scope=ads_read,read_insights,business_management&"
        f"response_type=code"
    )
    return OAuthUrlResponse(oauth_url=url, configured=True, app_id=app_id)


@router.post("/overview", response_model=FacebookOverviewResponse)
@router.get("/overview", response_model=FacebookOverviewResponse)
async def get_facebook_overview(
    payload: TokenOverviewRequest | None = None,
    token: str | None = Query(default=None),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """
    Retorna o perfil conectado, todas as BMs e contas de anúncio,
    com status de ativação no SFY idêntico ao NexoFy.
    """
    active_db_accounts = db.query(FacebookAccount).all()
    active_map = {acc.account_id: acc for acc in active_db_accounts}

    # Decide o access token a ser utilizado
    access_token = (payload.access_token if payload and payload.access_token else None) or token
    if not access_token:
        # Pega o primeiro token válido salvo
        for acc in active_db_accounts:
            if acc.access_token and acc.token_valid:
                access_token = acc.access_token
                break

    if not access_token:
        return FacebookOverviewResponse(
            connected=False,
            total_accounts=len(active_db_accounts),
            active_accounts=len(active_db_accounts),
        )

    # Busca perfil do usuário
    user_profile = None
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            user_resp = await client.get(
                f"{GRAPH_API_BASE}/me",
                params={"access_token": access_token, "fields": "id,name,picture.type(large)"},
            )
            if user_resp.status_code == 200:
                ud = user_resp.json()
                pic_url = ud.get("picture", {}).get("data", {}).get("url")
                user_profile = FacebookUserProfile(
                    id=ud.get("id", ""),
                    name=ud.get("name", "Usuário Facebook"),
                    picture=pic_url,
                )
    except Exception as e:
        logger.warning(f"Erro ao buscar perfil /me: {e}")

    # Busca BMs e Contas de Anúncio
    businesses: list[OverviewBusiness] = []
    seen_account_ids = set()

    try:
        async with httpx.AsyncClient(timeout=25.0) as client:
            # 1. Busca BMs
            bm_resp = await client.get(
                f"{GRAPH_API_BASE}/me/businesses",
                params={
                    "access_token": access_token,
                    "fields": "id,name,client_ad_accounts{id,account_id,name,account_status,currency},owned_ad_accounts{id,account_id,name,account_status,currency}",
                    "limit": 50,
                },
            )
            if bm_resp.status_code == 200:
                bm_data = bm_resp.json().get("data", [])
                for bm_item in bm_data:
                    b_id = bm_item.get("id")
                    b_name = bm_item.get("name", "Business Manager")
                    acc_list: list[OverviewAccount] = []

                    raw_accs = (
                        bm_item.get("owned_ad_accounts", {}).get("data", []) +
                        bm_item.get("client_ad_accounts", {}).get("data", [])
                    )

                    for raw in raw_accs:
                        aid = raw.get("account_id") or raw.get("id", "")
                        if aid and not aid.startswith("act_"):
                            aid = f"act_{aid}"
                        if not aid or aid in seen_account_ids:
                            continue
                        seen_account_ids.add(aid)

                        acc_list.append(
                            OverviewAccount(
                                account_id=aid,
                                name=raw.get("name") or aid,
                                currency=raw.get("currency", "BRL"),
                                status="ACTIVE" if str(raw.get("account_status")) in ("1", "ACTIVE") else "PAUSED",
                                is_active=aid in active_map,
                                business_id=b_id,
                            )
                        )

                    if acc_list:
                        businesses.append(
                            OverviewBusiness(
                                id=b_id,
                                name=b_name,
                                accounts_count=len(acc_list),
                                accounts=acc_list,
                            )
                        )

            # 2. Busca todas as contas do usuário (/me/adaccounts) para pegar contas pessoais
            all_accs_resp = await client.get(
                f"{GRAPH_API_BASE}/me/adaccounts",
                params={
                    "access_token": access_token,
                    "fields": "id,account_id,name,account_status,currency,business{id,name}",
                    "limit": 100,
                },
            )

            standalone_accs: list[OverviewAccount] = []
            if all_accs_resp.status_code == 200:
                all_data = all_accs_resp.json().get("data", [])
                for raw in all_data:
                    aid = raw.get("account_id") or raw.get("id", "")
                    if aid and not aid.startswith("act_"):
                        aid = f"act_{aid}"
                    if not aid or aid in seen_account_ids:
                        continue
                    seen_account_ids.add(aid)

                    # Verifica se tem business associada
                    bm_obj = raw.get("business")
                    b_id = bm_obj.get("id") if bm_obj else None
                    b_name = bm_obj.get("name") if bm_obj else None

                    acc_item = OverviewAccount(
                        account_id=aid,
                        name=raw.get("name") or aid,
                        currency=raw.get("currency", "BRL"),
                        status="ACTIVE" if str(raw.get("account_status")) in ("1", "ACTIVE") else "PAUSED",
                        is_active=aid in active_map,
                        business_id=b_id,
                    )

                    if b_id and b_name:
                        # Encontra ou cria a BM
                        found_bm = next((b for b in businesses if b.id == b_id), None)
                        if found_bm:
                            found_bm.accounts.append(acc_item)
                            found_bm.accounts_count = len(found_bm.accounts)
                        else:
                            businesses.append(
                                OverviewBusiness(
                                    id=b_id,
                                    name=b_name,
                                    accounts_count=1,
                                    accounts=[acc_item],
                                )
                            )
                    else:
                        standalone_accs.append(acc_item)

            if standalone_accs:
                businesses.append(
                    OverviewBusiness(
                        id="standalone",
                        name="Contas sem Business Manager",
                        accounts_count=len(standalone_accs),
                        accounts=standalone_accs,
                    )
                )

    except Exception as e:
        logger.error(f"Erro ao listar BMs e contas da Meta: {e}")

    # Fallback se a Meta API falhar ou não retornar contas: exibe as já salvas no DB
    if not businesses:
        if not active_db_accounts:
            default_acc = FacebookAccount(
                label="CONTA BR 1.5k",
                account_id="act_949690764845924",
                access_token="EAAYeBZCzUEzsBSkX3brv7KrG1dBVNNGCGNUuSAMTc5NZAxO0LyDskVNDYPKbcfZAGZCnAS2JnNLfaXCnhbU088mFvcL9Tc4bQlXB5aZB9WycZBarZA6gCWGh8hLIsIgkRwMRGwbdWu3HqDgBlAx9fsAYnZB9WdkyprJuefoFiQwJgZB8kLHi5sogcIecT0cwZALQn6kQZDZD",
                business_id="BM 4KBRL",
                token_valid=True,
            )
            db.add(default_acc)
            db.commit()
            active_db_accounts = [default_acc]

        bm_groups: dict[str, list[OverviewAccount]] = {}
        for acc in active_db_accounts:
            bm_name = acc.business_id or "BM 4KBRL"
            if bm_name not in bm_groups:
                bm_groups[bm_name] = []
            bm_groups[bm_name].append(
                OverviewAccount(
                    account_id=acc.account_id,
                    name=acc.label,
                    currency="BRL",
                    status="ACTIVE",
                    is_active=True,
                    business_id=acc.business_id,
                )
            )

        for b_name, acc_list in bm_groups.items():
            businesses.append(
                OverviewBusiness(
                    id=b_name.lower().replace(" ", "_"),
                    name=b_name,
                    accounts_count=len(acc_list),
                    accounts=acc_list,
                )
            )

    total_acc_count = sum(b.accounts_count for b in businesses)
    active_count = sum(1 for b in businesses for a in b.accounts if a.is_active)

    return FacebookOverviewResponse(
        connected=True,
        access_token=access_token,
        user=user_profile or FacebookUserProfile(id="unknown", name="Sayme Felix"),
        last_synced=datetime.now().strftime("%d/%m/%Y, %H:%M"),
        businesses=businesses,
        total_accounts=total_acc_count,
        active_accounts=active_count,
    )


@router.post("/accounts/toggle")
def toggle_facebook_account(
    payload: ToggleAccountRequest,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """Ativa ou desativa uma conta de anúncio no banco de dados."""
    existing = db.query(FacebookAccount).filter(
        FacebookAccount.account_id == payload.account_id
    ).first()

    if payload.active:
        if existing:
            existing.label = payload.name
            existing.access_token = payload.access_token
            if payload.business_id:
                existing.business_id = payload.business_id
            existing.token_valid = True
        else:
            db.add(FacebookAccount(
                label=payload.name,
                account_id=payload.account_id,
                access_token=payload.access_token,
                business_id=payload.business_id,
                token_valid=True,
            ))
        db.commit()
        return {"success": True, "active": True, "account_id": payload.account_id}
    else:
        if existing:
            db.delete(existing)
            db.commit()
        return {"success": True, "active": False, "account_id": payload.account_id}


@router.post("/disconnect")
def disconnect_facebook(
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """Desconecta todas as contas do Facebook."""
    db.query(FacebookAccount).delete()
    db.commit()
    return {"success": True, "message": "Contas desconectadas com sucesso"}


@router.post("/accounts/discover", response_model=DiscoverResponse)
async def discover_accounts(
    payload: DiscoverRequest,
    _=Depends(get_current_user),
):
    """Lista todas as contas de anúncio de um Business Manager."""
    accounts = await _fetch_bm_accounts(payload.access_token, payload.business_id)
    return DiscoverResponse(accounts=accounts, total=len(accounts))


@router.post("/accounts/sync", response_model=SyncResult)
async def sync_accounts(
    payload: DiscoverRequest,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """Sincroniza contas do BM: busca todas e faz upsert no DB."""
    discovered = await _fetch_bm_accounts(payload.access_token, payload.business_id)

    if not discovered:
        raise HTTPException(status_code=400, detail="Nenhuma conta encontrada neste Business Manager")

    added = 0
    skipped = 0

    for item in discovered:
        existing = db.query(FacebookAccount).filter(
            FacebookAccount.account_id == item.account_id,
        ).first()

        if existing:
            if not existing.business_id:
                existing.business_id = payload.business_id
            skipped += 1
            continue

        db.add(FacebookAccount(
            label=item.name,
            account_id=item.account_id,
            access_token=payload.access_token,
            business_id=payload.business_id,
        ))
        added += 1

    db.commit()
    return SyncResult(added=added, skipped=skipped, total_found=len(discovered))


async def _fetch_bm_accounts(
    access_token: str, business_id: str,
) -> list[DiscoveredAccount]:
    """Busca todas as contas de anúncio do BM (owned + shared) com paginação."""
    edges = ["owned_ad_accounts", "client_ad_accounts"]
    seen_ids: set[str] = set()
    accounts: list[DiscoveredAccount] = []

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            for edge in edges:
                url = f"{GRAPH_API_BASE}/{business_id}/{edge}"
                params = {
                    "access_token": access_token,
                    "fields": "account_id,name",
                    "limit": 100,
                }

                response = await client.get(url, params=params)

                if response.status_code != 200:
                    if edge == "owned_ad_accounts":
                        error_data = response.json()
                        error_msg = error_data.get("error", {}).get("message", "Erro desconhecido")
                        raise HTTPException(status_code=400, detail=f"Erro na API da Meta: {error_msg}")
                    logger.warning(f"Falha ao buscar {edge}, ignorando: {response.status_code}")
                    continue

                data = response.json()
                for acc in _parse_accounts(data):
                    if acc.account_id not in seen_ids:
                        seen_ids.add(acc.account_id)
                        accounts.append(acc)

                while "paging" in data and "next" in data["paging"]:
                    response = await client.get(data["paging"]["next"])
                    if response.status_code != 200:
                        break
                    data = response.json()
                    for acc in _parse_accounts(data):
                        if acc.account_id not in seen_ids:
                            seen_ids.add(acc.account_id)
                            accounts.append(acc)

    except httpx.RequestError as e:
        logger.error(f"Erro ao conectar com a Meta API: {e}")
        raise HTTPException(status_code=502, detail="Não foi possível conectar com a API da Meta")

    return accounts


def _parse_accounts(data: dict) -> list[DiscoveredAccount]:
    """Extrai contas do payload da Graph API."""
    result = []
    for item in data.get("data", []):
        account_id = item.get("account_id", item.get("id", ""))
        name = item.get("name", account_id)
        if account_id:
            if not account_id.startswith("act_"):
                account_id = f"act_{account_id}"
            result.append(DiscoveredAccount(account_id=account_id, name=name))
    return result

