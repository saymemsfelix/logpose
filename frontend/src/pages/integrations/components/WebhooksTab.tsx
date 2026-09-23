import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RiAddLine,
  RiFileCopyLine,
  RiCheckLine,
  RiDeleteBinLine,
  RiWebhookLine,
} from "@remixicon/react";
import { PlatformLogo } from "@/components/PlatformLogo";
import { CreateWebhookModal } from "@/pages/platforms/components/CreateWebhookModal";
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal";
import { useWebhooks } from "@/hooks/useWebhooks";
import type { WebhookEndpointAPI } from "@/services/integrations";
import { toast } from "sonner";

export function WebhooksTab() {
  const { endpoints, isLoading, addWebhook, removeWebhook } = useWebhooks();
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<WebhookEndpointAPI | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const handleCreate = async (platform: "kiwify" | "payt" | "hotmart" | "api", name: string) => {
    try {
      setIsCreating(true);
      await addWebhook(platform, name);
      toast.success("Webhook criado com sucesso!");
      setModalOpen(false);
    } catch {
      toast.error("Erro ao criar webhook");
    } finally {
      setIsCreating(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      await removeWebhook(deleteTarget.id);
      toast.success("Webhook excluído!");
      setDeleteTarget(null);
    } catch {
      toast.error("Erro ao excluir webhook");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopy = (endpoint: WebhookEndpointAPI) => {
    const url = `${window.location.origin}/api/webhook/${endpoint.platform}/${endpoint.slug}`;
    navigator.clipboard.writeText(url);
    setCopiedId(endpoint.id);
    toast.success("URL do Webhook copiada para a área de transferência!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Header da aba */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/40 bg-card/60 p-4 sm:p-5 shadow-xs backdrop-blur-xs">
        <div>
          <div className="text-[14px] font-medium text-foreground">Webhooks de Venda & Checkout</div>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            Receba notificações de vendas aprovadas, carrinhos abandonados e boletos gerados em tempo real.
          </p>
        </div>
        <Button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[13px] font-medium shadow-sm transition-colors"
        >
          <RiAddLine className="size-4" />
          Novo Webhook
        </Button>
      </div>

      {/* Lista de Webhooks */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : endpoints.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 bg-card/30 p-12 text-center space-y-3">
          <RiWebhookLine className="size-10 mx-auto text-muted-foreground/50" />
          <div>
            <h4 className="text-sm font-medium text-foreground">Nenhum webhook configurado</h4>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Crie um webhook para integrar sua conta da Hotmart, Kiwify, Payt ou qualquer outra plataforma.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => setModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white text-xs"
          >
            <RiAddLine className="size-3.5 mr-1" />
            Configurar Primeiro Webhook
          </Button>
        </div>
      ) : (
        <div className="grid gap-3">
          {endpoints.map((ep) => {
            const webhookUrl = `${window.location.origin}/api/webhook/${ep.platform}/${ep.slug}`;

            return (
              <div
                key={ep.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border/40 bg-card/60 p-4 shadow-xs hover:border-border/60 transition-colors backdrop-blur-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-10 rounded-lg bg-muted/60 flex items-center justify-center shrink-0 border border-border/30">
                    <PlatformLogo platform={ep.platform as "kiwify" | "payt" | "hotmart" | "api"} size="md" showLabel={false} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-medium text-foreground truncate">
                        {ep.name}
                      </span>
                      <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                        {ep.platform}
                      </Badge>
                    </div>
                    <p className="font-mono text-[11.5px] text-muted-foreground truncate max-w-md mt-0.5">
                      {webhookUrl}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(ep)}
                    className="inline-flex items-center gap-1.5 text-xs text-foreground/80 hover:bg-accent/60"
                  >
                    {copiedId === ep.id ? (
                      <>
                        <RiCheckLine className="size-3.5 text-emerald-400" />
                        Copiado
                      </>
                    ) : (
                      <>
                        <RiFileCopyLine className="size-3.5" />
                        Copiar URL
                      </>
                    )}
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteTarget(ep)}
                    className="text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 p-2"
                  >
                    <RiDeleteBinLine className="size-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modais de Criar e Excluir */}
      <CreateWebhookModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onCreate={handleCreate}
        isLoading={isCreating}
      />

      <ConfirmDeleteModal
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
        title="Excluir Webhook"
        description={`Tem certeza que deseja excluir o webhook "${deleteTarget?.name}"? A URL deixará de funcionar imediatamente.`}
      />
    </div>
  );
}
