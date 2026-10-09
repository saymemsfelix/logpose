import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { useCachedQuery } from "./useCachedQuery";
import {
  fetchCampaignsData,
  toggleCampaignStatus,
  batchToggleCampaignStatus,
  batchDeleteCampaigns,
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
    const targetAccountId = activeAccountId ?? accounts[0]?.id;
    if (!targetAccountId) {
      toast.error("Conta de anúncios não selecionada", {
        description: "Aguarde o carregamento ou selecione uma conta de anúncios no filtro.",
      });
      return;
    }
    setOptimisticOverrides((prev) => ({
      ...prev,
      [entityId]: { ...prev[entityId], budget: dailyBudget },
    }));
    try {
      await updateBudget(
        targetAccountId, entityId, entityType, dailyBudget,
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

      toast.success("Orçamento alterado com sucesso!", {
        description: entityName
          ? `${entityName} • Novo valor: ${formatted}/dia`
          : `Novo orçamento definido para ${formatted}/dia`,
        duration: 4000,
      });
    } catch {
      clearOverride(entityId, "budget");
      toast.error("Erro ao atualizar orçamento", {
        description: "Não foi possível atualizar o valor no Meta Ads. Tente novamente.",
      });
    }
  };

  const batchToggle = async (
    entityIds: string[],
    entityType: "campaign" | "adset" | "ad",
    active: boolean,
  ) => {
    const targetAccountId = activeAccountId ?? accounts[0]?.id;
    if (!targetAccountId || entityIds.length === 0) return;

    const newStatus = active ? "active" : "paused";
    const newOverrides: Record<string, { status?: string }> = {};
    for (const eid of entityIds) {
      newOverrides[eid] = { status: newStatus };
    }
    setOptimisticOverrides((prev) => ({
      ...prev,
      ...newOverrides,
    }));

    try {
      const res = await batchToggleCampaignStatus(
        targetAccountId,
        entityIds,
        entityType,
        active,
      );
      invalidateCacheByPrefix("campaigns");
      await silentReload();
      for (const eid of entityIds) {
        clearOverride(eid, "status");
      }
      const label = entityType === "campaign" ? "campanha(s)" : entityType === "adset" ? "conjunto(s)" : "anúncio(s)";
      if (active) {
        toast.success(`${res.updated} de ${res.total} ${label} ativada(s) com sucesso!`);
      } else {
        toast.info(`${res.updated} de ${res.total} ${label} pausada(s) com sucesso!`);
      }
    } catch {
      for (const eid of entityIds) {
        clearOverride(eid, "status");
      }
      toast.error("Erro ao alterar status em lote", {
        description: "Não foi possível sincronizar o status no Meta Ads.",
      });
    }
  };

  const batchDelete = async (
    entityIds: string[],
    entityType: "campaign" | "adset" | "ad" = "campaign",
  ) => {
    const targetAccountId = activeAccountId ?? accounts[0]?.id;
    if (!targetAccountId || entityIds.length === 0) return;

    try {
      const res = await batchDeleteCampaigns(
        targetAccountId,
        entityIds,
        entityType,
      );
      invalidateCacheByPrefix("campaigns");
      await silentReload();
      const label = entityType === "campaign" ? "campanha(s)" : entityType === "adset" ? "conjunto(s)" : "anúncio(s)";
      toast.success(`${res.deleted} de ${res.total} ${label} excluída(s) da Meta!`);
    } catch {
      toast.error("Erro ao excluir entidades em lote", {
        description: "Não foi possível excluir no Meta Ads.",
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
    batchToggle,
    batchDelete,
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
