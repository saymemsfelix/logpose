import { useState, useEffect } from "react";
import {
  RiFireLine,
  RiRefreshLine,
  RiPauseCircleLine,
  RiPlayCircleLine,
  RiCheckDoubleLine,
} from "@remixicon/react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getCreativeFatigueAnalysis,
  toggleFatigueAdStatus,
  type CreativeFatigueAd,
  type CreativeFatigueSummary,
} from "@/services/creativeFatigue";

export default function CreativeFatiguePage() {
  const [ads, setAds] = useState<CreativeFatigueAd[]>([]);
  const [summary, setSummary] = useState<CreativeFatigueSummary>({
    total_ads: 0,
    healthy_count: 0,
    warning_count: 0,
    critical_count: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<"all" | "critical" | "warning" | "healthy">("all");
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const res = await getCreativeFatigueAnalysis();
      setAds(res.ads);
      setSummary(res.summary);
    } catch {
      toast.error("Erro ao carregar análise de fadiga de criativos");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleAd = async (ad: CreativeFatigueAd) => {
    const newStatus = ad.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
    try {
      setActionInProgress(ad.id);
      await toggleFatigueAdStatus(ad.id, newStatus, ad.account_id);
      toast.success(newStatus === "PAUSED" ? `Anúncio "${ad.name}" pausado no Meta!` : `Anúncio ativado!`);
      setAds((prev) =>
        prev.map((a) => (a.id === ad.id ? { ...a, status: newStatus } : a))
      );
    } catch {
      toast.error("Erro ao alterar status do anúncio");
    } finally {
      setActionInProgress(null);
    }
  };

  const filteredAds = ads.filter((ad) => {
    if (selectedFilter === "all") return true;
    return ad.fatigue_status === selectedFilter;
  });

  return (
    <div className="flex flex-col gap-6 p-6 min-h-screen bg-background">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <RiFireLine className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              Radar de Fadiga de Criativos
              <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-xs">
                Auditoria de Saturação
              </Badge>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Monitoramento de Frequência, queda de CTR e saturação de criativos no Meta Ads (estilo Triple Whale).
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadData}
          disabled={isLoading}
          className="text-xs border-border/80"
        >
          <RiRefreshLine className={`w-4 h-4 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
          Atualizar Análise
        </Button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card
          onClick={() => setSelectedFilter("all")}
          className={`cursor-pointer transition-all bg-card/70 border-border/60 ${
            selectedFilter === "all" ? "ring-2 ring-primary/60 border-primary" : ""
          }`}
        >
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs">Criativos Rastreados</CardDescription>
            <CardTitle className="text-xl font-bold text-foreground">{summary.total_ads}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 text-xs text-muted-foreground">
            Anúncios ativos e recentes na conta
          </CardContent>
        </Card>

        <Card
          onClick={() => setSelectedFilter("healthy")}
          className={`cursor-pointer transition-all bg-card/70 border-border/60 ${
            selectedFilter === "healthy" ? "ring-2 ring-emerald-500/60 border-emerald-500" : ""
          }`}
        >
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs flex items-center justify-between">
              🟢 Saudáveis (Em Tração)
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </CardDescription>
            <CardTitle className="text-xl font-bold text-emerald-400">{summary.healthy_count}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 text-xs text-muted-foreground">
            Frequência baixa e audiência receptiva
          </CardContent>
        </Card>

        <Card
          onClick={() => setSelectedFilter("warning")}
          className={`cursor-pointer transition-all bg-card/70 border-border/60 ${
            selectedFilter === "warning" ? "ring-2 ring-amber-500/60 border-amber-500" : ""
          }`}
        >
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs flex items-center justify-between">
              🟡 Início de Saturação
              <span className="w-2 h-2 rounded-full bg-amber-500" />
            </CardDescription>
            <CardTitle className="text-xl font-bold text-amber-400">{summary.warning_count}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 text-xs text-muted-foreground">
            Frequência subindo, preparar substitutos
          </CardContent>
        </Card>

        <Card
          onClick={() => setSelectedFilter("critical")}
          className={`cursor-pointer transition-all bg-card/70 border-border/60 ${
            selectedFilter === "critical" ? "ring-2 ring-rose-500/60 border-rose-500" : ""
          }`}
        >
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs flex items-center justify-between">
              🔴 Saturação Crítica
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            </CardDescription>
            <CardTitle className="text-xl font-bold text-rose-400">{summary.critical_count}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 text-xs text-muted-foreground">
            Pausar ou trocar gancho imediatamente
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Anúncios e Análise de Fadiga */}
      <Card className="bg-card/90 border-border/60">
        <CardHeader className="p-4 border-b border-border/40 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">Tabela de Diagnóstico de Anúncios</CardTitle>
            <CardDescription className="text-xs">
              Classificação por Score de Fadiga (Frequência x CTR x CPA)
            </CardDescription>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant={selectedFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedFilter("all")}
              className="text-xs h-7"
            >
              Todos ({ads.length})
            </Button>
            <Button
              variant={selectedFilter === "critical" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedFilter("critical")}
              className="text-xs h-7 text-rose-400 border-rose-500/30"
            >
              Saturados ({summary.critical_count})
            </Button>
            <Button
              variant={selectedFilter === "warning" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedFilter("warning")}
              className="text-xs h-7 text-amber-400 border-amber-500/30"
            >
              Atenção ({summary.warning_count})
            </Button>
            <Button
              variant={selectedFilter === "healthy" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedFilter("healthy")}
              className="text-xs h-7 text-emerald-400 border-emerald-500/30"
            >
              Saudáveis ({summary.healthy_count})
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filteredAds.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <RiCheckDoubleLine className="w-10 h-10 mx-auto text-emerald-500/50 mb-2" />
              <p className="text-sm font-medium">Nenhum anúncio encontrado com esse filtro.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border/40">
                  <tr>
                    <th className="py-3 px-4">Anúncio / Campanha</th>
                    <th className="py-3 px-4">Saúde & Saturação</th>
                    <th className="py-3 px-4 text-center">Frequência</th>
                    <th className="py-3 px-4 text-center">CTR / CPC</th>
                    <th className="py-3 px-4 text-center">Gasto & Vendas</th>
                    <th className="py-3 px-4">Recomendação do Ninja</th>
                    <th className="py-3 px-4 text-right">Ação Rápida</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {filteredAds.map((ad) => {
                    const isCritical = ad.fatigue_status === "critical";
                    const isWarning = ad.fatigue_status === "warning";
                    const isPaused = ad.status === "PAUSED";

                    return (
                      <tr key={ad.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4 max-w-xs">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                isPaused ? "bg-zinc-600" : "bg-emerald-400"
                              }`}
                            />
                            <span className="font-semibold text-foreground truncate block">
                              {ad.name}
                            </span>
                          </div>
                          <span className="text-[10px] text-muted-foreground block truncate mt-0.5">
                            {ad.campaign_name} • {ad.adset_name}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-muted/60 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  isCritical
                                    ? "bg-rose-500"
                                    : isWarning
                                    ? "bg-amber-400"
                                    : "bg-emerald-400"
                                }`}
                                style={{ width: `${ad.fatigue_score}%` }}
                              />
                            </div>
                            <span className="font-mono text-[11px] font-bold">
                              {ad.fatigue_score}/100
                            </span>
                          </div>
                          <span className="text-[10px] block mt-1">
                            {isCritical ? (
                              <span className="text-rose-400 font-medium">🔴 Fadiga Severa</span>
                            ) : isWarning ? (
                              <span className="text-amber-400 font-medium">🟡 Início de Fadiga</span>
                            ) : (
                              <span className="text-emerald-400 font-medium">🟢 Saudável</span>
                            )}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-center">
                          <Badge
                            variant="secondary"
                            className={`font-mono text-xs ${
                              ad.frequency >= 2.4
                                ? "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                                : ad.frequency >= 1.8
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                                : "bg-muted text-foreground"
                            }`}
                          >
                            {ad.frequency.toFixed(2)}x
                          </Badge>
                        </td>

                        <td className="py-3 px-4 text-center font-mono">
                          <div className="text-foreground">{ad.ctr.toFixed(2)}%</div>
                          <div className="text-[10px] text-muted-foreground">R$ {ad.cpc.toFixed(2)}</div>
                        </td>

                        <td className="py-3 px-4 text-center font-mono">
                          <div className="text-foreground">R$ {ad.spend.toFixed(2)}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {ad.sales} vendas {ad.sales > 0 ? `(CPA R$ ${ad.cpa.toFixed(2)})` : ""}
                          </div>
                        </td>

                        <td className="py-3 px-4 max-w-sm">
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {ad.recommendation}
                          </p>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <Button
                            variant={isPaused ? "outline" : isCritical ? "destructive" : "secondary"}
                            size="sm"
                            disabled={actionInProgress === ad.id}
                            onClick={() => handleToggleAd(ad)}
                            className="text-xs h-7"
                          >
                            {actionInProgress === ad.id ? (
                              <RiRefreshLine className="w-3.5 h-3.5 animate-spin" />
                            ) : isPaused ? (
                              <>
                                <RiPlayCircleLine className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                                Reativar
                              </>
                            ) : (
                              <>
                                <RiPauseCircleLine className="w-3.5 h-3.5 mr-1" />
                                Pausar
                              </>
                            )}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
