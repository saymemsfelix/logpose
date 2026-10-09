import { useEffect } from "react";
import { usePageDataSetter, type PageDataSnapshot } from "@/contexts/PageDataContext";
import type { CampaignData } from "@/services/campaigns";
import type { CampaignFilterState } from "@/pages/campaigns/components/CampaignsInlineFilters";
import { statusLabels, objectiveLabels } from "@/pages/campaigns/components/dateHelpers";

/**
 * Hook para registrar os dados atuais da página de campanhas no PageDataContext.
 * Quando a página desmonta, limpa o snapshot automaticamente.
 */
export function useCampaignPageData(
  campaigns: CampaignData[],
  filters: CampaignFilterState,
  dateStart: string,
  dateEnd: string,
  taxEnabled: boolean = false,
  taxRate: number = 0,
) {
  const { setSnapshot, clearSnapshot } = usePageDataSetter();

  useEffect(() => {
    if (campaigns.length === 0) return;

    const filtersDescription = buildFiltersDescription(filters, dateStart, dateEnd);
    const data = buildCampaignsSummary(campaigns, dateStart, dateEnd, filters, taxEnabled, taxRate);

    const snapshot: PageDataSnapshot = {
      page: "campaigns",
      label: "Campanhas",
      filtersDescription,
      data,
    };

    setSnapshot(snapshot);
    return () => clearSnapshot();
  }, [campaigns, filters, dateStart, dateEnd, taxEnabled, taxRate, setSnapshot, clearSnapshot]);
}

function buildFiltersDescription(
  filters: CampaignFilterState,
  dateStart: string,
  dateEnd: string,
): string {
  const parts: string[] = [];

  parts.push(`Período: ${dateStart} até ${dateEnd}`);

  if (filters.status !== "all") {
    parts.push(`Status: ${statusLabels[filters.status] || filters.status}`);
  }
  if (filters.objective !== "all") {
    parts.push(`Objetivo: ${objectiveLabels[filters.objective] || filters.objective}`);
  }
  if (filters.product !== "all") parts.push(`Produto: ${filters.product}`);
  if (filters.tag !== "all") parts.push(`Tag: ${filters.tag}`);

  return parts.join(" | ");
}

function buildCampaignsSummary(
  campaigns: CampaignData[],
  dateStart: string,
  dateEnd: string,
  filters: CampaignFilterState,
  taxEnabled: boolean = false,
  taxRate: number = 0,
): string {
  const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0);
  const totalRevenue = campaigns.reduce((s, c) => s + c.revenue, 0);
  const taxDeduction = taxEnabled && taxRate > 0 ? totalRevenue * (taxRate / 100) : 0;
  const adjustedRevenue = totalRevenue - taxDeduction;
  const totalSales = campaigns.reduce((s, c) => s + c.sales, 0);
  const totalProfit = adjustedRevenue - totalSpend;
  const avgRoas = totalSpend > 0 ? adjustedRevenue / totalSpend : 0;
  const active = campaigns.filter((c) => c.status === "active").length;

  const lines: string[] = [
    `📊 DADOS ATUAIS DA PÁGINA DE CAMPANHAS`,
    `Período: ${dateStart} a ${dateEnd}`,
    `Filtros: ${filters.status !== "all" ? statusLabels[filters.status] : "Todos"} | ${filters.objective !== "all" ? objectiveLabels[filters.objective] : "Todos os objetivos"}`,
    ``,
    `--- KPIs GERAIS ---`,
    `Campanhas ativas: ${active}/${campaigns.length}`,
    `Investido: R$ ${totalSpend.toFixed(2)}`,
    taxEnabled && taxRate > 0
      ? `Faturamento Líquido (- impostos): R$ ${adjustedRevenue.toFixed(2)} (Bruto: R$ ${totalRevenue.toFixed(2)} | -R$ ${taxDeduction.toFixed(2)} a ${taxRate}%)`
      : `Faturamento: R$ ${totalRevenue.toFixed(2)}`,
    taxEnabled ? `Lucro Real: R$ ${totalProfit.toFixed(2)}` : `Lucro: R$ ${totalProfit.toFixed(2)}`,
    `Vendas: ${totalSales}`,
    `ROAS: ${avgRoas.toFixed(2)}x`,
    ``,
    `--- CAMPANHAS ---`,
  ];

  for (const c of campaigns) {
    const roas = c.spend > 0 ? (c.revenue / c.spend).toFixed(2) : "0.00";
    lines.push(
      `• [ID:${c.id}] ${c.name} [${c.status}] | Budget: R$${(c.budget || 0).toFixed(2)}/dia (${c.budget_type || "CBO"}) | Gasto: R$${c.spend.toFixed(2)} | Fat: R$${c.revenue.toFixed(2)} | Lucro: R$${c.profit.toFixed(2)} | Vendas: ${c.sales} | ROAS: ${roas}x | CPA: R$${c.cpa.toFixed(2)} | Clicks: ${c.clicks} | CTR: ${c.ctr.toFixed(2)}%`
    );
  }

  return lines.join("\n");
}
