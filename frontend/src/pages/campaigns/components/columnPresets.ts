export interface ColumnPreset {
  id: string;
  name: string;
  columns: string[];
}

export const defaultPresets: ColumnPreset[] = [
  {
    id: "vendas",
    name: "Vendas (Padrão UTMify)",
    columns: [
      "name", "spend", "revenue", "profit", "roas", "sales", "lpv", "ic", "connectRate", "checkoutRate", "cpc", "cpm", "ctr", "cpa",
    ],
  },
  {
    id: "gargalos",
    name: "Funil & Gargalos",
    columns: [
      "name", "clicks", "lpv", "cpv", "connectRate",
      "ic", "costPerIc", "checkoutConversion", "sales", "checkoutToSaleRate",
    ],
  },
  {
    id: "criativos",
    name: "Criativos",
    columns: [
      "name", "spend", "impressions", "cpm", "clicks", "hookRate", "bodyRate", "connectRate", "sales", "roas",
    ],
  },
];

export const allColumns: Record<string, string> = {
  name: "Campanha",
  spend: "Gastos",
  revenue: "Faturamento",
  profit: "Lucro",
  roas: "ROAS",
  sales: "Vendas",
  lpv: "PageView (LPV)",
  ic: "Initiate Checkout (IC)",
  connectRate: "Taxa de Conexão",
  checkoutRate: "Taxa de Checkout",
  cpa: "CPA",
  cpm: "CPM",
  cpc: "CPC",
  ctr: "CTR",
  clicks: "Cliques",
  impressions: "Impressões",
  cpv: "CPV",
  costPerIc: "Custo por IC",
  hookRate: "Hook Rate (3s)",
  bodyRate: "Body Rate (50%)",
  videoViews: "Views de Vídeo",
  playsVsl: "Plays VSL",
  playRate: "Play Rate",
  checkoutConversion: "Conv. Checkout",
  checkoutToSaleRate: "Conv. Venda",
  budget: "Orçamento",
};
