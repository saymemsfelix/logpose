import { useState } from "react";
import {
  RiBuilding2Line,
  RiArrowDownSLine,
  RiFileCopyLine,
  RiCheckLine,
  RiFolderShield2Line,
  RiCheckboxCircleFill,
} from "@remixicon/react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import type { OverviewBusiness, OverviewAccount } from "@/services/integrations";

interface BusinessManagersListProps {
  businesses: OverviewBusiness[];
  totalAccounts: number;
  activeAccounts: number;
  onToggleAccount: (account: OverviewAccount, active: boolean) => Promise<void>;
  isLoading?: boolean;
}

export function BusinessManagersList({
  businesses,
  totalAccounts,
  activeAccounts,
  onToggleAccount,
  isLoading = false,
}: BusinessManagersListProps) {
  // Guarda quais BMs estão abertos (por padrão todos abertos para fácil visualização)
  const [openBms, setOpenBms] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    businesses.forEach((b, idx) => {
      initial[b.id] = idx === 0 || b.accounts.some((a) => a.is_active);
    });
    return initial;
  });

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const toggleBm = (bmId: string) => {
    setOpenBms((prev) => ({
      ...prev,
      [bmId]: !prev[bmId],
    }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    toast.success(`ID ${text} copiado!`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleToggle = async (acc: OverviewAccount, newActive: boolean) => {
    try {
      setTogglingId(acc.account_id);
      await onToggleAccount(acc, newActive);
      if (newActive) {
        toast.success(`Conta "${acc.name}" ativada no SFY!`);
      } else {
        toast.info(`Conta "${acc.name}" desativada.`);
      }
    } catch {
      toast.error(`Erro ao alterar status da conta "${acc.name}"`);
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Header bar: Contas de anúncio e contador */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/40 bg-card/60 px-4 py-3 sm:px-5 shadow-xs backdrop-blur-xs">
        <span className="text-[13px] font-medium text-foreground">Contas de anúncio</span>
        <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
          {activeAccounts} / {totalAccounts || activeAccounts || 1} utilizadas
        </span>
      </div>

      {/* Lista de BMs (Acordeão) */}
      <div className="flex flex-col gap-3">
        {businesses.map((bm) => {
          const isOpen = openBms[bm.id] ?? false;
          const isStandalone = bm.id === "standalone";

          return (
            <div
              key={bm.id}
              className="overflow-hidden rounded-xl border border-border/40 bg-card/60 shadow-xs transition-all backdrop-blur-xs"
            >
              {/* Botão de cabeçalho da BM */}
              <button
                type="button"
                onClick={() => toggleBm(bm.id)}
                aria-expanded={isOpen}
                className="flex w-full flex-wrap items-center justify-between gap-x-3 gap-y-1 p-4 text-left sm:p-5 hover:bg-accent/40 transition-colors cursor-pointer"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  {isStandalone ? (
                    <RiFolderShield2Line className="size-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <RiBuilding2Line className="size-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className="min-w-0 truncate text-[13px] font-medium text-foreground">
                    {bm.name}
                  </span>
                  <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium bg-muted text-muted-foreground border border-border/30">
                    {bm.accounts_count} {bm.accounts_count === 1 ? "conta" : "contas"}
                  </span>
                </div>

                <RiArrowDownSLine
                  className={`size-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Conteúdo expandido: Contas dentro da BM */}
              {isOpen && (
                <div className="border-t border-border/30 bg-background/40 px-3 py-3 sm:px-5 sm:py-4 space-y-2.5">
                  {bm.accounts.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2 text-center">
                      Nenhuma conta encontrada nesta Business Manager.
                    </p>
                  ) : (
                    bm.accounts.map((acc) => {
                      const isToggling = togglingId === acc.account_id;

                      return (
                        <div
                          key={acc.account_id}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/30 bg-card/80 p-3 sm:px-4 sm:py-3 transition-colors hover:border-border/60"
                        >
                          {/* Info da Conta */}
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex flex-col min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-[13px] font-medium text-foreground truncate">
                                  {acc.name}
                                </span>
                                {acc.is_active && (
                                  <span className="inline-flex items-center gap-1 text-[10.5px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 rounded">
                                    <RiCheckboxCircleFill className="size-3 text-emerald-400" />
                                    Ativa no Dashboard
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 text-[11.5px] text-muted-foreground">
                                <span className="font-mono">{acc.account_id}</span>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(acc.account_id)}
                                  className="text-muted-foreground hover:text-foreground cursor-pointer"
                                  title="Copiar ID da Conta"
                                >
                                  {copiedId === acc.account_id ? (
                                    <RiCheckLine className="size-3 text-emerald-400" />
                                  ) : (
                                    <RiFileCopyLine className="size-3" />
                                  )}
                                </button>
                                <span>·</span>
                                <span className="uppercase text-[10.5px] font-semibold tracking-wider text-muted-foreground/80">
                                  {acc.currency}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Switch de Ativação / Rastreamento */}
                          <div className="flex items-center gap-3">
                            <span className="text-[11.5px] text-muted-foreground hidden sm:inline">
                              {acc.is_active ? "Rastreando" : "Ignorada"}
                            </span>
                            <Switch
                              checked={acc.is_active}
                              disabled={isToggling || isLoading}
                              onCheckedChange={(checked) => handleToggle(acc, checked)}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}

        {businesses.length === 0 && !isLoading && (
          <div className="rounded-xl border border-dashed border-border/60 bg-card/30 p-8 text-center space-y-2">
            <RiBuilding2Line className="size-8 mx-auto text-muted-foreground/50" />
            <div className="text-sm font-medium text-foreground">Nenhuma BM ou Conta Carregada</div>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Conecte sua conta do Facebook para importar automaticamente todas as suas Business Managers e Contas de Anúncio.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
