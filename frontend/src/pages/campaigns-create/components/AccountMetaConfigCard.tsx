import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AccountMetaConfig } from "../hooks/useCampaignForm";
import type { AccountMetaData } from "../hooks/useMetaData";
import type { FacebookAccountAPI } from "@/services/integrations";
import { RiLoader4Line, RiEdit2Line, RiListCheck3 } from "@remixicon/react";

interface AccountMetaConfigCardProps {
  account: FacebookAccountAPI;
  config: AccountMetaConfig;
  metaData: AccountMetaData | undefined;
  onUpdate: (accountId: number, data: Partial<AccountMetaConfig>) => void;
}

export function AccountMetaConfigCard({
  account, config, metaData, onUpdate,
}: AccountMetaConfigCardProps) {
  const pixels = metaData?.pixels ?? [];
  const pages = metaData?.pages ?? [];
  const igAccounts = metaData?.instagramAccounts ?? [];
  const isLoading = metaData?.loading ?? true;

  const [manualPixel, setManualPixel] = useState(false);
  const [manualPage, setManualPage] = useState(false);

  useEffect(() => {
    if (!config.pixelId && pixels.length > 0 && !manualPixel) {
      onUpdate(account.id, { pixelId: pixels[0].id });
    }
  }, [pixels, config.pixelId, manualPixel, account.id, onUpdate]);

  useEffect(() => {
    if (!config.pageId && pages.length > 0 && !manualPage) {
      onUpdate(account.id, { pageId: pages[0].id, pageLabel: pages[0].name });
    }
  }, [pages, config.pageId, manualPage, account.id, onUpdate]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/30">
        <RiLoader4Line className="size-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">{account.label} — Carregando...</span>
      </div>
    );
  }

  const hasPixels = pixels.length > 0;
  const hasPages = pages.length > 0;
  const isPixelManualActive = manualPixel || !hasPixels;
  const isPageManualActive = manualPage || !hasPages;

  return (
    <div className="p-3 rounded-lg border space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{account.label}</p>
        <span className="text-[11px] font-mono text-muted-foreground">{account.account_id}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Pixel */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Pixel</Label>
            {hasPixels && (
              <button
                type="button"
                onClick={() => setManualPixel(!manualPixel)}
                className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
              >
                {manualPixel ? <><RiListCheck3 className="size-2.5" /> Lista</> : <><RiEdit2Line className="size-2.5" /> Digitar</>}
              </button>
            )}
          </div>
          {isPixelManualActive ? (
            <Input
              placeholder="ID do Pixel"
              value={config.pixelId}
              onChange={(e) => onUpdate(account.id, { pixelId: e.target.value.trim() })}
              className="h-8 text-xs font-mono"
            />
          ) : (
            <Select
              value={config.pixelId}
              onValueChange={(v) => {
                if (v === "__manual__") {
                  setManualPixel(true);
                  onUpdate(account.id, { pixelId: "" });
                } else {
                  onUpdate(account.id, { pixelId: v });
                }
              }}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {pixels.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>
                ))}
                <SelectItem value="__manual__" className="text-xs text-primary font-medium">
                  + Digitar manualmente
                </SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Página FB */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Página</Label>
            {hasPages && (
              <button
                type="button"
                onClick={() => setManualPage(!manualPage)}
                className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
              >
                {manualPage ? <><RiListCheck3 className="size-2.5" /> Lista</> : <><RiEdit2Line className="size-2.5" /> Digitar</>}
              </button>
            )}
          </div>
          {isPageManualActive ? (
            <Input
              placeholder="ID da Página"
              value={config.pageId}
              onChange={(e) => {
                const val = e.target.value.trim();
                onUpdate(account.id, { pageId: val, pageLabel: config.pageLabel || val });
              }}
              className="h-8 text-xs font-mono"
            />
          ) : (
            <Select
              value={config.pageId}
              onValueChange={(v) => {
                if (v === "__manual__") {
                  setManualPage(true);
                  onUpdate(account.id, { pageId: "" });
                } else {
                  const page = pages.find((p) => p.id === v);
                  onUpdate(account.id, { pageId: v, pageLabel: page?.name ?? "" });
                }
              }}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {pages.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>
                ))}
                <SelectItem value="__manual__" className="text-xs text-primary font-medium">
                  + Digitar manualmente
                </SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Instagram */}
        <div className="space-y-1">
          <Label className="text-xs">Instagram</Label>
          <Select
            value={
              config.instagramActorId === "no_instagram"
                ? "no_instagram"
                : config.instagramActorId && config.instagramActorId !== "none" && config.instagramActorId !== "page_backed"
                ? config.instagramActorId
                : "page_backed"
            }
            onValueChange={(v) => {
              if (v === "no_instagram") {
                onUpdate(account.id, {
                  instagramActorId: "no_instagram",
                  instagramLabel: "Sem Instagram",
                });
              } else if (v === "page_backed") {
                onUpdate(account.id, {
                  instagramActorId: "page_backed",
                  instagramLabel: "Usar Página do FB",
                });
              } else {
                const ig = igAccounts.find((a) => a.id === v);
                onUpdate(account.id, {
                  instagramActorId: v,
                  instagramLabel: ig ? `@${ig.username}` : "",
                });
              }
            }}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="page_backed" className="text-xs">Usar Página do Facebook</SelectItem>
              {igAccounts.map((ig) => (
                <SelectItem key={ig.id} value={ig.id} className="text-xs">@{ig.username}</SelectItem>
              ))}
              <SelectItem value="no_instagram" className="text-xs text-muted-foreground">Não anunciar no Instagram</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
