import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardHeader } from "./components/DashboardHeader";
import { NexoKpisGrid } from "./components/NexoKpisGrid";
import { LogPoseFlow } from "./components/LogPoseFlow";
import { CommercialCards } from "./components/CommercialCards";
import { LogPoseCountry } from "./components/LogPoseCountry";
import { CampaignsPerformanceTable } from "./components/CampaignsPerformanceTable";
import { HourlyProfitChart } from "./components/HourlyProfitChart";
import { GoalsCards } from "./components/GoalsCards";
import { RevenueChart } from "./components/RevenueChart";
import { PlatformChart } from "./components/PlatformChart";
import { GlobalFilterBar } from "@/components/layout/GlobalFilterBar";
import { useDashboard } from "@/hooks/use-dashboard";
import { fetchCustomersFilterOptions } from "@/services/customers";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import type { UpsellOption } from "@/types/sale";

export default function DashboardPage() {
  const { data, settings, loading, filters, setFilters, reload } = useDashboard();
  const navigate = useNavigate();
  const [products, setProducts] = useState<{ id: number; name: string }[]>([]);
  const [upsells, setUpsells] = useState<UpsellOption[]>([]);
  const [platforms, setPlatforms] = useState<{ value: string; label: string }[]>([]);
  const [accounts, setAccounts] = useState<{ slug: string; name: string; platform: string }[]>([]);
  const [hideValues, setHideValues] = useState<boolean>(false);

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
      {/* 1. Header com Saudação, Status e Toggle de Ocultar Valores */}
      <DashboardHeader
        onRefresh={reload}
        hideValues={hideValues}
        onToggleHideValues={() => setHideValues((v) => !v)}
      />

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
          <NexoKpisGrid kpis={data.kpis} hideAllValues={hideValues} />

          {/* 4. LogPose Flow: Funil de Conversão em Tempo Real */}
          <LogPoseFlow flow={data.conversion_flow} />

          {/* 5. Três Cards Comerciais (UTMs, Produtos, Pagamentos) */}
          <CommercialCards
            utmOrigins={data.utm_origins}
            topProducts={data.top_products}
            paymentMethods={data.payment_methods}
            hideValues={hideValues}
          />

          {/* 6. Linha Dupla: LogPose Country (3D Globe) + Desempenho por Campanha */}
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-12 items-stretch">
            <div className="lg:col-span-6 min-w-0">
              <LogPoseCountry countries={data.countries} hideValues={hideValues} />
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
