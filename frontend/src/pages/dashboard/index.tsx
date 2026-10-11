import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardHeader } from "./components/DashboardHeader";
import { NexoKpisGrid } from "./components/NexoKpisGrid";
import { OptimizationHubCards } from "./components/OptimizationHubCards";
import { SfyFlow } from "./components/SfyFlow";
import { CommercialCards } from "./components/CommercialCards";
import { SfyCountry } from "./components/SfyCountry";
import { CampaignsPerformanceTable } from "./components/CampaignsPerformanceTable";
import { HourlyProfitChart } from "./components/HourlyProfitChart";
import { GoalsCards } from "./components/GoalsCards";
import { RevenueChart } from "./components/RevenueChart";
import { PlatformChart } from "./components/PlatformChart";
import { GlobalFilterBar } from "@/components/layout/GlobalFilterBar";
import { useDashboard } from "@/hooks/use-dashboard";
import { useDashboardPageData } from "@/hooks/useDashboardPageData";
import { useSalesListener } from "@/hooks/use-sales-listener";
import { fetchCustomersFilterOptions } from "@/services/customers";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Bell } from "lucide-react";
import { NexofyNotificationModal } from "@/components/NexofyNotificationModal";
import type { UpsellOption } from "@/types/sale";
import GuardianPage from "@/pages/guardian";
import CreativeFatiguePage from "@/pages/creative-fatigue";
import SimulatorPage from "@/pages/simulator";
import UtmBuilderPage from "@/pages/utm-builder";
import {
  RiBarChartLine,
  RiShieldCheckLine,
  RiFireLine,
  RiCalculatorLine,
  RiLinkM,
  RiArrowLeftLine,
} from "@remixicon/react";

