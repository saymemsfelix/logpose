import { apiRequest } from "./api";

export interface SimulatorMetrics {
  average_ticket: number;
  total_sales_30d: number;
  total_revenue_30d: number;
  total_spend_30d: number;
  average_cpa: number;
  average_roas: number;
  refund_rate: number;
}

export interface SimulatorPayload {
  product_price: number;
  gateway_fee_percent: number;
  gateway_fee_fixed: number;
  tax_percent: number;
  extra_costs_per_sale: number;
  refund_rate_percent: number;
  estimated_cpa?: number;
  daily_budget: number;
}

export interface ScaleScenario {
  name: string;
  daily_spend: number;
  sales_per_day: number;
  monthly_sales: number;
  gross_revenue_month: number;
  daily_profit: number;
  monthly_profit: number;
  projected_roas: number;
  net_margin_percent: number;
}

export interface SimulatorResult {
  status: string;
  breakeven: {
    net_revenue_per_sale: number;
    breakeven_cpa: number;
    breakeven_roas: number;
    contribution_margin_percent: number;
    deductions_per_sale: {
      gateway: number;
      tax: number;
      refund_provision: number;
      extra: number;
    };
  };
  target_projection: {
    daily_spend: number;
    target_cpa: number;
    sales_per_day: number;
    gross_revenue_daily: number;
    net_profit_daily: number;
    net_profit_monthly: number;
    projected_roas: number;
    net_margin_percent: number;
  };
  scenarios: ScaleScenario[];
}

export async function getSimulatorMetrics(): Promise<SimulatorMetrics> {
  return await apiRequest<SimulatorMetrics>("/simulator/metrics");
}

export async function calculateSimulator(payload: SimulatorPayload): Promise<SimulatorResult> {
  return await apiRequest<SimulatorResult>("/simulator/calculate", {
    method: "POST",
    body: payload,
  });
}
