import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RiLinkM, RiFileCopyLine, RiCheckLine, RiShareLine } from "@remixicon/react";
import { toast } from "sonner";

interface GenerateLinkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  oauthUrl?: string;
}

export function GenerateLinkModal({
  open,
  onOpenChange,
  oauthUrl,
}: GenerateLinkModalProps) {
  const [copied, setCopied] = useState(false);

  // Link de conexão para enviar ou abrir em outro navegador
  const connectionUrl = oauthUrl || `${window.location.origin}/integrations?connect=facebook`;

  const handleCopy = () => {
    navigator.clipboard.writeText(connectionUrl);
    setCopied(true);
    toast.success("Link de conexão copiado para a área de transferência!");
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <RiShareLine className="size-5 text-blue-500" />
            Link de Conexão Rápida
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Este link pode ser aberto em outro navegador ou enviado diretamente para o seu cliente autorizar a conta.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground">URL de Conexão do Workspace</label>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={connectionUrl}
                className="font-mono text-xs select-all bg-muted/40"
              />
              <Button
                size="sm"
                onClick={handleCopy}
                className="bg-blue-600 hover:bg-blue-500 text-white shrink-0"
              >
                {copied ? (
                  <>
                    <RiCheckLine className="size-4 mr-1 text-emerald-300" />
                    Copiado
                  </>
                ) : (
                  <>
                    <RiFileCopyLine className="size-4 mr-1" />
                    Copiar
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-border/40 bg-muted/20 p-3 text-[12px] text-muted-foreground space-y-1.5">
            <div className="flex items-center gap-1.5 font-medium text-foreground">
              <RiLinkM className="size-3.5 text-blue-400" />
              Como funciona o link externo?
            </div>
            <p>
              Ao abrir este link, o usuário é convidado a autorizar o acesso aos anúncios no Facebook. Assim que a autorização é finalizada, as contas de anúncio entram automaticamente neste seu Workspace do SFY!
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-border/40">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
