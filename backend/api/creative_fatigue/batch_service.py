"""
Serviço do Creative Hub - Assertividade por Leva de Criativos (Batch Testing Accuracy).
Agrupa criativos por levas de teste, aplica régua customizável em tempo real e calcula assertividade.
"""
import re
from typing import List, Dict, Any, Optional


def extract_batch_name(ad_name: str, campaign_name: str = "", adset_name: str = "") -> str:
    """
    Extrai o nome da Leva a partir da nomenclatura dos anúncios ou campanhas de tráfego direto.
    Exemplos suportados:
    - [L01] VSL Gancho Dor
    - LEVA 02 - Depoimentos UGC
    - LOTE 3 - Mecanismo Único
    - BATCH 04 - Novos Ganchos
    - L2_AD03
    """
    for text in [ad_name, campaign_name, adset_name]:
        if not text:
            continue
        # 1. Padrão colchetes: [L01], [LEVA 02], [LOTE 1], [BATCH 03]
        m = re.search(r'\[\s*(L(?:EVA)?\s*\d+|LOTE\s*\d+|BATCH\s*\d+)\s*\]', text, re.IGNORECASE)
        if m:
            num = re.search(r'\d+', m.group(1))
            return f"Leva {int(num.group(0)):02d}" if num else m.group(1).upper()

        # 2. Padrão palavra: LEVA 01, LEVA 1, LOTE 2, BATCH 3
        m = re.search(r'\b(LEVA\s*\d+|LOTE\s*\d+|BATCH\s*\d+)\b', text, re.IGNORECASE)
        if m:
            num = re.search(r'\d+', m.group(1))
            return f"Leva {int(num.group(0)):02d}" if num else m.group(1).upper()

        # 3. Padrão L01, L1, L2 no início de token
        m = re.search(r'\bL(\d{1,2})\b', text, re.IGNORECASE)
        if m:
            return f"Leva {int(m.group(1)):02d}"

    return "Leva 01 - Base Inicial"


def classify_creative(
    spend: float,
    sales: int,
    revenue: float,
    roas: float,
    cpa: float,
    champion_min_roas: float = 2.0,
    champion_min_sales: int = 3,
    validated_max_cpa: float = 45.0,
    validated_min_roas: float = 1.2,
    test_spend_threshold: float = 80.0,
) -> Dict[str, Any]:
    """
    Classifica o criativo com base na régua dinâmica de Direct Response:
    - champion: ROAS >= champion_min_roas E vendas >= champion_min_sales
    - validated: CPA <= validated_max_cpa OU ROAS >= validated_min_roas
    - testing: Gasto < test_spend_threshold E zero vendas
    - failed: Gasto >= test_spend_threshold sem vendas OU CPA estourado
    """
    if sales >= champion_min_sales and roas >= champion_min_roas:
        return {
            "status": "champion",
            "label": "Campeão",
            "color": "emerald",
            "action": "Escalar Imediatamente",
            "description": f"Criativo validado para escala com {sales} vendas e ROAS {roas:.2f}x.",
        }
    elif (sales > 0 and cpa <= validated_max_cpa) or roas >= validated_min_roas:
        return {
            "status": "validated",
            "label": "Validado",
            "color": "blue",
            "action": "Manter Ativo & Otimizar",
            "description": f"Criativo aprovado dentro da régua (CPA R$ {cpa:.2f}, ROAS {roas:.2f}x).",
        }
    elif sales == 0 and spend < test_spend_threshold:
        return {
            "status": "testing",
            "label": "Em Teste",
            "color": "amber",
            "action": "Aguardar Amostragem",
            "description": f"Em fase de teste. Investido R$ {spend:.2f} de R$ {test_spend_threshold:.2f} limite.",
        }
    else:
        return {
            "status": "failed",
            "label": "Reprovado",
            "color": "rose",
            "action": "Pausar Anúncio",
            "description": f"Gastou R$ {spend:.2f} sem retorno aceitável ou CPA inviável.",
        }


