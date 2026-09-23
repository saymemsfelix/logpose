import { MousePointerClick, Eye, Receipt, ShoppingCart, CheckCircle2, ChevronRight } from "lucide-react";
import type { ConversionFlow } from "@/types/dashboard";

interface LogPoseFlowProps {
  flow?: ConversionFlow;
}

export function LogPoseFlow({ flow }: LogPoseFlowProps) {
  const clicks = flow?.clicks ?? 0;
  const pageviews = flow?.pageviews ?? 0;
  const ics = flow?.initiate_checkouts ?? 0;
  const salesInit = flow?.initiated_sales ?? 0;
  const salesApp = flow?.approved_sales ?? 0;

  const rates = flow?.rates ?? {
    clicks_to_pageviews: clicks > 0 ? (pageviews / clicks) * 100 : 0,
    pageviews_to_ics: pageviews > 0 ? (ics / pageviews) * 100 : 0,
    ics_to_initiated: ics > 0 ? (salesInit / ics) * 100 : 0,
    initiated_to_approved: salesInit > 0 ? (salesApp / salesInit) * 100 : 0,
  };

  const steps = [
    {
      id: "clicks",
      label: "Cliques",
      value: clicks,
      icon: MousePointerClick,
    },
    {
      id: "pageviews",
      label: "Vis. Página",
      value: pageviews,
      icon: Eye,
      prevRate: rates.clicks_to_pageviews,
    },
    {
      id: "ics",
      label: "ICs",
      value: ics > 0 ? ics : "—",
      icon: Receipt,
      prevRate: rates.pageviews_to_ics,
      tooltip: "Initiate Checkouts (início de finalização de compra)",
    },
    {
      id: "sales_init",
      label: "Vendas Inic.",
      value: salesInit,
      icon: ShoppingCart,
      prevRate: rates.ics_to_initiated,
    },
    {
      id: "sales_app",
      label: "Vendas Apr.",
      value: salesApp,
      icon: CheckCircle2,
      prevRate: rates.initiated_to_approved,
      isFinal: true,
    },
  ];

  return (
    <div className="rounded-xl border border-zinc-200/80 bg-white dark:border-zinc-800/80 dark:bg-[#0f172a]/60 backdrop-blur-sm p-4 sm:p-5 shadow-xs">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[17px] font-bold tracking-tight">
            <span className="text-zinc-900 dark:text-white">LogPose </span>
            <span className="inline-block bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-400 bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(59,130,246,0.35)]">
              Flow
            </span>
          </div>
          <p className="mt-0.5 text-[12px] text-zinc-500 dark:text-zinc-400">
            Seu fluxo de conversão em tempo real
          </p>
        </div>
      </div>

      {/* Desktop view: pipeline horizontal conectado */}
      <div className="hidden sm:flex sm:items-center sm:justify-between mt-6 px-2">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          return (
            <div key={step.id} className="contents">
              {/* Connector between steps */}
              {idx > 0 && (
                <div className="flex flex-1 flex-col items-center px-1">
                  <span className="mb-1 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                    {step.prevRate !== undefined ? `${step.prevRate.toFixed(1)}%` : "0%"}
                  </span>
                  <div className="relative flex w-full items-center">
                    <span className="h-0.5 w-full bg-gradient-to-r from-blue-700 via-blue-500 to-cyan-400"></span>
                    <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.9)]"></span>
                    <ChevronRight className="absolute right-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-cyan-400" />
                  </div>
                </div>
              )}

              {/* Node Card */}
              <div
                className="flex w-24 shrink-0 flex-col items-center text-center"
                title={step.tooltip}
              >
                <div
                  className={`grid h-12 w-12 shrink-0 place-items-center rounded-full p-[2px] transition-transform hover:scale-105 ${
                    step.isFinal
                      ? "bg-gradient-to-br from-blue-500 via-cyan-400 to-emerald-400 shadow-[0_0_16px_rgba(56,189,248,0.45)]"
                      : "bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-500 shadow-[0_0_12px_rgba(59,130,246,0.35)]"
                  }`}
                >
                  <span className="grid h-full w-full place-items-center rounded-full bg-white dark:bg-zinc-950 text-blue-600 dark:text-cyan-400">
                    <Icon className="h-5 w-5" />
                  </span>
                </div>
                <span className="mt-2 text-[12px] font-medium text-zinc-600 dark:text-zinc-400">
                  {step.label}
                </span>
                <span className="mt-0.5 text-[17px] font-semibold tabular-nums text-zinc-900 dark:text-white">
                  {step.value}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile view: timeline vertical conectada */}
      <div className="flex flex-col gap-3 sm:hidden mt-4">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          return (
            <div key={step.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-full p-[2px] ${
                    step.isFinal
                      ? "bg-gradient-to-br from-blue-500 to-cyan-400 shadow-[0_0_10px_rgba(56,189,248,0.4)]"
                      : "bg-gradient-to-br from-blue-700 to-cyan-500 shadow-[0_0_8px_rgba(59,130,246,0.3)]"
                  }`}
                >
                  <span className="grid h-full w-full place-items-center rounded-full bg-white dark:bg-zinc-900 text-blue-600 dark:text-cyan-400">
                    <Icon className="h-4 w-4" />
                  </span>
                </span>
                {idx < steps.length - 1 && (
                  <span className="relative my-1 w-0.5 flex-1 bg-gradient-to-b from-blue-600 to-cyan-400">
                    <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500"></span>
                  </span>
                )}
              </div>
              <div className="flex flex-1 items-center justify-between pb-3">
                <div>
                  <div className="text-[12px] font-medium text-zinc-500 dark:text-zinc-400">
                    {step.label}
                  </div>
                  <div className="text-[17px] font-semibold tabular-nums text-zinc-900 dark:text-white">
                    {step.value}
                  </div>
                </div>
                {step.prevRate !== undefined && (
                  <span className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] font-medium text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                    {step.prevRate.toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
