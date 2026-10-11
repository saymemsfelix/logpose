import { useState, useMemo } from "react";
import {
  RiLinkM,
  RiFileCopyLine,
  RiCheckLine,
  RiExternalLinkLine,
  RiCodeSSlashLine,
  RiShieldFlashLine,
  RiInformationLine,
} from "@remixicon/react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ChannelType = "meta" | "google" | "tiktok" | "influencer" | "whatsapp";

interface ChannelConfig {
  name: string;
  badge: string;
  source: string;
  medium: string;
  campaign: string;
  content: string;
  term: string;
  src: string;
  sck: string;
}

const CHANNELS: Record<ChannelType, ChannelConfig> = {
  meta: {
    name: "Meta Ads (Facebook & Instagram)",
    badge: "Macros Dinâmicas",
    source: "{{site_source_name}}",
    medium: "{{placement}}",
    campaign: "{{campaign.name}}",
    content: "{{ad.name}}",
    term: "{{adset.name}}",
    src: "meta",
    sck: "{{campaign.id}}",
  },
  google: {
    name: "Google Ads (Search & YouTube)",
    badge: "ValueTrack",
    source: "google",
    medium: "cpc",
    campaign: "{campaignid}",
    content: "{creative}",
    term: "{keyword}",
    src: "google",
    sck: "{adgroupid}",
  },
  tiktok: {
    name: "TikTok Ads",
    badge: "Macros TikTok",
    source: "tiktok",
    medium: "cpc",
    campaign: "__CAMPAIGN_NAME__",
    content: "__CID_NAME__",
    term: "__AID_NAME__",
    src: "tiktok",
    sck: "__CAMPAIGN_ID__",
  },
  influencer: {
    name: "Parcerias & Influenciadores",
    badge: "Manual",
    source: "instagram",
    medium: "stories",
    campaign: "influencer_juliana",
    content: "stories_link",
    term: "cupom10",
    src: "influencer",
    sck: "",
  },
  whatsapp: {
    name: "WhatsApp / 1-a-1 / E-mail",
    badge: "Direto",
    source: "whatsapp",
    medium: "chat",
    campaign: "recuperacao_vendas",
    content: "oferta_exclusiva",
    term: "atendente_1",
    src: "whatsapp",
    sck: "",
  },
};

const UTM_PRESERVER_SCRIPT = `<!-- SCRIPT NINJA DE REPASSE DE UTMS (ANTI-PERDA DE VENDAS) -->
<script>
(function() {
  function getParams() {
    var query = window.location.search.substring(1);
    if (!query) return sessionStorage.getItem('ninja_utms') || '';
    sessionStorage.setItem('ninja_utms', query);
    return query;
  }
  
  function appendUtmsToLinks() {
    var utms = getParams();
    if (!utms) return;
    
    var links = document.querySelectorAll('a[href]');
    links.forEach(function(link) {
      var href = link.getAttribute('href');
      if (!href) return;
      // Aplica a checkouts conhecidos (Kiwify, Hotmart, Braip, PerfectPay, Kirvano, Eduzz, Greenn, Stripe, Typebot)
      var isCheckout = /kiwify|hotmart|perfectpay|braip|kirvano|greenn|eduzz|stripe|typebot|monetizze/i.test(href);
      if (isCheckout || link.classList.contains('ninja-track')) {
        var separator = href.indexOf('?') !== -1 ? '&' : '?';
        link.setAttribute('href', href + separator + utms);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', appendUtmsToLinks);
  } else {
    appendUtmsToLinks();
  }
  // Suporte a botões carregados dinamicamente
  setTimeout(appendUtmsToLinks, 1500);
  setTimeout(appendUtmsToLinks, 3000);
})();
</script>`;

