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

export interface BatchCreative {
  id: string;
  name: string;
  campaign_name: string;
  adset_name: string;
  status: string;
  spend: number;
  sales: number;
  revenue: number;
  roas: number;
  cpa: number;
  impressions?: number;
  reach?: number;
  frequency?: number;
  ctr?: number;
  cpc?: number;
  classification: "champion" | "validated" | "testing" | "failed";
  classification_label: string;
  classification_color: "emerald" | "blue" | "amber" | "rose";
  recommended_action: string;
  classification_desc?: string;
  hook_angle?: string;
  date?: string;
}

export interface CreativeBatch {
  id: string;
  name: string;
  date: string;
  status: "Em Teste" | "Finalizada";
  total_creatives: number;
  champion_count: number;
  validated_count: number;
  testing_count: number;
  failed_count: number;
  accuracy_rate: number;
  champion_rate: number;
  total_spend: number;
  total_revenue: number;
  profit: number;
  roas: number;
  cpa: number;
  creatives: BatchCreative[];
}

export interface BatchRuleSettings {
  champion_min_roas: number;
  champion_min_sales: number;
  validated_max_cpa: number;
  validated_min_roas: number;
  test_spend_threshold: number;
}

export interface CreativeBatchesSummary {
  total_batches: number;
  total_creatives: number;
  champion_count: number;
  validated_count: number;
  testing_count: number;
  failed_count: number;
  avg_accuracy_rate: number;
  champion_rate: number;
  total_spend: number;
  total_revenue: number;
  total_profit: number;
  overall_roas: number;
  best_batch_name: string;
  best_batch_accuracy: number;
}

export interface ReferenceInsight {
  title: string;
  summary: string;
  action: string;
  source: string;
}

export interface CreativeBatchesResponse {
  rules: BatchRuleSettings;
  summary: CreativeBatchesSummary;
  batches: CreativeBatch[];
  reference_insights: ReferenceInsight[];
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

export async function getCreativeBatches(
  rules?: Partial<BatchRuleSettings>,
  dateStart?: string,
  dateEnd?: string,
  accountId?: number
): Promise<CreativeBatchesResponse> {
  const params = new URLSearchParams();
  if (rules?.champion_min_roas !== undefined) {
    params.append("champion_min_roas", String(rules.champion_min_roas));
  }
  if (rules?.champion_min_sales !== undefined) {
    params.append("champion_min_sales", String(rules.champion_min_sales));
  }
  if (rules?.validated_max_cpa !== undefined) {
    params.append("validated_max_cpa", String(rules.validated_max_cpa));
  }
  if (rules?.validated_min_roas !== undefined) {
    params.append("validated_min_roas", String(rules.validated_min_roas));
  }
  if (rules?.test_spend_threshold !== undefined) {
    params.append("test_spend_threshold", String(rules.test_spend_threshold));
  }
  if (dateStart) params.append("date_start", dateStart);
  if (dateEnd) params.append("date_end", dateEnd);
  if (accountId) params.append("account_id", String(accountId));

  const query = params.toString();
  const endpoint = query ? `/creative-fatigue/batches?${query}` : "/creative-fatigue/batches";
  return await apiRequest<CreativeBatchesResponse>(endpoint);
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
