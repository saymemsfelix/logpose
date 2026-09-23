import type { TopCampaign } from "@/types/dashboard";

interface CampaignsPerformanceTableProps {
  campaigns?: TopCampaign[];
  hideValues?: boolean;
}

export function CampaignsPerformanceTable({
  campaigns = [],
  hideValues = false,
}: CampaignsPerformanceTableProps) {
  const formatCurrency = (val: number) => {
    if (hideValues) return "••••••";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val);
  };

  return (
    <div className="rounded-xl border border-zinc-200/80 bg-white p-4 sm:p-5 dark:border-zinc-800/80 dark:bg-[#0f172a]/60 backdrop-blur-sm h-full shadow-xs">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <span className="text-[13.5px] font-semibold text-zinc-900 dark:text-zinc-100">
            Desempenho por campanha
          </span>
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
            Retorno e eficiência das campanhas do Facebook Ads
          </p>
        </div>
      </div>

      {campaigns.length === 0 ? (
        <div className="py-8 text-center text-[13px] text-zinc-400">
          Nenhuma campanha com dados no período selecionado.
        </div>
      ) : (
        <div className="-mx-4 min-w-0 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[640px] text-[13px]">
            <thead>
              <tr className="text-left text-[12px] text-zinc-400 dark:text-zinc-500 border-b border-zinc-100 dark:border-zinc-800/80 pb-2">
                <th className="pb-2 font-medium">Campanha</th>
                <th className="pb-2 text-right font-medium">Investimento</th>
                <th className="pb-2 text-right font-medium">Receita</th>
                <th className="pb-2 text-right font-medium">Lucro</th>
                <th className="pb-2 text-right font-medium">Vendas</th>
                <th className="pb-2 text-right font-medium">ROAS</th>
                <th className="pb-2 text-right font-medium">ROI</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((camp, idx) => {
                const profit = camp.profit ?? (camp.revenue - camp.spend);
                const isProfitPositive = profit >= 0;
                const roi = camp.spend > 0 ? profit / camp.spend : 0;

                return (
                  <tr
                    key={idx}
                    className="border-t border-zinc-100 dark:border-zinc-800/60 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors"
                  >
                    <td className="py-3 font-medium text-zinc-800 dark:text-zinc-200 max-w-[260px] truncate" title={camp.name}>
                      {camp.name}
                    </td>
                    <td className="py-3 text-right tabular-nums text-zinc-600 dark:text-zinc-400">
                      {formatCurrency(camp.spend)}
                    </td>
                    <td className="py-3 text-right tabular-nums text-zinc-900 dark:text-zinc-100 font-medium">
                      {formatCurrency(camp.revenue)}
                    </td>
                    <td
                      className={`py-3 text-right font-semibold tabular-nums ${
                        isProfitPositive
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {formatCurrency(profit)}
                    </td>
                    <td className="py-3 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                      {camp.sales}
                    </td>
                    <td
                      className={`py-3 text-right font-medium tabular-nums ${
                        camp.roas >= 1.0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {camp.roas.toFixed(2)}x
                    </td>
                    <td
                      className={`py-3 text-right font-medium tabular-nums ${
                        roi >= 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {roi.toFixed(2)}x
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
