import { useState } from "react";
import { getStoredUser } from "@/services/auth";
import { Eye, EyeOff, RefreshCw } from "lucide-react";

function getGreeting(): string {
  const now = new Date();
  const spHour = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "numeric",
    hour12: false,
  }).format(now);
  const hour = parseInt(spHour, 10);

  if (hour >= 5 && hour < 12) return "Bom dia";
  if (hour >= 12 && hour < 18) return "Boa tarde";
  return "Boa noite";
}

interface DashboardHeaderProps {
  onRefresh: () => Promise<void>;
  hideValues: boolean;
  onToggleHideValues: () => void;
  syncTime?: string;
}

export function DashboardHeader({
  onRefresh,
  hideValues,
  onToggleHideValues,
  syncTime = "Sincronizado",
}: DashboardHeaderProps) {
  const user = getStoredUser();
  const firstName = user?.name?.split(" ")[0] || "Sayme";
  const greeting = getGreeting();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl text-zinc-900 dark:text-white flex items-center">
          <span>{greeting}, {firstName} 👋</span>
          <span className="ml-1 inline-block animate-pulse font-normal text-blue-500">|</span>
        </h1>
        <p className="mt-1 text-[13px] text-zinc-500 dark:text-zinc-400">
          Bora ver como estão seus números?
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {/* Botão Ocultar Valores */}
        <button
          type="button"
          onClick={onToggleHideValues}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200/80 bg-white px-3 py-1.5 text-[12px] font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors shadow-2xs cursor-pointer"
        >
          {hideValues ? (
            <>
              <Eye className="h-3.5 w-3.5 text-blue-500" />
              <span>Mostrar valores</span>
            </>
          ) : (
            <>
              <EyeOff className="h-3.5 w-3.5" />
              <span>Ocultar valores</span>
            </>
          )}
        </button>

        {/* Status de Sincronização + Botão Atualizar */}
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline text-[11px] text-zinc-400 dark:text-zinc-500">
            {syncTime}
          </span>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-[13px] font-medium text-white hover:bg-blue-500 disabled:opacity-60 transition-colors shadow-xs cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>Atualizar</span>
          </button>
        </div>
      </div>
    </div>
  );
}
