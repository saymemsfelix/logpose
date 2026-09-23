import { Tag, PackageCheck, CreditCard } from "lucide-react";
import type { UtmOrigin, TopProduct, PaymentMethod } from "@/types/dashboard";

interface CommercialCardsProps {
  utmOrigins?: UtmOrigin[];
  topProducts?: TopProduct[];
  paymentMethods?: PaymentMethod[];
  hideValues?: boolean;
}

export function CommercialCards({
  utmOrigins = [],
  topProducts = [],
  paymentMethods = [],
  hideValues = false,
}: CommercialCardsProps) {
  const formatCurrency = (val: number) => {
    if (hideValues) return "••••••";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val);
  };

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {/* 1. Vendas por origem (UTM) */}
      <div className="rounded-xl border border-zinc-200/80 bg-white dark:border-zinc-800/80 dark:bg-[#0f172a]/60 backdrop-blur-sm p-4 sm:p-5 h-full flex flex-col shadow-xs">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[13px] font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
            <Tag className="h-4 w-4 text-blue-500" />
            Vendas por origem (UTM)
          </span>
        </div>

        {utmOrigins.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
            <span className="text-[13px] text-zinc-400">Sem vendas atribuídas.</span>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5 flex-1">
            {utmOrigins.slice(0, 5).map((utm, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg bg-zinc-50/70 dark:bg-zinc-900/50 p-2 text-[12.5px]"
              >
                <div className="min-w-0 flex-1 truncate pr-2">
                  <p className="font-medium text-zinc-800 dark:text-zinc-200 truncate">
                    {utm.name}
                  </p>
                  {utm.source && utm.source !== "-" && (
                    <p className="text-[11px] text-zinc-400 truncate">{utm.source}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <span className="font-semibold tabular-nums text-zinc-900 dark:text-white">
                    {formatCurrency(utm.revenue)}
                  </span>
                  <span className="ml-1.5 text-[11px] text-zinc-400">
                    ({utm.sales})
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. Produtos vendidos */}
      <div className="rounded-xl border border-zinc-200/80 bg-white dark:border-zinc-800/80 dark:bg-[#0f172a]/60 backdrop-blur-sm p-4 sm:p-5 h-full flex flex-col shadow-xs">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[13px] font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
            <PackageCheck className="h-4 w-4 text-cyan-500" />
            Produtos vendidos
          </span>
        </div>

        {topProducts.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center">
            <div className="text-[13px] font-medium text-zinc-600 dark:text-zinc-300">
              Sem vendas no período
            </div>
            <div className="max-w-xs text-[11px] text-zinc-400">
              Os produtos vendidos aparecem aqui assim que uma venda for aprovada.
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5 flex-1">
            {topProducts.slice(0, 5).map((prod, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg bg-zinc-50/70 dark:bg-zinc-900/50 p-2 text-[12.5px]"
              >
                <div className="min-w-0 flex-1 truncate pr-2">
                  <p className="font-medium text-zinc-800 dark:text-zinc-200 truncate">
                    {prod.name}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-semibold tabular-nums text-zinc-900 dark:text-white">
                    {formatCurrency(prod.revenue)}
                  </span>
                  <span className="ml-1.5 text-[11px] text-zinc-400">
                    ({prod.sales})
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Formas de pagamento */}
      <div className="rounded-xl border border-zinc-200/80 bg-white dark:border-zinc-800/80 dark:bg-[#0f172a]/60 backdrop-blur-sm p-4 sm:p-5 h-full flex flex-col shadow-xs">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[13px] font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
            <CreditCard className="h-4 w-4 text-emerald-500" />
            Formas de pagamento
          </span>
        </div>

        {paymentMethods.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center">
            <div className="text-[13px] font-medium text-zinc-600 dark:text-zinc-300">
              Sem vendas no período
            </div>
            <div className="max-w-xs text-[11px] text-zinc-400">
              As formas de pagamento aparecem aqui assim que uma venda for aprovada.
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 flex-1 justify-center">
            {paymentMethods.map((pm) => (
              <div key={pm.method} className="space-y-1">
                <div className="flex items-center justify-between text-[12.5px]">
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    {pm.method}
                  </span>
                  <div className="text-right">
                    <span className="font-semibold tabular-nums text-zinc-900 dark:text-white">
                      {formatCurrency(pm.revenue)}
                    </span>
                    <span className="ml-1.5 text-[11px] text-zinc-400">
                      ({pm.percentage}%)
                    </span>
                  </div>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-400"
                    style={{ width: `${pm.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
