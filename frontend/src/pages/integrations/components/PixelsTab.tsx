import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  RiAddLine,
  RiCheckLine,
  RiFileCopyLine,
  RiFacebookCircleFill,
  RiFlashlightLine,
  RiShieldCheckLine,
} from "@remixicon/react";
import { toast } from "sonner";

interface PixelItem {
  id: string;
  name: string;
  pixelId: string;
  status: "active" | "testing";
  eventsCount: number;
}

export function PixelsTab() {
  const [pixels, setPixels] = useState<PixelItem[]>([
    {
      id: "px_1",
      name: "Pixel Principal - Oferta Escala",
      pixelId: "1202494388181203",
      status: "active",
      eventsCount: 1420,
    },
  ]);

  const [newPixelName, setNewPixelName] = useState("");
  const [newPixelId, setNewPixelId] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleAddPixel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPixelId.trim() || !newPixelName.trim()) {
      toast.error("Preencha o nome e o ID do Pixel");
      return;
    }

    setPixels((prev) => [
      ...prev,
      {
        id: `px_${Date.now()}`,
        name: newPixelName.trim(),
        pixelId: newPixelId.trim(),
        status: "active",
        eventsCount: 0,
      },
    ]);

    toast.success("Pixel adicionado com sucesso!");
    setNewPixelName("");
    setNewPixelId("");
    setIsAdding(false);
  };

  const copyPixel = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    toast.success("ID do Pixel copiado!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/40 bg-card/60 p-4 sm:p-5 shadow-xs backdrop-blur-xs">
        <div>
          <div className="text-[14px] font-medium text-foreground">Pixels da Meta & CAPI</div>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            Configure e monitore seus Pixels do Facebook para envio de eventos via Browser e API de Conversões.
          </p>
        </div>
        <Button
          onClick={() => setIsAdding(!isAdding)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[13px] font-medium shadow-sm transition-colors"
        >
          <RiAddLine className="size-4" />
          {isAdding ? "Cancelar" : "Adicionar Pixel"}
        </Button>
      </div>

      {/* Formulário Novo Pixel */}
      {isAdding && (
        <form
          onSubmit={handleAddPixel}
          className="rounded-xl border border-blue-500/30 bg-card/80 p-4 sm:p-5 space-y-4 shadow-sm"
        >
          <div className="text-sm font-semibold text-foreground flex items-center gap-2">
            <RiFacebookCircleFill className="size-4 text-blue-500" />
            Vincular Novo Pixel da Meta
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome de Identificação</Label>
              <Input
                placeholder="Ex: Pixel Oferta VSL"
                value={newPixelName}
                onChange={(e) => setNewPixelName(e.target.value)}
                className="text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">ID do Pixel (Dataset ID)</Label>
              <Input
                placeholder="Ex: 949690764845924"
                value={newPixelId}
                onChange={(e) => setNewPixelId(e.target.value)}
                className="text-xs font-mono"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAdding(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              className="bg-blue-600 hover:bg-blue-500 text-white"
            >
              Salvar Pixel
            </Button>
          </div>
        </form>
      )}

      {/* Lista de Pixels */}
      <div className="grid gap-3">
        {pixels.map((px) => (
          <div
            key={px.id}
            className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border/40 bg-card/60 p-4 shadow-xs hover:border-border/60 transition-colors backdrop-blur-xs"
          >
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0 text-blue-500">
                <RiFlashlightLine className="size-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-medium text-foreground">{px.name}</span>
                  <Badge variant="outline" className="text-[10px] text-emerald-400 bg-emerald-500/10 border-emerald-500/20">
                    <RiShieldCheckLine className="size-3 mr-1" />
                    CAPI Ativo
                  </Badge>
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground font-mono">
                  <span>ID: {px.pixelId}</span>
                  <button
                    type="button"
                    onClick={() => copyPixel(px.pixelId)}
                    className="hover:text-foreground cursor-pointer"
                    title="Copiar ID"
                  >
                    {copiedId === px.pixelId ? (
                      <RiCheckLine className="size-3 text-emerald-400" />
                    ) : (
                      <RiFileCopyLine className="size-3" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right text-xs">
                <div className="text-muted-foreground">Eventos Recebidos</div>
                <div className="font-semibold text-foreground">{px.eventsCount.toLocaleString("pt-BR")}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
