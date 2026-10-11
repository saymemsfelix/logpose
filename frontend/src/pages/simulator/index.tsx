import { useState, useEffect } from "react";
import {
  RiCalculatorLine,
  RiMoneyDollarCircleLine,
  RiSparklingLine,
  RiArrowRightUpLine,
} from "@remixicon/react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getSimulatorMetrics,
  calculateSimulator,
  type SimulatorResult,
  type SimulatorPayload,
} from "@/services/simulator";

const GATEWAY_PRESETS = [
  { name: "Kiwify", percent: 8.99, fixed: 2.49 },
  { name: "Hotmart", percent: 9.90, fixed: 1.00 },
  { name: "PerfectPay", percent: 7.99, fixed: 1.50 },
  { name: "Braip", percent: 9.90, fixed: 1.00 },
  { name: "Kirvano", percent: 7.90, fixed: 2.00 },
  { name: "Greenn", percent: 6.90, fixed: 2.00 },
];

export default function SimulatorPage() {
  const [productPrice, setProductPrice] = useState<number>(197);
  const [gatewayPercent, setGatewayPercent] = useState<number>(8.99);
  const [gatewayFixed, setGatewayFixed] = useState<number>(2.49);
  const [taxPercent, setTaxPercent] = useState<number>(6.0);
  const [extraCosts, setExtraCosts] = useState<number>(0.0);
  const [refundPercent, setRefundPercent] = useState<number>(2.5);
  const [dailyBudget, setDailyBudget] = useState<number>(500);
  const [estimatedCpa, setEstimatedCpa] = useState<number | undefined>(undefined);

  const [result, setResult] = useState<SimulatorResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingRealMetrics, setLoadingRealMetrics] = useState(false);

  const runCalculation = async () => {
    try {
      setIsLoading(true);
      const payload: SimulatorPayload = {
        product_price: Number(productPrice),
        gateway_fee_percent: Number(gatewayPercent),
        gateway_fee_fixed: Number(gatewayFixed),
        tax_percent: Number(taxPercent),
        extra_costs_per_sale: Number(extraCosts),
        refund_rate_percent: Number(refundPercent),
        estimated_cpa: estimatedCpa ? Number(estimatedCpa) : undefined,
        daily_budget: Number(dailyBudget),
      };
      const res = await calculateSimulator(payload);
      setResult(res);
    } catch {
      toast.error("Erro ao calcular simulação financeira");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    runCalculation();
  }, [productPrice, gatewayPercent, gatewayFixed, taxPercent, extraCosts, refundPercent, dailyBudget, estimatedCpa]);

  const loadRealMetrics = async () => {
    try {
      setLoadingRealMetrics(true);
      const m = await getSimulatorMetrics();
      if (m.average_ticket > 0) setProductPrice(m.average_ticket);
      if (m.average_cpa > 0) setEstimatedCpa(m.average_cpa);
      if (m.refund_rate > 0) setRefundPercent(m.refund_rate);
      toast.success("Métricas reais dos últimos 30 dias carregadas com sucesso!");
    } catch {
      toast.error("Erro ao puxar métricas reais da conta");
    } finally {
      setLoadingRealMetrics(false);
    }
  };

  const handleApplyPreset = (preset: typeof GATEWAY_PRESETS[0]) => {
    setGatewayPercent(preset.percent);
    setGatewayFixed(preset.fixed);
    toast.info(`Taxas da ${preset.name} aplicadas (${preset.percent}% + R$ ${preset.fixed.toFixed(2)})`);
  };

  return (
    <div className="flex flex-col gap-6 p-6 min-h-screen bg-background">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <RiCalculatorLine className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              Simulador de Breakeven & Escala Preditiva
              <Badge variant="outline" className="bg-cyan-500/10 text-cyan-400 border-cyan-500/30 text-xs">
                {isLoading ? "Recalculando..." : "Engenharia de Lucro"}
              </Badge>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Calcule seu CPA limite de equilíbrio e projete o Lucro Líquido Real ao escalar seus lances e orçamentos.
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadRealMetrics}
          disabled={loadingRealMetrics}
          className="text-xs border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
        >
          <RiSparklingLine className={`w-4 h-4 mr-1.5 ${loadingRealMetrics ? "animate-spin" : ""}`} />
          Carregar Dados Reais da Conta
        </Button>
      </div>

      {/* Grid: Inputs & Breakeven Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* COLUNA ESQUERDA: PARÂMETROS FINANCEIROS */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="bg-card/90 border-border/60 shadow-sm">
            <CardHeader className="p-5 pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <RiMoneyDollarCircleLine className="w-5 h-5 text-emerald-400" />
                Custos e Precificação
              </CardTitle>
              <CardDescription className="text-xs">
                Configure os custos do produto para descobrir seu teto de lance exato.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-5 pt-0 space-y-4">
              <div>
                <Label className="text-xs font-semibold">Preço do Produto / Ticket (R$)</Label>
                <Input
                  type="number"
                  step="any"
                  value={productPrice}
                  onChange={(e) => setProductPrice(parseFloat(e.target.value) || 0)}
                  className="mt-1 font-mono text-base font-bold text-foreground"
                />
              </div>

              {/* Gateway Presets */}
              <div>
                <Label className="text-xs font-semibold block mb-1.5">Plataforma / Checkout</Label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {GATEWAY_PRESETS.map((p) => (
                    <Button
                      key={p.name}
                      variant="outline"
                      size="sm"
                      onClick={() => handleApplyPreset(p)}
                      className={`text-[11px] h-6 px-2 ${
                        gatewayPercent === p.percent ? "bg-primary text-primary-foreground border-primary" : ""
                      }`}
                    >
                      {p.name}
                    </Button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Taxa Gateway (%)</Label>
                    <Input
                      type="number"
                      step="any"
                      value={gatewayPercent}
                      onChange={(e) => setGatewayPercent(parseFloat(e.target.value) || 0)}
                      className="mt-0.5 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Taxa Fixa (R$)</Label>
                    <Input
                      type="number"
                      step="any"
                      value={gatewayFixed}
                      onChange={(e) => setGatewayFixed(parseFloat(e.target.value) || 0)}
                      className="mt-0.5 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Impostos e Reembolsos */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold">Imposto (%)</Label>
                  <Input
                    type="number"
                    step="any"
                    value={taxPercent}
                    onChange={(e) => setTaxPercent(parseFloat(e.target.value) || 0)}
                    className="mt-1 text-xs font-mono"
                    placeholder="Ex: 6% (Simples)"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Reembolso (%)</Label>
                  <Input
                    type="number"
                    step="any"
                    value={refundPercent}
                    onChange={(e) => setRefundPercent(parseFloat(e.target.value) || 0)}
                    className="mt-1 text-xs font-mono"
                    placeholder="Ex: 2.5%"
                  />
                </div>
              </div>

              {/* Custos Operacionais */}
              <div>
                <Label className="text-xs font-semibold">Custos Operacionais Extras por Venda (R$)</Label>
                <Input
                  type="number"
                  step="any"
                  value={extraCosts}
                  onChange={(e) => setExtraCosts(parseFloat(e.target.value) || 0)}
                  className="mt-1 text-xs font-mono"
                  placeholder="Ex: R$ 0,00"
                />
              </div>

              <div className="pt-2 border-t border-border/40">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-semibold">Orçamento Diário (R$)</Label>
                    <Input
                      type="number"
                      step="any"
                      value={dailyBudget}
                      onChange={(e) => setDailyBudget(parseFloat(e.target.value) || 0)}
                      className="mt-1 text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">CPA Alvo Estimado (R$)</Label>
                    <Input
                      type="number"
                      step="any"
                      value={estimatedCpa !== undefined ? estimatedCpa : ""}
                      onChange={(e) =>
                        setEstimatedCpa(e.target.value ? parseFloat(e.target.value) : undefined)
                      }
                      placeholder={result ? `Sugerido: R$ ${result.target_projection.target_cpa.toFixed(2)}` : ""}
                      className="mt-1 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* COLUNA DIREITA: BREAKEVEN & PROJEÇÕES DE LUCRO */}
        <div className="lg:col-span-7 space-y-4">
          {result && (
            <>
              {/* Highlight Cards de Breakeven */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Card className="bg-gradient-to-br from-rose-950/30 to-card border-rose-500/30">
                  <CardHeader className="p-4 pb-1">
                    <CardDescription className="text-xs text-rose-300 font-semibold">
                      🎯 CPA Máximo (Breakeven)
                    </CardDescription>
                    <CardTitle className="text-2xl font-black text-rose-400 font-mono">
                      R$ {result.breakeven.breakeven_cpa.toFixed(2)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-1 text-[11px] text-muted-foreground">
                    Seu teto absoluto de lance antes de tomar prejuízo
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-cyan-950/30 to-card border-cyan-500/30">
                  <CardHeader className="p-4 pb-1">
                    <CardDescription className="text-xs text-cyan-300 font-semibold">
                      ⚡ ROAS de Equilíbrio
                    </CardDescription>
                    <CardTitle className="text-2xl font-black text-cyan-400 font-mono">
                      {result.breakeven.breakeven_roas.toFixed(2)}x
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-1 text-[11px] text-muted-foreground">
                    ROAS mínimo para empatar o investimento
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-emerald-950/30 to-card border-emerald-500/30">
                  <CardHeader className="p-4 pb-1">
                    <CardDescription className="text-xs text-emerald-300 font-semibold">
                      💵 Receita Líquida / Venda
                    </CardDescription>
                    <CardTitle className="text-2xl font-black text-emerald-400 font-mono">
                      R$ {result.breakeven.net_revenue_per_sale.toFixed(2)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-1 text-[11px] text-muted-foreground">
                    Margem líquida de {result.breakeven.contribution_margin_percent.toFixed(1)}% após taxas
                  </CardContent>
                </Card>
              </div>

              {/* Card de Projeção no Orçamento Atual */}
              <Card className="bg-gradient-to-r from-emerald-950/20 via-card to-cyan-950/20 border-emerald-500/40 shadow-lg">
                <CardHeader className="p-5 pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                      <RiSparklingLine className="w-5 h-5 text-emerald-400" />
                      Projeção com Orçamento de R$ {result.target_projection.daily_spend.toFixed(2)} / dia
                    </CardTitle>
                    <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                      CPA R$ {result.target_projection.target_cpa.toFixed(2)}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="p-5 pt-0">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 border-y border-border/40 text-center">
                    <div>
                      <span className="text-[11px] text-muted-foreground block">Vendas / Dia</span>
                      <span className="text-lg font-bold font-mono text-foreground">
                        {result.target_projection.sales_per_day.toFixed(1)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] text-muted-foreground block">Lucro Diário</span>
                      <span className="text-lg font-bold font-mono text-emerald-400">
                        R$ {result.target_projection.net_profit_daily.toFixed(2)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] text-muted-foreground block">Lucro Mensal Líquido</span>
                      <span className="text-xl font-black font-mono text-emerald-400">
                        R$ {result.target_projection.net_profit_monthly.toFixed(2)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] text-muted-foreground block">Margem Líquida</span>
                      <span className="text-lg font-bold font-mono text-cyan-400">
                        {result.target_projection.net_margin_percent.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Deduções detalhadas */}
              <Card className="bg-card/70 border-border/40 text-xs">
                <CardContent className="p-4 flex flex-wrap items-center justify-between gap-2 text-muted-foreground">
                  <span>Deduções estimadas por venda:</span>
                  <span>Gateway: R$ {result.breakeven.deductions_per_sale.gateway.toFixed(2)}</span>
                  <span>Imposto: R$ {result.breakeven.deductions_per_sale.tax.toFixed(2)}</span>
                  <span>Provisão Reembolso: R$ {result.breakeven.deductions_per_sale.refund_provision.toFixed(2)}</span>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* SEÇÃO INFERIOR: MATRIZ DE CENÁRIOS DE ESCALA PREDITIVA */}
      {result && (
        <Card className="bg-card/90 border-border/60">
          <CardHeader className="p-5 border-b border-border/40">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <RiArrowRightUpLine className="w-5 h-5 text-emerald-400" />
              Matriz de Escala Preditiva (5 Cenários de Investimento)
            </CardTitle>
            <CardDescription className="text-xs">
              Veja exatamente quanto você vai lucrar no mês em cada faixa de escala diária com este produto.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border/40">
                  <tr>
                    <th className="py-3 px-4">Cenário de Escala</th>
                    <th className="py-3 px-4 text-center">Investimento Diário</th>
                    <th className="py-3 px-4 text-center">Vendas Diárias</th>
                    <th className="py-3 px-4 text-center">Vendas no Mês</th>
                    <th className="py-3 px-4 text-center">Faturamento Mensal</th>
                    <th className="py-3 px-4 text-center">Lucro Líquido / Mês</th>
                    <th className="py-3 px-4 text-center">ROAS Projetado</th>
                    <th className="py-3 px-4 text-center">Margem %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {result.scenarios.map((sc, idx) => (
                    <tr
                      key={sc.name}
                      className={`hover:bg-muted/30 transition-colors ${
                        idx === 2 ? "bg-emerald-500/5 font-semibold" : ""
                      }`}
                    >
                      <td className="py-3 px-4">
                        <span className="font-bold text-foreground">{sc.name}</span>
                        {idx === 2 && (
                          <Badge className="ml-2 bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]">
                            Recomendado
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-semibold text-foreground">
                        R$ {sc.daily_spend.toFixed(2)}/dia
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-foreground">
                        {sc.sales_per_day} vendas
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-foreground">
                        {sc.monthly_sales} vendas
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-muted-foreground">
                        R$ {sc.gross_revenue_month.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-emerald-400 text-sm">
                        R$ {sc.monthly_profit.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-cyan-400">
                        {sc.projected_roas.toFixed(2)}x
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-foreground">
                        {sc.net_margin_percent.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