export default function DashboardPage() {
  const { data, settings, loading, filters, setFilters, reload } = useDashboard();
  useDashboardPageData(data, filters, settings);
  const { isEnabled: notificationsEnabled, toggleNotifications } = useSalesListener(reload);

  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"overview" | "guardian" | "fatigue" | "simulator" | "utms">("overview");
  const [products, setProducts] = useState<{ id: number; name: string }[]>([]);
  const [upsells, setUpsells] = useState<UpsellOption[]>([]);
  const [platforms, setPlatforms] = useState<{ value: string; label: string }[]>([]);
  const [accounts, setAccounts] = useState<{ slug: string; name: string; platform: string }[]>([]);
  const [hideValues, setHideValues] = useState<boolean>(false);
  const [bannerDismissed, setBannerDismissed] = useState<boolean>(false);
  const [isNotifModalOpen, setIsNotifModalOpen] = useState<boolean>(false);

  useEffect(() => {
    if (data?.meta_error === "token_invalid") {
      toast.error("Token do Facebook Ads inválido", {
        description: "O token de acesso expirou ou o app foi deletado. Atualize o token na página de integrações.",
        duration: Infinity,
        action: {
          label: "Corrigir agora",
          onClick: () => navigate("/integrations"),
        },
        id: "meta-token-invalid",
      });
    } else if (data?.meta_error === "missing_permissions") {
      toast.error("Permissões insuficientes no Facebook Ads", {
        description: "O token da conta Meta Ads não possui a permissão 'ads_read' ou 'ads_management'. Atualize o token nas Integrações para sincronizar gastos e ROAS.",
        duration: Infinity,
        action: {
          label: "Corrigir nas Integrações",
          onClick: () => navigate("/integrations"),
        },
        id: "meta-token-missing-perms",
      });
    }
  }, [data?.meta_error, navigate]);

  useEffect(() => {
    fetchCustomersFilterOptions().then((opt) => {
      setProducts(opt.products);
      setUpsells(opt.upsells ?? []);
      if (opt.platforms) setPlatforms(opt.platforms);
      if (opt.accounts) setAccounts(opt.accounts);
    }).catch(() => {});
  }, []);

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto w-full">
      {/* 1. Header com Saudação, Status, Pop-ups Nexofy e Toggle de Ocultar Valores */}
      <DashboardHeader
        onRefresh={reload}
        hideValues={hideValues}
        onToggleHideValues={() => setHideValues((v) => !v)}
        notificationsEnabled={notificationsEnabled}
        onToggleNotifications={toggleNotifications}
        onOpenNotificationModal={() => setIsNotifModalOpen(true)}
      />

      {/* Modal de Configuração de Pop-up & Alertas Estilo Nexofy */}
      <NexofyNotificationModal
        isOpen={isNotifModalOpen}
        onClose={() => setIsNotifModalOpen(false)}
        onRefreshDashboard={reload}
      />

      {/* Banner de Ativação Mobile de Alertas Ninja's Tracker */}
      {!notificationsEnabled && !bannerDismissed && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl border border-blue-500/30 bg-gradient-to-r from-blue-950/60 via-slate-900/80 to-indigo-950/50 text-white shadow-xl shadow-blue-950/20 backdrop-blur-md">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="size-10 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0 shadow-inner">
              <Bell className="size-5 animate-bounce" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs sm:text-sm font-semibold text-white flex items-center gap-2">
                <span>Pop-ups no Celular (Estilo Nexofy & Hotmart)</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded font-mono font-medium">
                  Web Push Ativo
                </span>
              </h4>
              <p className="text-[11px] sm:text-xs text-zinc-300/80 mt-0.5">
                Receba o pop-up com som e vibração na tela do celular a cada venda aprovada com valor em dinheiro e criativo!
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
            <button
              type="button"
              onClick={() => setIsNotifModalOpen(true)}
              className="px-3 py-1.5 rounded-lg border border-blue-400/40 bg-blue-900/40 hover:bg-blue-800/60 text-[11px] font-medium text-blue-200 transition-colors cursor-pointer"
            >
              Configurar Pop-ups ⚙️
            </button>
            <button
              type="button"
              onClick={toggleNotifications}
              className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[12px] font-semibold shadow-md shadow-blue-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              Ativar no Celular
            </button>
            <button
              type="button"
              onClick={() => setBannerDismissed(true)}
              className="text-zinc-500 hover:text-zinc-300 text-xs px-1.5 py-1"
              title="Dispensar"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Barra de Abas do Dashboard: Visão Geral + Módulos de Inteligência Ninja Pro */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-border/50 no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab("overview")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === "overview"
              ? "bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold"
              : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
          }`}
        >
          <RiBarChartLine className="w-4 h-4" />
          <span>Visão Geral & 12 KPIs</span>
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

      {/* Renderização Condicional por Aba */}
      {activeTab === "guardian" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-border/40">
            <button
              onClick={() => setActiveTab("overview")}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <RiArrowLeftLine className="w-4 h-4" /> Voltar ao Dashboard Geral
            </button>
            <span className="text-xs text-emerald-400 font-mono">Módulo Ativo: O Guardião de Lucro (Stop-Loss Automático)</span>
          </div>
          <GuardianPage />
        </div>
      )}

      {activeTab === "fatigue" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-border/40">
            <button
              onClick={() => setActiveTab("overview")}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <RiArrowLeftLine className="w-4 h-4" /> Voltar ao Dashboard Geral
            </button>
            <span className="text-xs text-amber-400 font-mono">Módulo Ativo: Radar de Fadiga & Saturação de Criativos</span>
          </div>
          <CreativeFatiguePage />
        </div>
      )}

      {activeTab === "simulator" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-border/40">
            <button
              onClick={() => setActiveTab("overview")}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <RiArrowLeftLine className="w-4 h-4" /> Voltar ao Dashboard Geral
            </button>
            <span className="text-xs text-cyan-400 font-mono">Módulo Ativo: Simulador de Breakeven & Escala Preditiva</span>
          </div>
          <SimulatorPage />
        </div>
      )}

      {activeTab === "utms" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-border/40">
            <button
              onClick={() => setActiveTab("overview")}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <RiArrowLeftLine className="w-4 h-4" /> Voltar ao Dashboard Geral
            </button>
            <span className="text-xs text-purple-400 font-mono">Módulo Ativo: Gerador Inteligente de UTMs & Script Ninja</span>
          </div>
          <UtmBuilderPage />
        </div>
      )}

      {activeTab === "overview" && (
        <>
          {/* 2. Filtros Globais (Período, Contas, Produtos, etc.) */}
          <GlobalFilterBar
            filters={filters}
            onFiltersChange={setFilters}
            settings={settings}
            products={products}
            upsells={upsells}
            platforms={platforms}
            accounts={accounts}
          />

          {/* 2.1. Central Ninja de Inteligência & Escala (Sempre visível no topo da Visão Geral) */}
          <OptimizationHubCards onSelectTab={(t) => setActiveTab(t)} />

          {loading || !data ? (
            <div className="space-y-4">
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
                {Array.from({ length: 12 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-xl" />
                ))}
              </div>
              <Skeleton className="h-32 w-full rounded-xl" />
              <div className="grid gap-4 sm:grid-cols-3">
                <Skeleton className="h-44 w-full rounded-xl" />
                <Skeleton className="h-44 w-full rounded-xl" />
                <Skeleton className="h-44 w-full rounded-xl" />
              </div>
            </div>
          ) : (
            <>
              {/* 3. Grid dos 12 KPIs Principais */}
              <NexoKpisGrid
                kpis={data.kpis}
                hideAllValues={hideValues}
                taxEnabled={filters.taxEnabled}
                taxRate={settings?.tax_rate ?? 0}
                opCostsEnabled={filters.opCostsEnabled}
                opCostsTotal={settings?.operational_costs.reduce((s, c) => s + c.amount, 0) ?? 0}
              />

          {/* 4. SFY Flow: Funil de Conversão em Tempo Real */}
          <SfyFlow flow={data.conversion_flow} />

          {/* 5. Três Cards Comerciais (UTMs, Produtos, Pagamentos) */}
          <CommercialCards
            utmOrigins={data.utm_origins}
            topProducts={data.top_products}
            paymentMethods={data.payment_methods}
            hideValues={hideValues}
          />

          {/* 6. Linha Dupla: SFY Country (3D Globe) + Desempenho por Campanha */}
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-12 items-stretch">
            <div className="lg:col-span-6 min-w-0">
              <SfyCountry countries={data.countries} hideValues={hideValues} />
            </div>
            <div className="lg:col-span-6 min-w-0">
              <CampaignsPerformanceTable
                campaigns={data.top_campaigns}
                hideValues={hideValues}
              />
            </div>
          </div>

          {/* 7. Gráfico Bidirecional de 24 Horas: Lucro por Horário */}
          <HourlyProfitChart
            data={data.hourly_profit}
            hideValues={hideValues}
          />

          {/* 8. Metas de Faturamento (Mês, Semana, Dia) */}
          <GoalsCards
            currentMonthlyRevenue={data.kpis?.total_revenue ?? 0}
            hideValues={hideValues}
          />

          {/* 9. Histórico de Evolução Diária & Distribuição por Plataforma */}
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <RevenueChart data={data.daily_revenue} />
            </div>
            <PlatformChart data={data.platform_distribution} />
          </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
