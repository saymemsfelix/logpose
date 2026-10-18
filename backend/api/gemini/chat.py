"""
Endpoint de chat com a AI — recebe pergunta e retorna resposta do agente.
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
import json
import asyncio

from database.core.connection import get_db
from database.models.gemini_account import GeminiAccount
from database.models.company import CompanySettings
from api.auth.deps import get_current_user
from api.campaigns.actions import fetch_learning_data
from ai.service import run_agent

router = APIRouter(prefix="/gemini", tags=["gemini"])


class ChatRequest(BaseModel):
    message: str
    history: list[dict] = []
    account_id: int | None = None
    page_context: str | None = None


class ChatResponse(BaseModel):
    response: str


@router.post("/chat", response_model=ChatResponse)
async def chat_with_ai(
    payload: ChatRequest,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """Envia mensagem para a AI e retorna resposta."""
    # Buscar conta Gemini (específica ou primeira)
    if payload.account_id:
        account = db.query(GeminiAccount).filter(
            GeminiAccount.id == payload.account_id
        ).first()
    else:
        account = db.query(GeminiAccount).first()

    if not account:
        from api.gemini.default_key import get_official_gemini_key
        default_k = get_official_gemini_key()
        if not default_k:
            raise HTTPException(
                status_code=400,
                detail="Nenhuma conta Gemini configurada."
            )
        account = GeminiAccount(
            name="Ninja Gemini Oficial",
            api_key=default_k,
            model="gemini-flash-latest",
        )
        db.add(account)
        db.commit()
        db.refresh(account)

    # Buscar instruções personalizadas do usuário
    settings = db.query(CompanySettings).first()
    ai_instructions = settings.ai_instructions if settings else None

    # Buscar dados de aprendizado (ações do CEO)
    learning_data = fetch_learning_data(db)

    try:
        response = await run_agent(
            api_key=account.api_key,
            model=account.model,
            user_message=payload.message,
            history=payload.history,
            page_context=payload.page_context,
            ai_instructions=ai_instructions,
            learning_data=learning_data,
        )
        return ChatResponse(response=response)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro na AI: {str(e)}")


@router.get("/status")
def gemini_status(
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """Verifica se há pelo menos uma conta Gemini configurada."""
    count = db.query(GeminiAccount).count()
    return {"configured": count > 0, "count": count}


class TranscribeRequest(BaseModel):
    audio_base64: str
    mime_type: str = "audio/webm"


class TranscribeResponse(BaseModel):
    text: str


@router.post("/transcribe", response_model=TranscribeResponse)
async def transcribe_audio(
    payload: TranscribeRequest,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """
    Transcreve áudio com extrema fidelidade usando Gemini Multimodal,
    com vocabulário especializado em marketing digital e tráfego pago.
    """
    if not payload.audio_base64:
        raise HTTPException(status_code=400, detail="Nenhum áudio enviado.")

    # Remove prefixo data URI se presente (ex: data:audio/webm;base64,...)
    raw_b64 = payload.audio_base64
    mime_type = payload.mime_type or "audio/webm"
    if "," in raw_b64:
        header, raw_b64 = raw_b64.split(",", 1)
        if "data:" in header and ";" in header:
            mime_type = header.split("data:")[1].split(";")[0]

    # Busca conta Gemini ou chave oficial
    account = db.query(GeminiAccount).first()
    api_key = account.api_key if account else ""
    if not api_key:
        from api.gemini.default_key import get_official_gemini_key
        api_key = get_official_gemini_key()

    if not api_key:
        raise HTTPException(status_code=400, detail="Chave do Gemini não configurada.")

    prompt_text = (
        "Você é o transcrevedor de áudio do NINJA'S TRACKER. "
        "Transcreva com fidelidade absoluta a fala em português brasileiro. "
        "Preserve com precisão terminologias de tráfego pago, marketing digital, e-commerce e infoprodutos "
        "(exemplo: ROAS, CPA, CPC, CPM, CTR, Criativo, Conjunto, Campanha, Escala, Checkout, Front-end, "
        "Order Bump, Upsell, Downsell, Kiwify, Hotmart, PayT, Facebook Ads, Meta Ads, VTurb, Pixel, Lucro, etc). "
        "Retorne APENAS o texto falado transcrito, sem introduções, sem aspas e sem explicações adicionais."
    )

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
    req_body = {
        "contents": [{
            "parts": [
                {
                    "inline_data": {
                        "mime_type": mime_type,
                        "data": raw_b64,
                    }
                },
                {"text": prompt_text}
            ]
        }],
        "generationConfig": {
            "temperature": 0.1,
            "maxOutputTokens": 1024,
        }
    }

    import httpx
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(url, json=req_body)
            if resp.status_code != 200:
                fallback_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key={api_key}"
                resp = await client.post(fallback_url, json=req_body)

        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail=f"Erro ao transcrever áudio com Gemini: {resp.text}")

        data = resp.json()
        candidates = data.get("candidates", [])
        if not candidates:
            return TranscribeResponse(text="")
        parts = candidates[0].get("content", {}).get("parts", [])
        transcribed_text = "".join(p.get("text", "") for p in parts if isinstance(p, dict)).strip()
        return TranscribeResponse(text=transcribed_text)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao processar áudio: {str(e)}")
