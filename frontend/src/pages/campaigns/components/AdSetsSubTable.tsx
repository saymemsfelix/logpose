import { useState } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  RiArrowDownSFill,
  RiPencilLine,
  RiFocus3Line,
  RiAddLine,
  RiFileCopyLine,
  RiEditLine,
  RiMoreFill,
  RiMoneyDollarCircleLine,
} from "@remixicon/react";
import { cn } from "@/lib/utils";
import type { CampaignAdSetData } from "@/services/campaigns";
import { allColumns } from "./columnPresets";
import { getCellValue, fmt } from "./campaignCellHelpers";
import { AdsSubTable } from "./AdsSubTable";
import { adsetToMetricRow } from "./mappers";
import { useKpiColorsContext } from "./KpiColorsContext";
import { TooltipTableHead } from "./TooltipTableHead";
import { BudgetModal } from "./BudgetModal";
import { BidCapModal } from "./BidCapModal";
import { EditAdSetModal } from "./EditAdSetModal";

interface AdSetsSubTableProps {
  adSets: CampaignAdSetData[];
  columns: string[];
  onToggle: (entityId: string, entityType: "campaign" | "adset" | "ad", active: boolean) => Promise<void>;
  onBudgetChange: (entityId: string, entityType: "campaign" | "adset", dailyBudget: number, entityName?: string, budgetBefore?: number, metrics?: Record<string, number>) => Promise<void>;
  onBidCapChange?: (adSetId: string, newBid: number, name?: string) => Promise<void>;
  onEditAdSet?: (adSetId: string, data: { name?: string; daily_budget?: number; bid_amount?: number; status?: string }) => Promise<void>;
  onDuplicateAdSet?: (adSet: CampaignAdSetData) => void;
  onAddNewAdSet?: () => void;
  taxEnabled?: boolean;
  taxRate?: number;
  selectedAdSetIds?: Set<string>;
  onToggleSelectAdSet?: (adSetId: string) => void;
  onSelectAllAdSets?: (adSetIds: string[], shouldSelect: boolean) => void;
  selectedAdIds?: Set<string>;
  onToggleSelectAd?: (adId: string) => void;
  onSelectAllAds?: (adIds: string[], shouldSelect: boolean) => void;
}

