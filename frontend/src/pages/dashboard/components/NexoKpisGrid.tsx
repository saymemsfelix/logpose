import { useState } from "react";
import { Eye, EyeOff, LayoutGrid, DollarSign, Megaphone, Filter } from "lucide-react";
import type { DashboardKpis } from "@/types/dashboard";

interface NexoKpisGridProps {
  kpis: DashboardKpis;
  hideAllValues?: boolean;
  onSpendUpdated?: () => void;
  taxEnabled?: boolean;
  taxRate?: number;
  opCostsEnabled?: boolean;
  opCostsTotal?: number;
}

type MetricCategory = "all" | "finance" | "traffic" | "funnel";

export function NexoKpisGrid({
  kpis,
  hideAllValues = false,
  taxEnabled = false,
  taxRate = 0,
  opCostsEnabled = false,
  opCostsTotal = 0,
}: NexoKpisGridProps) {
  const [activeTab, setActiveTab] = useState<MetricCategory>("all");
  const [hiddenCards, setHiddenCards] = useState<Record<string, boolean>>({});

  const toggleCard = (key: string) => {
    setHiddenCards((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const isHidden = (key: string) => hideAllValues || !!hiddenCards[key];

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val);
  };

  const maskValue = (valueStr: string, key: string) => {
    if (isHidden(key)) {
      return "••••••";
    }
    return valueStr;
  };

  const taxDeduction = taxEnabled ? kpis.total_revenue * (taxRate / 100) : 0;
  const opDeduction = opCostsEnabled ? opCostsTotal : 0;

  const adjustedRevenue = kpis.total_revenue - taxDeduction;
  const baseProfit = kpis.profit ?? (kpis.total_revenue - kpis.total_spend);
  const profit = baseProfit - taxDeduction - opDeduction;
  const isProfitPositive = profit >= 0;
  const margin = adjustedRevenue > 0 ? (profit / adjustedRevenue) * 100 : 0;
  const roas = kpis.total_spend > 0 ? adjustedRevenue / kpis.total_spend : 0;
  const totalCostBasis = kpis.total_spend + opDeduction;
  const roi = totalCostBasis > 0 ? profit / totalCostBasis : 0;
  const totalOrders = kpis.total_orders ?? kpis.total_sales;
  const approvalRate = kpis.approval_rate ?? (totalOrders > 0 ? (kpis.total_sales / totalOrders) * 100 : 0);
  const avgTicket = kpis.average_ticket || (kpis.total_sales > 0 ? kpis.total_revenue / kpis.total_sales : 0);

  // Métricas completas de Tráfego & Leilão (Padrão UTMify)
  const totalImpr = kpis.total_impressions ?? 0;
  const totalClicks = kpis.total_clicks ?? 0;
  const cpm = kpis.cpm ?? (totalImpr > 0 && kpis.total_spend > 0 ? (kpis.total_spend / totalImpr) * 1000 : 0);
  const cpc = kpis.cpc ?? (totalClicks > 0 && kpis.total_spend > 0 ? kpis.total_spend / totalClicks : 0);
  const ctr = kpis.ctr ?? (totalImpr > 0 && totalClicks > 0 ? (totalClicks / totalImpr) * 100 : 0);

  // Métricas completas de Funil & Páginas (Padrão UTMify)
  const lpv = kpis.pageviews ?? kpis.landing_page_views ?? 0;
  const cpv = kpis.cpv ?? (lpv > 0 && kpis.total_spend > 0 ? kpis.total_spend / lpv : 0);
  const connectRate = kpis.connect_rate ?? (totalClicks > 0 && lpv > 0 ? (lpv / totalClicks) * 100 : 0);
  const ic = kpis.initiate_checkout ?? 0;
  const costPerIc = kpis.cost_per_ic ?? (ic > 0 && kpis.total_spend > 0 ? kpis.total_spend / ic : 0);
  const checkoutRate = kpis.checkout_rate ?? (lpv > 0 && ic > 0 ? (ic / lpv) * 100 : 0);
  const checkoutConvRate = kpis.checkout_conversion_rate ?? (ic > 0 ? (kpis.total_sales / ic) * 100 : 0);
  const conversionRate = kpis.conversion_rate ?? (totalClicks > 0 ? (kpis.total_sales / totalClicks) * 100 : 0);

  const taxSubtext = taxEnabled
    ? `-${formatCurrency(taxDeduction)} impostos (${taxRate}%)`
    : null;
  const opSubtext = opCostsEnabled
    ? `-${formatCurrency(opDeduction)} custos fixos`
    : null;
  const profitSubtext = [taxSubtext, opSubtext].filter(Boolean).join(" | ") || null;

  interface CardItem {
    id: string;
    category: "finance" | "traffic" | "funnel";
    title: string;
    value: string;
    subtext: string | null;
    colorClass: string;
    hasToggle: boolean;
    badge?: string;
  }

  const allCards: CardItem[] = [
    // ─── 1. Financeiro & Vendas ───
    {
      id: "rev",
      category: "finance",
      title: taxEnabled ? "Faturamento (- impostos)" : "Faturamento líquido",
      value: formatCurrency(adjustedRevenue),
      subtext: taxSubtext,
      colorClass: "text-zinc-900 dark:text-zinc-100",
      hasToggle: true,
    },
    {
      id: "profit",
      category: "finance",
      title: (taxEnabled || opCostsEnabled) ? "Lucro Real" : "Lucro líquido",
      value: formatCurrency(profit),
      subtext: profitSubtext,
      colorClass: isProfitPositive
        ? "text-emerald-600 dark:text-emerald-400 font-semibold"
        : "text-rose-600 dark:text-rose-400 font-semibold",
      hasToggle: true,
    },
    {
      id: "margin",
      category: "finance",
      title: (taxEnabled || opCostsEnabled) ? "Margem Real" : "Margem de lucro",
      value: `${margin.toFixed(1)}%`,
      subtext: null,
      colorClass: "text-zinc-900 dark:text-zinc-100",
      hasToggle: true,
    },
    {
      id: "roas",
      category: "finance",
      title: taxEnabled ? "ROAS Real" : "ROAS",
      value: `${roas.toFixed(2)}x`,
      subtext: null,
      colorClass: roas >= 1.0 ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-rose-600 dark:text-rose-400 font-medium",
      hasToggle: true,
    },
    {
      id: "roi",
      category: "finance",
      title: (taxEnabled || opCostsEnabled) ? "ROI Real" : "ROI",
      value: `${roi.toFixed(2)}x`,
      subtext: null,
      colorClass: roi >= 0 ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-rose-600 dark:text-rose-400 font-medium",
      hasToggle: true,
    },
    {
      id: "approved",
      category: "finance",
      title: "Vendas aprovadas",
      value: String(kpis.total_sales),
      subtext: `de ${totalOrders} pedidos`,
      colorClass: "text-zinc-900 dark:text-zinc-100 font-medium",
      hasToggle: false,
    },
    {
      id: "approval_rate",
      category: "finance",
      title: "Taxa de aprovação",
      value: `${approvalRate.toFixed(1)}%`,
      subtext: null,
      colorClass: approvalRate >= 80 ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-900 dark:text-zinc-100",
      hasToggle: false,
    },
    {
      id: "ticket",
      category: "finance",
      title: "Ticket Médio",
      value: formatCurrency(avgTicket),
      subtext: null,
      colorClass: "text-zinc-900 dark:text-zinc-100",
      hasToggle: true,
    },
    {
      id: "cpa",
      category: "finance",
      title: "CPA (Custo por Venda)",
      value: formatCurrency(kpis.cpa ?? 0),
      subtext: null,
      colorClass: "text-zinc-900 dark:text-zinc-100",
      hasToggle: true,
    },
    {
      id: "arpu",
      category: "finance",
      title: "ARPU",
      value: formatCurrency(kpis.arpu ?? avgTicket),
      subtext: "Receita por cliente",
      colorClass: "text-zinc-900 dark:text-zinc-100",
      hasToggle: true,
    },
    {
      id: "refunded",
      category: "finance",
      title: "Vendas reembolsadas",
      value: String(kpis.refunded_count ?? 0),
      subtext: formatCurrency(kpis.refunded_amount ?? 0),
      colorClass: (kpis.refunded_count ?? 0) > 0 ? "text-amber-600 dark:text-amber-400" : "text-zinc-900 dark:text-zinc-100",
      hasToggle: true,
    },
    {
      id: "pending",
      category: "finance",
      title: "Vendas pendentes",
      value: String(kpis.pending_count ?? 0),
      subtext: formatCurrency(kpis.pending_amount ?? 0),
      colorClass: "text-zinc-900 dark:text-zinc-100",
      hasToggle: true,
    },

    // ─── 2. Tráfego & Leilão (Meta Ads / UTMify) ───
    {
      id: "spend",
      category: "traffic",
      title: "Gastos com anúncios",
      value: formatCurrency(kpis.total_spend),
      subtext: "Meta Ads ao vivo",
      colorClass: "text-zinc-900 dark:text-zinc-100 font-semibold",
      hasToggle: true,
    },
    {
      id: "cpm",
      category: "traffic",
      title: "CPM (Custo por Mil)",
      value: formatCurrency(cpm),
      subtext: cpm > 45 ? "Leilão concorrido" : cpm > 0 ? "Custo por 1k impressões" : "Aguardando dados",
      colorClass: cpm > 0 && cpm <= 30 ? "text-emerald-600 dark:text-emerald-400 font-semibold" : cpm > 50 ? "text-rose-600 dark:text-rose-400 font-semibold" : "text-zinc-900 dark:text-zinc-100",
      hasToggle: true,
      badge: "UTMify",
    },
    {
      id: "cpc",
      category: "traffic",
      title: "CPC (Custo por Clique)",
      value: formatCurrency(cpc),
      subtext: cpc > 0 ? "Custo por clique no link" : null,
      colorClass: cpc > 0 && cpc <= 1.80 ? "text-emerald-600 dark:text-emerald-400" : cpc > 3.0 ? "text-rose-600 dark:text-rose-400" : "text-zinc-900 dark:text-zinc-100",
      hasToggle: true,
      badge: "UTMify",
    },
    {
      id: "ctr",
      category: "traffic",
      title: "CTR (Taxa de Cliques)",
      value: `${ctr.toFixed(2)}%`,
      subtext: ctr >= 2.0 ? "Criativo com alta atração" : ctr > 0 ? "Taxa de cliques / views" : null,
      colorClass: ctr >= 2.0 ? "text-emerald-600 dark:text-emerald-400 font-medium" : ctr > 0 && ctr < 1.0 ? "text-amber-600 dark:text-amber-400" : "text-zinc-900 dark:text-zinc-100",
      hasToggle: true,
      badge: "UTMify",
    },
    {
      id: "clicks",
      category: "traffic",
      title: "Cliques no link",
      value: totalClicks.toLocaleString("pt-BR"),
      subtext: "Visitas iniciadas",
      colorClass: "text-zinc-900 dark:text-zinc-100",
      hasToggle: false,
    },
    {
      id: "impressions",
      category: "traffic",
      title: "Impressões totais",
      value: totalImpr.toLocaleString("pt-BR"),
      subtext: "Exibições no feed/stories",
      colorClass: "text-zinc-900 dark:text-zinc-100",
      hasToggle: false,
    },

    // ─── 3. Funil & Páginas (UTMify Funnel) ───
    {
      id: "lpv",
      category: "funnel",
      title: "Visualizações da Página (LPV)",
      value: lpv.toLocaleString("pt-BR"),
      subtext: "Pessoas que abriram a página",
      colorClass: "text-zinc-900 dark:text-zinc-100 font-semibold",
      hasToggle: false,
      badge: "UTMify",
    },
    {
      id: "cpv",
      category: "funnel",
      title: "CPV (Custo por Visualização)",
      value: formatCurrency(cpv),
      subtext: cpv > 0 ? "Custo por visualização de LP" : null,
      colorClass: cpv > 0 && cpv <= 2.0 ? "text-emerald-600 dark:text-emerald-400 font-medium" : cpv > 3.5 ? "text-amber-600 dark:text-amber-400" : "text-zinc-900 dark:text-zinc-100",
      hasToggle: true,
      badge: "UTMify",
    },
    {
      id: "connect_rate",
      category: "funnel",
      title: "Connect Rate (Taxa de Conexão)",
      value: `${connectRate.toFixed(1)}%`,
      subtext: connectRate >= 75 ? "Página carrega rápido" : connectRate > 0 && connectRate < 60 ? "Atenção: LP lenta" : "Cliques → Pageviews",
      colorClass: connectRate >= 75 ? "text-emerald-600 dark:text-emerald-400 font-medium" : connectRate > 0 && connectRate < 65 ? "text-rose-600 dark:text-rose-400 font-medium" : "text-zinc-900 dark:text-zinc-100",
      hasToggle: true,
      badge: "UTMify",
    },
    {
      id: "ic",
      category: "funnel",
      title: "Início de Checkout (IC)",
      value: ic.toLocaleString("pt-BR"),
      subtext: "Cliques no botão de compra",
      colorClass: "text-zinc-900 dark:text-zinc-100 font-medium",
      hasToggle: false,
      badge: "UTMify",
    },
    {
      id: "cost_per_ic",
      category: "funnel",
      title: "Custo por Checkout",
      value: formatCurrency(costPerIc),
      subtext: "Gasto / Inícios de checkout",
      colorClass: "text-zinc-900 dark:text-zinc-100",
      hasToggle: true,
      badge: "UTMify",
    },
    {
      id: "checkout_rate",
      category: "funnel",
      title: "Taxa de Checkout (LPV → IC)",
      value: `${checkoutRate.toFixed(1)}%`,
      subtext: "% de visitantes que vão pro checkout",
      colorClass: checkoutRate >= 12 ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-900 dark:text-zinc-100",
      hasToggle: true,
      badge: "UTMify",
    },
    {
      id: "checkout_conv",
      category: "funnel",
      title: "Conv. Checkout → Venda",
      value: `${checkoutConvRate.toFixed(1)}%`,
      subtext: "% de checkouts convertidos",
      colorClass: checkoutConvRate >= 20 ? "text-emerald-600 dark:text-emerald-400 font-medium" : checkoutConvRate > 0 && checkoutConvRate < 10 ? "text-rose-600 dark:text-rose-400" : "text-zinc-900 dark:text-zinc-100",
      hasToggle: true,
      badge: "UTMify",
    },
    {
      id: "cvr_global",
      category: "funnel",
      title: "Taxa de Conversão Global",
      value: `${conversionRate.toFixed(2)}%`,
      subtext: "Cliques → Vendas Aprovadas",
      colorClass: conversionRate >= 2.0 ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-zinc-900 dark:text-zinc-100",
      hasToggle: true,
      badge: "UTMify",
    },
  ];

  const filteredCards = activeTab === "all"
    ? allCards
    : allCards.filter((c) => c.category === activeTab);

  const counts = {
    all: allCards.length,
    finance: allCards.filter((c) => c.category === "finance").length,
    traffic: allCards.filter((c) => c.category === "traffic").length,
    funnel: allCards.filter((c) => c.category === "funnel").length,
  };

  return (
    <div className="space-y-3">
      {/* Barra de Filtro de Abas das Métricas (Padrão UTMify Pro) */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200/80 dark:border-zinc-800/80 pb-2.5">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "all"
                ? "bg-blue-600 text-white shadow-xs shadow-blue-500/20"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
            }`}
          >
            <LayoutGrid className="size-3.5" />
            <span>Todas as métricas</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === "all" ? "bg-white/20 text-white" : "bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"}`}>
              {counts.all}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("finance")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "finance"
                ? "bg-blue-600 text-white shadow-xs shadow-blue-500/20"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
            }`}
          >
            <DollarSign className="size-3.5" />
            <span>Financeiro & Vendas</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === "finance" ? "bg-white/20 text-white" : "bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"}`}>
              {counts.finance}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("traffic")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "traffic"
                ? "bg-blue-600 text-white shadow-xs shadow-blue-500/20"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
            }`}
          >
            <Megaphone className="size-3.5" />
            <span>Tráfego & Anúncios (CPM, CPC, CTR)</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === "traffic" ? "bg-white/20 text-white" : "bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"}`}>
              {counts.traffic}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("funnel")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "funnel"
                ? "bg-blue-600 text-white shadow-xs shadow-blue-500/20"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
            }`}
          >
            <Filter className="size-3.5" />
            <span>Funil & Páginas (LPV, CPV, IC)</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === "funnel" ? "bg-white/20 text-white" : "bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"}`}>
              {counts.funnel}
            </span>
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-[11px] text-zinc-400">
          <span className="inline-block size-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Métricas completas UTMify integradas</span>
        </div>
      </div>

      {/* Grid de Cards Responsivo de Alta Performance */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {filteredCards.map((card) => {
          const masked = isHidden(card.id);
          return (
            <div key={card.id} className="min-w-0 transition-all duration-200">
              <div className="h-full min-w-0 rounded-xl border border-zinc-200/80 bg-white p-3.5 sm:p-4 dark:border-zinc-800/80 dark:bg-[#0f172a]/60 backdrop-blur-sm shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700/80 transition-colors flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[12px] font-medium text-zinc-500 dark:text-zinc-400 truncate" title={card.title}>
                      {card.title}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      {card.badge && (
                        <span className="text-[9px] font-mono font-medium px-1 py-0.2 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                          {card.badge}
                        </span>
                      )}
                      {card.hasToggle && (
                        <button
                          type="button"
                          onClick={() => toggleCard(card.id)}
                          aria-label={masked ? "Mostrar valor" : "Ocultar valor"}
                          className="shrink-0 rounded p-1 text-zinc-400 hover:text-blue-500 transition-colors cursor-pointer"
                        >
                          {masked ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className={`mt-1.5 tracking-tight tabular-nums break-words text-[17px] min-[380px]:text-xl sm:text-2xl lg:text-lg ${card.colorClass}`}>
                    <span className={masked ? "filter blur-xs opacity-75" : ""}>
                      {maskValue(card.value, card.id)}
                    </span>
                  </div>
                </div>

                {card.subtext && (
                  <div className="mt-1.5 text-[11px] text-zinc-400 dark:text-zinc-500 truncate" title={card.subtext}>
                    {masked && card.id !== "approved" && card.id !== "clicks" && card.id !== "impressions" && card.id !== "lpv" && card.id !== "ic" ? "••••••" : card.subtext}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
