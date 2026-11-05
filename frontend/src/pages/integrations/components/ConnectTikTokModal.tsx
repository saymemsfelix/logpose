import { useState } from "react";
import {
  RiCloseLine,
  RiVideoLine,
  RiShieldCheckLine,
  RiInformationLine,
  RiKey2Line,
} from "@remixicon/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { connectTikTokAccount, type TikTokConnectPayload } from "@/services/tiktok";

interface ConnectTikTokModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ConnectTikTokModal({
  isOpen,
  onClose,
  onSuccess,
}: ConnectTikTokModalProps) {
  const [label, setLabel] = useState("");
  const [advertiserId, setAdvertiserId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [appId, setAppId] = useState("");
  const [secret, setSecret] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!advertiserId.trim() || !accessToken.trim()) {
      toast.error("Advertiser ID e Access Token são obrigatórios");
      return;
    }

    try {
      setIsSubmitting(true);
      const payload: TikTokConnectPayload = {
        label: label.trim() || `TikTok Ads (${advertiserId.trim()})`,
        advertiser_id: advertiserId.trim(),
        access_token: accessToken.trim(),
        app_id: appId.trim() || undefined,
        secret: secret.trim() || undefined,
      };

      await connectTikTokAccount(payload);
      toast.success("Conta TikTok Ads conectada com sucesso!");
      onSuccess();
      onClose();
    } catch {
      toast.error("Erro ao conectar conta do TikTok Ads");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl border border-border/60 bg-card p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <RiVideoLine className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Conectar TikTok Ads</h2>
              <p className="text-xs text-muted-foreground">TikTok for Business Marketing API</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          >
            <RiCloseLine className="w-5 h-5" />
          </button>
        </div>

        {/* Guia Rápido */}
        <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/20 text-xs text-muted-foreground space-y-1">
          <div className="flex items-center gap-1.5 text-cyan-400 font-semibold">
            <RiInformationLine className="w-4 h-4" />
            Como obter suas credenciais:
          </div>
          <p className="leading-relaxed">
            1. Acesse <strong>business-api.tiktok.com</strong> e crie seu App.
            <br />
            2. Cole seu <strong>Advertiser ID</strong> e o <strong>Access Token</strong> de longa duração gerado.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Nome da Conta / Rótulo</label>
            <Input
              placeholder="Ex: TikTok Ads Principal - Escala"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="h-9 text-xs bg-background/60"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">
              Advertiser ID (ID do Anunciante) *
            </label>
            <Input
              placeholder="Ex: 7123456789012345678"
              value={advertiserId}
              onChange={(e) => setAdvertiserId(e.target.value)}
              required
              className="h-9 text-xs font-mono bg-background/60"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">
              Access Token (Token de Acesso Long-Lived) *
            </label>
            <Input
              type="password"
              placeholder="Cole seu token de longa duração do TikTok"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              required
              className="h-9 text-xs font-mono bg-background/60"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground">App ID (Opcional)</label>
              <Input
                placeholder="TikTok App ID"
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
                className="h-8 text-xs font-mono bg-background/60"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground">Secret (Opcional)</label>
              <Input
                type="password"
                placeholder="TikTok Secret"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                className="h-8 text-xs font-mono bg-background/60"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-border/40">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <RiShieldCheckLine className="w-3.5 h-3.5 text-emerald-400" />
              Token criptografado e seguro
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                className="h-8 text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="h-8 text-xs bg-cyan-600 hover:bg-cyan-500 text-white font-semibold"
              >
                {isSubmitting ? "Conectando..." : "Salvar & Conectar"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

