import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RiRefreshLine,
  RiInstagramLine,
  RiFacebookCircleFill,
  RiFocus2Line,
  RiExchangeLine,
  RiCloseLine,
  RiAddLine,
  RiShieldCheckLine,
} from "@remixicon/react";
import type { CampaignFormState } from "../hooks/useCampaignForm";
import type { PixelData, PageData, InstagramAccount } from "@/services/campaignCreator";
import { PageSelectorModal } from "./PageSelectorModal";
import { PixelSelectorModal } from "./PixelSelectorModal";

interface SharedMetaSelectorsProps {
  form: CampaignFormState;
  onUpdate: <K extends keyof CampaignFormState>(key: K, value: CampaignFormState[K]) => void;
  pixels: PixelData[];
  pages: PageData[];
  instagramAccounts: InstagramAccount[];
  isLoading?: boolean;
  onRefresh?: () => void;
  accountId?: number;
}

export function SharedMetaSelectors({
  form,
  onUpdate,
  pixels: initialPixels,
  pages: initialPages,
  instagramAccounts,
  isLoading = false,
  onRefresh,
  accountId,
}: SharedMetaSelectorsProps) {
  const [pagesList, setPagesList] = useState<PageData[]>(initialPages);
  const [pixelsList, setPixelsList] = useState<PixelData[]>(initialPixels);
  const [isPageModalOpen, setIsPageModalOpen] = useState(false);
  const [isPixelModalOpen, setIsPixelModalOpen] = useState(false);

  useEffect(() => {
    if (initialPages.length > 0) setPagesList(initialPages);
  }, [initialPages]);

  useEffect(() => {
    if (initialPixels.length > 0) setPixelsList(initialPixels);
  }, [initialPixels]);

  // Busca o nome do pixel selecionado
  const selectedPixel = pixelsList.find((p) => p.id === form.pixelId);
  const pixelDisplayName = selectedPixel?.name || (form.pixelId ? `Pixel (${form.pixelId})` : "");

  // Busca o nome e avatar da página selecionada
  const selectedPage = pagesList.find((p) => p.id === form.pageId);
  const pageDisplayName = form.pageLabel || selectedPage?.name || (form.pageId ? `Página (${form.pageId})` : "");
  const pageAvatarUrl = selectedPage?.picture?.data?.url;

  return (
    <div className="space-y-3">
      {/* Top Header com Status e Botão Recarregar */}
      <div className="flex items-center justify-between text-xs text-muted-foreground pb-1">
        <span className="flex items-center gap-1.5 font-medium text-foreground">
          <RiFocus2Line className="size-3.5 text-primary" />
          Vínculos Meta (Pixel, Página e Instagram)
        </span>
        {onRefresh && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <RiRefreshLine className={`size-3.5 mr-1 ${isLoading ? "animate-spin" : ""}`} />
            {isLoading ? "Buscando na Meta..." : "Recarregar da Conta"}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* 1. Pixel / Dataset */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium flex items-center gap-1">
              <RiFocus2Line className="size-3.5 text-emerald-400" />
              Pixel / Dataset
            </Label>
            {form.pixelId && (
              <button
                type="button"
                onClick={() => setIsPixelModalOpen(true)}
                className="text-[11px] text-emerald-400 hover:underline flex items-center gap-0.5 font-medium"
              >
                <RiExchangeLine className="size-3" /> Alterar
              </button>
            )}
          </div>

          {form.pixelId ? (
            /* Card do Pixel Selecionado */
            <div className="p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 flex items-center justify-between gap-2 shadow-sm">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="size-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
                  <RiFocus2Line className="size-4 text-emerald-400" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-semibold text-white truncate">
                    {pixelDisplayName}
                  </p>
                  <p className="text-[10px] font-mono text-emerald-400/80">
                    ID: {form.pixelId}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <Button
                  type="button"
                  size="icon-xs"
                  variant="ghost"
                  onClick={() => setIsPixelModalOpen(true)}
                  className="size-6 text-slate-400 hover:text-white"
                  title="Alterar Pixel"
                >
                  <RiExchangeLine className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  size="icon-xs"
                  variant="ghost"
                  onClick={() => onUpdate("pixelId", "")}
                  className="size-6 text-slate-400 hover:text-red-400"
                  title="Remover Pixel"
                >
                  <RiCloseLine className="size-3.5" />
                </Button>
              </div>
            </div>
          ) : (
            /* Botão para abrir o Pop-up de Pixel */
            <button
              type="button"
              onClick={() => setIsPixelModalOpen(true)}
              className="w-full h-12 rounded-xl border border-dashed border-emerald-500/30 hover:border-emerald-500/60 bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors flex items-center justify-center gap-2 px-3 text-left group"
            >
              <div className="size-6 rounded-md bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0 text-emerald-400">
                <RiAddLine className="size-4" />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-xs font-medium text-slate-200 group-hover:text-white transition-colors">
                  Selecionar Pixel / Dataset
                </p>
                <p className="text-[10px] text-slate-400 truncate">
                  Clique para abrir a lista ou buscar por BM
                </p>
              </div>
            </button>
          )}
        </div>

        {/* 2. Página do Facebook (com Pop-up estilo Meta Ads) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium flex items-center gap-1">
              <RiFacebookCircleFill className="size-3.5 text-[#1877F2]" />
              Página do Facebook
            </Label>
            {form.pageId && (
              <button
                type="button"
                onClick={() => setIsPageModalOpen(true)}
                className="text-[11px] text-[#1877F2] hover:underline flex items-center gap-0.5 font-medium"
              >
                <RiExchangeLine className="size-3" /> Alterar
              </button>
            )}
          </div>

          {form.pageId ? (
            /* Card da Página Selecionada */
            <div className="p-2.5 rounded-xl border border-[#1877F2]/40 bg-[#1877F2]/5 flex items-center justify-between gap-2 shadow-sm">
              <div className="flex items-center gap-2.5 overflow-hidden">
                {pageAvatarUrl ? (
                  <img
                    src={pageAvatarUrl}
                    alt={pageDisplayName}
                    className="size-7 rounded-full object-cover shrink-0 border border-white/10"
                  />
                ) : (
                  <div className="size-7 rounded-full bg-[#1877F2]/10 border border-[#1877F2]/30 flex items-center justify-center shrink-0">
                    <RiFacebookCircleFill className="size-4 text-[#1877F2]" />
                  </div>
                )}
                <div className="overflow-hidden">
                  <p className="text-xs font-semibold text-white truncate">
                    {pageDisplayName}
                  </p>
                  <p className="text-[10px] font-mono text-[#1877F2]/90">
                    ID: {form.pageId}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <Button
                  type="button"
                  size="icon-xs"
                  variant="ghost"
                  onClick={() => setIsPageModalOpen(true)}
                  className="size-6 text-slate-400 hover:text-white"
                  title="Alterar Página"
                >
                  <RiExchangeLine className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  size="icon-xs"
                  variant="ghost"
                  onClick={() => {
                    onUpdate("pageId", "");
                    onUpdate("pageLabel", "");
                  }}
                  className="size-6 text-slate-400 hover:text-red-400"
                  title="Remover Página"
                >
                  <RiCloseLine className="size-3.5" />
                </Button>
              </div>
            </div>
          ) : (
            /* Botão para abrir o Pop-up de Página */
            <button
              type="button"
              onClick={() => setIsPageModalOpen(true)}
              className="w-full h-12 rounded-xl border border-dashed border-[#1877F2]/40 hover:border-[#1877F2]/70 bg-[#1877F2]/5 hover:bg-[#1877F2]/10 transition-colors flex items-center justify-center gap-2 px-3 text-left group"
            >
              <div className="size-6 rounded-md bg-[#1877F2]/10 border border-[#1877F2]/30 flex items-center justify-center shrink-0 text-[#1877F2]">
                <RiAddLine className="size-4" />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-xs font-medium text-slate-200 group-hover:text-white transition-colors">
                  Selecionar Página do Facebook
                </p>
                <p className="text-[10px] text-slate-400 truncate">
                  Clique para abrir a lista ou buscar por BM
                </p>
              </div>
            </button>
          )}
        </div>

        {/* 3. Instagram */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium flex items-center gap-1">
            <RiInstagramLine className="size-3.5 text-[#E4405F]" />
            Instagram
          </Label>

          <Select
            value={form.instagramActorId || "__use_page__"}
            onValueChange={(v) => {
              if (v === "__use_page__") {
                onUpdate("instagramActorId", "");
                onUpdate("instagramLabel", "Usar Página do Facebook");
              } else if (v === "__none__") {
                onUpdate("instagramActorId", "__none__");
                onUpdate("instagramLabel", "Sem Instagram");
              } else {
                const ig = instagramAccounts.find((i) => i.id === v);
                onUpdate("instagramActorId", v);
                onUpdate("instagramLabel", ig ? `@${ig.username}` : `Instagram (${v})`);
              }
            }}
          >
            <SelectTrigger className="w-full text-xs h-12 rounded-xl bg-[#111827]/70 border-white/10">
              <SelectValue placeholder="Selecione o Instagram" />
            </SelectTrigger>
            <SelectContent className="bg-[#0c1220] border-white/10 text-white">
              <SelectItem value="__use_page__" className="text-xs">
                <div className="flex items-center gap-1.5">
                  <RiShieldCheckLine className="size-3.5 text-emerald-400" />
                  <span>Usar Página do Facebook no Instagram (Recomendado)</span>
                </div>
              </SelectItem>
              {instagramAccounts.map((ig) => (
                <SelectItem key={ig.id} value={ig.id} className="text-xs">
                  @{ig.username} ({ig.id})
                </SelectItem>
              ))}
              <SelectItem value="__none__" className="text-xs text-slate-400">
                Não anunciar no Instagram (Apenas Facebook)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Pop-up Modal de Seleção de Página do Facebook */}
      <PageSelectorModal
        open={isPageModalOpen}
        onOpenChange={setIsPageModalOpen}
        pages={pagesList}
        selectedPageId={form.pageId}
        accountId={accountId}
        onSelectPage={(pageId, pageName) => {
          onUpdate("pageId", pageId);
          onUpdate("pageLabel", pageName);
        }}
        onPagesUpdated={(updatedPages) => setPagesList(updatedPages)}
      />

      {/* Pop-up Modal de Seleção de Pixel / Dataset */}
      <PixelSelectorModal
        open={isPixelModalOpen}
        onOpenChange={setIsPixelModalOpen}
        pixels={pixelsList}
        selectedPixelId={form.pixelId}
        accountId={accountId}
        onSelectPixel={(pixelId) => {
          onUpdate("pixelId", pixelId);
        }}
        onPixelsUpdated={(updatedPixels) => setPixelsList(updatedPixels)}
      />
    </div>
  );
}
