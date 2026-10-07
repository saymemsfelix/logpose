import { useEffect } from "react";
import { usePageDataSetter, type PageDataSnapshot } from "@/contexts/PageDataContext";
import type { DashboardOverview } from "@/types/dashboard";
import type { DashboardFilters } from "@/hooks/use-dashboard";
import type { CompanySettings } from "@/types/company";

/**
 * Hook para registrar todos os dados e métricas do Dashboard (incluindo todas as métricas avançadas:
 * CPM, CPC, CTR, LPV, CPV, Connect Rate, IC, Cost per IC, etc.) no PageDataContext.
 * Dessa forma, a IA do Ninja Tracker tem acesso instantâneo e completo a cada número do Dashboard.
 */
export function useDashboardPageData(
  data: DashboardOverview | null,
  filters: DashboardFilters,
  settings: CompanySettings | null,
) {
  const { setSnapshot, clearSnapshot } = usePageDataSetter();

  useEffect(() => {
    if (!data || !data.kpis) return;

    const k = data.kpis;
    const taxDeduction = filters.taxEnabled ? k.total_revenue * ((settings?.tax_rate ?? 0) / 100) : 0;
    const opDeduction = filters.opCostsEnabled ? (settings?.operational_costs.reduce((s, c) => s + c.amount, 0) ?? 0) : 0;
    const adjustedRevenue = k.total_revenue - taxDeduction;
    const profit = (k.profit ?? (k.total_revenue - k.total_spend)) - taxDeduction - opDeduction;
    const margin = adjustedRevenue > 0 ? (profit / adjustedRevenue) * 100 : 0;
    const roas = k.total_spend > 0 ? adjustedRevenue / k.total_spend : 0;
    const totalCostBasis = k.total_spend + opDeduction;
    const roi = totalCostBasis > 0 ? profit / totalCostBasis : 0;
    const totalOrders = k.total_orders ?? k.total_sales;
    const approvalRate = k.approval_rate ?? (totalOrders > 0 ? (k.total_sales / totalOrders) * 100 : 0);

    const totalImpr = k.total_impressions ?? 0;
    const totalClicks = k.total_clicks ?? 0;
    const cpm = k.cpm ?? (totalImpr > 0 && k.total_spend > 0 ? (k.total_spend / totalImpr) * 1000 : 0);
    const cpc = k.cpc ?? (totalClicks > 0 && k.total_spend > 0 ? k.total_spend / totalClicks : 0);
    const ctr = k.ctr ?? (totalImpr > 0 && totalClicks > 0 ? (totalClicks / totalImpr) * 100 : 0);

    const lpv = k.pageviews ?? k.landing_page_views ?? 0;
    const cpv = k.cpv ?? (lpv > 0 && k.total_spend > 0 ? k.total_spend / lpv : 0);
    const connectRate = k.connect_rate ?? (totalClicks > 0 && lpv > 0 ? (lpv / totalClicks) * 100 : 0);
    const ic = k.initiate_checkout ?? 0;
    const costPerIc = k.cost_per_ic ?? (ic > 0 && k.total_spend > 0 ? k.total_spend / ic : 0);
    const checkoutRate = k.checkout_rate ?? (lpv > 0 && ic > 0 ? (ic / lpv) * 100 : 0);
    const checkoutConvRate = k.checkout_conversion_rate ?? (ic > 0 ? (k.total_sales / ic) * 100 : 0);
    const conversionRate = k.conversion_rate ?? (totalClicks > 0 ? (k.total_sales / totalClicks) * 100 : 0);

    const filtersDesc = `Preset: ${filters.preset || "custom"} | Período: ${filters.startDate || "N/A"} a ${filters.endDate || "N/A"} | Plataforma: ${filters.platform || "Todas"}`;

    const lines: string[] = [
      `📊 DADOS ATUAIS DO DASHBOARD (Ninja Tracker)`,
      `Filtros: ${filtersDesc}`,
      ``,
      `--- 1. FINANCEIRO & VENDAS ---`,
      `• Faturamento Líquido: R$ ${adjustedRevenue.toFixed(2)}`,
      `• Lucro Líquido Real: R$ ${profit.toFixed(2)}`,
      `• Margem de Lucro: ${margin.toFixed(1)}%`,
      `• ROAS: ${roas.toFixed(2)}x | ROI: ${roi.toFixed(2)}x`,
      `• Vendas Aprovadas: ${k.total_sales} de ${totalOrders} pedidos (Aprovação: ${approvalRate.toFixed(1)}%)`,
      `• Ticket Médio: R$ ${(k.average_ticket || (k.total_sales > 0 ? k.total_revenue / k.total_sales : 0)).toFixed(2)}`,
      `• CPA (Custo por Venda): R$ ${(k.cpa || 0).toFixed(2)}`,
      `• ARPU: R$ ${(k.arpu || 0).toFixed(2)}`,
      `• Vendas Reembolsadas: ${k.refunded_count ?? 0} (R$ ${(k.refunded_amount ?? 0).toFixed(2)})`,
      `• Vendas Pendentes: ${k.pending_count ?? 0} (R$ ${(k.pending_amount ?? 0).toFixed(2)})`,
      `• Chargebacks: ${k.chargeback_count ?? 0} (Taxa: ${(k.chargeback_rate ?? 0).toFixed(2)}%)`,
      ``,
      `--- 2. TRÁFEGO & LEILÃO (Meta Ads / Ninja Tracker) ---`,
      `• Gastos com Anúncios (Spend): R$ ${k.total_spend.toFixed(2)}`,
      `• Impressões Totais: ${totalImpr.toLocaleString("pt-BR")}`,
      `• CPM (Custo por Mil Impressões): R$ ${cpm.toFixed(2)}`,
      `• Cliques no Link: ${totalClicks.toLocaleString("pt-BR")}`,
      `• CPC (Custo por Clique): R$ ${cpc.toFixed(2)}`,
      `• CTR (Taxa de Cliques): ${ctr.toFixed(2)}%`,
      ``,
      `--- 3. FUNIL DE CONVERSÃO & PÁGINAS (Ninja Tracker) ---`,
      `• Visualizações de Página (LPV): ${lpv.toLocaleString("pt-BR")}`,
      `• CPV (Custo por Visualização de LP): R$ ${cpv.toFixed(2)}`,
      `• Connect Rate (LPV / Cliques): ${connectRate.toFixed(1)}%`,
      `• Início de Checkout (IC): ${ic.toLocaleString("pt-BR")}`,
      `• Custo por Checkout (Custo por IC): R$ ${costPerIc.toFixed(2)}`,
      `• Taxa de Checkout (LPV → IC): ${checkoutRate.toFixed(1)}%`,
      `• Conversão Checkout → Venda: ${checkoutConvRate.toFixed(1)}%`,
      `• Taxa de Conversão Global (Cliques → Venda): ${conversionRate.toFixed(2)}%`,
    ];

    if (data.top_campaigns && data.top_campaigns.length > 0) {
      lines.push(``, `--- TOP CAMPANHAS HOJE ---`);
      for (const camp of data.top_campaigns) {
        lines.push(
          `• Campanha: ${camp.name} | Gasto: R$${camp.spend.toFixed(2)} | Fat: R$${camp.revenue.toFixed(2)} | Lucro: R$${camp.profit.toFixed(2)} | Vendas: ${camp.sales} | ROAS: ${camp.roas.toFixed(2)}x | CPM: R$${(camp.cpm ?? 0).toFixed(2)} | CPC: R$${(camp.cpc ?? 0).toFixed(2)} | CTR: ${(camp.ctr ?? 0).toFixed(2)}% | LPV: ${camp.landing_page_views ?? 0} | IC: ${camp.initiate_checkout ?? 0}`
        );
      }
    }

    const snapshot: PageDataSnapshot = {
      page: "dashboard",
      label: "Dashboard Geral",
      filtersDescription: filtersDesc,
      data: lines.join("\n"),
    };

    setSnapshot(snapshot);
    return () => clearSnapshot();
  }, [data, filters, settings, setSnapshot, clearSnapshot]);
}
