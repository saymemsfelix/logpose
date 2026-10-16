import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart";
import { RiMoneyDollarBoxLine, RiBarChartLine, RiLineChartLine } from "@remixicon/react";
import type { DailyRevenue } from "@/types/dashboard";

const chartConfig = {
  revenue: { label: "Faturamento", color: "var(--chart-1)" },
  spend: { label: "Investido", color: "var(--chart-4)" },
  profit: { label: "Lucro", color: "var(--chart-2)" },
} satisfies ChartConfig;

const metricIcons = {
  revenue: RiMoneyDollarBoxLine,
  spend: RiBarChartLine,
  profit: RiLineChartLine,
};

const metricColors = {
  revenue: "var(--chart-1)",
  spend: "var(--chart-4)",
  profit: "var(--chart-2)",
};

function parseDateSafe(dStr: string): Date {
  if (!dStr) return new Date();
  const parts = String(dStr).split("-");
  if (parts.length === 3) {
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12, 0, 0);
  }
  return new Date(dStr);
}

function CustomTooltip({ active, payload, label, hideValues, taxEnabled, taxRate }: any) {
  if (!active || !payload?.length) return null;
  const dateObj = parseDateSafe(label);
  const dateStr = dateObj.toLocaleDateString("pt-BR", {
    month: "long", day: "numeric",
  });

  return (
    <div className="rounded-xl border border-border/60 bg-card/95 backdrop-blur-md p-3 shadow-xl min-w-[210px]">
      <div className="flex items-center justify-between mb-2.5">
        <p className="text-xs font-semibold text-muted-foreground capitalize">{dateStr}</p>
        {taxEnabled && taxRate > 0 && (
          <span className="text-[10px] text-amber-500 font-medium">-{taxRate}% imposto</span>
        )}
      </div>
      <div className="space-y-2">
        {payload.map((entry: any) => {
          const key = entry.dataKey as keyof typeof metricIcons;
          const Icon = metricIcons[key];
          const color = metricColors[key];
          const val = Number(entry.value || 0);
          return (
            <div key={key} className="flex items-center gap-2.5">
              <div
                className="flex size-7 items-center justify-center rounded-full"
                style={{ backgroundColor: `color-mix(in oklch, ${color}, transparent 85%)` }}
              >
                <Icon className="size-3.5" style={{ color }} />
              </div>
              <div className="flex flex-1 items-center justify-between gap-4">
                <span className="text-xs text-muted-foreground">{chartConfig[key]?.label}</span>
                <span className="text-sm font-semibold tabular-nums">
                  {hideValues
                    ? "••••••"
                    : val < 0
                      ? `-R$ ${Math.abs(val).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : `R$ ${val.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface RevenueChartProps {
  data: DailyRevenue[];
  taxEnabled?: boolean;
  taxRate?: number;
  hideValues?: boolean;
}

export function RevenueChart({ data, taxEnabled = false, taxRate = 0, hideValues = false }: RevenueChartProps) {
  const chartData = useMemo(() => {
    if (!taxEnabled || taxRate <= 0) return data;
    return data.map((d) => {
      const tax = d.revenue * (taxRate / 100);
      const adjRev = Math.max(0, d.revenue - tax);
      const adjProfit = adjRev - d.spend;
      return {
        ...d,
        revenue: Math.round(adjRev * 100) / 100,
        profit: Math.round(adjProfit * 100) / 100,
      };
    });
  }, [data, taxEnabled, taxRate]);

  if (chartData.length === 0) {
    return (
      <Card className="border-border/40">
        <CardContent className="flex items-center justify-center h-[340px] text-muted-foreground text-sm">
          Sem dados no período selecionado
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/40">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Performance Diária</CardTitle>
          {taxEnabled && taxRate > 0 && (
            <span className="text-[11px] font-medium text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
              Líquido (-{taxRate}% imposto)
            </span>
          )}
        </div>
        <CardDescription>
          {taxEnabled && taxRate > 0
            ? `Faturamento líquido (-${taxRate}% s/ fat.), investimento e lucro por dia`
            : "Faturamento, investimento e lucro no período"}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer config={chartConfig} className="aspect-auto h-[280px] w-full">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="fillSpend" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-spend)" stopOpacity={0.6} />
                <stop offset="95%" stopColor="var(--color-spend)" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="fillProfit" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-profit)" stopOpacity={0.7} />
                <stop offset="95%" stopColor="var(--color-profit)" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={32}
              tickFormatter={(value) => parseDateSafe(value).toLocaleDateString("pt-BR", { month: "short", day: "numeric" })}
            />
            <YAxis
              tickLine={false} axisLine={false} tickMargin={8}
              tickFormatter={(value) => {
                if (hideValues) return "••••";
                if (Math.abs(value) >= 1000) return `R$${(value / 1000).toFixed(0)}k`;
                return `R$${value}`;
              }}
            />
            <ChartTooltip
              content={
                <CustomTooltip
                  hideValues={hideValues}
                  taxEnabled={taxEnabled}
                  taxRate={taxRate}
                />
              }
              cursor={false}
            />
            <Area dataKey="revenue" type="monotone" fill="url(#fillRevenue)" stroke="var(--color-revenue)" strokeWidth={2} />
            <Area dataKey="profit" type="monotone" fill="url(#fillProfit)" stroke="var(--color-profit)" strokeWidth={2} />
            <Area dataKey="spend" type="monotone" fill="url(#fillSpend)" stroke="var(--color-spend)" strokeWidth={2} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
