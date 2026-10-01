import { apiRequest } from "./api";
import type { DashboardOverview } from "@/types/dashboard";

interface DashboardParams {
  preset?: string;
  start_date?: string;
  end_date?: string;
  platform?: string;
  product_id?: number;
  upsell_id?: number;
  account_slug?: string;
  account_id?: number;
}

function buildQuery(params: DashboardParams): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== ""
  );
  if (entries.length === 0) return "";
  return "?" + entries.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join("&");
}

export async function fetchDashboardOverview(params: DashboardParams): Promise<DashboardOverview> {
  return apiRequest<DashboardOverview>(`/dashboard/overview${buildQuery(params)}`);
}

export async function fetchManualSpend(): Promise<{ spend: number; clicks: number; spend_date: string }> {
  return apiRequest<{ spend: number; clicks: number; spend_date: string }>("/dashboard/manual-spend");
}

export async function updateManualSpend(spend: number, clicks?: number, spendDate?: string): Promise<{ status: string }> {
  return apiRequest<{ status: string }>("/dashboard/manual-spend", {
    method: "POST",
    body: { spend, clicks: clicks || 0, spend_date: spendDate },
  });
}

