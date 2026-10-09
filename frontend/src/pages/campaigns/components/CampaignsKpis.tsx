import {
  RiFlashlightLine,
  RiMoneyDollarBoxLine,
  RiBarChartLine,
  RiLineChartLine,
  RiShoppingBagLine,
  RiFocus3Line,
} from "@remixicon/react";
import { MetricCard } from "@/components/MetricCard";
import type { MetricRow } from "./campaignCellHelpers";
import { fmtCompact, fmtNumber } from "@/utils/format";

interface CampaignsKpisProps {
  data: (MetricRow & { status?: string })[];
  taxEnabled?: boolean;
  taxRate?: number;
}

export function CampaignsKpis({
  data,
  taxEnabled = false,
  taxRate = 0,
}: CampaignsKpisProps) {
  const totalSpend = data.reduce((s, c) => s + c.spend, 0);
  const totalRawRevenue = data.reduce((s, c) => s + c.revenue, 0);
  const totalSales = data.reduce((s, c) => s + c.sales, 0);
  const activeCampaigns = data.filter((c) => c.status === "active").length;

  const taxDeduction = taxEnabled && taxRate > 0 ? totalRawRevenue * (taxRate / 100) : 0;
  const adjustedRevenue = totalRawRevenue - taxDeduction;
  const profit = adjustedRevenue - totalSpend;
  const isProfitPositive = profit >= 0;
  const roas = totalSpend > 0 ? adjustedRevenue / totalSpend : 0;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  const taxSubtext = taxEnabled && taxRate > 0
    ? `-${formatCurrency(taxDeduction)} impostos (${taxRate}% s/ fat.)`
    : null;

  const metrics = [
    {
      label: "Ativas",
      value: String(activeCampaigns),
      icon: RiFlashlightLine,
      color: "text-primary",
    },
    {
      label: "Investido",
      value: formatCurrency(totalSpend),
      rawValue: totalSpend,
      sub: "Meta Ads ao vivo",
      icon: RiBarChartLine,
      color: "text-foreground",
    },
    {
      label: taxEnabled ? "Faturamento (- impostos)" : "Faturamento",
      value: formatCurrency(adjustedRevenue),
      rawValue: adjustedRevenue,
      sub: taxSubtext || undefined,
      icon: RiMoneyDollarBoxLine,
      color: "text-primary",
    },
    {
      label: taxEnabled ? "Lucro Real" : "Lucro",
      value: formatCurrency(profit),
      rawValue: profit,
      sub: taxEnabled ? "Lucro Real" : undefined,
      icon: RiLineChartLine,
      color: isProfitPositive ? "text-[var(--color-success)]" : "text-destructive font-semibold",
    },
    {
      label: "Vendas",
      value: fmtNumber(totalSales),
      icon: RiShoppingBagLine,
      color: "text-foreground",
      sub: totalSales > 0 ? `Ticket: ${formatCurrency(totalRawRevenue / totalSales)}` : undefined,
    },
    {
      label: taxEnabled ? "ROAS Real" : "ROAS",
      value: `${roas.toFixed(2)}x`,
      sub: taxEnabled ? "ROAS Real" : undefined,
      icon: RiFocus3Line,
      color: roas >= 1.0 ? "text-[var(--color-success)]" : "text-destructive font-semibold",
    },
  ];

  return (
    <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
      {metrics.map((m) => (
        <MetricCard key={m.label} {...m} />
      ))}
    </div>
  );
}
