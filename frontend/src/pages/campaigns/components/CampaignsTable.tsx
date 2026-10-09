import { useState, useCallback, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  RiPauseCircleLine,
  RiPlayCircleLine,
  RiDeleteBinLine,
  RiCloseLine,
  RiLoader4Line,
} from "@remixicon/react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { CampaignData } from "@/services/campaigns";
import { allColumns } from "./columnPresets";
import { AdSetsSubTable } from "./AdSetsSubTable";
import { CampaignModals, type CampaignModalState } from "./CampaignModals";
import { CampaignNameCell } from "./CampaignNameCell";
import { CampaignContextMenu } from "./CampaignContextMenu";
import { DeactivateConfirmModal, type DeactivateMetrics } from "./DeactivateConfirmModal";
import { findEntityMetrics } from "./entityHelpers";
import { cn } from "@/lib/utils";
import type { BlurState } from "./BlurToggle";
import { getCellValue, getFooterValue } from "./campaignCellHelpers";
import { campaignToMetricRow } from "./mappers";
import { SortableTableHead } from "./SortableTableHead";
import { useCampaignSort } from "./useCampaignSort";
import type { MarkerMap } from "@/hooks/useCampaignMarkers";
import { useKpiColorsContext } from "./KpiColorsContext";
import { handleExportCampaignFromTable } from "./exportCampaign";
import { handleDuplicateCampaign } from "./duplicateCampaign";

interface CampaignsTableProps {
  data: CampaignData[];
  columns: string[];
  blur?: BlurState;
  tagsMap?: Record<string, string[]>;
  markersMap?: MarkerMap;
  onToggle: (entityId: string, entityType: "campaign" | "adset" | "ad", active: boolean, entityName?: string, metrics?: Record<string, number>, budget?: number) => Promise<void>;
  onBatchToggle?: (entityIds: string[], entityType: "campaign" | "adset" | "ad", active: boolean) => Promise<void>;
  onBatchDelete?: (entityIds: string[], entityType: "campaign" | "adset" | "ad") => Promise<void>;
  onBudgetChange: (entityId: string, entityType: "campaign" | "adset", dailyBudget: number, entityName?: string, budgetBefore?: number, metrics?: Record<string, number>) => Promise<void>;
  onSaveTags?: (campaignId: string, tags: string[]) => Promise<void>;
  onSaveMarker?: (campaignId: string, type: "video" | "checkout" | "product" | "platform", refId: string, refLabel: string) => Promise<void>;
  accountId?: number;
  taxEnabled?: boolean;
  taxRate?: number;
}

interface DeactivateState {
  open: boolean;
  entityId: string;
  entityName: string;
  entityType: "campaign" | "adset" | "ad";
  metrics: DeactivateMetrics;
}

const emptyMetrics: DeactivateMetrics = {
  spend: 0, revenue: 0, profit: 0, roas: 0, cpa: 0, cpc: 0, ctr: 0, sales: 0, clicks: 0, impressions: 0, budget: 0,
};
const emptyDeactivate: DeactivateState = {
  open: false, entityId: "", entityName: "", entityType: "campaign", metrics: emptyMetrics,
};

