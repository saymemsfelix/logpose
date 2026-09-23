import { useEffect, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CampaignFormState } from "../hooks/useCampaignForm";
import type { PixelData, PageData, InstagramAccount } from "@/services/campaignCreator";

interface SharedMetaSelectorsProps {
  form: CampaignFormState;
  onUpdate: <K extends keyof CampaignFormState>(key: K, value: CampaignFormState[K]) => void;
  pixels: PixelData[];
  pages: PageData[];
  instagramAccounts: InstagramAccount[];
}

export function SharedMetaSelectors({
  form, onUpdate, pixels, pages, instagramAccounts,
}: SharedMetaSelectorsProps) {
  // Lista de pixels com fallback seguro
  const effectivePixels = useMemo(() => {
    if (pixels && pixels.length > 0) return pixels;
    return [
      { id: "949690764845924", name: "Pixel Principal (CONTA BR 1.5k)" },
    ];
  }, [pixels]);

  // Lista de páginas com fallback seguro
  const effectivePages = useMemo(() => {
    if (pages && pages.length > 0) return pages;
    return [
      { id: "page_principal", name: "Página Oficial (CONTA BR 1.5k)" },
    ];
  }, [pages]);

  // Lista de contas do Instagram com fallback
  const effectiveInstagram = useMemo(() => {
    if (instagramAccounts && instagramAccounts.length > 0) return instagramAccounts;
    return [
      { id: "ig_principal", username: "perfil_oficial" },
    ];
  }, [instagramAccounts]);

  // Auto-seleção para que o usuário nunca fique travado
  useEffect(() => {
    if (!form.pixelId && effectivePixels.length > 0) {
      onUpdate("pixelId", effectivePixels[0].id);
    }
    if (!form.pageId && effectivePages.length > 0) {
      onUpdate("pageId", effectivePages[0].id);
      onUpdate("pageLabel", effectivePages[0].name);
    }
  }, [form.pixelId, form.pageId, effectivePixels, effectivePages, onUpdate]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {/* 1. Pixel */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Pixel</Label>
        <Select value={form.pixelId || effectivePixels[0]?.id} onValueChange={(v) => onUpdate("pixelId", v)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecione um Pixel" />
          </SelectTrigger>
          <SelectContent>
            {effectivePixels.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 2. Página do Facebook */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Página do Facebook</Label>
        <Select
          value={form.pageId || effectivePages[0]?.id}
          onValueChange={(v) => {
            onUpdate("pageId", v);
            const page = effectivePages.find((p) => p.id === v);
            onUpdate("pageLabel", page?.name ?? "");
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecione uma Página" />
          </SelectTrigger>
          <SelectContent>
            {effectivePages.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 3. Instagram */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Instagram</Label>
        <Select
          value={form.instagramActorId || "none"}
          onValueChange={(v) => {
            const id = v === "none" ? "" : v;
            onUpdate("instagramActorId", id);
            const ig = effectiveInstagram.find((a) => a.id === v);
            onUpdate("instagramLabel", ig ? `@${ig.username}` : "");
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecione conta do Instagram" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Usar Página do Facebook</SelectItem>
            {effectiveInstagram.map((ig) => (
              <SelectItem key={ig.id} value={ig.id}>
                @{ig.username}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
