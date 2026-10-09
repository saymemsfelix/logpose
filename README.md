<div align="center">
  <!-- Substitua pelo link da imagem do banner/logo do App -->
  <img src="/frontend/public/logo_dark.webp" alt="Banner do SFY" width="200" />

  <h1>SFY</h1>
  <p>O dashboard definitivo para CEOs de Direct Response. Navegue pelos seus dados de tráfego e vendas com máxima precisão e lucro.</p>

  <p>
    <a href="#instalação-em-1-clique-recomendado"><b>Deploy Automático</b></a> •
    <a href="#tutorial-de-instalação"><b>Vídeo Tutorial</b></a> •
    <a href="#instalação-manual-avançado"><b>Instalação Manual</b></a> •
    <a href="#licença"><b>Licença</b></a>
  </p>
</div>

---

## Sobre o Projeto

**SFY** é uma solução completa focada em entregar máxima clareza financeira para operações de Direct Response. 

O SFY é a ferramenta que indica a direção correta (campanhas, conjuntos e anúncios) que os gestores e CEOs devem seguir para encontrar o lucro verdadeiro da sua operação.

Em poucos segundos, um CEO consegue visualizar a saúde financeira da operação através de uma interface desenhada para destacar os KPIs essenciais de forma clara, objetiva e com uma UI/UX de alto padrão.

### Principais Recursos
- **Dashboard Executivo & Funil de Vendas:** Visão panorâmica e em tempo real dos seus KPIs mais importantes (Lucro Líquido, ROAS, ROI, CPA) interligados ao acompanhamento ponta a ponta do funil.
- **Criação em Massa no Facebook Ads:** Ganhe velocidade absurda na sua esteira de tráfego. Configure templates e suba 100 campanhas com 100 conjuntos de anúncios em questão de segundos.
- **Inteligência Artificial (Google Gemini):** A IA nativa analisa seus dados, identifica padrões de compra, sugere otimizações e envia relatórios diários automáticos detalhando a saúde da operação.
- **Acompanhamento de Recuperação de Carrinho:** Módulo dedicado para monitorar leads que abandonaram compras, facilitando as ações ativas de recuperação e aumentando o faturamento.
- **Tracking Transparente (Webhooks & Vendas):** Controle centralizado de transações. Receba eventos em tempo real (PayT, Kiwify, Stripe) e unifique a jornada de compra e assinaturas sem perder rastreio.
- **Gestão Avançada de Operação:** Controle unificado de clientes, mapeamento e aliases de produtos, acompanhamento de assinaturas, rastreio de reembolsos e integração com VTurb.

---
---

## Tutorial de Instalação

Preparamos um guia passo a passo em vídeo. Mostramos o aplicativo por dentro e como você pode ter a sua própria estrutura rodando em menos de 5 minutos.

[▶️ Clique aqui para assistir ao tutorial](https://www.youtube.com/watch?v=6vBqKXBLpVc)

[![Assista ao Tutorial](https://img.youtube.com/vi/6vBqKXBLpVc/maxresdefault.jpg)](https://www.youtube.com/watch?v=6vBqKXBLpVc)

---

## Instalação Manual (Avançado)

Se você tem experiência com infraestrutura cloud, gerenciamento de servidores Linux e prefere configurar o ambiente manualmente, utilize os arquivos `docker-compose` fornecidos.

**Pré-requisitos Necessários:**
- Acesso SSH a uma VPS crua (Ubuntu/Debian).
- Docker e Docker Compose instalados no servidor.
- Conhecimento para configurar Proxy Reverso (Nginx, Traefik ou Caddy).
- Geração e renovação de certificados SSL (Let's Encrypt).

```yaml
version: '3.8'

services:
  app:
    image: ninjastracker:latest
    environment:
      - DATABASE_URL=postgres://tracker_user:pass@db:5432/ninjas_tracker
      - SECRET_KEY=sua_chave_secreta_aqui
      - META_GRAPH_API_VERSION=v25.0
    ports:
      - "8000:8000"
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: postgres:14-alpine
    environment:
      - POSTGRES_USER=tracker_user
      - POSTGRES_PASSWORD=pass
      - POSTGRES_DB=ninjas_tracker
    volumes:
      - tracker_db_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  tracker_db_data:
```

1. Clone este repositório em seu servidor.
2. Edite as variáveis de ambiente com suas credenciais seguras.
3. Configure o bloco de servidor no proxy reverso apontando o seu domínio para a porta exposta.
4. Execute `docker compose up -d`.

---

## Tecnologias Utilizadas

- **Frontend:** React + TailwindCSS + ShadCN UI
- **Backend:** Python + FastAPI
- **Banco de Dados:** PostgreSQL
- **Deployment:** Docker

---

## Licença

Este projeto é de código aberto e está licenciado sob a [MIT License](LICENSE.md). É 100% gratuito para uso comercial e pessoal.

---

<div align="center">
  <br>
  <p><b>NINJA'S TRACKER</b> • Performance com vendas reais</p>
</div>