def get_demo_creative_batches(
    champion_min_roas: float = 2.0,
    champion_min_sales: int = 3,
    validated_max_cpa: float = 45.0,
    validated_min_roas: float = 1.2,
    test_spend_threshold: float = 80.0,
) -> Dict[str, Any]:
    """
    Fornece dados de demonstração realistas de 4 levas de teste com evolução de assertividade.
    """
    raw_demo_ads = [
        # Leva 04 (Mais recente - alta assertividade)
        {
            "id": "ad_l4_01",
            "name": "[L04] UGC História Emocional Gancho 1",
            "campaign_name": "[L04] Escala VSL Mulheres",
            "adset_name": "Interesse Saúde 25-45",
            "batch": "Leva 04 - Ângulos Emocionais & UGC",
            "date": "02/11/2026",
            "spend": 1420.0,
            "sales": 28,
            "revenue": 5516.0,
            "impressions": 38400,
            "reach": 21000,
            "frequency": 1.45,
            "ctr": 2.45,
            "cpc": 1.51,
            "status": "ACTIVE",
            "hook_angle": "Depoimento real com quebra de expectativa nos 3s",
        },
        {
            "id": "ad_l4_02",
            "name": "[L04] Notícia UOL Gancho Alerta Médico",
            "campaign_name": "[L04] Escala VSL Mulheres",
            "adset_name": "Lookalike Compradores 2%",
            "batch": "Leva 04 - Ângulos Emocionais & UGC",
            "date": "02/11/2026",
            "spend": 980.0,
            "sales": 16,
            "revenue": 3152.0,
            "impressions": 25200,
            "reach": 15800,
            "frequency": 1.38,
            "ctr": 1.95,
            "cpc": 1.99,
            "status": "ACTIVE",
            "hook_angle": "Print de matéria jornalística e aviso urgente",
        },
        {
            "id": "ad_l4_03",
            "name": "[L04] Comparativo Antes/Depois Rotina",
            "campaign_name": "[L04] Escala VSL Mulheres",
            "adset_name": "Aberto Brasil 35-55",
            "batch": "Leva 04 - Ângulos Emocionais & UGC",
            "date": "02/11/2026",
            "spend": 450.0,
            "sales": 6,
            "revenue": 1182.0,
            "impressions": 12400,
            "reach": 9100,
            "frequency": 1.25,
            "ctr": 1.45,
            "cpc": 2.50,
            "status": "ACTIVE",
            "hook_angle": "Comparação lado a lado com problema comum",
        },
        {
            "id": "ad_l4_04",
            "name": "[L04] Podcast Corte Revelação Chocante",
            "campaign_name": "[L04] Escala VSL Mulheres",
            "adset_name": "Interesse Saúde 25-45",
            "batch": "Leva 04 - Ângulos Emocionais & UGC",
            "date": "02/11/2026",
            "spend": 380.0,
            "sales": 5,
            "revenue": 985.0,
            "impressions": 10500,
            "reach": 7900,
            "frequency": 1.22,
            "ctr": 1.62,
            "cpc": 2.23,
            "status": "ACTIVE",
            "hook_angle": "Corte de mesa de podcast com legenda dinâmica",
        },
        {
            "id": "ad_l4_05",
            "name": "[L04] Teste Variação Gancho Curiosidade",
            "campaign_name": "[L04] Escala VSL Mulheres",
            "adset_name": "Lookalike 1%",
            "batch": "Leva 04 - Ângulos Emocionais & UGC",
            "date": "02/11/2026",
            "spend": 55.0,
            "sales": 0,
            "revenue": 0.0,
            "impressions": 1600,
            "reach": 1300,
            "frequency": 1.12,
            "ctr": 1.10,
            "cpc": 3.12,
            "status": "ACTIVE",
            "hook_angle": "Pergunta de curiosidade mórbida no primeiro frame",
        },
        {
            "id": "ad_l4_06",
            "name": "[L04] Variação Copy Acelerada",
            "campaign_name": "[L04] Escala VSL Mulheres",
            "adset_name": "Aberto Brasil 35-55",
            "batch": "Leva 04 - Ângulos Emocionais & UGC",
            "date": "02/11/2026",
            "spend": 260.0,
            "sales": 4,
            "revenue": 788.0,
            "impressions": 7200,
            "reach": 5800,
            "frequency": 1.20,
            "ctr": 1.35,
            "cpc": 2.67,
            "status": "ACTIVE",
            "hook_angle": "Narração rápida com imagens B-roll aceleradas",
        },

        # Leva 03
        {
            "id": "ad_l3_01",
            "name": "[L03] Gancho Médico Erro Comum",
            "campaign_name": "[L03] Teste Ganchos VSL",
            "adset_name": "Interesse Nutrição",
            "batch": "Leva 03 - Novos Ganchos VSL",
            "date": "24/10/2026",
            "spend": 1120.0,
            "sales": 18,
            "revenue": 3546.0,
            "impressions": 28000,
            "reach": 18500,
            "frequency": 1.62,
            "ctr": 1.75,
            "cpc": 2.29,
            "status": "ACTIVE",
            "hook_angle": "Especialista apontando erro clássico",
        },
        {
            "id": "ad_l3_02",
            "name": "[L03] Truque Matinal Segredo Caseiro",
            "campaign_name": "[L03] Teste Ganchos VSL",
            "adset_name": "Lookalike Compradores 1%",
            "batch": "Leva 03 - Novos Ganchos VSL",
            "date": "24/10/2026",
            "spend": 890.0,
            "sales": 14,
            "revenue": 2758.0,
            "impressions": 22400,
            "reach": 15100,
            "frequency": 1.55,
            "ctr": 1.88,
            "cpc": 2.11,
            "status": "ACTIVE",
            "hook_angle": "Ritual de 10 segundos ao acordar",
        },
        {
            "id": "ad_l3_03",
            "name": "[L03] Demonstração Visual Copo com Água",
            "campaign_name": "[L03] Teste Ganchos VSL",
            "adset_name": "Aberto Brasil 35-55",
            "batch": "Leva 03 - Novos Ganchos VSL",
            "date": "24/10/2026",
            "spend": 390.0,
            "sales": 5,
            "revenue": 985.0,
            "impressions": 9800,
            "reach": 7400,
            "frequency": 1.31,
            "ctr": 1.25,
            "cpc": 3.18,
            "status": "ACTIVE",
            "hook_angle": "Experimento visual no balcão da cozinha",
        },
        {
            "id": "ad_l3_04",
            "name": "[L03] Microfone de Lapela na Rua",
            "campaign_name": "[L03] Teste Ganchos VSL",
            "adset_name": "Interesse Nutrição",
            "batch": "Leva 03 - Novos Ganchos VSL",
            "date": "24/10/2026",
            "spend": 410.0,
            "sales": 5,
            "revenue": 985.0,
            "impressions": 10200,
            "reach": 7900,
            "frequency": 1.34,
            "ctr": 1.38,
            "cpc": 2.91,
            "status": "ACTIVE",
            "hook_angle": "Entrevista espontânea na rua com pessoas comuns",
        },
        {
            "id": "ad_l3_05",
            "name": "[L03] Texto Estilo Artigo Científico",
            "campaign_name": "[L03] Teste Ganchos VSL",
            "adset_name": "Lookalike Compradores 1%",
            "batch": "Leva 03 - Novos Ganchos VSL",
            "date": "24/10/2026",
            "spend": 120.0,
            "sales": 0,
            "revenue": 0.0,
            "impressions": 3100,
            "reach": 2700,
            "frequency": 1.15,
            "ctr": 0.65,
            "cpc": 5.95,
            "status": "PAUSED",
            "hook_angle": "Telas com gráficos médicos densos",
        },
        {
            "id": "ad_l3_06",
            "name": "[L03] Variação Ângulo Terror",
            "campaign_name": "[L03] Teste Ganchos VSL",
            "adset_name": "Aberto Brasil 35-55",
            "batch": "Leva 03 - Novos Ganchos VSL",
            "date": "24/10/2026",
            "spend": 95.0,
            "sales": 0,
            "revenue": 0.0,
            "impressions": 2200,
            "reach": 1900,
            "frequency": 1.16,
            "ctr": 0.72,
            "cpc": 5.99,
            "status": "PAUSED",
            "hook_angle": "Alerta vermelho com sirene nos primeiros segundos",
        },
        {
            "id": "ad_l3_07",
            "name": "[L03] Animação 3D Mecanismo",
            "campaign_name": "[L03] Teste Ganchos VSL",
            "adset_name": "Interesse Nutrição",
            "batch": "Leva 03 - Novos Ganchos VSL",
            "date": "24/10/2026",
            "spend": 320.0,
            "sales": 4,
            "revenue": 788.0,
            "impressions": 8100,
            "reach": 6500,
            "frequency": 1.25,
            "ctr": 1.42,
            "cpc": 2.78,
            "status": "ACTIVE",
            "hook_angle": "Animação anatômica mostrando a causa raiz",
        },
        {
            "id": "ad_l3_08",
            "name": "[L03] Storytelling Fracasso Pessoal",
            "campaign_name": "[L03] Teste Ganchos VSL",
            "adset_name": "Lookalike Compradores 1%",
            "batch": "Leva 03 - Novos Ganchos VSL",
            "date": "24/10/2026",
            "spend": 60.0,
            "sales": 0,
            "revenue": 0.0,
            "impressions": 1800,
            "reach": 1500,
            "frequency": 1.10,
            "ctr": 1.05,
            "cpc": 3.17,
            "status": "ACTIVE",
            "hook_angle": "Relato confessional em primeira pessoa",
        },

        # Leva 02
        {
            "id": "ad_l2_01",
            "name": "[L02] Depoimento Selfie Dona de Casa",
            "campaign_name": "[L02] Validação Oferta",
            "adset_name": "Interesse Bem-Estar",
            "batch": "Leva 02 - Mecanismo Único & Prova",
            "date": "15/10/2026",
            "spend": 1250.0,
            "sales": 19,
            "revenue": 3743.0,
            "impressions": 29000,
            "reach": 17200,
            "frequency": 1.78,
            "ctr": 1.55,
            "cpc": 2.78,
            "status": "ACTIVE",
            "hook_angle": "Câmera frontal tremida com emoção real",
        },
        {
            "id": "ad_l2_02",
            "name": "[L02] Notícia Descoberta Científica",
            "campaign_name": "[L02] Validação Oferta",
            "adset_name": "Lookalike 2%",
            "batch": "Leva 02 - Mecanismo Único & Prova",
            "date": "15/10/2026",
            "spend": 650.0,
            "sales": 7,
            "revenue": 1379.0,
            "impressions": 14500,
            "reach": 10200,
            "frequency": 1.48,
            "ctr": 1.22,
            "cpc": 3.67,
            "status": "ACTIVE",
            "hook_angle": "Apresentação em bancada estilo telejornal",
        },
        {
            "id": "ad_l2_03",
            "name": "[L02] Teste Gancho Pergunta Óbvia",
            "campaign_name": "[L02] Validação Oferta",
            "adset_name": "Aberto Brasil 35-55",
            "batch": "Leva 02 - Mecanismo Único & Prova",
            "date": "15/10/2026",
            "spend": 110.0,
            "sales": 0,
            "revenue": 0.0,
            "impressions": 2500,
            "reach": 2100,
            "frequency": 1.18,
            "ctr": 0.85,
            "cpc": 5.18,
            "status": "PAUSED",
            "hook_angle": "Texto estático com narração genérica",
        },
        {
            "id": "ad_l2_04",
            "name": "[L02] Storytelling Desespero Noturno",
            "campaign_name": "[L02] Validação Oferta",
            "adset_name": "Interesse Bem-Estar",
            "batch": "Leva 02 - Mecanismo Único & Prova",
            "date": "15/10/2026",
            "spend": 140.0,
            "sales": 0,
            "revenue": 0.0,
            "impressions": 2800,
            "reach": 2300,
            "frequency": 1.20,
            "ctr": 0.70,
            "cpc": 7.14,
            "status": "PAUSED",
            "hook_angle": "Cena escura sem dinamismo no gancho",
        },
        {
            "id": "ad_l2_05",
            "name": "[L02] Explicativo de Ingredientes",
            "campaign_name": "[L02] Validação Oferta",
            "adset_name": "Lookalike 2%",
            "batch": "Leva 02 - Mecanismo Único & Prova",
            "date": "15/10/2026",
            "spend": 98.0,
            "sales": 0,
            "revenue": 0.0,
            "impressions": 1900,
            "reach": 1600,
            "frequency": 1.15,
            "ctr": 0.62,
            "cpc": 8.30,
            "status": "PAUSED",
            "hook_angle": "Foco prematuro no produto antes de gerar desejo",
        },
        {
            "id": "ad_l2_06",
            "name": "[L02] Cortina Quebra de Padrão Amarelo",
            "campaign_name": "[L02] Validação Oferta",
            "adset_name": "Aberto Brasil 35-55",
            "batch": "Leva 02 - Mecanismo Único & Prova",
            "date": "15/10/2026",
            "spend": 420.0,
            "sales": 5,
            "revenue": 985.0,
            "impressions": 9400,
            "reach": 7100,
            "frequency": 1.35,
            "ctr": 1.30,
            "cpc": 3.44,
            "status": "ACTIVE",
            "hook_angle": "Moldura de cor contrastante com movimento súbito",
        },

        # Leva 01
        {
            "id": "ad_l1_01",
            "name": "[L01] VSL Clássica Narrador Neutro",
            "campaign_name": "[L01] Setup Inicial",
            "adset_name": "Público Aberto",
            "batch": "Leva 01 - Criativos Base & Lançamento",
            "date": "05/10/2026",
            "spend": 1380.0,
            "sales": 15,
            "revenue": 2955.0,
            "impressions": 31000,
            "reach": 16800,
            "frequency": 1.95,
            "ctr": 1.15,
            "cpc": 3.88,
            "status": "ACTIVE",
            "hook_angle": "Voz padrão com slides de texto",
        },
        {
            "id": "ad_l1_02",
            "name": "[L01] Imagem Estática com Headline",
            "campaign_name": "[L01] Setup Inicial",
            "adset_name": "Público Aberto",
            "batch": "Leva 01 - Criativos Base & Lançamento",
            "date": "05/10/2026",
            "spend": 320.0,
            "sales": 4,
            "revenue": 788.0,
            "impressions": 7800,
            "reach": 6200,
            "frequency": 1.32,
            "ctr": 1.40,
            "cpc": 2.93,
            "status": "ACTIVE",
            "hook_angle": "Foto com marca-texto amarelo e seta vermelha",
        },
        {
            "id": "ad_l1_03",
            "name": "[L01] Vídeo Stock Animado Genérico",
            "campaign_name": "[L01] Setup Inicial",
            "adset_name": "Público Aberto",
            "batch": "Leva 01 - Criativos Base & Lançamento",
            "date": "05/10/2026",
            "spend": 140.0,
            "sales": 0,
            "revenue": 0.0,
            "impressions": 2900,
            "reach": 2400,
            "frequency": 1.20,
            "ctr": 0.58,
            "cpc": 8.32,
            "status": "PAUSED",
            "hook_angle": "Banco de vídeos sem conexão emocional",
        },
        {
            "id": "ad_l1_04",
            "name": "[L01] Carrossel Explicativo 5 Passos",
            "campaign_name": "[L01] Setup Inicial",
            "adset_name": "Público Aberto",
            "batch": "Leva 01 - Criativos Base & Lançamento",
            "date": "05/10/2026",
            "spend": 110.0,
            "sales": 0,
            "revenue": 0.0,
            "impressions": 2100,
            "reach": 1800,
            "frequency": 1.15,
            "ctr": 0.65,
            "cpc": 8.08,
            "status": "PAUSED",
            "hook_angle": "Cards estáticos com texto longo",
        },
        {
            "id": "ad_l1_05",
            "name": "[L01] Anúncio Direto ao Ponto",
            "campaign_name": "[L01] Setup Inicial",
            "adset_name": "Público Aberto",
            "batch": "Leva 01 - Criativos Base & Lançamento",
            "date": "05/10/2026",
            "spend": 95.0,
            "sales": 0,
            "revenue": 0.0,
            "impressions": 1900,
            "reach": 1600,
            "frequency": 1.18,
            "ctr": 0.52,
            "cpc": 9.60,
            "status": "PAUSED",
            "hook_angle": "Apresentação sem curiosidade",
        },
    ]

    return process_batch_groups(
        raw_demo_ads,
        champion_min_roas=champion_min_roas,
        champion_min_sales=champion_min_sales,
        validated_max_cpa=validated_max_cpa,
        validated_min_roas=validated_min_roas,
        test_spend_threshold=test_spend_threshold,
    )