export function CampaignsTable({
  data, columns,
  blur = { name: false, values: false, hideUnidentified: false, hiddenProducts: [] },
  tagsMap = {}, markersMap = {},
  onToggle, onBatchToggle, onBatchDelete, onBudgetChange, onSaveTags, onSaveMarker,
  accountId,
  taxEnabled = false,
  taxRate = 0,
}: CampaignsTableProps) {
  const navigate = useNavigate();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const ms: CampaignModalState = { open: false, campaign: null };
  const [budgetModal, setBudgetModal] = useState<CampaignModalState>(ms);
  const [tagsModal, setTagsModal] = useState<CampaignModalState>(ms);
  const [videoModal, setVideoModal] = useState<CampaignModalState>(ms);
  const [checkoutModal, setCheckoutModal] = useState<CampaignModalState>(ms);
  const [productModal, setProductModal] = useState<CampaignModalState>(ms);
  const [infoModal, setInfoModal] = useState<CampaignModalState>(ms);
  const [deactivateModal, setDeactivateModal] = useState<DeactivateState>(emptyDeactivate);
  const [deactivateLoading, setDeactivateLoading] = useState(false);

  // Bulk selection states
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<Set<string>>(new Set());
  const [selectedAdSetIds, setSelectedAdSetIds] = useState<Set<string>>(new Set());
  const [selectedAdIds, setSelectedAdIds] = useState<Set<string>>(new Set());
  const [batchLoading, setBatchLoading] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const visibleCols = columns.filter((c) => c !== "name");
  const blurClass = "blur-sm select-none";
  const kpiColors = useKpiColorsContext();
  const { sorted: sortedData, sortKey, toggleSort } = useCampaignSort(data);

  const selectableCampaigns = sortedData.filter((c) => c.status !== "unidentified");
  const allSelectableIds = selectableCampaigns.map((c) => c.id);
  const allCampaignsSelected = allSelectableIds.length > 0 && allSelectableIds.every((id) => selectedCampaignIds.has(id));
  const someCampaignsSelected = allSelectableIds.some((id) => selectedCampaignIds.has(id));

  const toggleSelectAllCampaigns = () => {
    if (allCampaignsSelected) {
      setSelectedCampaignIds(new Set());
    } else {
      setSelectedCampaignIds(new Set(allSelectableIds));
    }
  };

  const toggleCampaignSelect = (id: string) => {
    setSelectedCampaignIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAdSetSelect = (id: string) => {
    setSelectedAdSetIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAdSelect = (id: string) => {
    setSelectedAdIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedCampaignIds(new Set());
    setSelectedAdSetIds(new Set());
    setSelectedAdIds(new Set());
  };

  const handleBatchToggle = async (active: boolean) => {
    setBatchLoading(true);
    try {
      if (selectedCampaignIds.size > 0 && onBatchToggle) {
        await onBatchToggle(Array.from(selectedCampaignIds), "campaign", active);
      }
      if (selectedAdSetIds.size > 0 && onBatchToggle) {
        await onBatchToggle(Array.from(selectedAdSetIds), "adset", active);
      }
      if (selectedAdIds.size > 0 && onBatchToggle) {
        await onBatchToggle(Array.from(selectedAdIds), "ad", active);
      }
      clearSelection();
    } finally {
      setBatchLoading(false);
    }
  };

  const handleBatchDelete = async () => {
    setBatchLoading(true);
    try {
      if (selectedCampaignIds.size > 0 && onBatchDelete) {
        await onBatchDelete(Array.from(selectedCampaignIds), "campaign");
      }
      if (selectedAdSetIds.size > 0 && onBatchDelete) {
        await onBatchDelete(Array.from(selectedAdSetIds), "adset");
      }
      if (selectedAdIds.size > 0 && onBatchDelete) {
        await onBatchDelete(Array.from(selectedAdIds), "ad");
      }
      clearSelection();
    } finally {
      setBatchLoading(false);
      setDeleteConfirmOpen(false);
    }
  };

  const totalSelected = selectedCampaignIds.size + selectedAdSetIds.size + selectedAdIds.size;
  const selectedParts = [
    selectedCampaignIds.size > 0 ? `${selectedCampaignIds.size} campanha${selectedCampaignIds.size > 1 ? "s" : ""}` : "",
    selectedAdSetIds.size > 0 ? `${selectedAdSetIds.size} conjunto${selectedAdSetIds.size > 1 ? "s" : ""}` : "",
    selectedAdIds.size > 0 ? `${selectedAdIds.size} anúncio${selectedAdIds.size > 1 ? "s" : ""}` : "",
  ].filter(Boolean);
  const selectedLabel = selectedParts.length > 2
    ? `${selectedParts.slice(0, -1).join(", ")} e ${selectedParts[selectedParts.length - 1]}`
    : selectedParts.join(" e ");

  /** Intercepts toggle: if deactivating, shows confirmation modal first. */
  const handleToggle = useCallback(
    async (entityId: string, entityType: "campaign" | "adset" | "ad", active: boolean) => {
      const found = findEntityMetrics(data, entityId, entityType);
      const metricsObj = found ? {
        spend: found.metrics.spend, revenue: found.metrics.revenue,
        profit: found.metrics.profit, sales: found.metrics.sales,
        roas: found.metrics.roas, cpa: found.metrics.cpa,
        cpc: found.metrics.cpc || 0, ctr: found.metrics.ctr || 0,
        clicks: found.metrics.clicks, impressions: found.metrics.impressions,
      } : undefined;

      if (active) {
        await onToggle(entityId, entityType, true, found?.name, metricsObj, found?.metrics.budget);
        return;
      }
      if (!found) { await onToggle(entityId, entityType, false); return; }
      setDeactivateModal({ open: true, entityId, entityName: found.name, entityType, metrics: found.metrics });
    }, [data, onToggle],
  );

  const confirmDeactivate = async () => {
    setDeactivateLoading(true);
    const m = deactivateModal.metrics;
    const metricsObj = {
      spend: m.spend, revenue: m.revenue, profit: m.profit,
      sales: m.sales, roas: m.roas, cpa: m.cpa,
      clicks: m.clicks, impressions: m.impressions,
    };
    try {
      await onToggle(
        deactivateModal.entityId, deactivateModal.entityType, false,
        deactivateModal.entityName, metricsObj, m.budget,
      );
    }
    finally { setDeactivateLoading(false); setDeactivateModal(emptyDeactivate); }
  };

  const metricsForFooter = sortedData.map(campaignToMetricRow);

  return (
    <>
      <Card className="border-border/40 premium-table overflow-hidden min-w-0">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 px-3 text-center">
                    <Checkbox
                      checked={allCampaignsSelected ? true : someCampaignsSelected ? "indeterminate" : false}
                      onCheckedChange={toggleSelectAllCampaigns}
                      aria-label="Selecionar todas as campanhas"
                      className="translate-y-[2px]"
                    />
                  </TableHead>
                  <SortableTableHead
                    colKey="name"
                    label={allColumns.name}
                    sortKey={sortKey}
                    onSort={toggleSort}
                    className="min-w-[320px]"
                  />
                  {visibleCols.map((col) => (
                    <SortableTableHead
                      key={col}
                      colKey={col}
                      label={allColumns[col] || col}
                      sortKey={sortKey}
                      onSort={toggleSort}
                      className="text-right"
                    />
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.map((c) => {
                  const isUnidentified = c.status === "unidentified";
                  const isExpanded = expandedId === c.id;
                  const isSelected = selectedCampaignIds.has(c.id);
                  const row = campaignToMetricRow(c);
                  const tags = tagsMap[c.id] || [];

                  const rowContent = (
                    <TableRow
                      key={c.id}
                      className={cn(
                        "transition-colors",
                        isUnidentified ? "bg-[var(--color-warning)]/5" : "cursor-pointer",
                        isExpanded && !isUnidentified && "bg-muted/30",
                        isSelected && "bg-primary/5"
                      )}
                      onClick={isUnidentified ? undefined : () => setExpandedId((p) => (p === c.id ? null : c.id))}
                    >
                      <TableCell className="w-10 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        {!isUnidentified && (
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleCampaignSelect(c.id)}
                            aria-label={`Selecionar campanha ${c.name}`}
                            className="translate-y-[2px]"
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <CampaignNameCell
                          campaign={row} isExpanded={isExpanded} blurName={blur.name}
                          noIdSales={c.no_id_sales} tags={tags}
                          budgetType={c.budget_type}
                          onEditBudget={(e) => { e.stopPropagation(); setBudgetModal({ open: true, campaign: c }); }}
                          onToggle={(active) => handleToggle(c.id, "campaign", active)}
                        />
                      </TableCell>
                      {visibleCols.map((col) => (
                        <TableCell key={col} className={cn("text-right tabular-nums", blur.values && blurClass)}>
                          {col === "budget" && c.budget_type === "ABO"
                            ? <span className="text-xs text-muted-foreground">ABO</span>
                            : getCellValue(row, col, kpiColors, taxEnabled, taxRate)}
                        </TableCell>
                      ))}
                    </TableRow>
                  );

                  return (
                    <Fragment key={c.id}>
                      {isUnidentified ? rowContent : (
                        <CampaignContextMenu
                          isActive={row.status === "active"}
                          isCbo={c.budget_type !== "ABO"}
                          onToggle={() => handleToggle(c.id, "campaign", row.status !== "active")}
                          onEditBudget={() => setBudgetModal({ open: true, campaign: c })}
                          onEditTags={() => setTagsModal({ open: true, campaign: c })}
                          onDefineVideo={() => setVideoModal({ open: true, campaign: c })}
                          onDefineCheckout={() => setCheckoutModal({ open: true, campaign: c })}
                          onDefineProduct={() => setProductModal({ open: true, campaign: c })}
                          onExportCampaign={() => handleExportCampaignFromTable({ campaign: c, markersMap, accountId })}
                          onDuplicateCampaign={() => handleDuplicateCampaign({ campaign: c, markersMap, accountId, navigate })}
                          onViewInfo={() => setInfoModal({ open: true, campaign: c })}
                        >{rowContent}</CampaignContextMenu>
                      )}
                      {isExpanded && !isUnidentified && c.adsets.length > 0 && (
                        <TableRow key={`${c.id}-adsets`}>
                          <TableCell colSpan={visibleCols.length + 2} className="p-0">
                            <AdSetsSubTable
                              adSets={c.adsets}
                              columns={columns}
                              onToggle={handleToggle}
                              onBudgetChange={onBudgetChange}
                              taxEnabled={taxEnabled}
                              taxRate={taxRate}
                              selectedAdSetIds={selectedAdSetIds}
                              onToggleSelectAdSet={toggleAdSetSelect}
                              onSelectAllAdSets={(adSetIds, shouldSelect) => {
                                setSelectedAdSetIds((prev) => {
                                  const next = new Set(prev);
                                  adSetIds.forEach((id) => (shouldSelect ? next.add(id) : next.delete(id)));
                                  return next;
                                });
                              }}
                              selectedAdIds={selectedAdIds}
                              onToggleSelectAd={toggleAdSelect}
                              onSelectAllAds={(adIds, shouldSelect) => {
                                setSelectedAdIds((prev) => {
                                  const next = new Set(prev);
                                  adIds.forEach((id) => (shouldSelect ? next.add(id) : next.delete(id)));
                                  return next;
                                });
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
              </TableBody>
              <TableFooter>
                <TableRow className="bg-muted/40 font-semibold">
                  <TableCell className="w-10 px-3"></TableCell>
                  <TableCell>Total ({data.length})</TableCell>
                  {visibleCols.map((col) => (
                    <TableCell key={col} className={cn("text-right tabular-nums", blur.values && blurClass)}>
                      {getFooterValue(metricsForFooter, col, taxEnabled, taxRate)}
                    </TableCell>
                  ))}
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Floating Bulk Action Bar */}
      {totalSelected > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-card/95 border border-border/80 shadow-[0_10px_38px_-10px_rgba(0,0,0,0.5)] backdrop-blur-md animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
              {totalSelected}
            </span>
            <span className="text-xs font-medium text-foreground">
              {selectedLabel} selecionado(s)
            </span>
          </div>

          <div className="h-4 w-[1px] bg-border" />

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={batchLoading}
              onClick={() => handleBatchToggle(false)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border border-amber-500/20 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {batchLoading ? <RiLoader4Line className="size-3.5 animate-spin" /> : <RiPauseCircleLine className="size-3.5" />}
              Desativar
            </button>

            <button
              type="button"
              disabled={batchLoading}
              onClick={() => handleBatchToggle(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {batchLoading ? <RiLoader4Line className="size-3.5 animate-spin" /> : <RiPlayCircleLine className="size-3.5" />}
              Ativar
            </button>

            <button
              type="button"
              disabled={batchLoading}
              onClick={() => setDeleteConfirmOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 border border-rose-500/20 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <RiDeleteBinLine className="size-3.5" />
              Excluir
            </button>
          </div>

          <div className="h-4 w-[1px] bg-border" />

          <button
            type="button"
            onClick={clearSelection}
            className="p-1 text-muted-foreground hover:text-foreground rounded-md transition-colors cursor-pointer"
            title="Desmarcar tudo"
          >
            <RiCloseLine className="size-4" />
          </button>
        </div>
      )}

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-rose-500 flex items-center gap-2">
              <RiDeleteBinLine className="size-5" />
              Excluir {totalSelected} item(ns) da Meta Ads?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a excluir permanentemente <strong>{selectedLabel}</strong> na sua conta do Meta Ads.
              Esta ação não pode ser desfeita e removerá os dados diretamente do seu Gerenciador de Anúncios.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={batchLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleBatchDelete();
              }}
              disabled={batchLoading}
              className="bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
            >
              {batchLoading ? (
                <>
                  <RiLoader4Line className="size-4 animate-spin mr-1.5" />
                  Excluindo...
                </>
              ) : (
                "Excluir definitivamente"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CampaignModals
        budgetModal={budgetModal} setBudgetModal={setBudgetModal}
        tagsModal={tagsModal} setTagsModal={setTagsModal}
        videoModal={videoModal} setVideoModal={setVideoModal}
        checkoutModal={checkoutModal} setCheckoutModal={setCheckoutModal}
        productModal={productModal} setProductModal={setProductModal}
        infoModal={infoModal} setInfoModal={setInfoModal}
        tagsMap={tagsMap} markersMap={markersMap}
        onBudgetChange={onBudgetChange} onSaveTags={onSaveTags} onSaveMarker={onSaveMarker}
      />

      <DeactivateConfirmModal
        open={deactivateModal.open}
        onOpenChange={(open) => { if (!open) setDeactivateModal(emptyDeactivate); }}
        entityName={deactivateModal.entityName}
        entityType={deactivateModal.entityType}
        metrics={deactivateModal.metrics}
        onConfirm={confirmDeactivate}
        loading={deactivateLoading}
      />
    </>
  );
}
