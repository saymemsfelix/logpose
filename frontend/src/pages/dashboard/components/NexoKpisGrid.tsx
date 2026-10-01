import { useState } from "react";
import { Eye, EyeOff, Pencil, X, Loader2 } from "lucide-react";
import type { DashboardKpis } from "@/types/dashboard";
import { updateManualSpend } from "@/services/dashboard";
import { toast } from "sonner";

interface NexoKpisGridProps {
  kpis: DashboardKpis;
  hideAllValues?: boolean;
  onSpendUpdated?: () => void;
}

export function NexoKpisGrid({ kpis, hideAllValues = false, onSpendUpdated }: NexoKpisGridProps) {
  const [hiddenCards, setHiddenCards] = useState<Record<string, boolean>>({});
  const [isEditingSpend, setIsEditingSpend] = useState(false);
  const [spendInput, setSpendInput] = useState(String(kpis.total_spend || 43.89));
  const [clicksInput, setClicksInput] = useState("21");
  const [isSavingSpend, setIsSavingSpend] = useState(false);

  const handleSaveSpend = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSpend(true);
    try {
      const numSpend = parseFloat(spendInput.replace(",", "."));
      const numClicks = parseInt(clicksInput, 10) || 0;
      if (isNaN(numSpend) || numSpend < 0) {
        toast.error("Insira um valor numérico válido para o gasto");
        setIsSavingSpend(false);
        return;
      }
      await updateManualSpend(numSpend, numClicks);
      toast.success("Gastos com anúncios atualizados com sucesso!");
      setIsEditingSpend(false);
      onSpendUpdated?.();
    } catch {
      toast.error("Erro ao salvar gastos com anúncios");
    } finally {
      setIsSavingSpend(false);
    }
  };

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
                <div className="flex items-center gap-1">
                  {card.id === "spend" && (
                    <button
                      type="button"
                      onClick={() => {
                        setSpendInput(String(kpis.total_spend || 43.89));
                        setIsEditingSpend(true);
                      }}
                      title="Ajustar Gastos com Anúncios"
                      className="shrink-0 rounded p-1 text-zinc-400 hover:text-amber-500 transition-colors cursor-pointer"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
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

              {card.subtext && (
                <div className="mt-1 text-[11px] text-zinc-400 dark:text-zinc-500 truncate">
                  {masked && card.id !== "approved" ? "••••••" : card.subtext}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Modal para Ajustar Gastos com Anúncios */}
      {isEditingSpend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0f172a] p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-zinc-900 dark:text-white">
                  Gastos com Anúncios
                </span>
                <span className="rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 text-[11px] font-semibold">
                  Meta Ads
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingSpend(false)}
                className="rounded p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSpend} className="mt-4 space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-zinc-700 dark:text-zinc-300">
                  Valor Gasto Hoje (R$)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 43.89"
                  value={spendInput}
                  onChange={(e) => setSpendInput(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:border-blue-500 focus:outline-hidden"
                />
                <span className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1 block">
                  Atualiza automaticamente Lucro, ROAS, ROI, Margem e CPA.
                </span>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-zinc-700 dark:text-zinc-300">
                  Cliques no Anúncio (opcional)
                </label>
                <input
                  type="number"
                  placeholder="Ex: 21"
                  value={clicksInput}
                  onChange={(e) => setClicksInput(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditingSpend(false)}
                  className="flex-1 rounded-lg border border-zinc-200 dark:border-zinc-800 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingSpend}
                  className="flex-1 rounded-lg bg-blue-600 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm shadow-blue-500/25 cursor-pointer"
                >
                  {isSavingSpend ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    "Salvar Gasto"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
