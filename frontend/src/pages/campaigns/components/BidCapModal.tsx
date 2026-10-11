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
import { RiFocus3Line, RiLoader4Line, RiFlashlightLine } from "@remixicon/react";

interface BidCapModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  adSetName: string;
  currentBidAmount: number | null | undefined;
  onSave: (newBidAmount: number) => Promise<void>;
}

export function BidCapModal({
  open,
  onOpenChange,
  adSetName,
  currentBidAmount,
  onSave,
}: BidCapModalProps) {
  const initialValue = currentBidAmount && currentBidAmount > 0 ? String(currentBidAmount) : "";
  const [value, setValue] = useState(initialValue);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setValue(currentBidAmount && currentBidAmount > 0 ? String(currentBidAmount) : "");
    }
  }, [open, currentBidAmount]);

  const handleSave = async () => {
    const num = parseFloat(value.replace(",", "."));
    if (!isNaN(num) && num > 0) {
      setLoading(true);
      try {
        await onSave(num);
        onOpenChange(false);
      } finally {
        setLoading(false);
      }
    }
  };

  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
    });

  const handleQuickAdd = (amount: number) => {
    const current = parseFloat(value.replace(",", ".")) || (currentBidAmount ?? 0);
    const next = Math.max(1, current + amount);
    setValue(String(Math.round(next * 100) / 100));
  };

  const handleSetPreset = (target: number) => {
    setValue(String(target));
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !loading && onOpenChange(o)}>
      <DialogContent className="sm:max-w-[420px] border-border/60 shadow-2xl backdrop-blur-md">
        <DialogHeader className="gap-1">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <RiFocus3Line className="size-4" />
            </div>
            <DialogTitle className="text-base font-semibold">
              Alterar Bid Cap (Teto de Lance)
            </DialogTitle>
          </div>
          <DialogDescription className="line-clamp-2 break-words text-xs text-muted-foreground" title={adSetName}>
            {adSetName}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-3">
          <div className="grid gap-2">
            <Label htmlFor="bid-cap-value" className="text-xs font-medium text-foreground/80">
              Novo teto de lance (Bid Cap)
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                R$
              </span>
              <Input
                id="bid-cap-value"
                type="number"
                min={1}
                step={1}
                placeholder="Ex: 90.00"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="pl-9 text-base font-semibold tracking-tight tabular-nums h-10 border-border/70 focus-visible:ring-emerald-500/30"
                onKeyDown={(e) => e.key === "Enter" && !loading && handleSave()}
                autoFocus
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
              <span>
                Lance atual:{" "}
                <strong className="text-foreground/90 font-medium">
                  {currentBidAmount ? fmt(currentBidAmount) : "Sem teto definido"}
                </strong>
              </span>
            </div>

            {/* Quick Chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-2">
              <span className="text-[10px] uppercase font-semibold text-muted-foreground mr-1 flex items-center gap-1">
                <RiFlashlightLine className="size-3 text-amber-500" />
                Atalhos:
              </span>
              <button
                type="button"
                onClick={() => handleSetPreset(50)}
                className="px-2 py-0.5 rounded text-[11px] bg-muted/70 hover:bg-muted text-foreground/80 hover:text-foreground border border-border/50 transition-colors"
              >
                R$ 50
              </button>
              <button
                type="button"
                onClick={() => handleSetPreset(90)}
                className="px-2 py-0.5 rounded text-[11px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
              >
                R$ 90
              </button>
              <button
                type="button"
                onClick={() => handleSetPreset(120)}
                className="px-2 py-0.5 rounded text-[11px] bg-muted/70 hover:bg-muted text-foreground/80 hover:text-foreground border border-border/50 transition-colors"
              >
                R$ 120
              </button>
              <button
                type="button"
                onClick={() => handleQuickAdd(10)}
                className="px-2 py-0.5 rounded text-[11px] bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/40 transition-colors"
              >
                +R$ 10
              </button>
              <button
                type="button"
                onClick={() => handleQuickAdd(20)}
                className="px-2 py-0.5 rounded text-[11px] bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/40 transition-colors"
              >
                +R$ 20
              </button>
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed pt-2">
              💡 O Meta Ads aplicará este teto de lance diretamente no leilão de conversões do conjunto.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" size="sm" disabled={loading} onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            size="sm"
            disabled={loading || !value || parseFloat(value) <= 0}
            onClick={handleSave}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
          >
            {loading ? (
              <>
                <RiLoader4Line className="size-3.5 animate-spin mr-1.5" />
                Salvando na Meta...
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
