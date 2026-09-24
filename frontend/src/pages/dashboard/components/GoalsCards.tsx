import { useState, useEffect } from "react";
import { Target, Check } from "lucide-react";

interface GoalsCardsProps {
  currentMonthlyRevenue?: number;
  hideValues?: boolean;
}

export function GoalsCards({ currentMonthlyRevenue = 0, hideValues = false }: GoalsCardsProps) {
  const [monthlyGoal, setMonthlyGoal] = useState<number>(() => {
    const saved = localStorage.getItem("sfy_monthly_goal") || localStorage.getItem("logpose_monthly_goal");
    return saved ? parseFloat(saved) : 0;
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inputValue, setInputValue] = useState(monthlyGoal > 0 ? String(monthlyGoal) : "");

  useEffect(() => {
    if (monthlyGoal > 0) {
      localStorage.setItem("sfy_monthly_goal", String(monthlyGoal));
    }
  }, [monthlyGoal]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(inputValue.replace(/\D/g, "")) || 0;
    setMonthlyGoal(val);
    setIsModalOpen(false);
  };

  const formatCurrency = (val: number) => {
    if (hideValues) return "••••••";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const hasGoal = monthlyGoal > 0;
  const progressPercent = hasGoal ? Math.min((currentMonthlyRevenue / monthlyGoal) * 100, 100) : 0;
  const weeklyGoal = hasGoal ? monthlyGoal / 4.0 : 0;
  const dailyGoal = hasGoal ? monthlyGoal / 30.0 : 0;

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        {/* Meta do Mês (col-span-2) */}
        <div className="rounded-xl border border-zinc-200/80 bg-white dark:border-zinc-800/80 dark:bg-[#0f172a]/60 backdrop-blur-sm p-4 sm:p-5 h-full col-span-1 sm:col-span-2 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <Target className="h-4 w-4 text-blue-500" />
              Meta do Mês
            </span>
            {hasGoal && (
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="text-[11px] text-blue-500 hover:text-blue-400 font-medium cursor-pointer"
              >
                Ajustar meta
              </button>
            )}
          </div>

          {!hasGoal ? (
            <div className="flex flex-col items-center justify-center gap-2.5 py-4 text-center">
              <Target className="h-6 w-6 text-zinc-300 dark:text-zinc-600" />
              <p className="text-[12px] text-zinc-500 dark:text-zinc-400">
                Nenhuma meta definida ainda.
              </p>
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="rounded-lg bg-blue-600 px-3.5 py-1.5 text-[12px] font-medium text-white hover:bg-blue-500 transition-colors shadow-xs cursor-pointer"
              >
                Definir Meta
              </button>
            </div>
          ) : (
            <div className="py-2 space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-bold tabular-nums text-zinc-900 dark:text-white">
                  {formatCurrency(currentMonthlyRevenue)}
                </span>
                <span className="text-[12px] font-medium text-zinc-400">
                  / {formatCurrency(monthlyGoal)}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="text-[11px] text-zinc-400">
                {progressPercent.toFixed(1)}% atingido
              </p>
            </div>
          )}
        </div>

        {/* Meta da Semana (col-span-1) */}
        <div className="rounded-xl border border-zinc-200/80 bg-white dark:border-zinc-800/80 dark:bg-[#0f172a]/60 backdrop-blur-sm p-4 sm:p-5 h-full col-span-1 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold text-zinc-900 dark:text-zinc-100">
              Meta da Semana
            </span>
          </div>

          {!hasGoal ? (
            <p className="py-4 text-center text-[12px] text-zinc-400">
              Defina a meta mensal para calcular.
            </p>
          ) : (
            <div className="py-2">
              <div className="text-lg font-bold tabular-nums text-zinc-900 dark:text-white">
                {formatCurrency(weeklyGoal)}
              </div>
              <p className="mt-1 text-[11px] text-zinc-400">
                Meta semanal recomendada
              </p>
            </div>
          )}
        </div>

        {/* Meta do Dia (col-span-1) */}
        <div className="rounded-xl border border-zinc-200/80 bg-white dark:border-zinc-800/80 dark:bg-[#0f172a]/60 backdrop-blur-sm p-4 sm:p-5 h-full col-span-1 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold text-zinc-900 dark:text-zinc-100">
              Meta do Dia
            </span>
          </div>

          {!hasGoal ? (
            <p className="py-4 text-center text-[12px] text-zinc-400">
              Defina a meta mensal para calcular.
            </p>
          ) : (
            <div className="py-2">
              <div className="text-lg font-bold tabular-nums text-zinc-900 dark:text-white">
                {formatCurrency(dailyGoal)}
              </div>
              <p className="mt-1 text-[11px] text-zinc-400">
                Meta diária para bater o mês
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal para Definir Meta */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="text-base font-semibold text-zinc-900 dark:text-white">
              Definir Meta de Faturamento Mensal
            </h3>
            <p className="mt-1 text-[12px] text-zinc-500 dark:text-zinc-400">
              Informe quanto você quer faturar este mês. Calcularemos as metas semanais e diárias automaticamente.
            </p>

            <form onSubmit={handleSave} className="mt-4 space-y-4">
              <div>
                <label className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">
                  Valor da Meta (R$)
                </label>
                <div className="mt-1 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">
                    R$
                  </span>
                  <input
                    type="number"
                    step="100"
                    placeholder="Ex: 50000"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2 pl-9 pr-3 text-sm text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-800 dark:bg-zinc-800 dark:text-white"
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-blue-500"
                >
                  <Check className="h-3.5 w-3.5" />
                  Salvar Meta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
