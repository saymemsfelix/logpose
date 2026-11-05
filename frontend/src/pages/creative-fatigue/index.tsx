import { useState, useEffect, useCallback } from "react";
import {
  RiFireLine,
  RiTrophyLine,
  RiRefreshLine,
  RiSparklingFill,
  RiCompass3Line,
} from "@remixicon/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getCreativeFatigueAnalysis,
  getCreativeBatches,
  type CreativeFatigueAd,
  type CreativeFatigueSummary,
  type CreativeBatch,
  type BatchRuleSettings,
  type CreativeBatchesSummary,
  type ReferenceInsight,
} from "@/services/creativeFatigue";
import { BatchesView } from "./components/BatchesView";
import { FatigueRadarTab } from "./components/FatigueRadarTab";
import { ReferencesTab } from "./components/ReferencesTab";

export default function CreativeFatiguePage() {
  const [activeTab, setActiveTab] = useState<"batches" | "fatigue" | "references">("batches");

  // Estados de Fadiga
  const [ads, setAds] = useState<CreativeFatigueAd[]>([]);
  const [fatigueSummary, setFatigueSummary] = useState<CreativeFatigueSummary>({
    total_ads: 0,
    healthy_count: 0,
    warning_count: 0,
    critical_count: 0,
  });

  // Estados do Creative Hub (Assertividade por Leva)
  const [batches, setBatches] = useState<CreativeBatch[]>([]);
  const [batchesSummary, setBatchesSummary] = useState<CreativeBatchesSummary>({
    total_batches: 0,
    total_creatives: 0,
    champion_count: 0,
    validated_count: 0,
    testing_count: 0,
    failed_count: 0,
    avg_accuracy_rate: 0,
    champion_rate: 0,
    total_spend: 0,
    total_revenue: 0,
    total_profit: 0,
    overall_roas: 0,
    best_batch_name: "Leva 04",
    best_batch_accuracy: 0,
  });
  const [rules, setRules] = useState<BatchRuleSettings>({
    champion_min_roas: 2.0,
    champion_min_sales: 3,
    validated_max_cpa: 45.0,
    validated_min_roas: 1.2,
    test_spend_threshold: 80.0,
  });
  const [referenceInsights, setReferenceInsights] = useState<ReferenceInsight[]>([]);

  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async (customRules?: Partial<BatchRuleSettings>) => {
    try {
      setIsLoading(true);
      const activeRules = customRules ? { ...rules, ...customRules } : rules;

      const [fatigueRes, batchesRes] = await Promise.all([
        getCreativeFatigueAnalysis(),
        getCreativeBatches(activeRules),
      ]);

      setAds(fatigueRes.ads);
      setFatigueSummary(fatigueRes.summary);

      setBatches(batchesRes.batches);
      setBatchesSummary(batchesRes.summary);
      setRules(batchesRes.rules || activeRules);
      setReferenceInsights(batchesRes.reference_insights || []);
    } catch {
      toast.error("Erro ao carregar dados do Creative Hub");
    } finally {
      setIsLoading(false);
    }
  }, [rules]);

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateRules = (newRules: Partial<BatchRuleSettings>) => {
    setRules((prev) => ({ ...prev, ...newRules }));
    loadData(newRules);
  };

  const handleAdUpdated = (adId: string, newStatus: string) => {
    setAds((prev) =>
      prev.map((a) => (a.id === adId ? { ...a, status: newStatus } : a))
    );
  };

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto w-full min-h-screen">
      {/* ─── HEADER PRINCIPAL DO CREATIVE HUB ─── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/20 via-emerald-500/20 to-blue-500/20 border border-amber-500/30 text-amber-400">
            <RiTrophyLine className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Creative Hub & Assertividade por Leva
              </h1>
              <Badge
                variant="outline"
                className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[11px] font-mono font-semibold"
              >
                Ninja Creative Intelligence
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Monitore a assertividade de cada lote de criativos subido, controle a régua de validação e detecte saturação de tráfego.
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => loadData()}
          disabled={isLoading}
          className="text-xs border-border/80 h-8"
        >
          <RiRefreshLine className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
          Atualizar Tudo
        </Button>
      </div>

      {/* ─── ABAS DE NAVEGAÇÃO ─── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-border/50 no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab("batches")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === "batches"
              ? "bg-primary text-primary-foreground shadow-md shadow-primary/30 font-bold"
              : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
          }`}
        >
          <RiTrophyLine className="w-4 h-4" />
          <span>Assertividade por Leva (Creative Hub)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("fatigue")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === "fatigue"
              ? "bg-primary text-primary-foreground shadow-md shadow-primary/30 font-bold"
              : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
          }`}
        >
          <RiFireLine className="w-4 h-4" />
          <span>Radar de Fadiga & Saturação</span>
          {fatigueSummary.critical_count > 0 && (
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse ml-1" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("references")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === "references"
              ? "bg-primary text-primary-foreground shadow-md shadow-primary/30 font-bold"
              : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
          }`}
        >
          <RiSparklingFill className="w-4 h-4 text-emerald-400" />
          <span>Referências & Ideação Ninja</span>
        </button>
      </div>

      {/* ─── CONTEÚDO DA ABA SELECIONADA ─── */}
      {activeTab === "batches" && (
        <BatchesView
          batches={batches}
          summary={batchesSummary}
          rules={rules}
          isLoading={isLoading}
          onUpdateRules={handleUpdateRules}
          onRefresh={() => loadData()}
        />
      )}

      {activeTab === "fatigue" && (
        <FatigueRadarTab
          ads={ads}
          summary={fatigueSummary}
          isLoading={isLoading}
          onRefresh={() => loadData()}
          onAdUpdated={handleAdUpdated}
        />
      )}

      {activeTab === "references" && (
        <ReferencesTab
          insights={referenceInsights}
          bestBatchName={batchesSummary.best_batch_name}
        />
      )}
    </div>
  );
}
