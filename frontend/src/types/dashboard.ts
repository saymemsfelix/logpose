// ── Dashboard API types ──────────────────────────────────

export interface DashboardKpis {
  total_revenue: number;
  total_spend: number;
  profit: number;
  total_sales: number;
  total_orders?: number;
  approval_rate?: number;
  average_ticket: number;
  cpa: number;
  roas: number;
  roi?: number;
  arpu?: number;
  profit_margin: number;
  conversion_rate: number;
  total_clicks: number;
  chargeback_amount: number;
  chargeback_rate: number;
  refunded_count: number;
  refunded_amount?: number;
  pending_count?: number;
  pending_amount?: number;
  chargeback_count: number;
}

export interface DailyRevenue {
  date: string;
  revenue: number;
  spend: number;
  profit: number;
  sales: number;
}

export interface PlatformDist {
  name: string;
  value: number;
  sales: number;
  fill: string;
}

export interface TopCampaign {
  name: string;
  spend: number;
  revenue: number;
  sales: number;
  profit: number;
  roas: number;
  cpa: number;
}

export interface HourlySale {
  hour: string;
  sales: number;
  revenue: number;
}

export interface HourlyProfit {
  hour: string;
  revenue: number;
  spend: number;
  profit: number;
  sales: number;
}

export interface CountryData {
  code: string;
  name: string;
  sales: number;
  revenue: number;
  percentage?: number;
}

export interface UtmOrigin {
  name: string;
  source: string;
  sales: number;
  revenue: number;
}

export interface TopProduct {
  name: string;
  sales: number;
  revenue: number;
}

export interface PaymentMethod {
  method: string;
  sales: number;
  revenue: number;
  percentage: number;
}

export interface ConversionFlow {
  clicks: number;
  pageviews: number;
  initiate_checkouts: number;
  initiated_sales: number;
  approved_sales: number;
  rates: {
    clicks_to_pageviews: number;
    pageviews_to_ics: number;
    ics_to_initiated: number;
    initiated_to_approved: number;
  };
}

export interface DashboardOverview {
  kpis: DashboardKpis;
  daily_revenue: DailyRevenue[];
  platform_distribution: PlatformDist[];
  top_campaigns: TopCampaign[];
  hourly_sales: HourlySale[];
  hourly_profit?: HourlyProfit[];
  countries?: CountryData[];
  utm_origins?: UtmOrigin[];
  top_products?: TopProduct[];
  payment_methods?: PaymentMethod[];
  conversion_flow?: ConversionFlow;
  meta_error?: string | null;
}
