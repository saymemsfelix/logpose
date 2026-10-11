import { useNavigate } from "react-router-dom";
import {
  RiShieldCheckLine,
  RiFireLine,
  RiCalculatorLine,
  RiLinkM,
  RiArrowRightLine,
  RiSparklingFill,
} from "@remixicon/react";
import { Badge } from "@/components/ui/badge";

interface OptimizationHubCardsProps {
  onSelectTab?: (tab: "guardian" | "fatigue" | "simulator" | "utms") => void;
}

export function OptimizationHubCards({ onSelectTab }: OptimizationHubCardsProps) {
  const navigate = useNavigate();

  const handleCardClick = (tabKey: "guardian" | "fatigue" | "simulator" | "utms", path: string) => {
    if (onSelectTab) {
      onSelectTab(tabKey);
    } else {
      navigate(path);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RiSparklingFill className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-bold tracking-tight text-foreground uppercase tracking-wider text-[11px] text-zinc-400">
            Inteligência de Tráfego & Escala (Novas Ferramentas Pro)
          </h2>
        </div>
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]">
          4 Módulos Ativos
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* CARD 1: O GUARDIÃO DE LUCRO */}
        <div
          onClick={() => handleCardClick("guardian", "/guardian")}
          className="group relative cursor-pointer overflow-hidden rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/25 via-card to-card p-4 transition-all duration-200 hover:border-emerald-500/60 hover:shadow-lg hover:shadow-emerald-950/20"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <RiShieldCheckLine className="w-5 h-5" />
            </div>
            <span className="flex items-center gap-1.5 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Ativo 24h
            </span>
          </div>

          <h3 className="font-bold text-sm text-foreground group-hover:text-emerald-400 transition-colors">
            O Guardião de Lucro
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Stop-Loss automático e proteção contra conjuntos que gastam sem vender.
          </p>

          <div className="mt-3 pt-2.5 border-t border-border/40 flex items-center justify-between text-[11px]">
            <span className="text-emerald-300 font-mono text-[10px]">
              Stop: R$ 80 | Teto: R$ 90
            </span>
            <span className="text-emerald-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5 font-semibold">
              Abrir <RiArrowRightLine className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        {/* CARD 2: RADAR DE FADIGA */}
        <div
          onClick={() => handleCardClick("fatigue", "/creative-fatigue")}
          className="group relative cursor-pointer overflow-hidden rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-950/25 via-card to-card p-4 transition-all duration-200 hover:border-amber-500/60 hover:shadow-lg hover:shadow-amber-950/20"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <RiFireLine className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
              Triple Whale
            </span>
          </div>

          <h3 className="font-bold text-sm text-foreground group-hover:text-amber-400 transition-colors">
            Fadiga de Criativos
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Monitora frequência alta e queda de CTR para avisar antes do criativo saturar.
          </p>

          <div className="mt-3 pt-2.5 border-t border-border/40 flex items-center justify-between text-[11px]">
            <span className="text-amber-300 font-mono text-[10px]">
              Score de Saturação (0-100)
            </span>
            <span className="text-amber-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5 font-semibold">
              Verificar <RiArrowRightLine className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        {/* CARD 3: SIMULADOR DE ESCALA */}
        <div
          onClick={() => handleCardClick("simulator", "/simulator")}
          className="group relative cursor-pointer overflow-hidden rounded-xl border border-cyan-500/30 bg-gradient-to-br from-cyan-950/25 via-card to-card p-4 transition-all duration-200 hover:border-cyan-500/60 hover:shadow-lg hover:shadow-cyan-950/20"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <RiCalculatorLine className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-medium text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full">
              Breakeven
            </span>
          </div>

          <h3 className="font-bold text-sm text-foreground group-hover:text-cyan-400 transition-colors">
            Simulador de Breakeven
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            CPA máximo permitido e projeção de lucro líquido em 5 níveis de escala.
          </p>

          <div className="mt-3 pt-2.5 border-t border-border/40 flex items-center justify-between text-[11px]">
            <span className="text-cyan-300 font-mono text-[10px]">
              Kiwify • Hotmart • Braip
            </span>
            <span className="text-cyan-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5 font-semibold">
              Simular <RiArrowRightLine className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        {/* CARD 4: GERADOR DE UTMS */}
        <div
          onClick={() => handleCardClick("utms", "/utm-builder")}
          className="group relative cursor-pointer overflow-hidden rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-950/25 via-card to-card p-4 transition-all duration-200 hover:border-purple-500/60 hover:shadow-lg hover:shadow-purple-950/20"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <RiLinkM className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-medium text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full">
              Anti-Perda
            </span>
          </div>

          <h3 className="font-bold text-sm text-foreground group-hover:text-purple-400 transition-colors">
            Gerador de UTMs & Script
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Links com tags dinâmicas do Meta e Script JS de repasse para o checkout.
          </p>

          <div className="mt-3 pt-2.5 border-t border-border/40 flex items-center justify-between text-[11px]">
            <span className="text-purple-300 font-mono text-[10px]">
              Copiar Link & Script
            </span>
            <span className="text-purple-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5 font-semibold">
              Criar <RiArrowRightLine className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
