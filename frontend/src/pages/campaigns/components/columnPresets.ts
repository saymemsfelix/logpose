export interface ColumnPreset {
  id: string;
  name: string;
  columns: string[];
}

export const defaultPresets: ColumnPreset[] = [
  {
    id: "vendas",
    name: "Vendas",
    columns: [
      "name", "spend", "sales", "revenue", "profit", "roas", "cpa", "cpm", "hookRate", "bodyRate", "cpc", "ctr", "lpv", "ic",
    ],
  },
  {
    id: "criativos",
    name: "Criativos",
    columns: [
      "name", "spend", "impressions", "cpm", "clicks", "hookRate", "bodyRate", "connectRate", "sales", "roas",
    ],
  },
  {
    id: "gargalos",
    name: "Gargalos",
    columns: [
      "name", "clicks", "lpv", "cpv", "connectRate",
      "ic", "costPerIc", "checkoutConversion", "sales", "checkoutToSaleRate",
    ],
  },
];

export const allColumns: Record<string, string> = {
  name: "Campanha",
  spend: "Gastos",
  sales: "Vendas",
  revenue: "Faturamento",
  profit: "Lucro",
  roas: "ROAS",
  cpa: "CPA",
  cpm: "CPM",
  cpc: "CPC",
  ctr: "CTR",
  clicks: "Cliques",
  impressions: "Impressões",
  lpv: "LPV",
  cpv: "CPV",
  ic: "IC",
  costPerIc: "Custo por IC",
  connectRate: "Connect Rate",
  hookRate: "Hook Rate (3s)",
  bodyRate: "Body Rate (50%)",
  videoViews: "Views de Vídeo",
  playsVsl: "Plays VSL",
  playRate: "Play Rate",
  checkoutConversion: "Conv. Checkout",
  checkoutToSaleRate: "Conv. Venda",
  budget: "Orçamento",
};
