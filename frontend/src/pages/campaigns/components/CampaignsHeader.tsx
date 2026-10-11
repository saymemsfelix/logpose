import {
  RiMegaphoneLine,
  RiSearchLine,
  RiAddLine,
  RiSettings3Line,
  RiPercentLine,
  RiShieldCheckLine,
  RiFireLine,
  RiCalculatorLine,
  RiLinkM,
} from "@remixicon/react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { ColumnPreset } from "./columnPresets";
import { BlurToggle, type BlurState } from "./BlurToggle";
import { UtmParamsGuide } from "./UtmParamsGuide";
import { RefreshButton } from "@/components/RefreshButton";
import type { UnidentifiedProduct } from "@/services/campaigns";
import { PresetTab } from "./PresetTab";

interface CampaignsHeaderProps {
  search: string;
  onSearchChange: (value: string) => void;
  presets: ColumnPreset[];
  activePresetId: string;
  onPresetChange: (id: string) => void;
  onCreatePreset: () => void;
  onEditPreset?: (preset: ColumnPreset) => void;
  onDeletePreset?: (presetId: string) => void;
  blur: BlurState;
  onBlurChange: (blur: BlurState) => void;
  unidentifiedProducts?: UnidentifiedProduct[];
  onRefresh: () => Promise<void>;
  onOpenSettings: () => void;
  /** IDs of built-in (non-editable) presets */
  defaultPresetIds?: string[];
  taxEnabled?: boolean;
  onTaxEnabledChange?: (enabled: boolean) => void;
  taxRate?: number;
}

export function CampaignsHeader({
  search, onSearchChange,
  presets, activePresetId, onPresetChange, onCreatePreset,
  onEditPreset, onDeletePreset,
  blur, onBlurChange, unidentifiedProducts, onRefresh, onOpenSettings,
  defaultPresetIds = [],
  taxEnabled = false,
  onTaxEnabledChange,
  taxRate = 0,
}: CampaignsHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2.5">
            <RiMegaphoneLine className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Campanhas</h1>
            <p className="text-sm text-muted-foreground">
              Performance com vendas reais
            </p>
          </div>

          <div className="hidden lg:flex items-center gap-1.5 ml-4 pl-4 border-l border-border/50">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/guardian")}
              className="h-8 text-xs gap-1.5 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
              title="O Guardião de Lucro (Stop-Loss Automático)"
            >
              <RiShieldCheckLine className="size-3.5" />
              Guardião
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/creative-fatigue")}
              className="h-8 text-xs gap-1.5 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
              title="Radar de Fadiga de Criativos"
            >
              <RiFireLine className="size-3.5" />
              Fadiga
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/simulator")}
              className="h-8 text-xs gap-1.5 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
              title="Simulador de Breakeven & Escala"
            >
              <RiCalculatorLine className="size-3.5" />
              Simulador
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/utm-builder")}
              className="h-8 text-xs gap-1.5 border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
              title="Gerador de UTMs & Script"
            >
              <RiLinkM className="size-3.5" />
              UTMs
            </Button>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
          <div className="relative w-full sm:w-auto">
            <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Buscar campanha..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 w-full sm:w-[220px] h-9 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="gap-1.5 h-9 hidden sm:flex"
              onClick={() => navigate("/campaigns/create")}
            >
              <RiAddLine className="size-4" />
              Nova Campanha
            </Button>
            <BlurToggle
              blur={blur}
              onBlurChange={onBlurChange}
              unidentifiedProducts={unidentifiedProducts}
            />
            <UtmParamsGuide />
            <Button
              variant="outline"
              size="icon"
              className="size-9"
              onClick={onOpenSettings}
              title="Configurações dos KPIs"
            >
              <RiSettings3Line className="size-4" />
            </Button>
            <RefreshButton onRefresh={onRefresh} />
            {onTaxEnabledChange && (
              <div className="flex items-center gap-1.5 border-l border-border/40 pl-2.5 ml-1">
                <RiPercentLine className="size-3.5 text-muted-foreground" />
                <Label htmlFor="campaigns-tax-toggle" className="text-xs cursor-pointer select-none whitespace-nowrap">
                  Impostos
                </Label>
                <Switch
                  id="campaigns-tax-toggle"
                  checked={taxEnabled}
                  onCheckedChange={onTaxEnabledChange}
                  className="scale-90"
                />
                {taxEnabled && taxRate > 0 && (
                  <span className="text-xs font-semibold text-destructive tabular-nums whitespace-nowrap">
                    -{taxRate}%
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Preset tabs */}
      <div className="flex items-center gap-1 p-0.5 rounded-lg bg-muted/60 border border-border/40 w-fit overflow-x-auto max-w-full">
        {presets.map((preset) => {
          const isDefault = defaultPresetIds.includes(preset.id);
          return (
            <PresetTab
              key={preset.id}
              preset={preset}
              isActive={activePresetId === preset.id}
              isDefault={isDefault}
              onClick={() => onPresetChange(preset.id)}
              onEdit={onEditPreset && !isDefault ? () => onEditPreset(preset) : undefined}
              onDelete={onDeletePreset && !isDefault ? () => onDeletePreset(preset.id) : undefined}
            />
          );
        })}
        <Button
          variant="ghost"
          size="icon"
          className="size-9 rounded-md text-muted-foreground hover:text-foreground"
          onClick={onCreatePreset}
        >
          <RiAddLine className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
