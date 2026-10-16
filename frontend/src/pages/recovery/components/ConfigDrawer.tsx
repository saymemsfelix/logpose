import { useState, useEffect } from "react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  RiWhatsappLine, RiMailLine, RiMessage2Line,
  RiArrowGoBackLine, RiCheckLine, RiRobotLine, RiFilterLine,
} from "@remixicon/react";
import { CustomChannelsSection } from "./CustomChannelsSection";
import { EvolutionConfigSection } from "./EvolutionConfigSection";
import type { ChannelConfig, CustomChannelPayload } from "@/services/recovery";

const DEFAULT_META: Record<string, { label: string; icon: typeof RiWhatsappLine }> = {
  whatsapp: { label: "WhatsApp", icon: RiWhatsappLine },
  email: { label: "Email", icon: RiMailLine },
  sms: { label: "SMS", icon: RiMessage2Line },
  back_redirect: { label: "BackRedirect", icon: RiArrowGoBackLine },
};

interface ConfigDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  configs: ChannelConfig[];
  onSave: (configs: ChannelConfig[]) => Promise<void>;
  onAddCustom: (payload: CustomChannelPayload) => Promise<void>;
  onRemoveCustom: (channel: string) => Promise<void>;
  isSaving: boolean;
}

export function ConfigDrawer({
  open, onOpenChange, configs, onSave,
  onAddCustom, onRemoveCustom, isSaving,
}: ConfigDrawerProps) {
  const [activeTab, setActiveTab] = useState<"src" | "evolution">("src");
  const [draft, setDraft] = useState<Record<string, string>>({});

  useEffect(() => {
    const map: Record<string, string> = {};
    configs.forEach((c) => { map[c.channel] = c.keyword; });
    setDraft(map);
  }, [configs]);

  const handleChange = (channel: string, keyword: string) => {
    setDraft((prev) => ({ ...prev, [channel]: keyword }));
  };

  const handleSave = async () => {
    const updated = Object.entries(draft).map(([channel, keyword]) => ({
      channel, keyword,
    }));
    await onSave(updated);
    onOpenChange(false);
  };

  const defaultConfigs = configs.filter((c) => !c.is_custom);
  const customConfigs = configs.filter((c) => c.is_custom);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[420px] sm:w-[480px] flex flex-col">
        <SheetHeader>
          <SheetTitle className="text-base font-semibold">Configuração de Recuperação</SheetTitle>
          <SheetDescription className="text-xs">
            Gerencie o robô de envio via WhatsApp e o mapeamento de canais por SRC.
          </SheetDescription>
        </SheetHeader>

        {/* Tab Selector */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900/90 rounded-lg border border-border/40 mt-3">
          <button
            type="button"
            onClick={() => setActiveTab("src")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-medium transition-all cursor-pointer ${
              activeTab === "src"
                ? "bg-slate-800 text-white shadow-sm border border-border/60"
                : "text-muted-foreground hover:text-white"
            }`}
          >
            <RiFilterLine className="size-3.5" />
            <span>Mapeamento SRC</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("evolution")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "evolution"
                ? "bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/40 shadow-sm"
                : "text-muted-foreground hover:text-[#25D366]"
            }`}
          >
            <RiRobotLine className="size-3.5" />
            <span>Robô WhatsApp (Evolution)</span>
          </button>
        </div>

        <div className="flex flex-col gap-4 py-4 px-1 overflow-y-auto flex-1">
          {activeTab === "evolution" ? (
            <EvolutionConfigSection />
          ) : (
            <>
              {/* Canais Padrão */}
              <div className="space-y-3">
                {defaultConfigs.map((cfg) => {
                  const meta = DEFAULT_META[cfg.channel];
                  const Icon = meta?.icon ?? RiArrowGoBackLine;
                  const labelText = cfg.label || meta?.label || cfg.channel;
                  return (
                    <div key={cfg.channel} className="space-y-1.5">
                      <Label className="text-xs flex items-center gap-1.5">
                        <Icon className="size-3.5" />
                        {labelText}
                      </Label>
                      <Input
                        value={draft[cfg.channel] || ""}
                        onChange={(e) => handleChange(cfg.channel, e.target.value)}
                        placeholder={`Ex: ${cfg.channel}`}
                        className="h-8 text-xs font-mono"
                        disabled={isSaving}
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Se o src contiver:{" "}
                        <code className="bg-muted px-1 rounded">{draft[cfg.channel] || "—"}</code>
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Canais Personalizados */}
              <CustomChannelsSection
                customConfigs={customConfigs}
                onAdd={onAddCustom}
                onRemove={onRemoveCustom}
                isSaving={isSaving}
              />

              {/* Info */}
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">
                  Como funciona
                </p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  O campo <code className="bg-muted px-1 rounded text-[10px]">src</code> da transação é
                  comparado com os valores acima. O que não for identificado será classificado como{" "}
                  <strong>Outro</strong>.
                </p>
              </div>
            </>
          )}
        </div>

        {activeTab === "src" && (
          <SheetFooter className="px-6 pb-6 border-t border-border/40 pt-3">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full gap-1.5 text-xs font-semibold cursor-pointer"
            >
              <RiCheckLine className="size-4" />
              {isSaving ? "Salvando..." : "Salvar Configuração SRC"}
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
