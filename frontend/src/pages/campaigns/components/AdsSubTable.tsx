import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { CampaignAdData } from "@/services/campaigns";
import { allColumns } from "./columnPresets";
import { getCellValue } from "./campaignCellHelpers";
import { adToMetricRow } from "./mappers";
import { useKpiColorsContext } from "./KpiColorsContext";
import { TooltipTableHead } from "./TooltipTableHead";

interface AdsSubTableProps {
  ads: CampaignAdData[];
  columns: string[];
  onToggle: (entityId: string, entityType: "campaign" | "adset" | "ad", active: boolean) => Promise<void>;
  taxEnabled?: boolean;
  taxRate?: number;
  selectedAdIds?: Set<string>;
  onToggleSelectAd?: (adId: string) => void;
  onSelectAllAds?: (adIds: string[], shouldSelect: boolean) => void;
}

export function AdsSubTable({
  ads,
  columns,
  onToggle,
  taxEnabled = false,
  taxRate = 0,
  selectedAdIds,
  onToggleSelectAd,
  onSelectAllAds,
}: AdsSubTableProps) {
  const visibleCols = columns.filter((c) => c !== "name");
  const kpiColors = useKpiColorsContext();

  const allAdIds = ads.map((ad) => ad.id);
  const allAdsSelected = allAdIds.length > 0 && allAdIds.every((id) => selectedAdIds?.has(id));
  const someAdsSelected = allAdIds.some((id) => selectedAdIds?.has(id));

  if (ads.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-2 pl-20">
        Nenhum anúncio encontrado.
      </p>
    );
  }

  return (
    <div className="bg-muted/10 border-t border-border/20">
      <Table>
        <TableHeader>
          <TableRow className="text-[10px]">
            <TableHead className="w-10 px-3 text-center">
              <Checkbox
                checked={allAdsSelected ? true : someAdsSelected ? "indeterminate" : false}
                onCheckedChange={(checked) => {
                  onSelectAllAds?.(allAdIds, !!checked);
                }}
                aria-label="Selecionar todos os anúncios"
                className="translate-y-[2px]"
              />
            </TableHead>
            <TooltipTableHead colKey="name" label="Anúncio" className="pl-6 min-w-[180px]" />
            {visibleCols.map((col) => (
              <TooltipTableHead key={col} colKey={col} label={allColumns[col] || col} className="text-right" />
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {ads.map((ad) => {
            const row = adToMetricRow(ad);
            const isSelected = selectedAdIds?.has(ad.id) ?? false;
            return (
              <TableRow
                key={ad.id}
                className={cn("text-xs transition-colors", isSelected && "bg-primary/5")}
              >
                <TableCell className="w-10 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onToggleSelectAd?.(ad.id)}
                    aria-label={`Selecionar anúncio ${ad.name}`}
                    className="translate-y-[2px]"
                  />
                </TableCell>
                <TableCell className="pl-6">
                  <div className="flex items-center gap-2">
                    <Switch
                      size="sm"
                      className="after:pointer-events-none"
                      checked={ad.status === "active"}
                      onCheckedChange={async (checked) => {
                        await onToggle(ad.id, "ad", checked);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      onPointerDown={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    />
                    <span className="font-medium truncate max-w-[180px] block" title={ad.name}>
                      {ad.name}
                    </span>
                  </div>
                </TableCell>
                {visibleCols.map((col) => (
                  <TableCell key={col} className="text-right tabular-nums">
                    {getCellValue(row, col, kpiColors, taxEnabled, taxRate)}
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