export default function UtmBuilderPage() {
  const [baseUrl, setBaseUrl] = useState("https://seusite.com.br/vsl");
  const [selectedChannel, setSelectedChannel] = useState<ChannelType>("meta");

  // Parâmetros customizáveis
  const [source, setSource] = useState(CHANNELS.meta.source);
  const [medium, setMedium] = useState(CHANNELS.meta.medium);
  const [campaign, setCampaign] = useState(CHANNELS.meta.campaign);
  const [content, setContent] = useState(CHANNELS.meta.content);
  const [term, setTerm] = useState(CHANNELS.meta.term);
  const [srcParam, setSrcParam] = useState(CHANNELS.meta.src);
  const [sckParam, setSckParam] = useState(CHANNELS.meta.sck);

  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  const handleSelectChannel = (channel: ChannelType) => {
    setSelectedChannel(channel);
    const cfg = CHANNELS[channel];
    setSource(cfg.source);
    setMedium(cfg.medium);
    setCampaign(cfg.campaign);
    setContent(cfg.content);
    setTerm(cfg.term);
    setSrcParam(cfg.src);
    setSckParam(cfg.sck);
    toast.info(`Configurações de ${cfg.name} aplicadas!`);
  };

  // Constrói a URL final
  const generatedUrl = useMemo(() => {
    try {
      let cleanUrl = baseUrl.trim();
      if (!cleanUrl) return "";
      if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
        cleanUrl = "https://" + cleanUrl;
      }

      const urlObj = new URL(cleanUrl);
      if (source) urlObj.searchParams.set("utm_source", source);
      if (medium) urlObj.searchParams.set("utm_medium", medium);
      if (campaign) urlObj.searchParams.set("utm_campaign", campaign);
      if (content) urlObj.searchParams.set("utm_content", content);
      if (term) urlObj.searchParams.set("utm_term", term);
      if (srcParam) urlObj.searchParams.set("src", srcParam);
      if (sckParam) urlObj.searchParams.set("sck", sckParam);

      return urlObj.toString();
    } catch {
      return baseUrl;
    }
  }, [baseUrl, source, medium, campaign, content, term, srcParam, sckParam]);

  const handleCopyUrl = () => {
    if (!generatedUrl) return;
    navigator.clipboard.writeText(generatedUrl);
    setCopiedUrl(true);
    toast.success("URL com UTMs copiada para a área de transferência!");
    setTimeout(() => setCopiedUrl(false), 2500);
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(UTM_PRESERVER_SCRIPT);
    setCopiedScript(true);
    toast.success("Script Ninja de Repasse copiado!");
    setTimeout(() => setCopiedScript(false), 2500);
  };

  return (
    <div className="flex flex-col gap-6 p-6 min-h-screen bg-background">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <RiLinkM className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              Gerador Inteligente de UTMs & Script de Repasse
              <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/30 text-xs">
                Rastreamento Blindado
              </Badge>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Gere URLs com tags dinâmicas do Meta Ads e copie o script anti-perda de rastreamento para seus botões de checkout.
            </p>
          </div>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="generator" className="w-full">
        <TabsList className="bg-muted/50 p-1 border border-border/50">
          <TabsTrigger value="generator" className="gap-2 text-xs">
            <RiLinkM className="w-4 h-4 text-purple-400" />
            Construtor de Links UTM
          </TabsTrigger>
          <TabsTrigger value="script" className="gap-2 text-xs">
            <RiCodeSSlashLine className="w-4 h-4 text-emerald-400" />
            Script Ninja de Repasse (Anti-Perda)
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: CONSTRUTOR DE LINKS */}
        <TabsContent value="generator" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* INPUTS ESQUERDA */}
            <div className="lg:col-span-7 space-y-4">
              <Card className="bg-card/90 border-border/60">
                <CardHeader className="p-5 pb-3">
                  <CardTitle className="text-base font-semibold">1. URL da Página de Destino</CardTitle>
                  <CardDescription className="text-xs">
                    Cole o link da sua página de vendas, VSL, advertorial ou presell.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-5 pt-0">
                  <Input
                    placeholder="https://seusite.com.br/vsl"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    className="font-mono text-sm"
                  />
                </CardContent>
              </Card>

              <Card className="bg-card/90 border-border/60">
                <CardHeader className="p-5 pb-3">
                  <CardTitle className="text-base font-semibold">2. Canal de Tráfego</CardTitle>
                  <CardDescription className="text-xs">
                    Selecione o canal para aplicar as macros automáticas oficiais.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-5 pt-0">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {(Object.keys(CHANNELS) as ChannelType[]).map((ch) => {
                      const isSelected = selectedChannel === ch;
                      return (
                        <Button
                          key={ch}
                          variant={isSelected ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleSelectChannel(ch)}
                          className={`text-xs justify-start h-auto py-2.5 px-3 ${
                            isSelected ? "border-purple-500 shadow-md" : "border-border/60"
                          }`}
                        >
                          <div>
                            <div className="font-semibold text-left">{CHANNELS[ch].name.split("(")[0]}</div>
                            <div className="text-[10px] opacity-70 text-left font-normal">{CHANNELS[ch].badge}</div>
                          </div>
                        </Button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/90 border-border/60">
                <CardHeader className="p-5 pb-3">
                  <CardTitle className="text-base font-semibold">3. Parâmetros de Rastreamento</CardTitle>
                  <CardDescription className="text-xs">
                    Preenchidos automaticamente com macros da plataforma ou personalizáveis.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-5 pt-0 space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-[11px] font-semibold text-muted-foreground">utm_source (Origem)</Label>
                      <Input
                        value={source}
                        onChange={(e) => setSource(e.target.value)}
                        className="mt-1 font-mono text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] font-semibold text-muted-foreground">utm_medium (Mídia/Posicionamento)</Label>
                      <Input
                        value={medium}
                        onChange={(e) => setMedium(e.target.value)}
                        className="mt-1 font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-[11px] font-semibold text-muted-foreground">utm_campaign (Campanha)</Label>
                      <Input
                        value={campaign}
                        onChange={(e) => setCampaign(e.target.value)}
                        className="mt-1 font-mono text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] font-semibold text-muted-foreground">utm_content (Criativo / Anúncio)</Label>
                      <Input
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="mt-1 font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-[11px] font-semibold text-muted-foreground">utm_term (Conjunto)</Label>
                      <Input
                        value={term}
                        onChange={(e) => setTerm(e.target.value)}
                        className="mt-1 font-mono text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] font-semibold text-muted-foreground">src (Checkout)</Label>
                      <Input
                        value={srcParam}
                        onChange={(e) => setSrcParam(e.target.value)}
                        className="mt-1 font-mono text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] font-semibold text-muted-foreground">sck (Sub-ID)</Label>
                      <Input
                        value={sckParam}
                        onChange={(e) => setSckParam(e.target.value)}
                        className="mt-1 font-mono text-xs"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* PREVIEW E CÓPIA DIREITA */}
            <div className="lg:col-span-5 space-y-4">
              <Card className="bg-gradient-to-br from-purple-950/20 via-card to-card border-purple-500/40 shadow-xl sticky top-6">
                <CardHeader className="p-5 pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                      <RiShieldFlashLine className="w-5 h-5 text-purple-400" />
                      Link Rastreado Pronto
                    </CardTitle>
                    <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/30 text-[10px]">
                      100% Compatível
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">
                    Copie e cole este link diretamente no campo "URL do site" do seu anúncio no Meta Ads.
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-5 pt-0 space-y-4">
                  <div className="p-3.5 rounded-lg bg-black/40 border border-border/80 font-mono text-xs break-all text-purple-200 select-all leading-relaxed">
                    {generatedUrl}
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button
                      onClick={handleCopyUrl}
                      className="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-lg shadow-purple-950/50"
                    >
                      {copiedUrl ? (
                        <>
                          <RiCheckLine className="w-4 h-4 mr-1.5 text-emerald-300" />
                          Link Copiado!
                        </>
                      ) : (
                        <>
                          <RiFileCopyLine className="w-4 h-4 mr-1.5" />
                          Copiar Link Rastreado
                        </>
                      )}
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(generatedUrl, "_blank")}
                      className="w-full text-xs border-border/80"
                    >
                      <RiExternalLinkLine className="w-4 h-4 mr-1.5" />
                      Testar Link no Navegador
                    </Button>
                  </div>

                  <div className="p-3 rounded-lg bg-muted/40 border border-border/40 text-[11px] text-muted-foreground space-y-1.5">
                    <div className="font-semibold text-foreground flex items-center gap-1.5">
                      <RiInformationLine className="w-4 h-4 text-purple-400" />
                      Como funciona no Meta Ads?
                    </div>
                    <p>
                      O Meta Ads substituirá automaticamente macros como <code>{"{{campaign.name}}"}</code> e{" "}
                      <code>{"{{ad.name}}"}</code> pelo nome real no momento da impressão, garantindo atribuição perfeita no Ninja Tracker.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* TAB 2: SCRIPT NINJA DE REPASSE */}
        <TabsContent value="script" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 space-y-4">
              <Card className="bg-card/90 border-border/60">
                <CardHeader className="p-5 pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-bold flex items-center gap-2">
                        <RiCodeSSlashLine className="w-5 h-5 text-emerald-400" />
                        Script Ninja de Repasse de UTMs
                      </CardTitle>
                      <CardDescription className="text-xs mt-1">
                        Injeta automaticamente todas as UTMs em botões que levam para o checkout da Kiwify, Hotmart, PerfectPay, Braip, Kirvano, Greenn ou Typebot.
                      </CardDescription>
                    </div>

                    <Button
                      size="sm"
                      onClick={handleCopyScript}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs"
                    >
                      {copiedScript ? (
                        <>
                          <RiCheckLine className="w-4 h-4 mr-1.5" />
                          Script Copiado!
                        </>
                      ) : (
                        <>
                          <RiFileCopyLine className="w-4 h-4 mr-1.5" />
                          Copiar Script
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="p-5 pt-0">
                  <pre className="p-4 rounded-lg bg-black/60 border border-border/80 font-mono text-xs text-emerald-300 overflow-x-auto select-all leading-relaxed max-h-96">
                    {UTM_PRESERVER_SCRIPT}
                  </pre>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-4 space-y-4">
              <Card className="bg-card/90 border-border/60">
                <CardHeader className="p-5 pb-2">
                  <CardTitle className="text-sm font-semibold text-foreground">
                    Como Instalar na sua Página:
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 pt-0 space-y-3 text-xs text-muted-foreground leading-relaxed">
                  <div className="space-y-1">
                    <span className="font-bold text-foreground">1. No WordPress / Elementor:</span>
                    <p>
                      Adicione um widget de <strong>HTML</strong> no final da página ou vá em <em>Elementor &gt; Código Personalizado</em> e cole no <code>&lt;head&gt;</code> ou <code>&lt;body&gt;</code>.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="font-bold text-foreground">2. No GreatPages ou Webflow:</span>
                    <p>
                      Cole nas configurações de scripts da página em <strong>Cabeçalho (Head)</strong> ou <strong>Rodapé</strong>.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="font-bold text-foreground">3. Suporte a Múltiplas Páginas:</span>
                    <p>
                      O script salva as UTMs no <code>sessionStorage</code>. Mesmo se o visitante navegar entre a página de captura, advertorial e VSL, os dados não se perdem!
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
