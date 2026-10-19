"""
Endpoint que gera o relatório diário automático da AI.
Chamado pelo frontend ao detectar que precisa gerar um novo relatório.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database.core.connection import get_db
from database.models.gemini_account import GeminiAccount
from database.models.company import CompanySettings
from api.auth.deps import get_current_user
from ai.daily_report_data import collect_daily_data, format_daily_context
from ai.service import (
    build_llm_no_tools, _extract_text, _build_user_instructions_block,
    _sanitize_model, FALLBACK_MODEL, SECONDARY_FALLBACK,
)
from ai.prompt import DAILY_REPORT_PROMPT

from langchain_core.messages import SystemMessage, HumanMessage

router = APIRouter(prefix="/gemini", tags=["gemini"])


class DailyReportResponse(BaseModel):
    response: str
    spend_today: float


@router.post("/daily-report", response_model=DailyReportResponse)
async def generate_daily_report(
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """Gera relatório diário automático com todos os dados do dia."""
    account = db.query(GeminiAccount).first()
    if not account:
        from api.gemini.default_key import get_official_gemini_key
        default_k = get_official_gemini_key()
        if not default_k:
            raise HTTPException(
                status_code=400,
                detail="Nenhuma conta Gemini configurada.",
            )
        account = GeminiAccount(
            name="Ninja Gemini Oficial",
            api_key=default_k,
            model="gemini-2.5-flash-lite",
        )
        db.add(account)
        db.commit()
        db.refresh(account)

    # Coletar dados
    data = collect_daily_data(db)

    # Montar contexto formatado
    context = format_daily_context(data)

    # Instruções do usuário
    settings = db.query(CompanySettings).first()
    ai_instructions = settings.ai_instructions if settings else None
    user_block = _build_user_instructions_block(ai_instructions)

    clean_model = _sanitize_model(account.model)
    system = f"{DAILY_REPORT_PROMPT}{user_block}"
    messages = [
        SystemMessage(content=system),
        HumanMessage(content=f"Gere o relatório diário com os dados abaixo:\n\n{context}"),
    ]

    candidates = [clean_model]
    if FALLBACK_MODEL not in candidates:
        candidates.append(FALLBACK_MODEL)
    if SECONDARY_FALLBACK not in candidates:
        candidates.append(SECONDARY_FALLBACK)

    text = None
    for cand in candidates:
        try:
            llm = build_llm_no_tools(account.api_key, cand)
            response = await llm.ainvoke(messages)
            text = _extract_text(response.content)
            if text:
                break
        except Exception as e:
            err_msg = str(e)
            if "NOT_FOUND" in err_msg or "404" in err_msg or "no longer available" in err_msg:
                continue

    # Se a AI não responder (ex: sem cota ou falha de rede), gera relatório determinístico com métricas reais do banco
    if not text:
        kpis = data.get("today_kpis", {})
        rev = float(kpis.get("total_revenue") or 0.0)
        spend = float(kpis.get("total_spend") or 0.0)
        profit = float(kpis.get("net_profit") or (rev - spend))
        roas = float(kpis.get("roas") or 0.0)
        sales = int(kpis.get("approved_sales") or 0)
        cpa = round(spend / sales, 2) if sales > 0 else 0.0

        text = (
            f"## 🌅 Relatório Operacional — Ninja AI\n\n"
            f"**Desempenho Consolidado de Hoje:**\n\n"
            f"### 💰 Financeiro\n"
            f"- **Vendas Aprovadas:** {sales}\n"
            f"- **Faturamento:** R$ {rev:,.2f}\n"
            f"- **Gasto em Ads:** R$ {spend:,.2f}\n"
            f"- **Lucro Líquido:** R$ {profit:,.2f}\n"
            f"- **ROAS:** {roas:.2f}x\n"
            f"- **CPA Médio:** R$ {cpa:,.2f}\n\n"
            f"*(Métricas em tempo real sincronizadas diretamente com a sua conta.)*"
        )

    return DailyReportResponse(
        response=text,
        spend_today=float(data.get("total_spend_today") or 0.0),
    )
