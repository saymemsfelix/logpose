import { useState } from "react";
import {
  RiSparklingFill,
  RiShieldCheckLine,
  RiFireLine,
  RiCalculatorLine,
  RiLinkM,
  RiLayoutGridLine,
} from "@remixicon/react";
import { OptimizationHubCards } from "@/pages/dashboard/components/OptimizationHubCards";
import GuardianPage from "@/pages/guardian";
import CreativeFatiguePage from "@/pages/creative-fatigue";
import SimulatorPage from "@/pages/simulator";
import UtmBuilderPage from "@/pages/utm-builder";

export default function ToolsHubPage() {
  const [activeTab, setActiveTab] = useState<"hub" | "guardian" | "fatigue" | "simulator" | "utms">("hub");

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto w-full">
      {/* Header da Central Pro */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500/20 to-blue-500/20 border border-emerald-500/30 text-emerald-400">
              <RiSparklingFill className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                Central de Ferramentas Pro
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-medium">
                  Ninja Intelligence
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Automação de stop-loss, análise preditiva de fadiga, cálculo de breakeven e gerador dinâmico de UTMs.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Menu Superior de Ferramentas */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-border/50 no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab("hub")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === "hub"
              ? "bg-primary text-primary-foreground shadow-md shadow-primary/30 font-bold"
              : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
          }`}
        >
          <RiLayoutGridLine className="w-4 h-4" />
          <span>Visão Geral das Ferramentas</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("guardian")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === "guardian"
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 shadow-md shadow-emerald-950/40 font-bold"
              : "text-zinc-400 hover:text-emerald-400 hover:bg-emerald-950/20"
          }`}
        >
          <RiShieldCheckLine className="w-4 h-4 text-emerald-400" />
          <span>🛡️ O Guardião de Lucro</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("fatigue")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === "fatigue"
              ? "bg-amber-500/20 text-amber-400 border border-amber-500/50 shadow-md shadow-amber-950/40 font-bold"
              : "text-zinc-400 hover:text-amber-400 hover:bg-amber-950/20"
          }`}
        >
          <RiFireLine className="w-4 h-4 text-amber-400" />
          <span>🔥 Radar de Fadiga</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("simulator")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === "simulator"
              ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 shadow-md shadow-cyan-950/40 font-bold"
              : "text-zinc-400 hover:text-cyan-400 hover:bg-cyan-950/20"
          }`}
        >
          <RiCalculatorLine className="w-4 h-4 text-cyan-400" />
          <span>🧮 Simulador de Breakeven & Escala</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("utms")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === "utms"
              ? "bg-purple-500/20 text-purple-400 border border-purple-500/50 shadow-md shadow-purple-950/40 font-bold"
              : "text-zinc-400 hover:text-purple-400 hover:bg-purple-950/20"
          }`}
        >
          <RiLinkM className="w-4 h-4 text-purple-400" />
          <span>🔗 Gerador de UTMs & Script</span>
        </button>
      </div>

      {/* Conteúdo Dinâmico */}
      {activeTab === "hub" && (
        <div className="space-y-6">
          <OptimizationHubCards onSelectTab={(tab) => setActiveTab(tab)} />

          {/* Card Especial da Nova Inteligência de Horários da IA */}
          <div className="relative overflow-hidden rounded-2xl border border-blue-500/30 bg-gradient-to-r from-blue-950/40 via-card to-indigo-950/30 p-5 sm:p-6 backdrop-blur-md shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5 max-w-3xl">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 font-mono">
                    NOVA INTELIGÊNCIA IA
                  </span>
                  <h3 className="text-base font-bold text-foreground">
                    ⚡ Smart Dayparting & Acelerador por Horários
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Sua IA do Ninja Tracker agora lê seu Heatmap e performance hora a hora em tempo real. Você pode comandar no chat para aumentar o orçamento nas Janelas de Ouro de conversão e diminuir na madrugada:
                </p>
                <div className="flex flex-wrap gap-2 pt-2">
                  <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-zinc-900/80 border border-zinc-700/60 text-zinc-300">
                    💬 "Ninja, quais meus horários de pico e onde estou perdendo dinheiro?"
                  </span>
                  <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-zinc-900/80 border border-zinc-700/60 text-zinc-300">
                    💬 "Aumente 20% do orçamento da melhor campanha no horário de pico"
                  </span>
                  <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-zinc-900/80 border border-zinc-700/60 text-zinc-300">
                    💬 "Programe para diminuir o orçamento de madrugada"
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/40 bg-card/60 p-5 sm:p-6 backdrop-blur-sm">
            <h3 className="text-sm font-semibold text-foreground mb-1">
              Como funcionam as Ferramentas Pro?
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Estes módulos foram desenvolvidos para atuar em conjunto com o Ninja's Tracker, fornecendo automação em tempo real (como o Guardião que pausa anúncios que gastam sem vender), alerta preventivo de criativos fadigados antes de perder ROI, simulações de viabilidade de escala por plataforma de checkout e rastreamento à prova de falhas com UTMs dinâmicas.
            </p>
          </div>
        </div>
      )}

      {activeTab === "guardian" && <GuardianPage />}
      {activeTab === "fatigue" && <CreativeFatiguePage />}
      {activeTab === "simulator" && <SimulatorPage />}
      {activeTab === "utms" && <UtmBuilderPage />}
    </div>
  );
}
