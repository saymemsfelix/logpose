import logging
from typing import Optional
from fastapi import APIRouter, Request, Response
from pydantic import BaseModel, Field
from services.supabase_tracker import log_event_to_supabase

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/event", tags=["event-tracking"])


class EventPayload(BaseModel):
    eventName: str = Field(..., max_length=60)
    userId: str = Field(..., max_length=128)
    areaId: Optional[str] = None
    utm_source: Optional[str] = None
    utm_medium: Optional[str] = None
    utm_campaign: Optional[str] = None
    utm_term: Optional[str] = None
    utm_content: Optional[str] = None


@router.post("")
@router.post("/")
async def receive_event(payload: EventPayload, request: Request):
    """Recebe eventos de landing pages e grava direto no Supabase sem travar."""
    client_ip = request.client.host if request.client else None
    
    # Executa de forma assíncrona para responder à página em menos de 5ms
    ok = await log_event_to_supabase(
        event_name=payload.eventName,
        user_id=payload.userId,
        area_id=payload.areaId,
        utm_source=payload.utm_source,
        utm_medium=payload.utm_medium,
        utm_campaign=payload.utm_campaign,
        utm_term=payload.utm_term,
        utm_content=payload.utm_content,
        ip=client_ip
    )
    
    return {"ok": ok, "event": payload.eventName}


@router.options("")
@router.options("/")
async def options_preflight():
    """Responde CORS preflight imediatamente para requisições de outros domínios."""
    return Response(
        status_code=204,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey"
        }
    )

