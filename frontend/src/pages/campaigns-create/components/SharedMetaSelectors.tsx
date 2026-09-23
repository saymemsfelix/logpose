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
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {/* 1. Pixel */}
      <div className="space-y-2">
        <Label>Pixel</Label>
        <Select value={form.pixelId} onValueChange={(v) => onUpdate("pixelId", v)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={pixels.length > 0 ? "Selecione o Pixel" : "Nenhum pixel encontrado"} />
          </SelectTrigger>
          <SelectContent>
            {pixels.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name} ({p.id})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 2. Página do Facebook */}
      <div className="space-y-2">
        <Label>Página do Facebook</Label>
        <Select
          value={form.pageId}
          onValueChange={(v) => {
            onUpdate("pageId", v);
            const page = pages.find((p) => p.id === v);
            onUpdate("pageLabel", page?.name ?? "");
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={pages.length > 0 ? "Selecione a Página" : "Nenhuma página encontrada"} />
          </SelectTrigger>
          <SelectContent>
            {pages.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 3. Instagram */}
      <div className="space-y-2">
        <Label>Instagram</Label>
        <Select
          value={form.instagramActorId || "none"}
          onValueChange={(v) => {
            const id = v === "none" ? "" : v;
            onUpdate("instagramActorId", id);
            const ig = instagramAccounts.find((a) => a.id === v);
            onUpdate("instagramLabel", ig ? `@${ig.username}` : "");
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecione conta do Instagram" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Usar Página do Facebook</SelectItem>
            {instagramAccounts.map((ig) => (
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