def process_batch_groups(
    ads_list: List[Dict[str, Any]],
    champion_min_roas: float = 2.0,
    champion_min_sales: int = 3,
    validated_max_cpa: float = 45.0,
    validated_min_roas: float = 1.2,
    test_spend_threshold: float = 80.0,
) -> Dict[str, Any]:
    """
    Agrupa anúncios em levas, classifica de acordo com a régua e compila KPIs de assertividade.
    """
    batches_map: Dict[str, Dict[str, Any]] = {}

    for ad in ads_list:
        batch_name = ad.get("batch") or extract_batch_name(
            ad.get("name", ""),
            ad.get("campaign_name", ""),
            ad.get("adset_name", "")
        )

        spend = float(ad.get("spend", 0.0))
        sales = int(ad.get("sales", 0))
        revenue = float(ad.get("revenue", 0.0))
        roas = (revenue / spend) if spend > 0 else 0.0
        cpa = (spend / sales) if sales > 0 else (spend if spend > 0 else 0.0)

        classification = classify_creative(
            spend=spend,
            sales=sales,
            revenue=revenue,
            roas=roas,
            cpa=cpa,
            champion_min_roas=champion_min_roas,
            champion_min_sales=champion_min_sales,
            validated_max_cpa=validated_max_cpa,
            validated_min_roas=validated_min_roas,
            test_spend_threshold=test_spend_threshold,
        )

        enriched_ad = {
            **ad,
            "spend": round(spend, 2),
            "sales": sales,
            "revenue": round(revenue, 2),
            "roas": round(roas, 2),
            "cpa": round(cpa, 2),
            "classification": classification["status"],
            "classification_label": classification["label"],
            "classification_color": classification["color"],
            "recommended_action": classification["action"],
            "classification_desc": classification["description"],
        }

        if batch_name not in batches_map:
            batches_map[batch_name] = {
                "name": batch_name,
                "date": ad.get("date", "Recente"),
                "creatives": [],
                "champion_count": 0,
                "validated_count": 0,
                "testing_count": 0,
                "failed_count": 0,
                "total_spend": 0.0,
                "total_revenue": 0.0,
                "total_sales": 0,
            }

        b = batches_map[batch_name]
        b["creatives"].append(enriched_ad)
        b["total_spend"] += spend
        b["total_revenue"] += revenue
        b["total_sales"] += sales

        st = classification["status"]
        if st == "champion":
            b["champion_count"] += 1
        elif st == "validated":
            b["validated_count"] += 1
        elif st == "testing":
            b["testing_count"] += 1
        else:
            b["failed_count"] += 1

    batches_list = []
    total_champions_all = 0
    total_validated_all = 0
    total_testing_all = 0
    total_failed_all = 0
    total_creatives_all = 0
    total_spend_all = 0.0
    total_revenue_all = 0.0

    for bname, bdata in batches_map.items():
        creatives = bdata["creatives"]
        tot = len(creatives)
        champs = bdata["champion_count"]
        vals = bdata["validated_count"]
        tests = bdata["testing_count"]
        fails = bdata["failed_count"]
        bspend = bdata["total_spend"]
        brevenue = bdata["total_revenue"]
        bsales = bdata["total_sales"]

        accuracy_rate = round(((champs + vals) / tot * 100), 1) if tot > 0 else 0.0
        champion_rate = round((champs / tot * 100), 1) if tot > 0 else 0.0
        profit = brevenue - bspend
        broas = round((brevenue / bspend), 2) if bspend > 0 else 0.0
        bcpa = round((bspend / bsales), 2) if bsales > 0 else (round(bspend, 2) if bspend > 0 else 0.0)

        status = "Em Teste" if tests > 0 else "Finalizada"

        total_champions_all += champs
        total_validated_all += vals
        total_testing_all += tests
        total_failed_all += fails
        total_creatives_all += tot
        total_spend_all += bspend
        total_revenue_all += brevenue

        batches_list.append({
            "id": re.sub(r'[^a-zA-Z0-9]', '_', bname.lower()),
            "name": bname,
            "date": bdata["date"],
            "status": status,
            "total_creatives": tot,
            "champion_count": champs,
            "validated_count": vals,
            "testing_count": tests,
            "failed_count": fails,
            "accuracy_rate": accuracy_rate,
            "champion_rate": champion_rate,
            "total_spend": round(bspend, 2),
            "total_revenue": round(brevenue, 2),
            "profit": round(profit, 2),
            "roas": broas,
            "cpa": bcpa,
            "creatives": creatives,
        })

    # Ordenar levas da mais recente para a mais antiga
    batches_list.sort(key=lambda x: x["name"], reverse=True)

    avg_accuracy = (
        round(((total_champions_all + total_validated_all) / total_creatives_all * 100), 1)
        if total_creatives_all > 0 else 0.0
    )
    overall_roas = (
        round((total_revenue_all / total_spend_all), 2)
        if total_spend_all > 0 else 0.0
    )
    total_profit_all = round(total_revenue_all - total_spend_all, 2)

    best_batch = max(batches_list, key=lambda x: x["accuracy_rate"]) if batches_list else None

    # Sugestões e referências estratégicas para a próxima leva (Ecossistema Ninja)
    reference_insights = [
        {
            "title": "Gancho UGC de Prova Social domina a assertividade",
            "summary": "Criativos no formato UGC com corte de 3 segundos tiveram 83% de taxa de validação na Leva 04, superando vídeos com narrador em 2.4x.",
            "action": "Priorizar 4 variações de selfie e depoimento na próxima leva.",
            "source": "Ninja Ads Miner · Swipe File Analisado",
        },
        {
            "title": "Aviso de Urgência / Estilo Jornalístico",
            "summary": "Ganchos com headline de notícia (tarja amarela e fonte serifada) mantiveram CPA médio de R$ 38,20 na gringa e Brasil.",
            "action": "Modelar 2 novos ganchos usando estética de matéria televisiva.",
            "source": "Ninja Creative AI Studio",
        },
        {
            "title": "Quebra de Padrão nos primeiros 2 segundos",
            "summary": "Vídeos com movimento rápido ou troca repentina de cor no primeiro segundo reduziram o custo por clique (CPC) de R$ 3,88 para R$ 1,51.",
            "action": "Aplicar zoom dinâmico e efeitos sonoros nos primeiros 2s da Leva 05.",
            "source": "Laboratório de Criativos Ninja",
        },
    ]

    return {
        "rules": {
            "champion_min_roas": champion_min_roas,
            "champion_min_sales": champion_min_sales,
            "validated_max_cpa": validated_max_cpa,
            "validated_min_roas": validated_min_roas,
            "test_spend_threshold": test_spend_threshold,
        },
        "summary": {
            "total_batches": len(batches_list),
            "total_creatives": total_creatives_all,
            "champion_count": total_champions_all,
            "validated_count": total_validated_all,
            "testing_count": total_testing_all,
            "failed_count": total_failed_all,
            "avg_accuracy_rate": avg_accuracy,
            "champion_rate": round((total_champions_all / total_creatives_all * 100), 1) if total_creatives_all > 0 else 0.0,
            "total_spend": round(total_spend_all, 2),
            "total_revenue": round(total_revenue_all, 2),
            "total_profit": total_profit_all,
            "overall_roas": overall_roas,
            "best_batch_name": best_batch["name"] if best_batch else "N/A",
            "best_batch_accuracy": best_batch["accuracy_rate"] if best_batch else 0.0,
        },
        "batches": batches_list,
        "reference_insights": reference_insights,
    }

