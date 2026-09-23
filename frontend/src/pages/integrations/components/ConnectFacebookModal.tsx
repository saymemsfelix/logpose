import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  RiFacebookCircleFill,
  RiKey2Line,
  RiLoader4Line,
  RiCheckLine,
  RiExternalLinkLine,
} from "@remixicon/react";
import { toast } from "sonner";

interface ConnectFacebookModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnectToken: (token: string) => Promise<void>;
  oauthUrl?: string;
  isOauthConfigured?: boolean;
}

export function ConnectFacebookModal({
  open,
  onOpenChange,
  onConnectToken,
  oauthUrl,
  isOauthConfigured = false,
}: ConnectFacebookModalProps) {
  const [token, setToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("oauth");

  const handleOAuthConnect = () => {
    if (oauthUrl && isOauthConfigured) {
      window.location.href = oauthUrl;
    } else {
      // Abre instrução prática ou guia do Facebook
      toast.info("Abrindo autorização da Meta...");
      // Fallback amigável caso META_APP_ID ainda não tenha sido definido
      const fallbackUrl = "https://developers.facebook.com/tools/explorer/";
      window.open(fallbackUrl, "_blank", "width=800,height=700");
    }
  };

  const handleTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) {
      toast.error("Insira o Access Token do Facebook");
      return;
    }

    try {
      setIsLoading(true);
      await onConnectToken(token.trim());
      toast.success("Conta do Facebook conectada com sucesso!");
      setToken("");
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao conectar conta do Facebook";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <RiFacebookCircleFill className="size-5 text-[#1877F2]" />
            Conectar Conta do Facebook
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Escolha a forma como deseja autorizar a sincronização das suas campanhas e contas de anúncio.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-1">
          <TabsList className="grid w-full grid-cols-2 rounded-lg bg-muted/60 p-1">
            <TabsTrigger value="oauth" className="text-xs font-medium">
              1 Clique Oficial (OAuth)
            </TabsTrigger>
            <TabsTrigger value="token" className="text-xs font-medium">
              Token de Acesso
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: 1 Clique */}
          <TabsContent value="oauth" className="space-y-4 pt-3">
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 text-center space-y-3">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#1877F2]/10 text-[#1877F2]">
                <RiFacebookCircleFill className="size-8" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground">Autorização Direta na Meta</h4>
                <p className="mt-1 text-xs text-muted-foreground max-w-xs mx-auto">
                  Você será redirecionado para a página oficial do Facebook para conceder permissão de leitura dos seus anúncios.
                </p>
              </div>

              <div className="flex flex-col gap-1.5 text-left text-[11.5px] text-muted-foreground bg-background/60 rounded-lg p-3 border border-border/40">
                <div className="flex items-center gap-2">
                  <RiCheckLine className="size-3.5 text-emerald-500 shrink-0" />
                  <span>Importa todas as suas Business Managers (BMs)</span>
                </div>
                <div className="flex items-center gap-2">
                  <RiCheckLine className="size-3.5 text-emerald-500 shrink-0" />
                  <span>Lista todas as Contas de Anúncio instantaneamente</span>
                </div>
                <div className="flex items-center gap-2">
                  <RiCheckLine className="size-3.5 text-emerald-500 shrink-0" />
                  <span>100% seguro com criptografia de ponta a ponta</span>
                </div>
              </div>

              <Button
                type="button"
                onClick={handleOAuthConnect}
                className="w-full bg-[#1877F2] hover:bg-[#166fe5] text-white font-medium text-xs sm:text-sm py-2.5 rounded-lg shadow-sm flex items-center justify-center gap-2"
              >
                <RiFacebookCircleFill className="size-4.5" />
                Continuar com o Facebook
              </Button>
            </div>
          </TabsContent>

          {/* TAB 2: Token */}
          <TabsContent value="token" className="space-y-4 pt-3">
            <form onSubmit={handleTokenSubmit} className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="fb-token" className="text-xs font-medium">
                    Access Token da Meta / Graph API
                  </Label>
                  <a
                    href="https://developers.facebook.com/tools/explorer/"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-blue-400 hover:underline"
                  >
                    Gerar no Explorer
                    <RiExternalLinkLine className="size-3" />
                  </a>
                </div>
                <Input
                  id="fb-token"
                  type="password"
                  placeholder="Cole aqui seu token (EAAB...)"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  disabled={isLoading}
                  autoComplete="off"
                  className="font-mono text-xs"
                />
                <p className="text-[11px] text-muted-foreground">
                  O Log Pose consulta a Meta API com esse token e agrupa todas as suas BMs e contas de anúncio automaticamente.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                  disabled={isLoading}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-500 text-white"
                  disabled={isLoading || !token.trim()}
                >
                  {isLoading ? (
                    <>
                      <RiLoader4Line className="size-4 animate-spin mr-1.5" />
                      Consultando Meta API...
                    </>
                  ) : (
                    <>
                      <RiKey2Line className="size-4 mr-1.5" />
                      Conectar e Buscar Contas
                    </>
                  )}
                </Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
