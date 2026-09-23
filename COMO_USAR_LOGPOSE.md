# 🏴‍☠️ Guia Rápido: Log Pose (UTMify / NexoFy Open-Source)

O **Log Pose** foi clonado com sucesso para a pasta:
`c:\Users\User\Downloads\INFOPRODUTOS\logpose`

---

## 🎯 O que é o Log Pose?
O Log Pose é uma plataforma completa e open-source criada especificamente para gestores de tráfego direto e produtores no Brasil, servindo como uma alternativa livre e sem mensalidade ao **UTMify** e **NexoFy**.

### Principais Módulos Integrados:
1. **Dashboard & KPIs:** Faturamento Líquido, Lucro, ROAS, ROI, CPA, gráficos de vendas hora a hora e distribuição por plataforma.
2. **Funil de Vendas:** Rastreamento visual de conversão (Páginas -> Carrinho -> Vendas).
3. **Facebook Ads & Meta API v25:** 
   - Gerenciamento de campanhas, conjuntos e anúncios.
   - Sincronização automática e métricas em tempo real.
   - **Criação de Campanhas em Massa:** Cria dezenas de campanhas e conjuntos com poucos cliques.
4. **Webhooks de Checkouts:** Kiwify, PayT, Stripe, VTurb, etc.
5. **Recuperação de Vendas:** Módulo dedicado para carrinhos abandonados e boletos/PIX pendentes.
6. **Inteligência Artificial (Google Gemini):** Diagnósticos automáticos da operação e geração de relatórios diários.

---

## 🚀 Como Colocar no Ar (Opções)

### Opção 1: Deploy no Render (Recomendado se você já usa Render)
O repositório já possui um `Dockerfile` pronto para produção.
1. No [Render.com](https://render.com), crie um novo **PostgreSQL Database** (gratuito). Copie a `Internal Database URL`.
2. Crie um novo **Web Service** conectado ao repositório do Log Pose:
   - **Environment:** `Docker`
   - **Dockerfile Path:** `./Dockerfile`
   - **Environment Variables:**
     - `DATABASE_URL`: URL do seu banco PostgreSQL do Render
     - `SECRET_KEY`: uma chave aleatória qualquer (ex: `chave_secreta_super_segura_123`)
     - `META_GRAPH_API_VERSION`: `v25.0`
3. O Render vai compilar o frontend React e subir o backend Python FastAPI automaticamente na porta 8000.

---

### Opção 2: Deploy em 1 Clique (Oficial do projeto)
O Log Pose oferece um instalador em 1 clique na plataforma Ilumin Cloud:
- Link: [https://ilumin.app/?src=logpose](https://ilumin.app/?src=logpose)

---

### Opção 3: Executar Localmente no seu Computador
- **Frontend (Interface):**
  ```powershell
  cd "c:\Users\User\Downloads\INFOPRODUTOS\logpose\frontend"
  npm run dev
  ```
  Isso abrirá o dashboard em `http://localhost:5173`.

- **Backend (Python + PostgreSQL):**
  ```powershell
  cd "c:\Users\User\Downloads\INFOPRODUTOS\logpose\backend"
  pip install -r requirements.txt
  python -m uvicorn app:app --port 8000 --reload
  ```