export function AdSetsSubTable({
  adSets,
  columns,
  onToggle,
  onBudgetChange,
  onBidCapChange,
  onEditAdSet,
  onDuplicateAdSet,
  onAddNewAdSet,
  taxEnabled = false,
  taxRate = 0,
  selectedAdSetIds,
  onToggleSelectAdSet,
  onSelectAllAdSets,
  selectedAdIds,
  onToggleSelectAd,
  onSelectAllAds,
}: AdSetsSubTableProps) {
  const [expandedAdSetId, setExpandedAdSetId] = useState<string | null>(null);
  const [budgetAdSet, setBudgetAdSet] = useState<CampaignAdSetData | null>(null);
  const [bidCapAdSet, setBidCapAdSet] = useState<CampaignAdSetData | null>(null);
  const [editingAdSet, setEditingAdSet] = useState<CampaignAdSetData | null>(null);

  const visibleCols = columns.filter((c) => c !== "name");
  const kpiColors = useKpiColorsContext();

  const allAdSetIds = adSets.map((as_) => as_.id);
  const allAdSetsSelected = allAdSetIds.length > 0 && allAdSetIds.every((id) => selectedAdSetIds?.has(id));
  const someAdSetsSelected = allAdSetIds.some((id) => selectedAdSetIds?.has(id));

  const handleAdSetClick = (id: string) => {
    setExpandedAdSetId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="bg-muted/20 border-t border-border/30">
      {/* Subtable header bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-muted/40 border-b border-border/30">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-foreground/90">
            Conjuntos de Anúncios ({adSets.length})
          </span>
        </div>
        {onAddNewAdSet && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onAddNewAdSet(); }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 border border-primary/25 transition-colors cursor-pointer shadow-xs"
          >
            <RiAddLine className="size-3.5" />
            Novo Conjunto
          </button>
        )}
      </div>

      {adSets.length === 0 ? (
        <div className="py-6 px-4 text-center">
          <p className="text-xs text-muted-foreground mb-2">
            Nenhum conjunto de anúncio encontrado nesta campanha.
          </p>
          {onAddNewAdSet && (
            <button
              type="button"
              onClick={onAddNewAdSet}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <RiAddLine className="size-3.5" />
              Criar Primeiro Conjunto
            </button>
          )}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="text-xs">
              <TableHead className="w-10 px-3 text-center">
                <Checkbox
                  checked={allAdSetsSelected ? true : someAdSetsSelected ? "indeterminate" : false}
                  onCheckedChange={(checked) => {
                    onSelectAllAdSets?.(allAdSetIds, !!checked);
                  }}
                  aria-label="Selecionar todos os conjuntos"
                  className="translate-y-[2px]"
                />
              </TableHead>
              <TooltipTableHead colKey="name" label="Conjunto" className="pl-2 min-w-[200px]" />
              {visibleCols.map((col) => (
                <TooltipTableHead key={col} colKey={col} label={allColumns[col] || col} className="text-right" />
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {adSets.map((as_) => {
              const isExpanded = expandedAdSetId === as_.id;
              const isActive = as_.status === "active";
              const row = adsetToMetricRow(as_);
              const hasBudget = as_.budget > 0;
              const hasBidCap = as_.bid_amount !== undefined && as_.bid_amount !== null && as_.bid_amount > 0;
              const isSelected = selectedAdSetIds?.has(as_.id) ?? false;

              return (
                <div key={as_.id} className="contents">
                  <TableRow
                    className={cn(
                      "text-xs cursor-pointer transition-colors",
                      isExpanded && "bg-muted/20",
                      isSelected && "bg-primary/5"
                    )}
                    onClick={() => handleAdSetClick(as_.id)}
                  >
                    <TableCell className="w-10 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => onToggleSelectAdSet?.(as_.id)}
                        aria-label={`Selecionar conjunto ${as_.name}`}
                        className="translate-y-[2px]"
                      />
                    </TableCell>
                    <TableCell className="pl-2">
                      <div className="flex flex-col gap-1 py-1">
                        <div className="flex items-center gap-2">
                          <RiArrowDownSFill
                            className={cn(
                              "size-3.5 shrink-0 text-muted-foreground transition-transform duration-200",
                              isExpanded ? "rotate-0" : "-rotate-90"
                            )}
                          />
                          <Switch
                            size="sm"
                            className="after:pointer-events-none"
                            checked={isActive}
                            onCheckedChange={async (checked) => {
                              await onToggle(as_.id, "adset", checked);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            onPointerDown={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                            onKeyDown={(e) => e.stopPropagation()}
                          />
                          <span className="font-medium truncate max-w-[220px] block" title={as_.name}>
                            {as_.name}
                          </span>

                          {/* Dropdown Menu for Ad Set actions */}
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              onClick={(e) => e.stopPropagation()}
                              className="size-5 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors ml-auto cursor-pointer"
                              title="Opções do Conjunto"
                            >
                              <RiMoreFill className="size-3.5" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-48 text-xs">
                              <DropdownMenuItem
                                onClick={(e) => { e.stopPropagation(); setBidCapAdSet(as_); }}
                                className="gap-2 cursor-pointer"
                              >
                                <RiFocus3Line className="size-3.5 text-emerald-500" />
                                <span>Alterar Bid Cap (Lance)</span>
                              </DropdownMenuItem>

                              {hasBudget && (
                                <DropdownMenuItem
                                  onClick={(e) => { e.stopPropagation(); setBudgetAdSet(as_); }}
                                  className="gap-2 cursor-pointer"
                                >
                                  <RiMoneyDollarCircleLine className="size-3.5 text-muted-foreground" />
                                  <span>Alterar Orçamento</span>
                                </DropdownMenuItem>
                              )}

                              <DropdownMenuItem
                                onClick={(e) => { e.stopPropagation(); setEditingAdSet(as_); }}
                                className="gap-2 cursor-pointer"
                              >
                                <RiEditLine className="size-3.5 text-indigo-500" />
                                <span>Editar Conjunto</span>
                              </DropdownMenuItem>

                              {onDuplicateAdSet && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={(e) => { e.stopPropagation(); onDuplicateAdSet(as_); }}
                                    className="gap-2 cursor-pointer"
                                  >
                                    <RiFileCopyLine className="size-3.5 text-muted-foreground" />
                                    <span>Duplicar Conjunto</span>
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* Badges line: Budget & Bid Cap */}
                        <div className="flex flex-wrap items-center gap-1.5 pl-9 relative z-10">
                          {hasBudget && (
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-muted-foreground tabular-nums">
                                {fmt(as_.budget)}/dia
                              </span>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setBudgetAdSet(as_); }}
                                className="text-muted-foreground hover:text-foreground transition-colors"
                                title="Editar orçamento"
                              >
                                <RiPencilLine className="size-2.5" />
                              </button>
                            </div>
                          )}

                          {/* Bid Cap Badge / Button */}
                          {hasBidCap ? (
                            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              <RiFocus3Line className="size-2.5" />
                              <span className="text-[10px] font-semibold tabular-nums">
                                Bid Cap: {fmt(as_.bid_amount!)}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setBidCapAdSet(as_); }}
                                className="text-emerald-600 dark:text-emerald-400 hover:opacity-80 transition-opacity ml-0.5"
                                title="Alterar Bid Cap"
                              >
                                <RiPencilLine className="size-2.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setBidCapAdSet(as_); }}
                              className="text-[10px] text-muted-foreground/80 hover:text-emerald-500 hover:underline transition-colors flex items-center gap-0.5"
                              title="Definir Bid Cap (teto de lance)"
                            >
                              <RiFocus3Line className="size-2.5" />
                              + Bid Cap
                            </button>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    {visibleCols.map((col) => (
                      <TableCell key={col} className="text-right tabular-nums">
                        {getCellValue(row, col, kpiColors, taxEnabled, taxRate)}
                      </TableCell>
                    ))}
                  </TableRow>
                  {isExpanded && as_.ads.length > 0 && (
                    <TableRow key={`${as_.id}-ads`}>
                      <TableCell colSpan={visibleCols.length + 2} className="p-0">
                        <AdsSubTable
                          ads={as_.ads}
                          columns={columns}
                          onToggle={onToggle}
                          taxEnabled={taxEnabled}
                          taxRate={taxRate}
                          selectedAdIds={selectedAdIds}
                          onToggleSelectAd={onToggleSelectAd}
                          onSelectAllAds={onSelectAllAds}
                        />
                      </TableCell>
                    </TableRow>
                  )}
                </div>
              );
            })}
          </TableBody>
        </Table>
      )}

      {/* Budget Modal */}
      {budgetAdSet && (
        <BudgetModal
          open={!!budgetAdSet}
          onOpenChange={(open) => { if (!open) setBudgetAdSet(null); }}
          campaignName={budgetAdSet.name}
          currentBudget={budgetAdSet.budget}
          onSave={async (newBudget) => {
            const a = budgetAdSet;
            await onBudgetChange(
              a.id, "adset", newBudget, a.name, a.budget,
              { spend: a.spend, revenue: a.revenue, profit: a.profit, sales: a.sales, roas: a.roas, cpa: a.cpa, cpc: a.cpc, ctr: a.ctr, clicks: a.clicks, impressions: a.impressions },
            );
            setBudgetAdSet(null);
          }}
        />
      )}

      {/* Bid Cap Modal */}
      {bidCapAdSet && onBidCapChange && (
        <BidCapModal
          open={!!bidCapAdSet}
          onOpenChange={(open) => { if (!open) setBidCapAdSet(null); }}
          adSetName={bidCapAdSet.name}
          currentBidAmount={bidCapAdSet.bid_amount}
          onSave={async (newBid) => {
            if (bidCapAdSet) {
              await onBidCapChange(bidCapAdSet.id, newBid, bidCapAdSet.name);
            }
          }}
        />
      )}

      {/* Edit Ad Set Modal */}
      {editingAdSet && onEditAdSet && (
        <EditAdSetModal
          open={!!editingAdSet}
          onOpenChange={(open) => { if (!open) setEditingAdSet(null); }}
          adSet={editingAdSet}
          onSave={async (data) => {
            if (editingAdSet) {
              await onEditAdSet(editingAdSet.id, data);
            }
          }}
        />
      )}
    </div>
  );
}
