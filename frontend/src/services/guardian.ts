import { apiRequest } from "./api";

export interface GuardianRuleData {
  id: number;
  name: string;
  description?: string | null;
  entity_type: "adset" | "campaign";
  condition_type: "spend_without_sales" | "cpa_above" | "roas_above" | "ctr_below" | "frequency_above";
  threshold_value: number;
  secondary_threshold: number;
  action: "pause" | "notify" | "increase_budget" | "decrease_budget";
  action_value: number;
  is_active: boolean;
  last_run_at?: string | null;
  created_at?: string | null;
}

export interface GuardianLogData {
  id: number;
  rule_id?: number | null;
  rule_name: string;
  entity_id: string;
  entity_type: string;
  entity_name: string;
  action_taken: "paused" | "notified" | "budget_increased" | "budget_decreased" | "pause_failed";
  message: string;
  metrics_snapshot?: {
    spend?: number;
    sales?: number;
    cpa?: number;
    roas?: number;
    ctr?: number;
    impressions?: number;
    status?: string;
  } | null;
  created_at?: string | null;
}

export interface EvaluateResult {
  status: string;
  dry_run: boolean;
  evaluated_entities: number;
  actions_taken: number;
  message: string;
  executed_logs: Array<{
    rule_name: string;
    entity_name: string;
    action: string;
    message: string;
  }>;
}

export async function getGuardianRules(): Promise<GuardianRuleData[]> {
  const res = await apiRequest<{ rules: GuardianRuleData[] }>("/guardian/rules");
  return res.rules;
}

export async function createGuardianRule(rule: Partial<GuardianRuleData>): Promise<void> {
  await apiRequest("/guardian/rules", { method: "POST", body: rule });
}

export async function updateGuardianRule(ruleId: number, data: Partial<GuardianRuleData>): Promise<void> {
  await apiRequest(`/guardian/rules/${ruleId}`, { method: "PUT", body: data });
}

export async function deleteGuardianRule(ruleId: number): Promise<void> {
  await apiRequest(`/guardian/rules/${ruleId}`, { method: "DELETE" });
}

export async function getGuardianLogs(limit: number = 50): Promise<GuardianLogData[]> {
  const res = await apiRequest<{ logs: GuardianLogData[] }>(`/guardian/logs?limit=${limit}`);
  return res.logs;
}

export async function clearGuardianLogs(): Promise<void> {
  await apiRequest("/guardian/logs", { method: "DELETE" });
}

export async function evaluateGuardian(dryRun: boolean = false): Promise<EvaluateResult> {
  const res = await apiRequest<EvaluateResult>(`/guardian/evaluate?dry_run=${dryRun}`, { method: "POST" });
  return res;
}
