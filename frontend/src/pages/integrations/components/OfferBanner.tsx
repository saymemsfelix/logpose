import { RiAddLine } from "@remixicon/react";
import { Button } from "@/components/ui/button";

interface OfferBannerProps {
  onConfigureOffer?: () => void;
}

export function OfferBanner({ onConfigureOffer }: OfferBannerProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border/40 bg-card/60 p-4 sm:p-5 shadow-xs backdrop-blur-xs">
      <div>
        <div className="text-[14px] font-medium text-foreground">Configure sua nova oferta</div>
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          Configure o rastreamento da sua oferta em poucos passos.
        </p>
      </div>
      <Button
        onClick={onConfigureOffer}
        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 text-[13px] font-medium shadow-sm transition-colors"
      >
        <RiAddLine className="size-4" />
        Configurar nova oferta
      </Button>
    </div>
  );
}
