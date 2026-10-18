import { useState } from "react";
import type { HourlyProfit } from "@/types/dashboard";

interface HourlyProfitChartProps {
  data?: HourlyProfit[];
  hideValues?: boolean;
}

export function HourlyProfitChart({ data = [], hideValues = false }: HourlyProfitChartProps) {
  const [hoveredHour, setHoveredHour] = useState<HourlyProfit | null>(null);

  // Garantir que temos as 24 horas preenchidas
  const full24Hours: HourlyProfit[] = Array.from({ length: 24 }).map((_, h) => {
    const hourLabel = `${h.toString().padStart(2, "0")}:00`;
    const found = data.find((d) => d.hour === hourLabel || d.hour.startsWith(`${h.toString().padStart(2, "0")}`));
    if (found) return found;
    return {
      hour: hourLabel,
      revenue: 0,
      spend: 0,
      profit: 0,
      sales: 0,
    };
  });

  // Encontrar o valor absoluto máximo para escalar a altura das barras (mínimo de R$ 10 para ter escala visível)
  const maxAbsProfit = Math.max(
    ...full24Hours.map((d) => Math.abs(d.profit)),
    10
  );

  const formatCurrency = (val: number) => {
    if (hideValues) return "••••••";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val);
  };

  // Encontrar o horário de pico de vendas e de lucro
  const hoursWithSales = [...full24Hours].filter((h) => h.sales > 0 || h.revenue > 0);
  hoursWithSales.sort((a, b) => b.sales - a.sales || b.revenue - a.revenue);
  const peakSaleHour = hoursWithSales.length > 0 ? hoursWithSales[0] : null;

  const hoursWithProfit = [...full24Hours].filter((h) => h.profit > 0);
  hoursWithProfit.sort((a, b) => b.profit - a.profit);
  const peakProfitHour = hoursWithProfit.length > 0 ? hoursWithProfit[0] : null;

  return (
    <div className="rounded-xl border border-zinc-200/80 bg-white p-4 sm:p-5 dark:border-zinc-800/80 dark:bg-[#0f172a]/60 backdrop-blur-sm shadow-xs">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-bold text-zinc-900 dark:text-zinc-100">
              Lucro e Horários de Pico
            </span>
            {peakSaleHour && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 dark:bg-amber-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400 border border-amber-500/30">
                🔥 Pico de Vendas: {peakSaleHour.hour} ({peakSaleHour.sales} {peakSaleHour.sales === 1 ? "venda" : "vendas"} • {formatCurrency(peakSaleHour.revenue)})
              </span>
            )}
            {peakProfitHour && peakProfitHour.hour !== peakSaleHour?.hour && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                💰 Maior Lucro: {peakProfitHour.hour} (+{formatCurrency(peakProfitHour.profit)})
              </span>
            )}
          </div>
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">
            Identifique seus melhores horários de conversão e acompanhe onde seus anúncios geram lucro
          </p>
        </div>

        <div className="flex items-center gap-3 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]"></span>
            Lucro +
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.5)]"></span>
            Prejuízo −
          </span>
        </div>
      </div>

      {/* Tooltip com info do horário sob hover */}
      <div className="min-h-[30px] mb-2.5">
        {hoveredHour ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12px] bg-zinc-100 dark:bg-zinc-800/90 px-3 py-1.5 rounded-lg w-fit border border-zinc-200 dark:border-zinc-700/60 shadow-xs animate-in fade-in duration-150">
            <span className="font-bold text-zinc-900 dark:text-white px-1.5 py-0.5 rounded bg-zinc-200/70 dark:bg-zinc-700/60 text-[11px]">
              {hoveredHour.hour}
            </span>
            <span className="text-zinc-500 dark:text-zinc-400">
              Receita: <strong className="text-zinc-700 dark:text-zinc-200 font-semibold">{formatCurrency(hoveredHour.revenue)}</strong>
            </span>
            <span className="text-zinc-500 dark:text-zinc-400">
              Gasto: <strong className="text-zinc-700 dark:text-zinc-200 font-semibold">{formatCurrency(hoveredHour.spend)}</strong>
            </span>
            <span className={hoveredHour.profit >= 0 ? "font-bold text-emerald-500" : "font-bold text-rose-500"}>
              Lucro: {formatCurrency(hoveredHour.profit)}
            </span>
            {hoveredHour.products && hoveredHour.products.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pl-2 border-l border-zinc-300 dark:border-zinc-700">
                <span className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500">
                  {hoveredHour.products.length === 1 && hoveredHour.products[0].count === 1 ? "Produto:" : "Produtos:"}
                </span>
                {hoveredHour.products.map((p, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                    title={p.name}
                  >
                    <span>📦</span>
                    <span className="max-w-[240px] truncate">{p.name}</span>
                    {p.count > 1 && (
                      <span className="font-bold text-emerald-800 dark:text-emerald-200 bg-emerald-500/20 px-1 rounded text-[10px]">
                        {p.count}x
                      </span>
                    )}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-[11px] text-zinc-400 dark:text-zinc-500 italic py-1">
            Passe o mouse sobre as horas para ver receita, gasto, lucro e produtos vendidos
          </div>
        )}
      </div>

      {/* Gráfico bidirecional */}
      <div className="relative">
        <div className="flex h-44 sm:h-52 gap-0.5 sm:gap-1 items-stretch">
          {full24Hours.map((item) => {
            const isPositive = item.profit > 0;
            const isNegative = item.profit < 0;
            const absPercent = Math.min((Math.abs(item.profit) / maxAbsProfit) * 100, 100);

            return (
              <button
                key={item.hour}
                type="button"
                onMouseEnter={() => setHoveredHour(item)}
                onMouseLeave={() => setHoveredHour(null)}
                aria-label={`${item.hour}: ${formatCurrency(item.profit)}`}
                className="group flex flex-1 flex-col rounded-sm outline-none transition-colors duration-150 hover:bg-zinc-100/70 dark:hover:bg-zinc-800/40 cursor-pointer"
              >
                {/* Metade Superior: Lucro Positivo (cresce de baixo para cima) */}
                <div className="flex flex-1 flex-col justify-end">
                  {isPositive && (
                    <div
                      className="w-full rounded-t bg-emerald-500 group-hover:bg-emerald-400 transition-all duration-200 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                      style={{ height: `${absPercent}%` }}
                    />
                  )}
                </div>

                {/* Linha Central Zero */}
                <div className="border-t border-zinc-300 dark:border-zinc-700/80 w-full" />

                {/* Metade Inferior: Prejuízo Negativo (cresce de cima para baixo) */}
                <div className="flex flex-1 flex-col justify-start">
                  {isNegative && (
                    <div
                      className="w-full rounded-b bg-rose-500 group-hover:bg-rose-400 transition-all duration-200 shadow-[0_0_8px_rgba(244,63,94,0.3)]"
                      style={{ height: `${absPercent}%` }}
                    />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Labels das horas */}
        <div className="mt-2 flex gap-0.5 sm:gap-1">
          {full24Hours.map((item, idx) => {
            const showOnMobile = idx % 4 === 0;
            return (
              <div
                key={item.hour}
                className="min-w-0 flex-1 text-center text-[10px] text-zinc-400 dark:text-zinc-500"
              >
                <span className={showOnMobile ? "inline" : "hidden sm:inline"}>
                  {item.hour}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
