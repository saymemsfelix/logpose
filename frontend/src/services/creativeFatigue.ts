import { apiRequest } from "./api";

export interface CreativeFatigueAd {
  id: string;
  name: string;
  campaign_name: string;
  adset_name: string;
  account_id: number;
  status: string;
  spend: number;
  impressions: number;
  reach: number;
  frequency: number;
  clicks: number;
  ctr: number;
  cpc: number;
  sales: number;
  cpa: number;
  roas: number;
  fatigue_score: number;
  fatigue_status: "healthy" | "warning" | "critical";
  recommendation: string;
}

export interface CreativeFatigueSummary {
  total_ads: number;
  healthy_count: number;
  warning_count: number;
  critical_count: number;
}

export interface CreativeFatigueResponse {
  summary: CreativeFatigueSummary;
  ads: CreativeFatigueAd[];
  date_range: {
    start: string;
    end: string;
  };
}

export async function getCreativeFatigueAnalysis(
  dateStart?: string,
  dateEnd?: string,
  accountId?: number
): Promise<CreativeFatigueResponse> {
  const params = new URLSearchParams();
  if (dateStart) params.append("date_start", dateStart);
  if (dateEnd) params.append("date_end", dateEnd);
  if (accountId) params.append("account_id", String(accountId));

  const query = params.toString();
  const endpoint = query ? `/creative-fatigue/analysis?${query}` : "/creative-fatigue/analysis";
  return await apiRequest<CreativeFatigueResponse>(endpoint);
}

export async function toggleFatigueAdStatus(
  adId: string,
  status: "PAUSED" | "ACTIVE",
  accountId?: number
): Promise<{ status: string; message: string }> {
  return await apiRequest<{ status: string; message: string }>("/creative-fatigue/toggle-ad", {
    method: "POST",
    body: {
      ad_id: adId,
      status,
      account_id: accountId,
    },
  });
}
