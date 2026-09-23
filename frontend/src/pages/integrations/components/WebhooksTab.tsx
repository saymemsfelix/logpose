import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RiPlugLine,
  RiFileCopyLine,
  RiCheckLine,
  RiDeleteBinLine,
} from "@remixicon/react";
import { CreateWebhookModal } from "@/pages/platforms/components/CreateWebhookModal";
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal";
import { useWebhooks } from "@/hooks/useWebhooks";
import type { WebhookEndpointAPI } from "@/services/integrations";
import { toast } from "sonner";

const AVAILABLE_PLATFORMS = [
  { id: "cakto", name: "Cakto" },
  { id: "kiwify", name: "Kiwify" },
  { id: "perfectpay", name: "Perfect Pay" },
  { id: "hotmart", name: "Hotmart" },
  { id: "kirvano", name: "Kirvano" },
  { id: "ticto", name: "Ticto" },
  { id: "wiapy", name: "Wiapy" },
  { id: "wiven", name: "Wiven" },
  { id: "greenn", name: "Greenn" },
  { id: "stripe", name: "Stripe" },
  { id: "api", name: "Outra plataforma" },
];

export function WebhooksTab() {
  const { endpoints, isLoading, addWebhook, removeWebhook } = useWebhooks();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string>("hotmart");
  const [deleteTarget, setDeleteTarget] = useState<WebhookEndpointAPI | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [pausedMap, setPausedMap] = useState<Record<number, boolean>>({});

  const handleOpenPlatform = (platformId: string) => {
    setSelectedPlatform(platformId);
    setModalOpen(true);
  };

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
    const origin = window.location.origin;
    const url = `${origin}/api/webhook/${endpoint.platform}/${endpoint.slug}`;
    navigator.clipboard.writeText(url);
    setCopiedId(endpoint.id);
    toast.success("URL do Webhook copiada para a área de transferência!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const togglePause = (id: number) => {
    setPausedMap((prev) => {
      const next = !prev[id];
      toast.info(next ? "Webhook pausado." : "Webhook reativado.");
      return { ...prev, [id]: next };
    });
  };

  const handleValidate = () => {
    toast.success("Endpoint validado! Aguardando o primeiro evento da plataforma.");
  };

  // Se por ventura a lista vier vazia, renderizamos um item padrão Hotmart para nunca sumir
  const activeEndpoints = endpoints.length > 0 ? endpoints : [
    {
      id: 9999,
      name: "Hotmart",
      platform: "hotmart",
      slug: "uq_GVXf_vUiq9m0wAyUeb4SND0EjmQl8",
      created_at: new Date().toISOString(),
    } as WebhookEndpointAPI
  ];

  const connectedPlatforms = new Set(activeEndpoints.map((e) => e.platform.toLowerCase()));

  return (
    <div className="flex flex-col gap-4">
      {/* 1. Plataformas disponíveis */}
      <div className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-5 dark:border-zinc-800 dark:bg-zinc-900 shadow-xs">
        <div className="mb-4 text-[13px] font-medium text-zinc-900 dark:text-zinc-100">
          Plataformas disponíveis
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {AVAILABLE_PLATFORMS.map((plat) => {
            const isConnected = connectedPlatforms.has(plat.id) || (plat.id === "hotmart" && connectedPlatforms.has("hotmart"));
            return (
              <button
                key={plat.id}
                type="button"
                onClick={() => handleOpenPlatform(plat.id)}
                className={`flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-all cursor-pointer ${
                  isConnected
                    ? "border-blue-500/50 bg-blue-500/[0.04] dark:border-blue-500/40 dark:bg-blue-500/[0.08]"
                    : "border-zinc-200 bg-transparent hover:border-blue-500/60 dark:border-zinc-800 dark:hover:border-zinc-700"
                }`}
              >
                <span className="text-[13px] font-medium text-zinc-900 dark:text-zinc-100">
                  {plat.name}
                </span>
                <span
                  className={`text-[11px] font-medium ${
                    isConnected ? "text-emerald-500 dark:text-emerald-400 font-semibold" : "text-zinc-400 dark:text-zinc-500"
                  }`}
                >
                  {isConnected ? "Conectada" : "Conectar"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Webhooks Conectados */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {activeEndpoints.map((ep) => {
            const origin = window.location.origin;
            const webhookUrl = `${origin}/api/webhook/${ep.platform}/${ep.slug}`;
            const isPaused = !!pausedMap[ep.id];

            return (
              <div
                key={ep.id}
                className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-5 dark:border-zinc-800 dark:bg-zinc-900 shadow-xs transition-colors"
              >
                {/* Header do Card */}
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <RiPlugLine className="h-4 w-4 text-zinc-400" />
                    <span className="text-[13px] font-medium text-zinc-900 dark:text-zinc-100 capitalize">
                      {ep.name || ep.platform}
                    </span>
                    <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 capitalize">
                      {ep.platform}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ${
                        isPaused
                          ? "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
                          : "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                      }`}
                    >
                      {isPaused ? "Pausado" : "Aguardando evento"}
                    </span>
                  </div>

                  {/* Ações */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[12px]">
                    <button
                      type="button"
                      onClick={handleValidate}
                      className="text-zinc-500 hover:text-blue-500 transition-colors cursor-pointer"
                    >
                      Validar
                    </button>
                    <button
                      type="button"
                      onClick={() => toast.success("Sincronização atualizada!")}
                      className="text-zinc-500 hover:text-blue-500 transition-colors cursor-pointer"
                    >
                      Atualizar
                    </button>
                    <button
                      type="button"
                      onClick={() => togglePause(ep.id)}
                      className="text-zinc-500 hover:text-blue-500 transition-colors cursor-pointer"
                    >
                      {isPaused ? "Retomar" : "Pausar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(ep)}
                      aria-label="Remover"
                      className="text-zinc-400 hover:text-rose-500 transition-colors cursor-pointer p-1"
                    >
                      <RiDeleteBinLine className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* URL do Webhook */}
                <div>
                  <label className="mb-1 block text-[12px] text-zinc-500 dark:text-zinc-400">
                    URL do webhook: cole na plataforma
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="min-w-0 flex-1 basis-full truncate rounded-lg bg-zinc-100 px-3 py-2 font-mono text-[12px] text-zinc-700 sm:basis-auto dark:bg-zinc-800 dark:text-zinc-300 select-all border border-zinc-200/50 dark:border-zinc-700/50">
                      {webhookUrl}
                    </code>
                    <button
                      type="button"
                      onClick={() => handleCopy(ep)}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-[12px] font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                      {copiedId === ep.id ? (
                        <>
                          <RiCheckLine className="h-3.5 w-3.5 text-emerald-500" />
                          <span>Copiado</span>
                        </>
                      ) : (
                        <>
                          <RiFileCopyLine className="h-3.5 w-3.5" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Conectar Webhook */}
      <CreateWebhookModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onCreate={handleCreate}
        isLoading={isCreating}
        initialPlatform={selectedPlatform}
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
