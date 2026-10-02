import { useState, useCallback } from "react";
import type { DashboardOverview } from "@/types/dashboard";
import type { CompanySettings } from "@/types/company";
import { fetchDashboardOverview } from "@/services/dashboard";
import { fetchCompanySettings } from "@/services/company";
import { useCachedQuery } from "./useCachedQuery";
import { parseProductFilterValue } from "@/utils/product-filter";

export type DatePreset = "today" | "yesterday" | "7d" | "14d" | "30d" | "90d" | "all" | "custom";

export interface DashboardFilters {
  datePreset: DatePreset;
  dateStart: string;
  dateEnd: string;
  product: string;
  platform: string;
  accountSlug: string;
  taxEnabled: boolean;
  opCostsEnabled: boolean;
}

export const dashboardFilterDefaults: DashboardFilters = {
  datePreset: "today",
  dateStart: "",
  dateEnd: "",
  product: "all",
  platform: "all",
  accountSlug: "all",
  taxEnabled: true,
  opCostsEnabled: false,
};

export function useDashboard() {
  const [filters, setFiltersState] = useState<DashboardFilters>(() => {
    const savedTax = typeof window !== "undefined" ? localStorage.getItem("ninjas_tracker_tax_enabled") : null;
    return {
      ...dashboardFilterDefaults,
      taxEnabled: savedTax !== null ? savedTax === "true" : true,
    };
  });

  const setFilters = useCallback((updater: DashboardFilters | ((prev: DashboardFilters) => DashboardFilters)) => {
    setFiltersState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      if (typeof window !== "undefined") {
        localStorage.setItem("ninjas_tracker_tax_enabled", String(next.taxEnabled));
      }
      return next;
    });
  }, []);

  const buildParams = useCallback(() => {
    const p: Record<string, unknown> = {
      preset: filters.datePreset,
    };
    if (filters.datePreset === "custom") {
      p.start_date = filters.dateStart;
      p.end_date = filters.dateEnd;
    }
    if (filters.platform !== "all") p.platform = filters.platform;
    const pf = parseProductFilterValue(filters.product);
    if (pf.product_id) p.product_id = pf.product_id;
    if (pf.upsell_id) p.upsell_id = pf.upsell_id;
    if (filters.accountSlug !== "all") p.account_slug = filters.accountSlug;
    return p;
  }, [filters]);

  const params = buildParams();

  const { data, isLoading: loading, reload } = useCachedQuery<DashboardOverview>({
    cachePrefix: "dashboard",
    params,
    queryFn: () => fetchDashboardOverview(params as Record<string, string | number | undefined>),
    autoRefreshMs: 15000,
  });

  const { data: settings } = useCachedQuery<CompanySettings>({
    cachePrefix: "company-settings",
    queryFn: fetchCompanySettings,
  });

  return { data, settings, loading, filters, setFilters, reload };
}
