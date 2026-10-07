# 🥷 Guia Rápido: NINJA'S TRACKER

O **NINJA'S TRACKER** está na pasta:
`c:\Users\User\Downloads\INFOPRODUTOS\NINJA'S TRACKER`

---

## 🎯 O que é o NINJA'S TRACKER?
O NINJA'S TRACKER é uma plataforma completa e privativa criada especificamente para gestores de tráfego direto e infoprodutores, servindo como uma solução sem mensalidade com alta performance.

### Principais Módulos Integrados:
1. **Dashboard & KPIs:** Faturamento Líquido, Lucro, ROAS, ROI, CPA, gráficos de vendas hora a hora e distribuição por plataforma.
2. **Funil de Vendas:** Rastreamento visual de conversão (Páginas -> Carrinho -> Vendas).
3. **Facebook Ads & Meta API v25:** 
   - Gerenciamento de campanhas, conjuntos e anúncios.
   - Sincronização automática e métricas em tempo real.
   - **Criação de Campanhas em Massa:** Cria dezenas de campanhas e conjuntos com poucos cliques.
   - **Ações Rápidas de IA:** Aumentar orçamento e ativar campanhas direto no chat com 1 clique.
4. **Webhooks de Checkouts:** Kiwify, PayT, Hotmart, Stripe, VTurb, etc.
5. **Recuperação de Vendas:** Módulo dedicado para carrinhos abandonados e boletos/PIX pendentes.
6. **Inteligência Artificial (Google Gemini):** Diagnósticos automáticos da operação e geração de relatórios diários.

---

## 🚀 Como Executar Localmente no seu Computador

- **Frontend (Interface):**
  ```powershell
  cd "c:\Users\User\Downloads\INFOPRODUTOS\NINJA'S TRACKER\frontend"
  npm run dev
  ```
  Isso abrirá o dashboard em `http://localhost:5173`.

- **Backend (Python + PostgreSQL):**
  ```powershell
  cd "c:\Users\User\Downloads\INFOPRODUTOS\NINJA'S TRACKER\backend"
  pip install -r requirements.txt
  python -m uvicorn app:app --port 8000 --reload
  ```
