import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { useCachedQuery } from "./useCachedQuery";
import {
  fetchCampaignsData,
  toggleCampaignStatus,
  updateBudget,
  fetchPresets,
  createPreset,
  updatePreset,
  deletePreset,
  fetchCampaignFilterOptions,
  type CampaignData,
  type PresetAPI,
  type CampaignFilterOptionsAPI,
} from "@/services/campaigns";
import { useFacebookAccounts } from "./useFacebookAccounts";
import { invalidateCacheByPrefix } from "@/lib/queryCache";


export function useCampaigns(dateStart: string, dateEnd: string) {
  const { accounts } = useFacebookAccounts();
  const [selectedAccountId, setSelectedAccountId] = useState<number | undefined>();
  const [optimisticOverrides, setOptimisticOverrides] = useState<
    Record<string, { status?: string; budget?: number }>
  >({});

  // Guard against concurrent toggles on the same entity
  const toggleInProgressRef = useRef<Set<string>>(new Set());

  const activeAccountId = selectedAccountId ?? accounts[0]?.id;

  const { data, isLoading, error, reload, silentReload } = useCachedQuery<{
    campaigns: CampaignData[];
    unidentified: CampaignData | null;
    error?: string | null;
  }>({
    cachePrefix: "campaigns",
    params: { dateStart, dateEnd, activeAccountId },
    queryFn: () => fetchCampaignsData(dateStart, dateEnd, activeAccountId),
    enabled: !!dateStart && !!dateEnd,
    autoRefreshMs: 30_000,
  });

  // isInitialLoading = loading + no data yet (first load only)
  const isInitialLoading = isLoading && !data;

  const applyOverrides = useCallback(
    (campaigns: CampaignData[]): CampaignData[] =>
      campaigns.map((c) => {
        const override = optimisticOverrides[c.id];
        const updatedAdsets = c.adsets.map((as_) => {
          const asOverride = optimisticOverrides[as_.id];
          const updatedAds = as_.ads.map((ad) => {
            const adOverride = optimisticOverrides[ad.id];
            return adOverride ? { ...ad, ...adOverride } : ad;
          });
          return asOverride
            ? { ...as_, ...asOverride, ads: updatedAds }
            : { ...as_, ads: updatedAds };
        });
        return override
          ? { ...c, ...override, adsets: updatedAdsets }
          : { ...c, adsets: updatedAdsets };
      }),
    [optimisticOverrides],
  );

  const clearOverride = (entityId: string, key: "status" | "budget") => {
    setOptimisticOverrides((prev) => {
      const next = { ...prev };
      if (next[entityId]) {
        delete next[entityId][key];
        if (Object.keys(next[entityId]).length === 0) delete next[entityId];
      }
      return next;
    });
  };

  const toggle = async (
    entityId: string,
    entityType: "campaign" | "adset" | "ad",
    active: boolean,
    entityName?: string,
    metrics?: Record<string, number>,
    budget?: number,
  ) => {
    if (!activeAccountId) return;

    // Prevent concurrent toggles on the same entity
    if (toggleInProgressRef.current.has(entityId)) return;
    toggleInProgressRef.current.add(entityId);

    const newStatus = active ? "active" : "paused";
    setOptimisticOverrides((prev) => ({
      ...prev,
      [entityId]: { ...prev[entityId], status: newStatus },
    }));
    try {
      await toggleCampaignStatus(
        activeAccountId, entityId, entityType, active,
        entityName, metrics, budget,
      );
      invalidateCacheByPrefix("campaigns");
      // Silent reload — table stays visible, no loading spinner
      await silentReload();
      clearOverride(entityId, "status");

      const entityLabel = entityType === "campaign" ? "Campanha" : entityType === "adset" ? "Conjunto" : "Anúncio";
      if (active) {
        toast.success(`${entityLabel} ativado com sucesso!`, {
          description: entityName || undefined,
          duration: 3000,
        });
      } else {
        toast.info(`${entityLabel} pausado`, {
          description: entityName || undefined,
          duration: 3000,
        });
      }
    } catch {
      // Revert on error only
      clearOverride(entityId, "status");
      toast.error("Erro ao alterar status", {
        description: "Não foi possível sincronizar o status no Meta Ads.",
      });
    } finally {
      toggleInProgressRef.current.delete(entityId);
    }
  };

  const changeBudget = async (
    entityId: string,
    entityType: "campaign" | "adset",
    dailyBudget: number,
    entityName?: string,
    budgetBefore?: number,
    metrics?: Record<string, number>,
  ) => {
    if (!activeAccountId) return;
    setOptimisticOverrides((prev) => ({
      ...prev,
      [entityId]: { ...prev[entityId], budget: dailyBudget },
    }));
    try {
      await updateBudget(
        activeAccountId, entityId, entityType, dailyBudget,
        entityName, budgetBefore, metrics,
      );
      invalidateCacheByPrefix("campaigns");
      // Silent reload — no loading spinner
      await silentReload();
      clearOverride(entityId, "budget");

      const formatted = new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(dailyBudget);

      toast.success("Valor da campanha atualizado!", {
        description: entityName
          ? `${entityName} alterada para ${formatted}/dia`
          : `Orçamento atualizado para ${formatted}/dia`,
        duration: 3500,
      });
    } catch {
      clearOverride(entityId, "budget");
      toast.error("Erro ao atualizar orçamento", {
        description: "Não foi possível atualizar o valor no Meta Ads. Tente novamente.",
      });
    }
  };

  const rawCampaigns = data?.campaigns ?? [];
  const campaigns = applyOverrides(rawCampaigns);

  return {
    campaigns,
    unidentified: data?.unidentified ?? null,
    metaError: data?.error ?? null,
    isLoading: isInitialLoading,
    error,
    accounts,
    activeAccountId,
    setSelectedAccountId,
    toggle,
    changeBudget,
    reload,
    silentReload,
  };
}

export function useCampaignPresets() {
  const { data, isLoading, reload } = useCachedQuery<PresetAPI[]>({
    cachePrefix: "campaign-presets",
    queryFn: fetchPresets,
  });

  const addPreset = async (name: string, columns: string[]) => {
    const p = await createPreset(name, columns);
    invalidateCacheByPrefix("campaign-presets");
    await reload();
    return p;
  };

  const editPreset = async (id: number, name: string, columns: string[]) => {
    const p = await updatePreset(id, name, columns);
    invalidateCacheByPrefix("campaign-presets");
    await reload();
    return p;
  };

  const removePreset = async (id: number) => {
    await deletePreset(id);
    invalidateCacheByPrefix("campaign-presets");
    await reload();
  };

  return { presets: data ?? [], isLoading, addPreset, editPreset, removePreset, reload };
}

const defaultFilterOptions: CampaignFilterOptionsAPI = { products: [], platforms: [] };

export function useCampaignFilterOptions() {
  const { data, isLoading } = useCachedQuery<CampaignFilterOptionsAPI>({
    cachePrefix: "campaign-filter-options",
    queryFn: fetchCampaignFilterOptions,
  });

  return { filterOptions: data ?? defaultFilterOptions, isLoading };
}
