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
import { RiEditLine, RiLoader4Line, RiFocus3Line } from "@remixicon/react";
import type { CampaignAdSetData } from "@/services/campaigns";

interface EditAdSetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  adSet: CampaignAdSetData | null;
  onSave: (data: {
    name?: string;
    daily_budget?: number;
    bid_amount?: number;
    status?: string;
  }) => Promise<void>;
}

export function EditAdSetModal({
  open,
  onOpenChange,
  adSet,
  onSave,
}: EditAdSetModalProps) {
  const [name, setName] = useState("");
  const [budget, setBudget] = useState("");
  const [bidAmount, setBidAmount] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (adSet && open) {
      setName(adSet.name || "");
      setBudget(adSet.budget > 0 ? String(adSet.budget) : "");
      setBidAmount(adSet.bid_amount && adSet.bid_amount > 0 ? String(adSet.bid_amount) : "");
      setIsActive(adSet.status === "active");
    }
  }, [adSet, open]);

  if (!adSet) return null;

  const hasBudget = adSet.budget > 0;

  const handleSave = async () => {
    setLoading(true);
    try {
      const payload: {
        name?: string;
        daily_budget?: number;
        bid_amount?: number;
        status?: string;
      } = {};

      if (name.trim() !== adSet.name) {
        payload.name = name.trim();
      }

      const numBudget = parseFloat(budget.replace(",", "."));
      if (hasBudget && !isNaN(numBudget) && numBudget > 0 && numBudget !== adSet.budget) {
        payload.daily_budget = numBudget;
      }

      const numBid = parseFloat(bidAmount.replace(",", "."));
      if (!isNaN(numBid) && numBid > 0 && numBid !== (adSet.bid_amount ?? 0)) {
        payload.bid_amount = numBid;
      }

      const newStatus = isActive ? "ACTIVE" : "PAUSED";
      const currStatus = adSet.status === "active" ? "ACTIVE" : "PAUSED";
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
            <div className="flex size-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
              <RiEditLine className="size-4" />
            </div>
            <DialogTitle className="text-base font-semibold">
              Editar Conjunto de Anúncios
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground flex items-center gap-2">
            <span>ID: <code className="text-[11px] bg-muted/60 px-1 py-0.5 rounded font-mono">{adSet.id}</code></span>
            <span>• {adSet.ads.length} anúncio(s) vinculados</span>
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-3">
          {/* Status switch */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold text-foreground">Status do Conjunto</span>
              <span className="text-[11px] text-muted-foreground">
                {isActive ? "Ativo (veiculando no Meta)" : "Pausado"}
              </span>
            </div>
            <Switch
              checked={isActive}
              onCheckedChange={setIsActive}
              disabled={loading}
            />
          </div>

          {/* Nome do Conjunto */}
          <div className="grid gap-1.5">
            <Label htmlFor="adset-name" className="text-xs font-medium text-foreground/80">
              Nome do Conjunto
            </Label>
            <Input
              id="adset-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Aberto 25-45 | H+M"
              className="text-xs h-9 border-border/70"
              disabled={loading}
            />
          </div>

          {/* Bid Cap / Teto de Lance */}
          <div className="grid gap-1.5 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
            <div className="flex items-center justify-between">
              <Label htmlFor="adset-bid" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <RiFocus3Line className="size-3.5 text-emerald-500" />
                Teto de Lance (Bid Cap)
              </Label>
              <span className="text-[10px] text-muted-foreground">Opcional</span>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                R$
              </span>
              <Input
                id="adset-bid"
                type="number"
                min={1}
                step={1}
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                placeholder="Ex: 90.00"
                className="pl-9 text-xs font-semibold tabular-nums h-9 border-emerald-500/30 focus-visible:ring-emerald-500/30"
                disabled={loading}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Define o lance máximo por conversão no leilão do Meta Ads.
            </p>
          </div>

          {/* Orçamento Diário (se conjunto tiver orçamento próprio / ABO) */}
          {hasBudget && (
            <div className="grid gap-1.5">
              <Label htmlFor="adset-budget" className="text-xs font-medium text-foreground/80">
                Orçamento Diário do Conjunto (ABO)
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                  R$
                </span>
                <Input
                  id="adset-budget"
                  type="number"
                  min={1}
                  step={10}
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="Ex: 50.00"
                  className="pl-9 text-xs font-semibold tabular-nums h-9 border-border/70"
                  disabled={loading}
                />
              </div>
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
