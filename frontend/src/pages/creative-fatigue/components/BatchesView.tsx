import { useState, useMemo } from "react";
import {
  RiTrophyLine,
  RiCheckDoubleLine,
  RiTimeLine,
  RiCloseCircleLine,
  RiSettings3Line,
  RiRefreshLine,
  RiPlayCircleLine,
  RiPauseCircleLine,
  RiArrowRightSLine,
  RiSparklingFill,
  RiBarChartGroupedLine,
  RiSearchLine,
  RiArrowLeftLine,
} from "@remixicon/react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  type CreativeBatch,
  type BatchCreative,
  type BatchRuleSettings,
  type CreativeBatchesSummary,
  toggleFatigueAdStatus,
} from "@/services/creativeFatigue";

interface BatchesViewProps {
  batches: CreativeBatch[];
  summary: CreativeBatchesSummary;
  rules: BatchRuleSettings;
  isLoading: boolean;
  onUpdateRules: (newRules: Partial<BatchRuleSettings>) => void;
  onRefresh: () => void;
}

export function BatchesView({
  batches,
  summary,
  rules,
  isLoading,
  onUpdateRules,
  onRefresh,
}: BatchesViewProps) {
  // Estado local para os controles da régua
  const [localRules, setLocalRules] = useState<BatchRuleSettings>(rules);
  const [metricMode, setMetricMode] = useState<"accuracy" | "champion">("accuracy");
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(batches[0]?.id || null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Sincroniza localRules quando rules prop mudar
  useMemo(() => {
    setLocalRules(rules);
  }, [rules]);

  const handleApplyRules = () => {
    onUpdateRules(localRules);
    toast.success("Régua de validação atualizada! Métricas recalculadas.");
  };

  const selectedBatch = useMemo(() => {
    return batches.find((b) => b.id === selectedBatchId) || batches[0];
  }, [batches, selectedBatchId]);

  const filteredCreatives = useMemo(() => {
    if (!selectedBatch?.creatives) return [];
    return selectedBatch.creatives.filter((c) => {
      const matchSearch =
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.campaign_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.hook_angle && c.hook_angle.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchStatus = statusFilter === "all" || c.classification === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [selectedBatch, searchTerm, statusFilter]);

  const handleToggleAd = async (creative: BatchCreative) => {
    const newStatus = creative.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
    try {
      setActionInProgress(creative.id);
      await toggleFatigueAdStatus(creative.id, newStatus);
      toast.success(
        newStatus === "PAUSED"
          ? `Criativo "${creative.name}" pausado no Meta Ads!`
          : `Criativo "${creative.name}" ativado com sucesso!`
      );
      creative.status = newStatus;
    } catch {
      toast.error("Erro ao alterar status do anúncio no Meta Ads");
    } finally {
      setActionInProgress(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* ─── PAINEL DE CONTROLE DA RÉGUA DE VALIDAÇÃO ─── */}
      <Card className="border-border/50 bg-card/60 backdrop-blur-xs overflow-hidden">
        <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <RiSettings3Line className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-foreground">
                  Régua de Validação & Corte da Operação
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Ajuste os parâmetros da esteira. O gráfico e a assertividade de todas as levas recalculam na hora.
                </CardDescription>
              </div>
            </div>

            <Button
              size="sm"
              onClick={handleApplyRules}
              disabled={isLoading}
              className="bg-primary text-primary-foreground font-semibold text-xs h-8 px-3 rounded-lg shadow-sm"
            >
              <RiRefreshLine className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
              Aplicar & Recalcular
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
              <span>🏆 ROAS Campeão (Mín.)</span>
            </label>
            <div className="relative">
              <Input
                type="number"
                step="0.1"
                min="1.0"
                value={localRules.champion_min_roas}
                onChange={(e) =>
                  setLocalRules({ ...localRules, champion_min_roas: parseFloat(e.target.value) || 2.0 })
                }
                className="h-8 text-xs font-mono font-bold bg-background/60"
              />
              <span className="absolute right-2.5 top-2 text-[10px] text-muted-foreground font-mono">x</span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
              <span>🏆 Mínimo de Vendas</span>
            </label>
            <Input
              type="number"
              min="1"
              value={localRules.champion_min_sales}
              onChange={(e) =>
                setLocalRules({ ...localRules, champion_min_sales: parseInt(e.target.value) || 3 })
              }
              className="h-8 text-xs font-mono font-bold bg-background/60"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
              <span>🟢 CPA Validado (Máx.)</span>
            </label>
            <div className="relative">
              <Input
                type="number"
                step="1.0"
                min="5.0"
                value={localRules.validated_max_cpa}
                onChange={(e) =>
                  setLocalRules({ ...localRules, validated_max_cpa: parseFloat(e.target.value) || 45.0 })
                }
                className="h-8 text-xs font-mono font-bold bg-background/60 pl-7"
              />
              <span className="absolute left-2 top-2 text-[10px] text-muted-foreground font-mono">R$</span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
              <span>🟢 ROAS Validado (Mín.)</span>
            </label>
            <div className="relative">
              <Input
                type="number"
                step="0.1"
                min="0.5"
                value={localRules.validated_min_roas}
                onChange={(e) =>
                  setLocalRules({ ...localRules, validated_min_roas: parseFloat(e.target.value) || 1.2 })
                }
                className="h-8 text-xs font-mono font-bold bg-background/60"
              />
              <span className="absolute right-2.5 top-2 text-[10px] text-muted-foreground font-mono">x</span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
            <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
              <span>🟡 Limite Gasto Teste</span>
            </label>
            <div className="relative">
              <Input
                type="number"
                step="5.0"
                min="20.0"
                value={localRules.test_spend_threshold}
                onChange={(e) =>
                  setLocalRules({ ...localRules, test_spend_threshold: parseFloat(e.target.value) || 80.0 })
                }
                className="h-8 text-xs font-mono font-bold bg-background/60 pl-7"
              />
              <span className="absolute left-2 top-2 text-[10px] text-muted-foreground font-mono">R$</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── CARDS DE KPIS GERAIS DA ESTEIRA DE TESTES ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <Card className="border-border/40 bg-card/60 p-4">
          <div className="flex items-center justify-between text-muted-foreground mb-1.5">
            <span className="text-xs font-medium">Assertividade Geral</span>
            <RiBarChartGroupedLine className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black font-mono text-emerald-400">
            {summary.avg_accuracy_rate.toFixed(1)}%
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            {summary.champion_count + summary.validated_count} de {summary.total_creatives} aprovados
          </p>
        </Card>

        <Card className="border-border/40 bg-card/60 p-4">
          <div className="flex items-center justify-between text-muted-foreground mb-1.5">
            <span className="text-xs font-medium">Criativos Campeões</span>
            <RiTrophyLine className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black font-mono text-amber-400">
            {summary.champion_count}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            {summary.champion_rate.toFixed(1)}% taxa de escala
          </p>
        </Card>

        <Card className="border-border/40 bg-card/60 p-4">
          <div className="flex items-center justify-between text-muted-foreground mb-1.5">
            <span className="text-xs font-medium">Validados (Breakeven+)</span>
            <RiCheckDoubleLine className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black font-mono text-blue-400">
            {summary.validated_count}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Operando dentro da margem
          </p>
        </Card>

        <Card className="border-border/40 bg-card/60 p-4">
          <div className="flex items-center justify-between text-muted-foreground mb-1.5">
            <span className="text-xs font-medium">Em Teste / Amostragem</span>
            <RiTimeLine className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black font-mono text-amber-400">
            {summary.testing_count}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            {summary.failed_count} reprovados no total
          </p>
        </Card>

        <Card className="border-border/40 bg-card/60 p-4 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-muted-foreground mb-1.5">
            <span className="text-xs font-medium">Lucro Líquido das Levas</span>
            <RiSparklingFill className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black font-mono text-foreground">
            R$ {summary.total_profit.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            ROAS consolidado {summary.overall_roas.toFixed(2)}x
          </p>
        </Card>
      </div>

      {/* ─── GRÁFICO: EVOLUÇÃO DA ASSERTIVIDADE POR LEVA ─── */}
      <Card className="border-border/50 bg-card/60 backdrop-blur-xs">
        <CardHeader className="pb-3 border-b border-border/40">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <span>Evolução da Assertividade por Leva</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Lote a Lote
                </span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Acompanhe o aprendizado da sua esteira criativa e a eficácia de cada novo lote de testes.
              </CardDescription>
            </div>

            {/* Alternador de Métrica */}
            <div className="flex items-center gap-1 p-1 bg-muted/40 border border-border/50 rounded-xl">
              <button
                type="button"
                onClick={() => setMetricMode("accuracy")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  metricMode === "accuracy"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Assertividade (% Validados)
              </button>
              <button
                type="button"
                onClick={() => setMetricMode("champion")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  metricMode === "champion"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Campeões (% Escala)
              </button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6 pb-4">
          {/* Gráfico de Colunas Verticais Estilo Asvi */}
          <div className="flex items-end justify-around gap-4 sm:gap-8 h-64 pt-6 px-2 sm:px-6 border-b border-border/40">
            {batches.slice().reverse().map((b) => {
              const value = metricMode === "accuracy" ? b.accuracy_rate : b.champion_rate;
              const isSelected = selectedBatch?.id === b.id;

              // Cor da coluna baseada no valor
              let barColor = "from-emerald-500 to-teal-400";
              let badgeBg = "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
              if (value < 40) {
                barColor = "from-rose-500 to-red-400";
                badgeBg = "bg-rose-500/15 text-rose-400 border-rose-500/30";
              } else if (value < 60) {
                barColor = "from-amber-500 to-yellow-400";
                badgeBg = "bg-amber-500/15 text-amber-400 border-amber-500/30";
              }

              return (
                <div
                  key={b.id}
                  onClick={() => setSelectedBatchId(b.id)}
                  className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer"
                >
                  {/* Porcentagem em cima da coluna */}
                  <div
                    className={`text-xs font-black font-mono px-2 py-0.5 rounded-md border mb-2 transition-transform group-hover:scale-110 ${badgeBg}`}
                  >
                    {value.toFixed(1)}%
                  </div>

                  {/* Barra da coluna com altura dinâmica */}
                  <div className="w-full max-w-[70px] bg-muted/40 rounded-t-xl overflow-hidden p-1 flex items-end">
                    <div
                      className={`w-full rounded-t-lg bg-gradient-to-t ${barColor} transition-all duration-500 group-hover:brightness-110 ${
                        isSelected ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
                      }`}
                      style={{ height: `${Math.max(12, value)}%` }}
                    />
                  </div>

                  {/* Rótulo inferior da Leva */}
                  <div className="mt-3 text-center">
                    <span
                      className={`text-xs font-bold block truncate max-w-[110px] ${
                        isSelected ? "text-primary" : "text-foreground group-hover:text-primary"
                      }`}
                    >
                      {b.name.split("-")[0].trim()}
                    </span>
                    <span className="text-[10px] text-muted-foreground block font-mono">
                      {b.total_creatives} criativos
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 px-2">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              Alta Assertividade (≥ 60%)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
              Média (40% - 59%)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
              Abaixo da Régua (&lt; 40%)
            </span>
          </div>
        </CardContent>
      </Card>

      {/* ─── TABELA CONSOLIDADA DAS LEVAS ─── */}
      <Card className="border-border/50 bg-card/60 backdrop-blur-xs overflow-hidden">
        <CardHeader className="pb-3 border-b border-border/40">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-foreground">
                Tabela Histórica de Levas
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Clique em qualquer leva para inspecionar os criativos específicos e pausar/escalar no Meta Ads.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              className="text-xs h-8 border-border/60"
            >
              <RiRefreshLine className="w-3.5 h-3.5 mr-1" />
              Atualizar
            </Button>
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 text-[11px] font-semibold text-muted-foreground uppercase border-b border-border/40 font-mono">
              <tr>
                <th className="py-3 px-4">Leva & Lote</th>
                <th className="py-3 px-4 text-center">Data</th>
                <th className="py-3 px-4 text-center">Criativos</th>
                <th className="py-3 px-4 text-center">🏆 Campeões</th>
                <th className="py-3 px-4 text-center">🟢 Validados</th>
                <th className="py-3 px-4 text-center">Assertividade</th>
                <th className="py-3 px-4 text-center">Investido</th>
                <th className="py-3 px-4 text-center">Lucro</th>
                <th className="py-3 px-4 text-center">ROAS</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {batches.map((batch) => {
                const isSelected = selectedBatch?.id === batch.id;
                return (
                  <tr
                    key={batch.id}
                    onClick={() => setSelectedBatchId(batch.id)}
                    className={`hover:bg-muted/30 transition-colors cursor-pointer ${
                      isSelected ? "bg-primary/5 border-l-2 border-primary" : ""
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div className="font-bold text-foreground flex items-center gap-1.5">
                        {batch.name}
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        CPA Médio: R$ {batch.cpa.toFixed(2)}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center text-xs text-muted-foreground font-mono">
                      {batch.date}
                    </td>

                    <td className="py-3 px-4 text-center font-mono font-bold text-foreground">
                      {batch.total_creatives}
                    </td>

                    <td className="py-3 px-4 text-center font-mono text-amber-400 font-bold">
                      {batch.champion_count}
                    </td>

                    <td className="py-3 px-4 text-center font-mono text-blue-400 font-bold">
                      {batch.validated_count}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Badge
                          variant="secondary"
                          className={`font-mono text-xs font-bold ${
                            batch.accuracy_rate >= 60
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                              : batch.accuracy_rate >= 40
                              ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                              : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                          }`}
                        >
                          {batch.accuracy_rate.toFixed(1)}%
                        </Badge>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-center font-mono text-muted-foreground text-xs">
                      R$ {batch.total_spend.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </td>

                    <td className="py-3 px-4 text-center font-mono font-bold text-emerald-400 text-xs">
                      R$ {batch.profit.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </td>

                    <td className="py-3 px-4 text-center font-mono font-bold text-foreground">
                      {batch.roas.toFixed(2)}x
                    </td>

                    <td className="py-3 px-4 text-center">
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          batch.status === "Em Teste"
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                            : "bg-zinc-800 text-zinc-300 border-zinc-700"
                        }`}
                      >
                        {batch.status}
                      </Badge>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <Button
                        variant={isSelected ? "secondary" : "ghost"}
                        size="sm"
                        className="text-xs h-7"
                      >
                        Explorar
                        <RiArrowRightSLine className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ─── DRILL-DOWN: CRIATIVOS DA LEVA SELECIONADA ─── */}
      {selectedBatch && (
        <Card className="border-border/50 bg-card/60 backdrop-blur-xs overflow-hidden shadow-md">
          <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-primary/20 text-primary border-primary/30 text-xs font-bold">
                    Leva Selecionada
                  </Badge>
                  <CardTitle className="text-base font-bold text-foreground">
                    {selectedBatch.name}
                  </CardTitle>
                </div>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Assertividade de {selectedBatch.accuracy_rate.toFixed(1)}% ({selectedBatch.champion_count} campeões, {selectedBatch.validated_count} validados, {selectedBatch.testing_count} em teste).
                </CardDescription>
              </div>

              {/* Filtro e Busca */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-48">
                  <RiSearchLine className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-2.5" />
                  <Input
                    placeholder="Buscar anúncio ou gancho..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-8 pl-8 text-xs bg-background/60"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-8 px-2.5 text-xs rounded-lg border border-border/50 bg-background/60 text-foreground"
                >
                  <option value="all">Todos os Status</option>
                  <option value="champion">🏆 Campeões</option>
                  <option value="validated">🟢 Validados</option>
                  <option value="testing">🟡 Em Teste</option>
                  <option value="failed">🔴 Reprovados</option>
                </select>
              </div>
            </div>
          </CardHeader>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40 text-[11px] font-semibold text-muted-foreground uppercase border-b border-border/40 font-mono">
                <tr>
                  <th className="py-3 px-4">Anúncio & Gancho</th>
                  <th className="py-3 px-4 text-center">Classificação</th>
                  <th className="py-3 px-4 text-center">Gasto</th>
                  <th className="py-3 px-4 text-center">Vendas</th>
                  <th className="py-3 px-4 text-center">CPA</th>
                  <th className="py-3 px-4 text-center">ROAS</th>
                  <th className="py-3 px-4 text-center">Lucro</th>
                  <th className="py-3 px-4">Ação Recomendada</th>
                  <th className="py-3 px-4 text-right">Meta Ads</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {filteredCreatives.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-xs text-muted-foreground">
                      Nenhum criativo encontrado com os filtros atuais para esta leva.
                    </td>
                  </tr>
                ) : (
                  filteredCreatives.map((c) => {
                    const isPaused = c.status === "PAUSED";
                    let badgeClass = "bg-muted text-foreground";
                    if (c.classification === "champion") {
                      badgeClass = "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30";
                    } else if (c.classification === "validated") {
                      badgeClass = "bg-blue-500/15 text-blue-400 border border-blue-500/30";
                    } else if (c.classification === "testing") {
                      badgeClass = "bg-amber-500/15 text-amber-400 border border-amber-500/30";
                    } else if (c.classification === "failed") {
                      badgeClass = "bg-rose-500/15 text-rose-400 border border-rose-500/30";
                    }

                    return (
                      <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4 max-w-xs">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${
                                isPaused ? "bg-zinc-600" : "bg-emerald-400"
                              }`}
                            />
                            <span className="font-semibold text-foreground truncate block text-xs">
                              {c.name}
                            </span>
                          </div>
                          {c.hook_angle && (
                            <span className="text-[11px] text-amber-400/90 block truncate mt-0.5">
                              🎯 {c.hook_angle}
                            </span>
                          )}
                          <span className="text-[10px] text-muted-foreground block truncate mt-0.5">
                            {c.campaign_name}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-center">
                          <Badge variant="secondary" className={`text-xs font-bold ${badgeClass}`}>
                            {c.classification === "champion" && "🏆 "}
                            {c.classification === "validated" && "🟢 "}
                            {c.classification === "testing" && "🟡 "}
                            {c.classification === "failed" && "🔴 "}
                            {c.classification_label}
                          </Badge>
                        </td>

                        <td className="py-3 px-4 text-center font-mono text-xs">
                          R$ {c.spend.toFixed(2)}
                        </td>

                        <td className="py-3 px-4 text-center font-mono font-bold text-xs">
                          {c.sales}
                        </td>

                        <td className="py-3 px-4 text-center font-mono text-xs">
                          {c.sales > 0 ? `R$ ${c.cpa.toFixed(2)}` : "—"}
                        </td>

                        <td className="py-3 px-4 text-center font-mono font-bold text-xs">
                          <span className={c.roas >= 2.0 ? "text-emerald-400" : c.roas >= 1.0 ? "text-foreground" : "text-rose-400"}>
                            {c.roas.toFixed(2)}x
                          </span>
                        </td>

                        <td className="py-3 px-4 text-center font-mono text-xs font-semibold">
                          <span className={c.revenue - c.spend >= 0 ? "text-emerald-400" : "text-rose-400"}>
                            R$ {(c.revenue - c.spend).toFixed(2)}
                          </span>
                        </td>

                        <td className="py-3 px-4 max-w-xs">
                          <span className="text-xs text-foreground font-medium block">
                            {c.recommended_action}
                          </span>
                          <span className="text-[10px] text-muted-foreground block leading-tight mt-0.5">
                            {c.classification_desc}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <Button
                            variant={isPaused ? "outline" : c.classification === "failed" ? "destructive" : "secondary"}
                            size="sm"
                            disabled={actionInProgress === c.id}
                            onClick={() => handleToggleAd(c)}
                            className="text-xs h-7"
                          >
                            {actionInProgress === c.id ? (
                              <RiRefreshLine className="w-3.5 h-3.5 animate-spin" />
                            ) : isPaused ? (
                              <>
                                <RiPlayCircleLine className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                                Ativar
                              </>
                            ) : (
                              <>
                                <RiPauseCircleLine className="w-3.5 h-3.5 mr-1 text-rose-400" />
                                Pausar
                              </>
                            )}
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

