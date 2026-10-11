import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import type { SaleAPI } from "@/types/sale";
import { getCountryFlag } from "@/pages/dashboard/components/SfyCountry";

interface UtmDetailModalProps {
  sale: SaleAPI | null;
  onClose: () => void;
}

export function UtmDetailModal({ sale, onClose }: UtmDetailModalProps) {
  if (!sale) return null;

  const details = [
    { label: "UTM Source", value: sale.utm_source || "—" },
    { label: "UTM Campaign", value: sale.utm_campaign || "—" },
    { label: "UTM Medium", value: sale.utm_medium || "—" },
    { label: "UTM Content", value: sale.utm_content || "—" },
    { label: "UTM Term", value: sale.utm_term || "—" },
    { label: "SRC", value: sale.src || "—" },
  ];

  return (
    <Dialog open={!!sale} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Rastreamento da Venda</span>
            {sale.country && (
              <Badge variant="outline" className="text-xs font-normal">
                {getCountryFlag(sale.country)} {sale.country}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-lg bg-muted/50 p-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Transação / Plataforma
              </p>
              <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                {sale.platform}
              </Badge>
            </div>
            {sale.platform === "payt" ? (
              <a 
                href={`https://app.payt.com.br/admin/vendas/${sale.external_id}`} 
                target="_blank" 
                rel="noreferrer"
                className="mt-1 block text-sm font-medium font-mono text-blue-500 hover:underline"
              >
                {sale.external_id}
              </a>
            ) : (
              <p className="mt-1 text-sm font-medium font-mono">{sale.external_id}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {details.map((d) => (
              <div key={d.label} className="rounded-lg bg-muted/50 p-3">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  {d.label}
                </p>
                <p className="mt-0.5 text-sm font-medium break-all">{d.value}</p>
              </div>
            ))}
          </div>

          {sale.checkout_url && (
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                URL de Checkout
              </p>
              <a
                href={sale.checkout_url}
                target="_blank"
                rel="noreferrer"
                className="mt-0.5 block text-xs font-medium text-blue-500 hover:underline truncate"
              >
                {sale.checkout_url}
              </a>
            </div>
          )}

          {sale.order_bumps && Array.isArray(sale.order_bumps) && sale.order_bumps.length > 0 && (
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-2">
                Order Bumps ({sale.order_bumps.length})
              </p>
              <div className="space-y-1.5">
                {sale.order_bumps.map((ob: any, i: number) => {
                  const rawPrice = ob.product?.price ?? ob.price ?? ob.amount ?? 0;
                  const numPrice = typeof rawPrice === "number" ? rawPrice : parseFloat(String(rawPrice).replace(",", ".")) || 0;
                  const displayPrice = numPrice > 200 ? numPrice / 100 : numPrice;
                  const obTitle = ob.name || ob.product?.name || ob.title || "Order Bump";
                  return (
                    <div key={i} className="flex items-center justify-between text-xs py-0.5 border-b border-border/20 last:border-0">
                      <span className="font-medium text-foreground truncate max-w-[280px]">
                        {obTitle}
                      </span>
                      <span className="tabular-nums text-muted-foreground ml-2">
                        {displayPrice > 0 ? `R$ ${displayPrice.toFixed(2)}` : "Incluso"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
