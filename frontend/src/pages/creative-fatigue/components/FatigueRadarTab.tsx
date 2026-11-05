import { useState } from "react";
import {
  RiRefreshLine,
  RiPlayCircleLine,
  RiPauseCircleLine,
  RiCheckDoubleLine,
} from "@remixicon/react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  type CreativeFatigueAd,
  type CreativeFatigueSummary,
  toggleFatigueAdStatus,
} from "@/services/creativeFatigue";

interface FatigueRadarTabProps {
  ads: CreativeFatigueAd[];
  summary: CreativeFatigueSummary;
  isLoading: boolean;
  onRefresh: () => void;
  onAdUpdated: (adId: string, newStatus: string) => void;
}

export function FatigueRadarTab({
  ads,
  summary,
  isLoading,
  onRefresh,
  onAdUpdated,
}: FatigueRadarTabProps) {
  const [selectedFilter, setSelectedFilter] = useState<"all" | "critical" | "warning" | "healthy">("all");
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const handleToggleAd = async (ad: CreativeFatigueAd) => {
    const newStatus = ad.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
    try {
      setActionInProgress(ad.id);
      await toggleFatigueAdStatus(ad.id, newStatus, ad.account_id);
      toast.success(newStatus === "PAUSED" ? `Anúncio "${ad.name}" pausado no Meta!` : `Anúncio ativado!`);
      onAdUpdated(ad.id, newStatus);
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
    <div className="flex flex-col gap-6">
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
              Métricas reais agregadas de Meta Ads cruzadas com conversão e índice preditivo de fadiga.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isLoading}
              className="text-xs h-8 border-border/60"
            >
              <RiRefreshLine className={`w-3.5 h-3.5 mr-1 ${isLoading ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40 text-[11px] font-semibold text-muted-foreground uppercase border-b border-border/40 font-mono">
                <tr>
                  <th className="py-3 px-4">Anúncio & Campanha</th>
                  <th className="py-3 px-4">Índice de Fadiga</th>
                  <th className="py-3 px-4 text-center">Frequência</th>
                  <th className="py-3 px-4 text-center">CTR / CPC</th>
                  <th className="py-3 px-4 text-center">Gasto & Vendas</th>
                  <th className="py-3 px-4">Diagnóstico & Recomendação</th>
                  <th className="py-3 px-4 text-right">Ação</th>
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
                              <RiPauseCircleLine className="w-3.5 h-3.5 mr-1 text-rose-400" />
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
        </CardContent>
      </Card>
    </div>
  );
}

