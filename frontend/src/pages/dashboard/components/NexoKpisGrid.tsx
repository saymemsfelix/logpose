import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import type { DashboardKpis } from "@/types/dashboard";

interface NexoKpisGridProps {
  kpis: DashboardKpis;
  hideAllValues?: boolean;
}

export function NexoKpisGrid({ kpis, hideAllValues = false }: NexoKpisGridProps) {
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

  const profit = kpis.profit ?? (kpis.total_revenue - kpis.total_spend);
  const isProfitPositive = profit >= 0;
  const margin = kpis.profit_margin ?? (kpis.total_revenue > 0 ? (profit / kpis.total_revenue) * 100 : 0);
  const roas = kpis.roas ?? (kpis.total_spend > 0 ? kpis.total_revenue / kpis.total_spend : 0);
  const roi = kpis.roi ?? (kpis.total_spend > 0 ? profit / kpis.total_spend : 0);
  const totalOrders = kpis.total_orders ?? kpis.total_sales;
  const approvalRate = kpis.approval_rate ?? (totalOrders > 0 ? (kpis.total_sales / totalOrders) * 100 : 0);

  const cards = [
    {
      id: "rev",
      title: "Faturamento líquido",
      value: formatCurrency(kpis.total_revenue),
      subtext: null,
      colorClass: "text-zinc-900 dark:text-zinc-100",
      hasToggle: true,
    },
    {
      id: "profit",
      title: "Lucro",
      value: formatCurrency(profit),
      subtext: null,
      colorClass: isProfitPositive
        ? "text-emerald-600 dark:text-emerald-400 font-semibold"
        : "text-rose-600 dark:text-rose-400 font-semibold",
      hasToggle: true,
    },
    {
      id: "margin",
      title: "Margem",
      value: `${margin.toFixed(1)}%`,
      subtext: null,
      colorClass: "text-zinc-900 dark:text-zinc-100",
      hasToggle: true,
    },
    {
      id: "roas",
      title: "ROAS",
      value: `${roas.toFixed(2)}x`,
      subtext: null,
      colorClass: roas >= 1.0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400",
      hasToggle: true,
    },
    {
      id: "roi",
      title: "ROI",
      value: `${roi.toFixed(2)}x`,
      subtext: null,
      colorClass: roi >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400",
      hasToggle: true,
    },
    {
      id: "approved",
      title: "Vendas aprovadas",
      value: String(kpis.total_sales),
      subtext: `de ${totalOrders} pedidos`,
      colorClass: "text-zinc-900 dark:text-zinc-100",
      hasToggle: false,
    },
    {
      id: "approval_rate",
      title: "Aprovação",
      value: `${approvalRate.toFixed(1)}%`,
      subtext: null,
      colorClass: "text-zinc-900 dark:text-zinc-100",
      hasToggle: false,
    },
    {
      id: "spend",
      title: "Gastos com anúncios",
      value: formatCurrency(kpis.total_spend),
      subtext: null,
      colorClass: "text-zinc-900 dark:text-zinc-100",
      hasToggle: true,
    },
    {
      id: "refunded",
      title: "Vendas reembolsadas",
      value: String(kpis.refunded_count ?? 0),
      subtext: formatCurrency(kpis.refunded_amount ?? 0),
      colorClass: "text-zinc-900 dark:text-zinc-100",
      hasToggle: true,
    },
    {
      id: "pending",
      title: "Venda pendente",
      value: String(kpis.pending_count ?? 0),
      subtext: formatCurrency(kpis.pending_amount ?? 0),
      colorClass: "text-zinc-900 dark:text-zinc-100",
      hasToggle: true,
    },
    {
      id: "cpa",
      title: "CPA",
      value: formatCurrency(kpis.cpa ?? 0),
      subtext: null,
      colorClass: "text-zinc-900 dark:text-zinc-100",
      hasToggle: true,
    },
    {
      id: "arpu",
      title: "ARPU",
      value: formatCurrency(kpis.arpu ?? (kpis.average_ticket || 0)),
      subtext: null,
      colorClass: "text-zinc-900 dark:text-zinc-100",
      hasToggle: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {cards.map((card) => {
        const masked = isHidden(card.id);
        return (
          <div key={card.id} className="min-w-0 transition-all duration-200">
            <div className="h-full min-w-0 rounded-xl border border-zinc-200/80 bg-white p-3.5 sm:p-4 dark:border-zinc-800/80 dark:bg-[#0f172a]/60 backdrop-blur-sm shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700/80 transition-colors">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[12px] font-medium text-zinc-500 dark:text-zinc-400 truncate">
                  {card.title}
                </span>
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

              <div className={`mt-1.5 tracking-tight tabular-nums break-words text-[17px] min-[380px]:text-xl sm:text-2xl lg:text-lg ${card.colorClass}`}>
                <span className={masked ? "filter blur-xs opacity-75" : ""}>
                  {maskValue(card.value, card.id)}
                </span>
              </div>

              {card.subtext && (
                <div className="mt-1 text-[11px] text-zinc-400 dark:text-zinc-500 truncate">
                  {masked && card.id !== "approved" ? "••••••" : card.subtext}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
