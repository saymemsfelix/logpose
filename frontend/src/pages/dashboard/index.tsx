import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardHeader } from "./components/DashboardHeader";
import { NexoKpisGrid } from "./components/NexoKpisGrid";
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

export default function DashboardPage() {
  const { data, settings, loading, filters, setFilters, reload } = useDashboard();
  useDashboardPageData(data, filters, settings);
  const { isEnabled: notificationsEnabled, toggleNotifications, testAlertSound, testPushNotification } = useSalesListener(reload);

  const navigate = useNavigate();
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
    </div>
  );
}
