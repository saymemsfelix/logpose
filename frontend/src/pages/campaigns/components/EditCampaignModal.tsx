import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { RiEditLine, RiLoader4Line } from "@remixicon/react";
import type { CampaignData } from "@/services/campaigns";

interface EditCampaignModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: CampaignData | null;
  onSave: (data: { name?: string; daily_budget?: number; status?: string }) => Promise<void>;
}

export function EditCampaignModal({
  open,
  onOpenChange,
  campaign,
  onSave,
}: EditCampaignModalProps) {
  const [name, setName] = useState("");
  const [budget, setBudget] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (campaign && open) {
      setName(campaign.name || "");
      setBudget(campaign.budget > 0 ? String(campaign.budget) : "");
      setIsActive(campaign.status === "active");
    }
  }, [campaign, open]);

  if (!campaign) return null;

  const isCbo = campaign.budget_type !== "ABO";

  const handleSave = async () => {
    setLoading(true);
    try {
      const payload: { name?: string; daily_budget?: number; status?: string } = {};

      if (name.trim() !== campaign.name) {
        payload.name = name.trim();
      }

      const numBudget = parseFloat(budget.replace(",", "."));
      if (isCbo && !isNaN(numBudget) && numBudget > 0 && numBudget !== campaign.budget) {
        payload.daily_budget = numBudget;
      }

      const newStatus = isActive ? "ACTIVE" : "PAUSED";
      const currStatus = campaign.status === "active" ? "ACTIVE" : "PAUSED";
      if (newStatus !== currStatus) {
        payload.status = newStatus;
      }

      await onSave(payload);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !loading && onOpenChange(o)}>
      <DialogContent className="sm:max-w-[460px] border-border/60 shadow-2xl backdrop-blur-md">
        <DialogHeader className="gap-1">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
              <RiEditLine className="size-4" />
            </div>
            <DialogTitle className="text-base font-semibold">
              Editar Campanha (Meta Ads)
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground flex items-center gap-2">
            <span>ID: <code className="text-[11px] bg-muted/60 px-1 py-0.5 rounded font-mono">{campaign.id}</code></span>
            <Badge variant="outline" className="text-[10px] font-normal uppercase py-0 px-1.5">
              {campaign.budget_type}
            </Badge>
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-3">
          {/* Status switch */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold text-foreground">Veiculação da Campanha</span>
              <span className="text-[11px] text-muted-foreground">
                {isActive ? "Ativa (veiculando anúncios no Meta)" : "Pausada"}
              </span>
            </div>
            <Switch
              checked={isActive}
              onCheckedChange={setIsActive}
              disabled={loading}
            />
          </div>

          {/* Nome da Campanha */}
          <div className="grid gap-1.5">
            <Label htmlFor="camp-name" className="text-xs font-medium text-foreground/80">
              Nome da Campanha
            </Label>
            <Input
              id="camp-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: [CBO] VSL 01 - Escala"
              className="text-xs h-9 border-border/70"
              disabled={loading}
            />
          </div>

          {/* Orçamento Diário (se CBO) */}
          {isCbo ? (
            <div className="grid gap-1.5">
              <Label htmlFor="camp-budget" className="text-xs font-medium text-foreground/80">
                Orçamento Diário (CBO)
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                  R$
                </span>
                <Input
                  id="camp-budget"
                  type="number"
                  min={1}
                  step={10}
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="Ex: 100.00"
                  className="pl-9 text-xs font-semibold tabular-nums h-9 border-border/70"
                  disabled={loading}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Distribuído automaticamente pelo Meta Ads entre os conjuntos desta campanha.
              </p>
            </div>
          ) : (
            <div className="p-2.5 rounded-lg bg-muted/20 border border-border/40 text-[11px] text-muted-foreground">
              Esta campanha utiliza orçamento nos conjuntos (ABO). O orçamento pode ser editado diretamente em cada conjunto.
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" size="sm" disabled={loading} onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            size="sm"
            disabled={loading || !name.trim()}
            onClick={handleSave}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
          >
            {loading ? (
              <>
                <RiLoader4Line className="size-3.5 animate-spin mr-1.5" />
                Salvando alterações...
              </>
            ) : (
              "Salvar no Meta Ads"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
