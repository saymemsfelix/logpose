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
  RiFacebookCircleFill,
  RiSearchLine,
  RiBuildingLine,
  RiCheckLine,
  RiRefreshLine,
  RiInformationLine,
  RiEditLine,
  RiArrowRightLine,
} from "@remixicon/react";
import type { PageData } from "@/services/campaignCreator";
import { searchMetaAssets, fetchPages } from "@/services/campaignCreator";

interface PageSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pages: PageData[];
  selectedPageId: string;
  onSelectPage: (pageId: string, pageName: string) => void;
  accountId?: number;
  onPagesUpdated?: (pages: PageData[]) => void;
}

export function PageSelectorModal({
  open,
  onOpenChange,
  pages: initialPages,
  selectedPageId,
  onSelectPage,
  accountId,
  onPagesUpdated,
}: PageSelectorModalProps) {
  const [pagesList, setPagesList] = useState<PageData[]>(initialPages);
  const [searchQuery, setSearchQuery] = useState("");
  const [bmIdInput, setBmIdInput] = useState("");
  const [directPageId, setDirectPageId] = useState("");
  const [directPageName, setDirectPageName] = useState("");
  const [isSearchingBm, setIsSearchingBm] = useState(false);
  const [bmSearchError, setBmSearchError] = useState("");
  const [currentSelectedId, setCurrentSelectedId] = useState(selectedPageId);
  const [showBmInput, setShowBmInput] = useState(false);

  // Sincroniza se a lista externa atualizar
  if (initialPages.length > 0 && pagesList.length === 0) {
    setPagesList(initialPages);
  }

  // Filtragem da lista por texto ou ID
  const filteredPages = pagesList.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      p.name.toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q)
    );
  });

  // Buscar páginas de uma BM específica
  const handleSearchByBm = async () => {
    if (!bmIdInput.trim() || !accountId) return;
    setIsSearchingBm(true);
    setBmSearchError("");

    try {
      // 1. Tenta buscar páginas passando business_id no endpoint
      const res = await fetchPages(accountId, bmIdInput.trim());
      let found = res.pages || [];

      // 2. Se vazio, tenta pelo searchMetaAssets
      if (found.length === 0) {
        const metaRes = await searchMetaAssets(accountId, bmIdInput.trim());
        found = metaRes.pages || [];
      }

      if (found.length > 0) {
        // Junta deduplicando
        const map = new Map<string, PageData>();
        pagesList.forEach((p) => map.set(p.id, p));
        found.forEach((p) => map.set(p.id, p));
        const updated = Array.from(map.values());
        setPagesList(updated);
        if (onPagesUpdated) onPagesUpdated(updated);
        // Seleciona a primeira página encontrada automaticamente
        if (!currentSelectedId && found[0]) {
          setCurrentSelectedId(found[0].id);
        }
      } else {
        setBmSearchError("Nenhuma página encontrada com este ID de BM ou permissão restrita na Meta.");
      }
    } catch (err) {
      setBmSearchError("Erro ao consultar BM na Meta API. Verifique se o ID está correto.");
    } finally {
      setIsSearchingBm(false);
    }
  };

  // Inserir página por ID direto
  const handleAddDirectPage = () => {
    const id = directPageId.trim();
    if (!id) return;
    const name = directPageName.trim() || `Página (${id})`;
    const newPage: PageData = { id, name };

    const map = new Map<string, PageData>();
    pagesList.forEach((p) => map.set(p.id, p));
    map.set(id, newPage);
    const updated = Array.from(map.values());

    setPagesList(updated);
    if (onPagesUpdated) onPagesUpdated(updated);
    setCurrentSelectedId(id);
    setDirectPageId("");
    setDirectPageName("");
  };

  const handleConfirm = () => {
    const page = pagesList.find((p) => p.id === currentSelectedId);
    if (page) {
      onSelectPage(page.id, page.name);
    } else if (currentSelectedId) {
      onSelectPage(currentSelectedId, `Página (${currentSelectedId})`);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[88vh] flex flex-col p-0 gap-0 overflow-hidden bg-[#0c1220] border-white/10 text-white shadow-2xl">
        {/* Header no estilo Meta Ads */}
        <DialogHeader className="p-5 pb-4 border-b border-white/10 bg-[#090d16]/80">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-[#1877F2]/10 border border-[#1877F2]/30 flex items-center justify-center shrink-0">
              <RiFacebookCircleFill className="size-5 text-[#1877F2]" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-white">
                Selecionar Página do Facebook
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400 mt-0.5">
                Escolha a página que representará sua identidade nos anúncios da Meta.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Barra de Pesquisa */}
          <div className="relative">
            <RiSearchLine className="absolute left-3 top-2.5 size-4 text-slate-400" />
            <Input
              placeholder="Pesquisar por nome ou ID da Página..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-[#111827] border-white/10 text-xs h-9 text-white placeholder:text-slate-500 focus-visible:ring-[#1877F2]/50"
            />
          </div>

          {/* Seletor / Botão de Buscar por ID da BM */}
          <div className="rounded-xl border border-white/10 bg-[#111827]/60 p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-200 flex items-center gap-1.5">
                <RiBuildingLine className="size-3.5 text-primary" />
                Buscar páginas de uma Business Manager (BM)
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
                    className="h-8 text-xs shrink-0 bg-[#1877F2] hover:bg-[#1877F2]/90 text-white font-medium"
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
                <p className="text-[10px] text-slate-400">
                  O sistema consultará todas as páginas vinculadas a este ID de BM na Meta API.
                </p>
              </div>
            )}
          </div>

          {/* Lista de Páginas */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-400 pb-1">
              <span>Páginas disponíveis ({filteredPages.length})</span>
              {currentSelectedId && (
                <span className="text-emerald-400 text-[11px]">1 selecionada</span>
              )}
            </div>

            {filteredPages.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/10 p-6 text-center space-y-3 bg-[#111827]/30">
                <div className="size-10 rounded-full bg-white/5 mx-auto flex items-center justify-center text-slate-400">
                  <RiFacebookCircleFill className="size-6 text-slate-500" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-300">
                    Nenhuma página listada automaticamente
                  </p>
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto mt-1 leading-relaxed">
                    Você pode digitar o <strong>ID da sua BM</strong> acima ou inserir o <strong>ID da Página</strong> diretamente no campo abaixo.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 max-h-[220px] overflow-y-auto pr-1">
                {filteredPages.map((page) => {
                  const isSelected = page.id === currentSelectedId;
                  const avatarUrl = page.picture?.data?.url;

                  return (
                    <div
                      key={page.id}
                      onClick={() => setCurrentSelectedId(page.id)}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-[#1877F2]/10 border-[#1877F2] shadow-[0_0_12px_rgba(24,119,242,0.2)]"
                          : "bg-[#111827]/70 border-white/5 hover:border-white/20 hover:bg-[#111827]"
                      }`}
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt={page.name}
                            className="size-8 rounded-full object-cover shrink-0 border border-white/10"
                          />
                        ) : (
                          <div className="size-8 rounded-full bg-[#1877F2]/20 border border-[#1877F2]/30 flex items-center justify-center shrink-0">
                            <RiFacebookCircleFill className="size-4 text-[#1877F2]" />
                          </div>
                        )}
                        <div className="overflow-hidden">
                          <p className="text-xs font-semibold text-white truncate max-w-[280px]">
                            {page.name}
                          </p>
                          <p className="text-[10px] font-mono text-slate-400">
                            ID: {page.id}
                          </p>
                        </div>
                      </div>

                      <div
                        className={`size-5 rounded-full flex items-center justify-center border transition-colors shrink-0 ${
                          isSelected
                            ? "bg-[#1877F2] border-[#1877F2] text-white"
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
                Inserir ID da Página manualmente
              </span>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="ID numérico (ex: 102938475612345)"
                value={directPageId}
                onChange={(e) => setDirectPageId(e.target.value.trim())}
                className="bg-[#111827] border-white/10 text-xs h-8 font-mono text-white placeholder:text-slate-500"
              />
              <Input
                placeholder="Nome opcional"
                value={directPageName}
                onChange={(e) => setDirectPageName(e.target.value)}
                className="bg-[#111827] border-white/10 text-xs h-8 text-white placeholder:text-slate-500 max-w-[140px]"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleAddDirectPage}
                disabled={!directPageId.trim()}
                className="h-8 text-xs shrink-0 border-white/10 hover:bg-white/10"
              >
                Adicionar
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
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
            className="text-xs bg-[#1877F2] hover:bg-[#1877F2]/90 text-white font-medium px-4 h-8"
          >
            <span>Selecionar Página</span>
            <RiArrowRightLine className="size-3.5 ml-1" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
