import {
  RiRefreshLine,
  RiDeleteBinLine,
  RiPlayCircleLine,
  RiLinkM,
  RiVideoLine,
} from "@remixicon/react";
import { Button } from "@/components/ui/button";
import type { TikTokAccount } from "@/services/tiktok";

interface TikTokCardProps {
  connected: boolean;
  accounts: TikTokAccount[];
  lastSynced?: string | null;
  onConnect: () => void;
  onSync: () => void;
  onDisconnect: (accountId: number) => void;
  isSyncing?: boolean;
}

export function TikTokCard({
  connected,
  accounts,
  lastSynced,
  onConnect,
  onSync,
  onDisconnect,
  isSyncing = false,
}: TikTokCardProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border/40 bg-card/60 p-4 sm:p-5 shadow-xs backdrop-blur-xs">
        {/* Lado Esquerdo: Status & Contas */}
        <div className="space-y-1">
          <div className="text-[13px] font-medium text-foreground flex items-center gap-2">
            <span>Contas do TikTok Ads (TikTok for Business)</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              API v1.3
            </span>
          </div>

          <div>
            <a
              href="https://business-api.tiktok.com/portal/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[12px] font-medium text-cyan-500 hover:text-cyan-400 hover:underline transition-colors"
            >
              <RiPlayCircleLine className="size-3.5 shrink-0" />
              Acessar TikTok for Business Developers
            </a>
          </div>

          <div className="flex flex-col gap-0.5 pt-0.5">
            {connected && accounts.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground">
                <span className="font-semibold text-foreground">
                  {accounts[0].label} ({accounts[0].advertiser_id})
                </span>
                <span>· sincronizado {lastSynced || "recentemente"}</span>
              </div>
            ) : (
              <p className="text-[12px] text-muted-foreground">
                Nenhuma conta do TikTok Ads conectada ainda. Conecte com seu token de anunciante.
              </p>
            )}
          </div>
        </div>

        {/* Lado Direito: Ações */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={onConnect}
            className="inline-flex items-center gap-1.5 rounded-lg bg-black hover:bg-zinc-800 text-white border border-border/50 px-3 py-2 text-[13px] font-medium shadow-sm transition-colors"
          >
            <RiVideoLine className="size-4 text-cyan-400" />
            {connected ? "Conectar outra conta TikTok" : "Conectar TikTok Ads"}
          </Button>

          {connected && accounts.length > 0 && (
            <span className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onSync}
                disabled={isSyncing}
                className="inline-flex items-center gap-1.5 rounded-lg border-border/50 px-2.5 py-1.5 text-[12px] text-foreground/80 hover:bg-accent/60 transition-colors"
              >
                <RiRefreshLine className={`size-3.5 ${isSyncing ? "animate-spin text-cyan-400" : ""}`} />
                {isSyncing ? "Sincronizando..." : "Sincronizar"}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => onDisconnect(accounts[0].id)}
                disabled={isSyncing}
                className="inline-flex items-center gap-1.5 rounded-lg border-border/50 px-2.5 py-1.5 text-[12px] text-muted-foreground hover:text-rose-500 hover:border-rose-500/30 transition-colors"
              >
                <RiDeleteBinLine className="size-3.5" />
                Desconectar
              </Button>
            </span>
          )}
        </div>
      </div>

      {/* Dica explicativa */}
      <p className="flex items-center gap-1.5 text-[12px] text-muted-foreground leading-relaxed">
        <RiLinkM className="size-3.5 shrink-0 text-muted-foreground/70" />
        O TikTok Ads sincroniza o gasto por anúncio e hora diretamente da Marketing API oficial, unificando os custos com o Meta Ads no mesmo fuso e moeda.
      </p>
    </div>
  );
}

