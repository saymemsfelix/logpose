import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RiCheckboxCircleLine, RiTimeLine, RiWhatsappFill } from "@remixicon/react";
import type { RecoveryRow, ChannelConfig } from "@/services/recovery";
import { PaginationBar } from "@/components/PaginationBar";

const typeLabels: Record<string, string> = {
  abandoned_cart: "Carrinho Abandonado",
  declined_card: "Cartão Recusado",
  unpaid_pix: "PIX Não Pago",
  trial: "Trial",
  unidentified: "Não Identificado",
};

const STATIC_CHANNEL_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp",
  email: "Email",
  sms: "SMS",
  back_redirect: "BackRedirect",
  other: "Outro",
};

const COUNTRY_FLAGS: Record<string, string> = {
  IT: "🇮🇹",
  BR: "🇧🇷",
  MX: "🇲🇽",
  ES: "🇪🇸",
  DE: "🇩🇪",
  CH: "🇨🇭",
  AT: "🇦🇹",
  AR: "🇦🇷",
  CO: "🇨🇴",
  US: "🇺🇸",
};

function buildChannelLabelMap(configs: ChannelConfig[]): Record<string, string> {
  const map = { ...STATIC_CHANNEL_LABELS };
  configs.forEach((c) => {
    if (c.label) map[c.channel] = c.label;
  });
  return map;
}

interface RecoveryTableProps {
  data: RecoveryRow[];
  isLoading: boolean;
  total: number;
  page: number;
  onPageChange: (page: number) => void;
  channelConfigs?: ChannelConfig[];
  onOpenWhatsApp: (row: RecoveryRow) => void;
  onToggleStatus?: (row: RecoveryRow) => void;
}

function TableSkeleton() {
  return (
    <Card className="border-border/40 premium-table">
      <CardContent className="p-0">
        <div className="p-4 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function RecoveryTable({
  data,
  isLoading,
  total,
  page,
  onPageChange,
  channelConfigs = [],
  onOpenWhatsApp,
  onToggleStatus,
}: RecoveryTableProps) {
  const channelLabels = buildChannelLabelMap(channelConfigs);
  if (isLoading) return <TableSkeleton />;

  if (data.length === 0) {
    return (
      <Card className="border-border/40 border-dashed">
        <CardContent className="flex items-center justify-center py-16">
          <p className="text-sm text-muted-foreground">
            Nenhuma recuperação encontrada para os filtros selecionados.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/40 premium-table">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Canal</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => {
                const country = (row.customerCountry || "").toUpperCase();
                const flag = COUNTRY_FLAGS[country] || "";

                return (
                  <TableRow key={row.id}>
                    <TableCell className="tabular-nums whitespace-nowrap text-muted-foreground text-xs">
                      {row.date
                        ? new Date(row.date).toLocaleString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-white">{row.customerName}</span>
                        {country && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-border/60">
                            {flag} {country}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="truncate max-w-[170px]">{row.customerEmail}</span>
                        {row.customerPhone && (
                          <span className="font-mono text-[11px] text-emerald-400/90 font-medium">
                            {row.customerPhone}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[180px] truncate text-xs" title={row.product}>
                      {row.product}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] font-medium">
                        {typeLabels[row.type] || row.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold text-white">
                      R$ {row.amount.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {row.recovered ? (
                        <div className="flex items-center gap-1.5 text-[var(--color-success)] text-xs">
                          <RiCheckboxCircleLine className="size-4 shrink-0" />
                          <span className="font-medium">Recuperado</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                          <RiTimeLine className="size-4 shrink-0 text-amber-400" />
                          <span className="text-amber-400/90 font-medium">Pendente</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {channelLabels[row.channel] || row.channel || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => onOpenWhatsApp(row)}
                          title="Abrir Recuperação no WhatsApp"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-[#25D366]/15 hover:bg-[#25D366]/25 border border-[#25D366]/30 text-[#25D366] transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                          <RiWhatsappFill className="size-3.5" />
                          <span>WhatsApp</span>
                        </button>
                        {onToggleStatus && (
                          <button
                            type="button"
                            onClick={() => onToggleStatus(row)}
                            title={row.recovered ? "Marcar como Pendente" : "Marcar como Recuperado"}
                            className={`p-1.5 rounded-md border text-xs transition-colors ${
                              row.recovered
                                ? "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                                : "border-border/40 text-muted-foreground hover:bg-slate-800 hover:text-white"
                            }`}
                          >
                            {row.recovered ? (
                              <RiCheckboxCircleLine className="size-3.5" />
                            ) : (
                              <RiTimeLine className="size-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <PaginationBar
          total={total}
          page={page}
          onPageChange={onPageChange}
          label="recuperações"
        />
      </CardContent>
    </Card>
  );
}
