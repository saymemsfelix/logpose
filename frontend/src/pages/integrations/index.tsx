import { useState, useEffect, useCallback } from "react";
import { OfferBanner } from "./components/OfferBanner";
import { FacebookCard } from "./components/FacebookCard";
import { BusinessManagersList } from "./components/BusinessManagersList";
import { ConnectFacebookModal } from "./components/ConnectFacebookModal";
import { TutorialModal } from "./components/TutorialModal";
import { GenerateLinkModal } from "./components/GenerateLinkModal";
import { WebhooksTab } from "./components/WebhooksTab";
import { UtmsTab } from "./components/UtmsTab";
import { PixelsTab } from "./components/PixelsTab";
import {
  fetchFacebookOverview,
  toggleFacebookAccount,
  disconnectFacebook,
  fetchOAuthUrl,
  type FacebookOverviewResponse,
  type OverviewAccount,
} from "@/services/integrations";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

type TabKey = "ads" | "webhooks" | "utms" | "pixels";

interface IntegrationsPageProps {
  initialTab?: TabKey;
}

export default function IntegrationsPage({ initialTab = "ads" }: IntegrationsPageProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [overview, setOverview] = useState<FacebookOverviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [oauthData, setOauthData] = useState<{ oauth_url: string; configured: boolean; app_id?: string | null }>({
    oauth_url: "",
    configured: false,
  });

  // Modais
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [generateLinkModalOpen, setGenerateLinkModalOpen] = useState(false);

  // Carrega visão geral do Facebook e dados OAuth
  const loadOverview = useCallback(async (token?: string) => {
    try {
      setIsLoading(true);
      const data = await fetchFacebookOverview(token);
      setOverview(data);
    } catch {
      // Se ainda não tiver contas salvas
      setOverview({
        connected: false,
        businesses: [],
        total_accounts: 0,
        active_accounts: 0,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOverview();

    fetchOAuthUrl()
      .then((res) => setOauthData(res))
      .catch(() => {});
  }, [loadOverview]);

  // Sincronizar contas
  const handleSync = async () => {
    try {
      setIsSyncing(true);
      await loadOverview(overview?.access_token || undefined);
      toast.success("Contas e métricas do Facebook sincronizadas!");
    } catch {
      toast.error("Erro ao sincronizar contas com a Meta");
    } finally {
      setIsSyncing(false);
    }
  };

  // Conectar com novo token
  const handleConnectToken = async (token: string) => {
    await loadOverview(token);
  };

  // Toggle de conta ativa/inativa
  const handleToggleAccount = async (acc: OverviewAccount, active: boolean) => {
    const token = overview?.access_token || "";
    await toggleFacebookAccount({
      account_id: acc.account_id,
      name: acc.name,
      access_token: token,
      business_id: acc.business_id,
      active,
    });

    // Atualiza estado local imediatamente
    setOverview((prev) => {
      if (!prev) return prev;
      const updatedBusinesses = prev.businesses.map((bm) => ({
        ...bm,
        accounts: bm.accounts.map((a) =>
          a.account_id === acc.account_id ? { ...a, is_active: active } : a
        ),
      }));

      const activeCount = updatedBusinesses.reduce(
        (sum, b) => sum + b.accounts.filter((a) => a.is_active).length,
        0
      );

      return {
        ...prev,
        businesses: updatedBusinesses,
        active_accounts: activeCount,
      };
    });
  };

  // Desconectar Facebook
  const handleDisconnect = async () => {
    try {
      setIsSyncing(true);
      await disconnectFacebook();
      setOverview({
        connected: false,
        businesses: [],
        total_accounts: 0,
        active_accounts: 0,
      });
      toast.success("Conta do Facebook desconectada.");
    } catch {
      toast.error("Erro ao desconectar Facebook");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8 space-y-6">
      {/* Título da Página */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Integrações</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">Workspace Principal</p>
        </div>
      </div>

      {/* Card: Configure sua nova oferta */}
      <OfferBanner onConfigureOffer={() => navigate("/products")} />

      {/* Abas Superiores no estilo NexoFy */}
      <div>
        <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl border border-border/40 bg-card/60 p-1 sm:flex sm:flex-wrap backdrop-blur-xs">
          <button
            type="button"
            onClick={() => setActiveTab("ads")}
            className={`rounded-lg px-3.5 py-2 text-[13px] sm:py-1.5 font-medium transition-all cursor-pointer ${
              activeTab === "ads"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
            }`}
          >
            Anúncios
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("webhooks")}
            className={`rounded-lg px-3.5 py-2 text-[13px] sm:py-1.5 font-medium transition-all cursor-pointer ${
              activeTab === "webhooks"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
            }`}
          >
            Webhooks e APIs
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("utms")}
            className={`rounded-lg px-3.5 py-2 text-[13px] sm:py-1.5 font-medium transition-all cursor-pointer ${
              activeTab === "utms"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
            }`}
          >
            UTMs
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("pixels")}
            className={`rounded-lg px-3.5 py-2 text-[13px] sm:py-1.5 font-medium transition-all cursor-pointer ${
              activeTab === "pixels"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
            }`}
          >
            Pixels
          </button>
        </div>

        {/* Conteúdo da Aba Ativa */}
        <div className="transition-all duration-200 ease-out">
          {activeTab === "ads" && (
            <div className="flex flex-col gap-4">
              <FacebookCard
                connected={overview?.connected ?? false}
                user={overview?.user}
                lastSynced={overview?.last_synced}
                onOpenTutorial={() => setTutorialOpen(true)}
                onConnectAnother={() => setConnectModalOpen(true)}
                onGenerateLink={() => setGenerateLinkModalOpen(true)}
                onSync={handleSync}
                onDisconnect={handleDisconnect}
                isSyncing={isSyncing}
              />

              <BusinessManagersList
                businesses={overview?.businesses ?? []}
                totalAccounts={overview?.total_accounts ?? 0}
                activeAccounts={overview?.active_accounts ?? 0}
                onToggleAccount={handleToggleAccount}
                isLoading={isLoading || isSyncing}
              />
            </div>
          )}

          {activeTab === "webhooks" && <WebhooksTab />}

          {activeTab === "utms" && <UtmsTab />}

          {activeTab === "pixels" && <PixelsTab />}
        </div>
      </div>

      {/* Modais de Suporte */}
      <TutorialModal
        open={tutorialOpen}
        onOpenChange={setTutorialOpen}
        onOpenConnect={() => setConnectModalOpen(true)}
      />

      <ConnectFacebookModal
        open={connectModalOpen}
        onOpenChange={setConnectModalOpen}
        onConnectToken={handleConnectToken}
        oauthUrl={oauthData.oauth_url}
        isOauthConfigured={oauthData.configured}
      />

      <GenerateLinkModal
        open={generateLinkModalOpen}
        onOpenChange={setGenerateLinkModalOpen}
        oauthUrl={oauthData.oauth_url}
      />
    </div>
  );
}
