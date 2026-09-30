import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  RiFocus2Line,
  RiSearchLine,
  RiBuildingLine,
  RiCheckLine,
  RiRefreshLine,
  RiInformationLine,
  RiEditLine,
  RiArrowRightLine,
} from "@remixicon/react";
import type { PixelData } from "@/services/campaignCreator";
import { searchMetaAssets } from "@/services/campaignCreator";

interface PixelSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pixels: PixelData[];
  selectedPixelId: string;
  onSelectPixel: (pixelId: string) => void;
  accountId?: number;
  onPixelsUpdated?: (pixels: PixelData[]) => void;
}

export function PixelSelectorModal({
  open,
  onOpenChange,
  pixels: initialPixels,
  selectedPixelId,
  onSelectPixel,
  accountId,
  onPixelsUpdated,
}: PixelSelectorModalProps) {
  const [pixelsList, setPixelsList] = useState<PixelData[]>(initialPixels);
  const [searchQuery, setSearchQuery] = useState("");
  const [bmIdInput, setBmIdInput] = useState("");
  const [directPixelId, setDirectPixelId] = useState("");
  const [directPixelName, setDirectPixelName] = useState("");
  const [isSearchingBm, setIsSearchingBm] = useState(false);
  const [bmSearchError, setBmSearchError] = useState("");
  const [currentSelectedId, setCurrentSelectedId] = useState(selectedPixelId);
  const [showBmInput, setShowBmInput] = useState(false);

  // Sincroniza se a lista externa atualizar
  if (initialPixels.length > 0 && pixelsList.length === 0) {
    setPixelsList(initialPixels);
  }

  const filteredPixels = pixelsList.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      p.name.toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q)
    );
  });

  const handleSearchByBm = async () => {
    if (!bmIdInput.trim() || !accountId) return;
    setIsSearchingBm(true);
    setBmSearchError("");

    try {
      const metaRes = await searchMetaAssets(accountId, bmIdInput.trim());
      const found = metaRes.pixels || [];

      if (found.length > 0) {
        const map = new Map<string, PixelData>();
        pixelsList.forEach((p) => map.set(p.id, p));
        found.forEach((p) => map.set(p.id, p));
        const updated = Array.from(map.values());
        setPixelsList(updated);
        if (onPixelsUpdated) onPixelsUpdated(updated);
        if (!currentSelectedId && found[0]) {
          setCurrentSelectedId(found[0].id);
        }
      } else {
        setBmSearchError("Nenhum pixel ou dataset encontrado para este ID de BM.");
      }
    } catch {
      setBmSearchError("Erro ao consultar BM na Meta API. Verifique o ID informado.");
    } finally {
      setIsSearchingBm(false);
    }
  };

  const handleAddDirectPixel = () => {
    const id = directPixelId.trim();
    if (!id) return;
    const name = directPixelName.trim() || `Pixel (${id})`;
    const newPixel: PixelData = { id, name };

    const map = new Map<string, PixelData>();
    pixelsList.forEach((p) => map.set(p.id, p));
    map.set(id, newPixel);
    const updated = Array.from(map.values());

    setPixelsList(updated);
    if (onPixelsUpdated) onPixelsUpdated(updated);
    setCurrentSelectedId(id);
    setDirectPixelId("");
    setDirectPixelName("");
  };

  const handleConfirm = () => {
    if (currentSelectedId) {
      onSelectPixel(currentSelectedId);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[88vh] flex flex-col p-0 gap-0 overflow-hidden bg-[#0c1220] border-white/10 text-white shadow-2xl">
        <DialogHeader className="p-5 pb-4 border-b border-white/10 bg-[#090d16]/80">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <RiFocus2Line className="size-5 text-emerald-400" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-white">
                Selecionar Pixel / Dataset da Meta
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400 mt-0.5">
                Escolha o identificador de evento para rastreamento de compras e leads.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Barra de Pesquisa */}
          <div className="relative">
            <RiSearchLine className="absolute left-3 top-2.5 size-4 text-slate-400" />
            <Input
              placeholder="Pesquisar por nome ou ID do Pixel / Dataset..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-[#111827] border-white/10 text-xs h-9 text-white placeholder:text-slate-500 focus-visible:ring-emerald-500/50"
            />
          </div>

          {/* Buscar por BM */}
          <div className="rounded-xl border border-white/10 bg-[#111827]/60 p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-200 flex items-center gap-1.5">
                <RiBuildingLine className="size-3.5 text-primary" />
                Buscar pixels de uma Business Manager (BM)
              </span>
              <button
                type="button"
                onClick={() => setShowBmInput(!showBmInput)}
                className="text-[11px] text-primary hover:underline font-medium"
              >
                {showBmInput ? "Ocultar" : "Digitar ID da BM"}
              </button>
            </div>

            {showBmInput && (
              <div className="space-y-2 pt-1 border-t border-white/5">
                <div className="flex gap-2">
                  <Input
                    placeholder="ID da BM (ex: 84920485930219)"
                    value={bmIdInput}
                    onChange={(e) => setBmIdInput(e.target.value.trim())}
                    className="bg-[#090d16] border-white/10 text-xs h-8 font-mono text-white placeholder:text-slate-500"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSearchByBm}
                    disabled={isSearchingBm || !bmIdInput.trim()}
                    className="h-8 text-xs shrink-0 bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
                  >
                    <RiRefreshLine className={`size-3.5 mr-1 ${isSearchingBm ? "animate-spin" : ""}`} />
                    {isSearchingBm ? "Buscando..." : "Buscar na BM"}
                  </Button>
                </div>
                {bmSearchError && (
                  <p className="text-[11px] text-amber-400 flex items-center gap-1">
                    <RiInformationLine className="size-3 shrink-0" />
                    {bmSearchError}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Lista de Pixels */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-400 pb-1">
              <span>Pixels e Datasets disponíveis ({filteredPixels.length})</span>
              {currentSelectedId && (
                <span className="text-emerald-400 text-[11px]">1 selecionado</span>
              )}
            </div>

            {filteredPixels.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/10 p-6 text-center space-y-3 bg-[#111827]/30">
                <div className="size-10 rounded-full bg-white/5 mx-auto flex items-center justify-center text-slate-400">
                  <RiFocus2Line className="size-6 text-slate-500" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-300">
                    Nenhum pixel ou dataset listado automaticamente
                  </p>
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto mt-1 leading-relaxed">
                    Você pode buscar pelo <strong>ID da BM</strong> acima ou inserir o <strong>ID do Pixel</strong> diretamente abaixo.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 max-h-[220px] overflow-y-auto pr-1">
                {filteredPixels.map((pixel) => {
                  const isSelected = pixel.id === currentSelectedId;

                  return (
                    <div
                      key={pixel.id}
                      onClick={() => setCurrentSelectedId(pixel.id)}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-emerald-500/10 border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.2)]"
                          : "bg-[#111827]/70 border-white/5 hover:border-white/20 hover:bg-[#111827]"
                      }`}
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="size-8 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
                          <RiFocus2Line className="size-4 text-emerald-400" />
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-xs font-semibold text-white truncate max-w-[280px]">
                            {pixel.name}
                          </p>
                          <p className="text-[10px] font-mono text-slate-400">
                            ID: {pixel.id}
                          </p>
                        </div>
                      </div>

                      <div
                        className={`size-5 rounded-full flex items-center justify-center border transition-colors shrink-0 ${
                          isSelected
                            ? "bg-emerald-500 border-emerald-500 text-white"
                            : "border-white/20 bg-black/20"
                        }`}
                      >
                        {isSelected && <RiCheckLine className="size-3.5 stroke-[2.5]" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Inserir ID Manualmente */}
          <div className="pt-2 border-t border-white/10">
            <div className="flex items-center justify-between pb-1.5">
              <span className="text-xs font-medium text-slate-300 flex items-center gap-1">
                <RiEditLine className="size-3 text-slate-400" />
                Inserir ID de Pixel/Dataset manualmente
              </span>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="ID numérico (ex: 949690764845924)"
                value={directPixelId}
                onChange={(e) => setDirectPixelId(e.target.value.trim())}
                className="bg-[#111827] border-white/10 text-xs h-8 font-mono text-white placeholder:text-slate-500"
              />
              <Input
                placeholder="Nome opcional"
                value={directPixelName}
                onChange={(e) => setDirectPixelName(e.target.value)}
                className="bg-[#111827] border-white/10 text-xs h-8 text-white placeholder:text-slate-500 max-w-[140px]"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleAddDirectPixel}
                disabled={!directPixelId.trim()}
                className="h-8 text-xs shrink-0 border-white/10 hover:bg-white/10"
              >
                Adicionar
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="p-4 border-t border-white/10 bg-[#090d16]/80 flex justify-between items-center sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs text-slate-400 hover:text-white"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleConfirm}
            disabled={!currentSelectedId}
            className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 h-8"
          >
            <span>Selecionar Pixel</span>
            <RiArrowRightLine className="size-3.5 ml-1" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
