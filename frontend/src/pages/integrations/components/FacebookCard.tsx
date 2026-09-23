import {
  RiFacebookCircleFill,
  RiLinkM,
  RiRefreshLine,
  RiDeleteBinLine,
  RiPlayCircleLine,
} from "@remixicon/react";
import { Button } from "@/components/ui/button";
import type { FacebookUserProfile } from "@/services/integrations";

interface FacebookCardProps {
  connected: boolean;
  user?: FacebookUserProfile | null;
  lastSynced?: string | null;
  onOpenTutorial: () => void;
  onConnectAnother: () => void;
  onGenerateLink: () => void;
  onSync: () => void;
  onDisconnect: () => void;
  isSyncing?: boolean;
}

export function FacebookCard({
  connected,
  user,
  lastSynced,
  onOpenTutorial,
  onConnectAnother,
  onGenerateLink,
  onSync,
  onDisconnect,
  isSyncing = false,
}: FacebookCardProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border/40 bg-card/60 p-4 sm:p-5 shadow-xs backdrop-blur-xs">
        {/* Left Side: Status & Profile */}
        <div className="space-y-1">
          <div className="text-[13px] font-medium text-foreground">Conta do Facebook</div>
          <div>
            <button
              type="button"
              onClick={onOpenTutorial}
              className="inline-flex items-center gap-1.5 text-[12px] font-medium text-blue-500 hover:text-blue-400 hover:underline cursor-pointer transition-colors"
            >
              <RiPlayCircleLine className="size-3.5 shrink-0" />
              Aprenda como conectar aqui
            </button>
          </div>
          <div className="flex flex-col gap-0.5 pt-0.5">
            {connected && user ? (
              <p className="flex flex-wrap items-center gap-1.5 text-[12px] text-muted-foreground">
                <span className="font-medium text-foreground">{user.name}</span>
                <span>· sincronizado {lastSynced || "recentemente"}</span>
              </p>
            ) : (
              <p className="text-[12px] text-muted-foreground">
                Nenhuma conta do Facebook conectada ainda.
              </p>
            )}
          </div>
        </div>

        {/* Right Side: Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={onConnectAnother}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 text-[13px] font-medium shadow-sm transition-colors"
          >
            <RiFacebookCircleFill className="size-4" />
            {connected ? "Conectar outra conta" : "Conectar Facebook"}
          </Button>

          <Button
            variant="outline"
            onClick={onGenerateLink}
            className="inline-flex items-center gap-1.5 rounded-lg border-border/50 px-3 py-2 text-[13px] font-medium text-foreground/80 hover:bg-accent/60 transition-colors"
          >
            <RiLinkM className="size-4" />
            Gerar link de conexão
          </Button>

          {connected && (
            <span className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onSync}
                disabled={isSyncing}
                className="inline-flex items-center gap-1.5 rounded-lg border-border/50 px-2.5 py-1.5 text-[12px] text-foreground/80 hover:bg-accent/60 transition-colors"
              >
                <RiRefreshLine className={`size-3.5 ${isSyncing ? "animate-spin text-blue-400" : ""}`} />
                {isSyncing ? "Sincronizando..." : "Sincronizar"}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={onDisconnect}
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

      {/* Helpful info text */}
      <p className="flex items-center gap-1.5 text-[12px] text-muted-foreground leading-relaxed">
        <RiLinkM className="size-3.5 shrink-0 text-muted-foreground/70" />
        Conectar Facebook abre a autorização aqui mesmo. O link de conexão pode ser aberto em outro navegador/computador ou enviado a um cliente — a conta entra automaticamente neste workspace quando a autorização é concluída.
      </p>
    </div>
  );
}
