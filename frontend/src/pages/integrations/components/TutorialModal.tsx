import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { RiPlayCircleLine, RiCheckLine, RiShieldKeyholeLine, RiExternalLinkLine } from "@remixicon/react";
import { Button } from "@/components/ui/button";

interface TutorialModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenConnect?: () => void;
}

export function TutorialModal({ open, onOpenChange, onOpenConnect }: TutorialModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <RiPlayCircleLine className="size-5 text-blue-500" />
            Como conectar sua conta do Facebook Ads
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Acompanhe o passo a passo para integrar suas contas com rastreamento automático.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Método 1: Conexão Oficial em 1 Clique */}
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 space-y-2.5">
            <div className="flex items-center gap-2 text-sm font-semibold text-blue-400">
              <span className="flex size-5 items-center justify-center rounded-full bg-blue-500 text-white text-[11px] font-bold">1</span>
              Conexão Direta Oficial (Recomendada)
            </div>
            <p className="text-[12.5px] leading-relaxed text-muted-foreground">
              Basta clicar em <strong>&quot;Conectar outra conta&quot;</strong>. Você será direcionado para o Facebook oficial para autorizar a leitura das métricas das suas campanhas. Nenhuma senha é compartilhada.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11.5px] text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <RiCheckLine className="size-4 text-emerald-500 shrink-0" />
                Busca todas as suas BMs na hora
              </div>
              <div className="flex items-center gap-1.5">
                <RiCheckLine className="size-4 text-emerald-500 shrink-0" />
                Sincroniza todas as contas de anúncio
              </div>
              <div className="flex items-center gap-1.5">
                <RiCheckLine className="size-4 text-emerald-500 shrink-0" />
                Token renovado automaticamente
              </div>
              <div className="flex items-center gap-1.5">
                <RiCheckLine className="size-4 text-emerald-500 shrink-0" />
                Segurança oficial da Meta API
              </div>
            </div>
          </div>

          {/* Método 2: Conexão por Token de Acesso */}
          <div className="rounded-xl border border-border/40 bg-card/40 p-4 space-y-2.5">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <span className="flex size-5 items-center justify-center rounded-full bg-zinc-700 text-white text-[11px] font-bold">2</span>
              Conexão por Token de Acesso (Contingência / BM Externa)
            </div>
            <p className="text-[12.5px] leading-relaxed text-muted-foreground">
              Ideal para quem gerencia contas de clientes ou contas de contingência:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-[12px] text-muted-foreground pl-1">
              <li>Acesse o <strong>Graph API Explorer</strong> no Meta for Developers.</li>
              <li>Selecione as permissões: <code className="rounded bg-muted px-1.5 py-0.5 text-blue-400">ads_read</code>, <code className="rounded bg-muted px-1.5 py-0.5 text-blue-400">read_insights</code> e <code className="rounded bg-muted px-1.5 py-0.5 text-blue-400">business_management</code>.</li>
              <li>Gere o token e cole no botão &quot;Conectar via Token&quot;. O Log Pose listará todas as BMs e contas vinculadas àquele token automaticamente!</li>
            </ol>
            <div className="pt-2">
              <a
                href="https://developers.facebook.com/tools/explorer/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[12px] text-blue-400 hover:text-blue-300 font-medium hover:underline"
              >
                Abrir Graph API Explorer
                <RiExternalLinkLine className="size-3.5" />
              </a>
            </div>
          </div>

          {/* Dica de Segurança */}
          <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-[12px] text-amber-300/90">
            <RiShieldKeyholeLine className="size-4.5 shrink-0 text-amber-400 mt-0.5" />
            <p>
              O Log Pose apenas lê métricas de desempenho (gasto, cliques, impressões, vendas). Nós nunca alteramos ou criamos cobranças em suas contas sem a sua ação explícita.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Entendido
          </Button>
          {onOpenConnect && (
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-500 text-white"
              onClick={() => {
                onOpenChange(false);
                onOpenConnect();
              }}
            >
              Conectar Agora
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
