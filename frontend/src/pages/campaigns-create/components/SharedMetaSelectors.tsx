import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
  RiEdit2Line,
  RiListCheck3,
  RiInformationLine,
  RiInstagramLine,
  RiFacebookCircleLine,
  RiFocus2Line,
} from "@remixicon/react";
import type { CampaignFormState } from "../hooks/useCampaignForm";
import type { PixelData, PageData, InstagramAccount } from "@/services/campaignCreator";

interface SharedMetaSelectorsProps {
  form: CampaignFormState;
  onUpdate: <K extends keyof CampaignFormState>(key: K, value: CampaignFormState[K]) => void;
  pixels: PixelData[];
  pages: PageData[];
  instagramAccounts: InstagramAccount[];
  isLoading?: boolean;
  onRefresh?: () => void;
}

export function SharedMetaSelectors({
  form,
  onUpdate,
  pixels,
  pages,
  instagramAccounts,
  isLoading = false,
  onRefresh,
}: SharedMetaSelectorsProps) {
  const [manualPixel, setManualPixel] = useState(false);
  const [manualPage, setManualPage] = useState(false);
  const [manualIg, setManualIg] = useState(false);

  // Auto-seleciona primeiro Pixel se disponível e form ainda não possui
  useEffect(() => {
    if (!form.pixelId && pixels.length > 0 && !manualPixel) {
      onUpdate("pixelId", pixels[0].id);
    }
  }, [pixels, form.pixelId, manualPixel, onUpdate]);

  // Auto-seleciona primeira Página se disponível e form ainda não possui
  useEffect(() => {
    if (!form.pageId && pages.length > 0 && !manualPage) {
      onUpdate("pageId", pages[0].id);
      onUpdate("pageLabel", pages[0].name);
    }
  }, [pages, form.pageId, manualPage, onUpdate]);

  const hasPixels = pixels.length > 0;
  const hasPages = pages.length > 0;
  const isPixelManualActive = manualPixel || !hasPixels;
  const isPageManualActive = manualPage || !hasPages;

  return (
    <div className="space-y-3">
      {/* Top Header com Status e Botão Recarregar */}
      <div className="flex items-center justify-between text-xs text-muted-foreground pb-1">
        <span className="flex items-center gap-1 font-medium text-foreground">
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
        {/* 1. Pixel */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium flex items-center gap-1">
              Pixel / Dataset
            </Label>
            {hasPixels && (
              <button
                type="button"
                onClick={() => setManualPixel(!manualPixel)}
                className="text-[11px] text-primary hover:underline flex items-center gap-0.5"
              >
                {manualPixel ? (
                  <>
                    <RiListCheck3 className="size-3" /> Ver lista
                  </>
                ) : (
                  <>
                    <RiEdit2Line className="size-3" /> Digitar ID
                  </>
                )}
              </button>
            )}
          </div>

          {isPixelManualActive ? (
            <div className="space-y-1">
              <Input
                placeholder="Ex: 949690764845924"
                value={form.pixelId}
                onChange={(e) => onUpdate("pixelId", e.target.value.trim())}
                className="font-mono text-xs h-9"
              />
              <p className="text-[10.5px] text-muted-foreground flex items-center gap-1">
                <RiInformationLine className="size-3 shrink-0 text-amber-500" />
                {!hasPixels
                  ? "Nenhum pixel listado pela API. Digite o ID do Pixel/Dataset da Meta."
                  : "Modo manual: ID informado será usado no conjunto."}
              </p>
            </div>
          ) : (
            <Select
              value={form.pixelId}
              onValueChange={(v) => {
                if (v === "__manual__") {
                  setManualPixel(true);
                  onUpdate("pixelId", "");
                } else {
                  onUpdate("pixelId", v);
                }
              }}
            >
              <SelectTrigger className="w-full text-xs h-9">
                <SelectValue placeholder="Selecione o Pixel" />
              </SelectTrigger>
              <SelectContent>
                {pixels.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-xs">
                    {p.name} ({p.id})
                  </SelectItem>
                ))}
                <SelectItem value="__manual__" className="text-xs text-primary font-medium">
                  + Digitar outro ID de Pixel manualmente
                </SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        {/* 2. Página do Facebook */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium flex items-center gap-1">
              <RiFacebookCircleLine className="size-3.5 text-[#1877F2]" />
              Página do Facebook
            </Label>
            {hasPages && (
              <button
                type="button"
                onClick={() => setManualPage(!manualPage)}
                className="text-[11px] text-primary hover:underline flex items-center gap-0.5"
              >
                {manualPage ? (
                  <>
                    <RiListCheck3 className="size-3" /> Ver lista
                  </>
                ) : (
                  <>
                    <RiEdit2Line className="size-3" /> Digitar ID
                  </>
                )}
              </button>
            )}
          </div>

          {isPageManualActive ? (
            <div className="space-y-1">
              <Input
                placeholder="Ex: 102938475612345"
                value={form.pageId}
                onChange={(e) => {
                  const val = e.target.value.trim();
                  onUpdate("pageId", val);
                  onUpdate("pageLabel", form.pageLabel || val);
                }}
                className="font-mono text-xs h-9"
              />
              <p className="text-[10.5px] text-muted-foreground flex items-center gap-1">
                <RiInformationLine className="size-3 shrink-0 text-amber-500" />
                {!hasPages
                  ? "Nenhuma página listada pela API. Digite o ID numérico da sua Página."
                  : "Modo manual: ID da página informado será usado nos anúncios."}
              </p>
            </div>
          ) : (
            <Select
              value={form.pageId}
              onValueChange={(v) => {
                if (v === "__manual__") {
                  setManualPage(true);
                  onUpdate("pageId", "");
                } else {
                  onUpdate("pageId", v);
                  const page = pages.find((p) => p.id === v);
                  onUpdate("pageLabel", page?.name ?? "");
                }
              }}
            >
              <SelectTrigger className="w-full text-xs h-9">
                <SelectValue placeholder="Selecione a Página" />
              </SelectTrigger>
              <SelectContent>
                {pages.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-xs">
                    {p.name}
                  </SelectItem>
                ))}
                <SelectItem value="__manual__" className="text-xs text-primary font-medium">
                  + Digitar outro ID de Página manualmente
                </SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        {/* 3. Instagram */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium flex items-center gap-1">
              <RiInstagramLine className="size-3.5 text-pink-500" />
              Instagram
            </Label>
            {manualIg && (
              <button
                type="button"
                onClick={() => {
                  setManualIg(false);
                  onUpdate("instagramActorId", "page_backed");
                  onUpdate("instagramLabel", "");
                }}
                className="text-[11px] text-primary hover:underline flex items-center gap-0.5"
              >
                <RiListCheck3 className="size-3" /> Ver opções
              </button>
            )}
          </div>

          {manualIg ? (
            <div className="space-y-1">
              <Input
                placeholder="ID numérico do perfil do Instagram"
                value={form.instagramActorId === "page_backed" || form.instagramActorId === "no_instagram" ? "" : form.instagramActorId}
                onChange={(e) => {
                  const val = e.target.value.trim();
                  onUpdate("instagramActorId", val);
                  onUpdate("instagramLabel", val ? `@${val}` : "");
                }}
                className="font-mono text-xs h-9"
              />
              <p className="text-[10.5px] text-muted-foreground flex items-center gap-1">
                <RiInformationLine className="size-3 shrink-0 text-amber-500" />
                Digite o Instagram User ID (ex: 178414...)
              </p>
            </div>
          ) : (
            <Select
              value={
                form.instagramActorId === "no_instagram"
                  ? "no_instagram"
                  : form.instagramActorId && form.instagramActorId !== "none" && form.instagramActorId !== "page_backed"
                  ? form.instagramActorId
                  : "page_backed"
              }
              onValueChange={(v) => {
                if (v === "__manual__") {
                  setManualIg(true);
                  onUpdate("instagramActorId", "");
                  onUpdate("instagramLabel", "");
                } else if (v === "no_instagram") {
                  onUpdate("instagramActorId", "no_instagram");
                  onUpdate("instagramLabel", "Sem Instagram (Apenas FB)");
                } else if (v === "page_backed") {
                  onUpdate("instagramActorId", "page_backed");
                  onUpdate("instagramLabel", "Usar Página do Facebook");
                } else {
                  onUpdate("instagramActorId", v);
                  const ig = instagramAccounts.find((a) => a.id === v);
                  onUpdate("instagramLabel", ig ? `@${ig.username}` : "");
                }
              }}
            >
              <SelectTrigger className="w-full text-xs h-9">
                <SelectValue placeholder="Selecione conta do Instagram" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="page_backed" className="text-xs">
                  Usar Página do Facebook no Instagram (Recomendado)
                </SelectItem>
                {instagramAccounts.map((ig) => (
                  <SelectItem key={ig.id} value={ig.id} className="text-xs">
                    @{ig.username} (Conta Conectada)
                  </SelectItem>
                ))}
                <SelectItem value="no_instagram" className="text-xs text-muted-foreground">
                  Não anunciar no Instagram (Apenas Facebook)
                </SelectItem>
                <SelectItem value="__manual__" className="text-xs text-primary font-medium">
                  + Digitar ID de Instagram manualmente
                </SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </div>
    </div>
  );
}
