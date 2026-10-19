import { kpiData, dailyRevenueData, platformData, topCampaigns, hourlyData } from "../data/mock-dashboard";
import { campaignsData } from "../data/mock-campaigns";
import { adSetsData } from "../data/mock-adsets";
import { adsData } from "../data/mock-ads";
import { salesData } from "../data/mock-sales";
import { customersData } from "../data/mock-customers";
import { productsData } from "../data/mock-products";
import { funnelData } from "../data/mock-funnel";
import { recoveryData } from "../data/mock-recovery";
import { monthlyFinancialData, defaultCompanySettings } from "../data/mock-company";

export async function getMockData(endpoint: string, _options?: any): Promise<any> {
  // Mock delay to simulate network
  await new Promise((resolve) => setTimeout(resolve, 500));

  const [path] = endpoint.split("?");

  if (path === "/dashboard/overview") {
    return {
      kpis: {
        total_revenue: kpiData.totalRevenue,
        total_spend: kpiData.totalSpend,
        profit: kpiData.profit,
        total_sales: kpiData.totalSales,
        average_ticket: kpiData.averageTicket,
        cpa: kpiData.cpa,
        roas: kpiData.roas,
        profit_margin: kpiData.profitMargin,
        conversion_rate: kpiData.conversionRate,
        total_clicks: kpiData.totalClicks,
        chargeback_amount: kpiData.chargebackAmount,
        chargeback_rate: kpiData.chargebackRate,
        refunded_count: 45,
        chargeback_count: 22,
      },
      daily_revenue: dailyRevenueData,
      platform_distribution: platformData,
      top_campaigns: topCampaigns.map(c => ({
        name: c.name,
        spend: c.spend,
        revenue: c.revenue,
        sales: c.sales,
        profit: c.revenue - c.spend,
        roas: c.roas,
        cpa: c.cpa,
      })),
      hourly_sales: hourlyData,
    };
  }

  if (path === "/campaigns/data") {
    const mapAd = (ad: any) => ({
      id: ad.id,
      ad_set_id: ad.adSetId,
      name: ad.name,
      status: ad.status,
      budget: ad.budget,
      spend: ad.spend,
      clicks: ad.clicks,
      impressions: ad.impressions,
      cpc: ad.cpc,
      ctr: ad.ctr,
      landing_page_views: ad.landingPageViews,
      initiate_checkout: ad.initiateCheckout,
      connect_rate: ad.connectRate,
      sales: ad.sales,
      revenue: ad.revenue,
      profit: ad.profit,
      roas: ad.roas,
      cpa: ad.cpa,
      no_id_sales: Math.floor((ad.sales || 0) * 0.1),
      plays_vsl: Math.floor((ad.landingPageViews || 0) * 0.42),
      play_rate: ad.landingPageViews ? 42.0 : 0,
    });

    const mapAdSet = (as_: any) => ({
      id: as_.id,
      campaign_id: as_.campaignId,
      name: as_.name,
      status: as_.status,
      budget: as_.budget,
      spend: as_.spend,
      clicks: as_.clicks,
      impressions: as_.impressions,
      cpc: as_.cpc,
      ctr: as_.ctr,
      landing_page_views: as_.landingPageViews,
      initiate_checkout: as_.initiateCheckout,
      connect_rate: as_.connectRate,
      sales: as_.sales,
      revenue: as_.revenue,
      profit: as_.profit,
      roas: as_.roas,
      cpa: as_.cpa,
      no_id_sales: Math.floor((as_.sales || 0) * 0.1),
      plays_vsl: Math.floor((as_.landingPageViews || 0) * 0.42),
      play_rate: as_.landingPageViews ? 42.0 : 0,
      ads: adsData.filter((ad) => ad.adSetId === as_.id).map(mapAd),
    });

    const mapCampaign = (c: any, i: number) => ({
      ...c,
      // objective, bid_strategy, budget_type, account_id, account_name come from mock data
      landing_page_views: c.landingPageViews,
      initiate_checkout: c.initiateCheckout,
      connect_rate: c.connectRate,
      no_id_sales: Math.floor((c.sales || 0) * 0.1),
      plays_vsl: Math.floor((c.landingPageViews || 0) * 0.42),
      play_rate: c.landingPageViews ? 42.5 + i : 0,
      adsets: adSetsData.filter((as_) => as_.campaignId === c.id).map(mapAdSet),
    });

    return {
      campaigns: campaignsData.filter((c) => c.id !== "unidentified").map((c, i) => mapCampaign(c, i)),
      unidentified: mapCampaign(campaignsData.find((c) => c.id === "unidentified") || {}, 99),
    };
  }

  if (path === "/campaigns/conversion") {
    return campaignsData.filter(c => c.id !== "unidentified").map(c => ({
      campaign_id: c.id,
      total_transactions: c.sales + 40,
      approved_count: c.sales,
      approved_revenue: c.revenue,
      pending_count: 20,
      pending_revenue: 1500,
      refunded_count: 15,
      refunded_revenue: 800,
      chargeback_count: 5,
      chargeback_revenue: 400,
      trial_count: 0,
      trial_revenue: 0,
      approval_rate: 85.5,
      recovery_rate: 12.0,
      loss_rate: 2.5,
    }));
  }

  if (path.startsWith("/sales")) {
    if (path.includes("summary")) {
      return {
        total: salesData.length,
        approved: salesData.filter(s => s.status === 'approved').length,
        refunded: salesData.filter(s => s.status === 'refunded').length,
        chargebacks: salesData.filter(s => s.status === 'chargeback').length,
        pending: salesData.filter(s => s.status === 'pending').length,
        trial: salesData.filter(s => s.status === 'trial').length,
        revenue: 25400,
        avg_ticket: 297,
      };
    }
    if (path.includes("filter-options")) {
      return {
        products: [{ id: 1, name: "Produto Mock" }],
        platforms: [{ value: "kiwify", label: "Kiwify" }],
        accounts: [
          { slug: "act_123456789", name: "Ninja - Oficial", platform: "facebook" },
          { slug: "act_987654321", name: "Ninja - Secundária", platform: "facebook" }
        ],
        upsells: [],
        campaigns: ["Campanha Mock"]
      };
    }
    const mappedSales = salesData.map((s, i) => ({
      ...s,
      id: i + 1,
      external_id: s.id,
      customer_email: s.customerEmail,
      product_name: s.product,
      product_id: 1,
      utm_campaign: s.utmCampaign,
      utm_content: s.utmContent,
      utm_medium: s.utmMedium,
      utm_source: s.utmSource,
      webhook_slug: null,
      checkout_url: null,
      order_bumps: [],
      created_at: s.date
    }));
    return { items: mappedSales, total: mappedSales.length, page: 1, per_page: 20 };
  }

  if (path.startsWith("/customers")) {
    if (path.includes("summary")) {
       return { 
         total_customers: customersData.length, 
         total_orders: customersData.reduce((acc, c) => acc + c.totalOrders, 0),
         total_spent: customersData.reduce((acc, c) => acc + c.totalSpent, 0),
         unique_products: 3,
         avg_ticket: customersData.reduce((acc, c) => acc + c.totalSpent, 0) / customersData.reduce((acc, c) => acc + c.totalOrders, 0)
       };
    }
    if (path.includes("filter-options")) {
      return {
        products: [{ id: 1, name: "Produto Mock" }],
        platforms: [{ value: "kiwify", label: "Kiwify" }],
        accounts: [
          { slug: "act_123456789", name: "Ninja - Oficial", platform: "facebook" },
          { slug: "act_987654321", name: "Ninja - Secundária", platform: "facebook" }
        ],
        upsells: []
      };
    }
    const mappedCustomers = customersData.map(c => ({
      ...c,
      total_spent: c.totalSpent,
      total_orders: c.totalOrders,
      first_purchase_at: c.firstPurchase,
      last_purchase_at: c.lastPurchase
    }));
    return { items: mappedCustomers, total: mappedCustomers.length, page: 1, per_page: 20 };
  }

  if (path.startsWith("/products")) {
    const parts = path.split("/").filter(Boolean);
    
    if (parts.length === 1) {
      return productsData.map((p: any, i: number) => ({
        id: i + 1,
        name: p.name,
        logo_url: null,
      }));
    }
    
    if (parts.length === 3 && parts[2] === "checkouts") {
      const productIdIndex = parseInt(parts[1]) - 1;
      const product = productsData[productIdIndex];
      return product ? product.checkouts.map((c: any, i: number) => ({
        id: i + 1,
        url: c.url,
        price: c.price,
        platform: c.platform || "kiwify",
        checkout_code: null,
        name: c.id,
      })) : [];
    }

    if (parts.length === 3 && parts[2] === "order-bumps") {
      const pId = parseInt(parts[1]) - 1;
      return productsData[pId]?.orderBumps.map((ob: any, i: number) => ({
        id: i + 1, product_id: pId + 1, external_id: ob.id, name: ob.name, price: ob.price, created_at: null
      })) || [];
    }
    if (parts.length === 3 && parts[2] === "upsells") {
      const pId = parseInt(parts[1]) - 1;
      return productsData[pId]?.upsells.map((up: any, i: number) => ({
        id: i + 1, product_id: pId + 1, external_id: up.id, name: up.name, price: up.price, created_at: null
      })) || [];
    }
    if (parts.length === 2 && parts[1] === "stats") {
      return productsData.map((p: any, i: number) => ({
        product_id: i + 1,
        checkouts: p.checkouts.map((c: any, ci: number) => ({
          id: ci + 1, url: c.url, price: c.price, name: c.url, sales: c.sales, revenue: c.revenue, abandons: c.abandons, conversion_rate: c.conversionRate
        })),
        order_bumps: p.orderBumps.map((ob: any, oi: number) => ({
          id: oi + 1, external_id: ob.id, name: ob.name, price: ob.price, sales: ob.sales, revenue: ob.revenue, conversion_rate: ob.conversionRate
        })),
        upsells: p.upsells.map((up: any, ui: number) => ({
          id: ui + 1, external_id: up.id, name: up.name, price: up.price, sales: up.sales, revenue: up.revenue, conversion_rate: up.conversionRate
        }))
      }));
    }

    return productsData;
  }

  if (path.startsWith("/funnel")) {
    if (path.includes("recovery-data")) {
      return funnelData.map(f => ({
        ...f,
        stages: [
          { name: "Eventos Gerados", value: f.stages[3]?.value || 100 },
          { name: "Mensagens Enviadas", value: Math.floor((f.stages[3]?.value || 100) * 0.8) },
          { name: "Recuperados", value: Math.floor((f.stages[3]?.value || 100) * 0.15), revenue: Math.floor((f.stages[3]?.value || 100) * 0.15) * 197 }
        ]
      }));
    }
    return funnelData;
  }

  if (path.startsWith("/recovery")) {
    if (path.includes("summary")) {
       return { 
         total: 195,
         recovered: 30,
         pending: 165,
         recovery_rate: 15.38,
         recovered_amount: 15000,
         lost_amount: 45000,
         by_channel: {
           whatsapp: 18,
           email: 5,
           sms: 2,
           back_redirect: 3,
           other: 2
         }
       };
    }
    if (path.includes("list")) {
      return { items: recoveryData, total: recoveryData.length, page: 1, per_page: 20 };
    }
  }

  if (path.startsWith("/company")) {
    if (path.includes("settings")) {
      return {
        tax_rate: defaultCompanySettings.taxRate,
        operational_costs: defaultCompanySettings.operationalCosts,
      };
    }
    if (path.includes("dashboard")) {
      return {
        year: 2026,
        monthly: monthlyFinancialData.map(m => ({
          ...m,
          losses: 0
        })),
        total_sales: 847,
        unique_customers: 523,
      };
    }
    if (path.includes("kpi-colors")) {
      return {
        roas: null,
        cpa: null,
        ctr: null,
        cpc: null
      };
    }
    if (path.includes("ai-instructions")) {
      return {
        metrics: {
          roas: null,
          cpa: null,
          cpc: null,
          connect_rate: null
        },
        additional_prompt: ""
      };
    }
  }

  if (path.startsWith("/refunds")) {
    if (path.includes("summary")) {
      return {
        total_refunds: 145, refunded: 100, chargebacks: 45,
        refund_amount: 15400, chargeback_amount: 8500,
        refund_rate: 3.2, with_reason: 80, without_reason: 65
      };
    }
    if (path.includes("reasons/stats")) {
      return [
        { code: "didnt_like", count: 40 },
        { code: "too_expensive", count: 20 },
        { code: "technical_issues", count: 15 },
        { code: "not_as_described", count: 5 }
      ];
    }
    if (path.includes("list")) {
      return {
        items: [
          { id: 1, external_id: "REF-001", platform: "kiwify", status: "refunded", amount: 197, customer_email: "cliente1@email.com", product_name: "Ebook Fitness", product_id: 1, created_at: "2026-03-01T10:00:00", reason_code: "didnt_like", reason_text: "Não gostei" },
          { id: 2, external_id: "CB-002", platform: "payt", status: "chargeback", amount: 297, customer_email: "cliente2@email.com", product_name: "Curso Marketing", product_id: 2, created_at: "2026-03-02T14:30:00", reason_code: null, reason_text: null }
        ],
        total: 2, page: 1, per_page: 10
      };
    }
  }

  if (path.startsWith("/subscriptions")) {
    if (path.includes("metrics")) {
      return {
        mrr: 15500, arr: 186000, ltv: 850,
        trials: { count: 45, potential_value: 4500, conversion_rate: 65, churn_rate: 35 },
        renewal_rate: 85, cancellation_rate: 15, ticket_medio: 97,
        active_customers: 160, new_customers_month: 20,
        avg_tenure_months: 8.5, avg_cancel_months: 2.1, churn_rate: 10, total_canceled_period: 15
      };
    }
    if (path.includes("mrr-history")) {
      return {
        mrr_history: [
          { month: "Jan", mrr: 12000, new_mrr: 2000, churned_mrr: 500, net_mrr: 1500 },
          { month: "Fev", mrr: 13500, new_mrr: 2500, churned_mrr: 1000, net_mrr: 1500 },
          { month: "Mar", mrr: 15500, new_mrr: 3000, churned_mrr: 1000, net_mrr: 2000 }
        ]
      };
    }
    if (path.includes("products")) {
      return [{ id: "prod_1", name: "Assinatura VIP" }];
    }
  }

  if (path.startsWith("/stripe")) {
    if (path.includes("accounts")) {
      return [{ id: 1, name: "Stripe Principal", api_key: "sk_test_***", created_at: "2026-01-10T10:00:00" }];
    }
  }

  if (path === "/vturb/players") {
    return [
      { id: "vt1", name: "VSL Principal", duration: 1200, pitch_time: 900, created_at: "2026-01-15T00:00:00", account_name: "Conta 1", plays_30d: 4500 },
      { id: "vt2", name: "Upsell Video", duration: 600, pitch_time: 300, created_at: "2026-02-10T00:00:00", account_name: "Conta 1", plays_30d: 1200 }
    ];
  }

  if (path === "/facebook/accounts") {
    return [
      { id: 1, label: "Ninja - Oficial", account_id: "act_123456789", access_token: "mock_token_1", created_at: "2026-01-01T00:00:00" },
      { id: 2, label: "Ninja - Secundária", account_id: "act_987654321", access_token: "mock_token_2", created_at: "2026-02-01T00:00:00" },
    ];
  }

  if (path.startsWith("/users")) {
    return [
      { id: 1, name: "Admin", email: "admin@ninjastracker.com", role: "owner", status: "active", invite_token: null, created_at: "2026-01-01T00:00:00" },
      { id: 2, name: "Gestor", email: "gestor@ninjastracker.com", role: "admin", status: "active", invite_token: null, created_at: "2026-02-01T00:00:00" }
    ];
  }


  if (path === "/ai/training-level") {
    return {
      count: 920,
      percentage: 92,
      level: "Quase lá",
      max_records: 1000,
    };
  }

  // ─── Campaign Creator ───────────────────────────────────────────────

  if (path === "/campaigns/create/pixels") {
    return {
      pixels: [
        { id: "px_1234567890", name: "Pixel Principal - Ninja Tracker", last_fired_time: "2026-05-01T14:30:00" },
        { id: "px_0987654321", name: "Pixel Secundário - Checkout", last_fired_time: "2026-04-30T22:10:00" },
      ],
    };
  }

  if (path === "/campaigns/create/pages") {
    return {
      pages: [
        {
          id: "pg_111222333",
          name: "Ninja Tracker Oficial",
          picture: { data: { url: "https://ui-avatars.com/api/?name=NT&background=6366f1&color=fff&size=64" } },
        },
        {
          id: "pg_444555666",
          name: "Ninja Tracker - Marketing",
          picture: { data: { url: "https://ui-avatars.com/api/?name=NT&background=10b981&color=fff&size=64" } },
        },
      ],
      instagram_accounts: [
        { id: "ig_999888777", username: "ninjastracker.oficial", profile_pic: "https://ui-avatars.com/api/?name=NT&background=e879f9&color=fff&size=64" },
        { id: "ig_666555444", username: "ninjastracker.mkt", profile_pic: "https://ui-avatars.com/api/?name=NM&background=f59e0b&color=fff&size=64" },
      ],
    };
  }

  if (path === "/campaigns/create/interests") {
    const query = endpoint.split("q=")[1]?.toLowerCase() ?? "";
    const allInterests = [
      { id: "int_001", name: "Marketing Digital", audience_size: 45000000 },
      { id: "int_002", name: "Empreendedorismo", audience_size: 32000000 },
      { id: "int_003", name: "Fitness e Musculação", audience_size: 28000000 },
      { id: "int_004", name: "Emagrecimento", audience_size: 21000000 },
      { id: "int_005", name: "Negócios Online", audience_size: 18500000 },
      { id: "int_006", name: "Investimentos", audience_size: 15000000 },
      { id: "int_007", name: "Cursos Online", audience_size: 12000000 },
      { id: "int_008", name: "Renda Extra", audience_size: 9800000 },
      { id: "int_009", name: "Saúde e Bem-estar", audience_size: 38000000 },
      { id: "int_010", name: "Tecnologia", audience_size: 55000000 },
      { id: "int_011", name: "E-commerce", audience_size: 14000000 },
      { id: "int_012", name: "Copywriting", audience_size: 4500000 },
    ];
    const filtered = query
      ? allInterests.filter((i) => i.name.toLowerCase().includes(decodeURIComponent(query)))
      : allInterests.slice(0, 6);
    return { interests: filtered };
  }

  if (path === "/campaigns/create/publish") {
    return {
      success: true,
      campaign_id: "mock_camp_" + Date.now(),
      adset_id: "mock_adset_" + Date.now(),
      campaigns_created: 2,
      ads_created: 2,
      errors: [],
      account_results: [
        { account_id: 1, account_label: "Ninja - Oficial", success: true, campaigns_created: 1, ads_created: 1, errors: [] },
        { account_id: 2, account_label: "Ninja - Secundária", success: true, campaigns_created: 1, ads_created: 1, errors: [] },
      ],
    };
  }

  if (path === "/campaigns/create/import") {
    return { success: true, data: _options?.body ?? {} };
  }

  // ─── Gemini AI ──────────────────────────────────────────────────────

  if (path === "/gemini/status") {
    return { configured: true, count: 1 };
  }

  if (path === "/gemini/accounts") {
    return [
      { id: 1, name: "Ninja AI", api_key: "AIza***mock***", model: "gemini-2.0-flash", created_at: "2026-01-10T00:00:00" },
    ];
  }

  if (path === "/gemini/chat") {
    const body = _options?.body as { message?: string } | undefined;
    const msg = (body?.message ?? "").toLowerCase();

    let response = "";

    if (msg.includes("melhor campanha") || msg.includes("top campanha")) {
      response = `## 🏆 Melhor Campanha\n\nAnalisando os dados atuais, a **Campaign - Curso Marketing Digital** é a sua melhor campanha:\n\n- **Faturamento:** R$ 35.200\n- **Vendas:** 234\n- **Lucro:** R$ 22.900\n- **ROAS:** 2,86\n\nApesar de ter o maior volume, o **ROAS ainda está abaixo de 3x**. Recomendo testar novos criativos no conjunto "Retargeting 7d" para melhorar o índice de conversão.`;
    } else if (msg.includes("roas")) {
      response = `## 📊 Análise de ROAS\n\nVeja o ROAS atual das suas campanhas ativas:\n\n| Campanha | ROAS |\n|---|---|\n| Ebook Fitness | 3,34 |\n| Mentoria Premium | **4,0** ✅ |\n| Lançamento VIP | 3,18 |\n| Curso Marketing | 2,86 ⚠️ |\n\nA **Mentoria Premium** tem o melhor ROAS (4,0x). Recomendo aumentar o orçamento dela em ~20% para escalar esse resultado.\n\nA **Curso Marketing** está abaixo de 3x — considere revisar os criativos ou pausar os conjuntos de baixo desempenho.`;
    } else if (msg.includes("pausar") || msg.includes("pausa")) {
      response = `## ⏸️ Campanhas para Pausar\n\nBaseando-me nos dados atuais, recomendo pausar:\n\n1. **PLR Bundle Pack** — ROAS 2,25 com CPA de R$56. Está consumindo orçamento sem retorno adequado.\n2. **Desafio 21 Dias** — Status "concluída" mas ainda gerando gastos.\n\nAntes de pausar, verifique se há conjuntos específicos dentro dessas campanhas que ainda estejam performando bem. Posso analisar os conjuntos de cada uma se desejar.`;
    } else if (msg.includes("cpa")) {
      response = `## 💰 Análise de CPA\n\nO CPA médio da operação está em **R$ 48,71**. Por campanha:\n\n- 🟢 Lançamento VIP: **R$ 42,80** (melhor)\n- 🟢 Ebook Fitness: R$ 44,97\n- 🟡 Mentoria Premium: R$ 50,00\n- 🟡 Curso Marketing: R$ 52,56\n- 🔴 PLR Bundle Pack: **R$ 56,00** (pior)\n\nO seu CPA ideal deveria estar abaixo de **R$ 50** para manter margem saudável. As campanhas Ebook Fitness e Lançamento VIP estão dentro do target.`;
    } else if (msg.includes("vendas") || msg.includes("receita") || msg.includes("faturamento")) {
      response = `## 💵 Resumo de Vendas\n\nDados consolidados da operação:\n\n- **Total de vendas:** 981\n- **Faturamento:** R$ 137.250\n- **Gasto total:** R$ 46.350\n- **Lucro líquido:** R$ 90.900\n- **ROAS médio:** 3,06\n\nA campanha com maior volume é o **Curso Marketing Digital** (234 vendas). Para maximizar o lucro, foque em escalar a **Mentoria Premium** — ela tem o melhor ROAS (4,0x) e margem mais alta.`;
    } else if (msg.includes("escalar") || msg.includes("aumentar orçamento")) {
      response = `## 🚀 Estratégia de Escala\n\nPara escalar com segurança, recomendo:\n\n**1. Mentoria Premium** (ROAS 4,0x)\n→ Aumente o orçamento diário de R$350 para R$500-600 gradualmente (+20% a cada 3 dias)\n\n**2. Lançamento VIP** (ROAS 3,18x, CPA R$42,80)\n→ Duplique o orçamento do conjunto "Lista VIP Lookalike"\n\n**Evite escalar:**\n- PLR Bundle Pack (ROAS abaixo de 2,5x)\n- Desafio 21 Dias (campanha encerrada)\n\n> ⚠️ Nunca aumente mais que 30% do orçamento de uma vez para não sair da fase de aprendizado.`;
    } else if (msg.includes("criativo") || msg.includes("anúncio")) {
      response = `## 🎨 Análise de Criativos\n\nOs melhores anúncios atualmente:\n\n1. **"Criativo Depoimento Ana"** — CTR 3,28%, ROAS 4,5x ⭐\n2. **"VSL Mentoria Case"** — CTR 3,56%, ROAS 4,5x ⭐\n3. **"VIP Exclusivo Feed"** — CPA R$ 39,47 (mais eficiente)\n\n**Padrão observado:** Criativos de **depoimento e case** superam os de imagem genérica em todos os conjuntos. Recomendo produzir mais vídeos UGC e VSL com histórias reais.`;
    } else if (msg.includes("relatório") || msg.includes("resumo")) {
      response = `## 📋 Relatório Geral — Hoje\n\n**Desempenho Atual:**\n- Faturamento: **R$ 137.250**\n- Gastos: R$ 46.350\n- Lucro: **R$ 90.900** (margem 66%)\n- Vendas: 981\n- ROAS médio: **3,06x**\n\n**Destaques:**\n✅ Mentoria Premium com ROAS 4,0x — escale com prioridade\n⚠️ Curso Marketing com ROAS 2,86 — revisar criativos\n🔴 PLR Bundle Pack pausado — aguardando otimização\n\n**Recomendação do dia:** Aloque mais verba na Mentoria Premium e teste novos criativos UGC no Curso Marketing Digital.`;
    } else {
      response = `Olá! Sou a **Ninja AI**, sua assistente de análise de campanhas do **NINJA'S TRACKER**. 🥷\n\nPosso te ajudar com:\n\n- 📊 **Análise de ROAS, CPA e métricas** das suas campanhas\n- 🎯 **Recomendações** de quais campanhas escalar ou pausar\n- 💡 **Insights sobre criativos** de melhor desempenho\n- 📋 **Relatórios resumidos** da operação\n- 🚀 **Estratégias de escala** segura\n\nMe pergunte algo como: *"Qual campanha tem melhor ROAS?"*, *"O que devo pausar?"* ou *"Como posso escalar?"*`;
    }

    return { response };
  }

  if (path === "/gemini/transcribe") {
    return {
      text: "Qual é o faturamento e o ROAS das minhas campanhas hoje?",
    };
  }

  if (path === "/gemini/daily-report") {
    return {
      spend_today: 0,
      response: `## 🌅 Relatório Operacional — Ninja AI\n\n**Resumo do Dia:**\n\n### 💰 Financeiro\n- **Status:** Operação Ativa\n- **Métricas:** Sincronização em tempo real ativada\n\n> Nenhuma ação corretiva crítica necessária no momento.`,
    };
  }

  if (path === "/campaigns/ai-action") {
    const body = _options?.body as { action?: string; entity_name?: string } | undefined;
    const action = body?.action ?? "action";
    const name = body?.entity_name ?? "entidade";
    return {
      status: "success",
      message: `${action === "pause" ? "Pausada" : action === "activate" ? "Ativada" : "Atualizada"}: ${name}`,
    };
  }

  if (path === "/guardian/rules") {
    return {
      rules: [
        {
          id: 1,
          name: "Stop-Loss Anti-Prejuízo (Zero Vendas)",
          description: "Pausa automaticamente o conjunto se gastar mais de R$ 80,00 no dia sem gerar nenhuma venda.",
          entity_type: "adset",
          condition_type: "spend_without_sales",
          threshold_value: 80.0,
          secondary_threshold: 0.0,
          action: "pause",
          action_value: 0.0,
          is_active: true,
          created_at: new Date().toISOString(),
        },
        {
          id: 2,
          name: "Teto de CPA Excedido (Bid Cap Guard)",
          description: "Pausa ou alerta se o CPA médio do conjunto ultrapassar R$ 90,00 (após pelo menos 1 venda).",
          entity_type: "adset",
          condition_type: "cpa_above",
          threshold_value: 90.0,
          secondary_threshold: 1.0,
          action: "pause",
          action_value: 0.0,
          is_active: true,
          created_at: new Date().toISOString(),
        },
        {
          id: 3,
          name: "Detector de Escala (Winner / ROAS 2.5x+)",
          description: "Alerta oportunidade de escala quando o conjunto bater ROAS acima de 2.5x com pelo menos 2 vendas.",
          entity_type: "adset",
          condition_type: "roas_above",
          threshold_value: 2.5,
          secondary_threshold: 2.0,
          action: "notify",
          action_value: 20.0,
          is_active: true,
          created_at: new Date().toISOString(),
        },
        {
          id: 4,
          name: "Alerta de CTR Crítico (Criativo Ineficiente)",
          description: "Notifica quando o CTR ficar abaixo de 0.8% após gastar pelo menos R$ 40,00 no dia.",
          entity_type: "adset",
          condition_type: "ctr_below",
          threshold_value: 0.8,
          secondary_threshold: 40.0,
          action: "notify",
          action_value: 0.0,
          is_active: true,
          created_at: new Date().toISOString(),
        },
      ],
    };
  }

  if (path === "/guardian/logs") {
    return {
      logs: [
        {
          id: 101,
          rule_id: 1,
          rule_name: "Stop-Loss Anti-Prejuízo (Zero Vendas)",
          entity_id: "adset_98234",
          entity_type: "adset",
          entity_name: "Lookalike 1% - Compradores 30d",
          action_taken: "paused",
          message: "Conjunto pausado: Gastou R$ 86,40 sem nenhuma venda hoje.",
          metrics_snapshot: { spend: 86.40, sales: 0, cpa: 86.40, roas: 0 },
          created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
        },
        {
          id: 102,
          rule_id: 2,
          rule_name: "Teto de CPA Excedido (Bid Cap Guard)",
          entity_id: "adset_98235",
          entity_type: "adset",
          entity_name: "Interesses: Marketing Digital Aberto",
          action_taken: "paused",
          message: "CPA de R$ 94,20 ultrapassou o teto de R$ 90,00 (1 venda gerada).",
          metrics_snapshot: { spend: 94.20, sales: 1, cpa: 94.20, roas: 2.09 },
          created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
        },
        {
          id: 103,
          rule_id: 3,
          rule_name: "Detector de Escala (Winner / ROAS 2.5x+)",
          entity_id: "adset_98236",
          entity_type: "adset",
          entity_name: "Retargeting VSL 7 Dias",
          action_taken: "notified",
          message: "Potencial de Escala: ROAS de 3,85x com 6 vendas no dia!",
          metrics_snapshot: { spend: 306.00, sales: 6, cpa: 51.00, roas: 3.85 },
          created_at: new Date(Date.now() - 3600000 * 8).toISOString(),
        },
      ],
    };
  }

  if (path === "/guardian/evaluate") {
    return {
      status: "ok",
      dry_run: false,
      evaluated_entities: 14,
      actions_taken: 1,
      message: "Verificação concluída: 14 conjuntos avaliados, 1 ação aplicada com sucesso.",
      executed_logs: [
        {
          rule_name: "Stop-Loss Anti-Prejuízo",
          entity_name: "Broad Aberto 25-54",
          action: "paused",
          message: "Gastou R$ 82,10 sem vendas no dia.",
        },
      ],
    };
  }

  if (path === "/creative-fatigue/analysis") {
    return {
      summary: {
        total_ads: 8,
        healthy_count: 5,
        warning_count: 2,
        critical_count: 1,
      },
      ads: [
        {
          id: "ad_101",
          name: "VSL Gancho 01 - História Médico",
          campaign_name: "Escala Perpétuo",
          adset_name: "Lookalike 1%",
          account_id: 1,
          status: "ACTIVE",
          spend: 3450.0,
          impressions: 48900,
          reach: 18200,
          frequency: 2.68,
          clicks: 980,
          ctr: 0.68,
          cpc: 3.52,
          sales: 32,
          cpa: 107.80,
          roas: 1.82,
          fatigue_score: 88,
          fatigue_status: "critical",
          recommendation: "🔴 Saturação severa detectada (Frequência 2.68x, CTR 0.68%). Recomenda-se pausar este anúncio ou testar novo gancho/abertura imediatamente.",
        },
        {
          id: "ad_102",
          name: "Depoimento WhatsApp - Antes e Depois",
          campaign_name: "Escala Perpétuo",
          adset_name: "Interesses Nutrição",
          account_id: 1,
          status: "ACTIVE",
          spend: 1890.0,
          impressions: 32100,
          reach: 16800,
          frequency: 1.91,
          clicks: 640,
          ctr: 1.45,
          cpc: 2.95,
          sales: 28,
          cpa: 67.50,
          roas: 2.91,
          fatigue_score: 55,
          fatigue_status: "warning",
          recommendation: "🟡 Frequência em elevação (1.91x) e CTR moderado. Prepare criativos substitutos para evitar subida brusca de CPA.",
        },
        {
          id: "ad_103",
          name: "UGC Vídeo Curto - Unboxing & Resultado",
          campaign_name: "Remarketing VSL",
          adset_name: "Visitantes 14d",
          account_id: 1,
          status: "ACTIVE",
          spend: 920.0,
          impressions: 21500,
          reach: 17200,
          frequency: 1.25,
          clicks: 720,
          ctr: 3.35,
          cpc: 1.27,
          sales: 22,
          cpa: 41.80,
          roas: 4.71,
          fatigue_score: 18,
          fatigue_status: "healthy",
          recommendation: "🟢 Criativo saudável com alta tração e baixa repetição de público (Frequência 1.25x). Seguro para manter ou aumentar orçamento.",
        },
      ],
      date_range: { start: "2026-10-04", end: "2026-10-11" },
    };
  }

  if (path === "/simulator/metrics") {
    return {
      status: "ok",
      average_ticket: 197.0,
      total_sales_30d: 480,
      total_revenue_30d: 94560.0,
      total_spend_30d: 28400.0,
      average_cpa: 59.16,
      average_roas: 3.32,
      refund_rate: 2.4,
    };
  }

  if (path === "/simulator/calculate") {
    const b = _options?.body || {};
    const price = b.product_price || 197.0;
    const feeP = b.gateway_fee_percent || 8.99;
    const feeF = b.gateway_fee_fixed || 2.49;
    const taxP = b.tax_percent || 6.0;
    const refP = b.refund_rate_percent || 2.5;
    const extra = b.extra_costs_per_sale || 0;
    const bud = b.daily_budget || 500.0;
    const gFee = price * (feeP / 100) + feeF;
    const tFee = price * (taxP / 100);
    const rFee = price * (refP / 100);
    const netRev = Math.max(0, price - gFee - tFee - rFee - extra);
    const cpa = b.estimated_cpa || netRev * 0.5;
    const salesDay = bud / cpa;
    const grossDay = salesDay * price;
    const netDay = salesDay * netRev;
    const profitDay = netDay - bud;

    return {
      status: "ok",
      breakeven: {
        net_revenue_per_sale: netRev,
        breakeven_cpa: netRev,
        breakeven_roas: price / netRev,
        contribution_margin_percent: (netRev / price) * 100,
        deductions_per_sale: {
          gateway: gFee,
          tax: tFee,
          refund_provision: rFee,
          extra,
        },
      },
      target_projection: {
        daily_spend: bud,
        target_cpa: cpa,
        sales_per_day: salesDay,
        gross_revenue_daily: grossDay,
        net_profit_daily: profitDay,
        net_profit_monthly: profitDay * 30,
        projected_roas: grossDay / bud,
        net_margin_percent: (profitDay / grossDay) * 100,
      },
      scenarios: [
        {
          name: "Conservador",
          daily_spend: 200,
          sales_per_day: 200 / cpa,
          monthly_sales: Math.round((200 / cpa) * 30),
          gross_revenue_month: (200 / cpa) * price * 30,
          daily_profit: (200 / cpa) * netRev - 200,
          monthly_profit: ((200 / cpa) * netRev - 200) * 30,
          projected_roas: price / cpa,
          net_margin_percent: 38.5,
        },
        {
          name: "Moderado",
          daily_spend: 500,
          sales_per_day: 500 / cpa,
          monthly_sales: Math.round((500 / cpa) * 30),
          gross_revenue_month: (500 / cpa) * price * 30,
          daily_profit: (500 / cpa) * netRev - 500,
          monthly_profit: ((500 / cpa) * netRev - 500) * 30,
          projected_roas: price / cpa,
          net_margin_percent: 41.2,
        },
        {
          name: "Escala Agressiva",
          daily_spend: 1500,
          sales_per_day: 1500 / cpa,
          monthly_sales: Math.round((1500 / cpa) * 30),
          gross_revenue_month: (1500 / cpa) * price * 30,
          daily_profit: (1500 / cpa) * netRev - 1500,
          monthly_profit: ((1500 / cpa) * netRev - 1500) * 30,
          projected_roas: price / cpa,
          net_margin_percent: 40.8,
        },
        {
          name: "Escala Pesada",
          daily_spend: 3000,
          sales_per_day: 3000 / cpa,
          monthly_sales: Math.round((3000 / cpa) * 30),
          gross_revenue_month: (3000 / cpa) * price * 30,
          daily_profit: (3000 / cpa) * netRev - 3000,
          monthly_profit: ((3000 / cpa) * netRev - 3000) * 30,
          projected_roas: price / cpa,
          net_margin_percent: 39.5,
        },
        {
          name: "Escala Ninja",
          daily_spend: 6000,
          sales_per_day: 6000 / cpa,
          monthly_sales: Math.round((6000 / cpa) * 30),
          gross_revenue_month: (6000 / cpa) * price * 30,
          daily_profit: (6000 / cpa) * netRev - 6000,
          monthly_profit: ((6000 / cpa) * netRev - 6000) * 30,
          projected_roas: price / cpa,
          net_margin_percent: 38.0,
        },
      ],
    };
  }

  if (path === "/setup/status") {
    return { is_configured: true };
  }

  if (path === "/setup") {
    return { message: "Setup concluído com sucesso!" };
  }

  if (path === "/login") {
    return {
      access_token: "ninja-pro-demo-token-jwt-secret-authenticated",
      token_type: "bearer",
      user: {
        id: 1,
        name: "Sayme",
        email: "sayme@ninjastracker.com",
        role: "owner",
      },
    };
  }

  if (path === "/profile") {
    return {
      id: 1,
      name: "Sayme",
      email: "sayme@ninjastracker.com",
      role: "owner",
    };
  }

  if (path === "/auth/reset-password") {
    return { message: "Senha redefinida com sucesso! Você já pode entrar." };
  }

  // Return undefined to fallback to normal fetch if endpoint is not mocked
  return undefined;
}
