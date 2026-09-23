import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  RiLinkM,
  RiFileCopyLine,
  RiCheckLine,
  RiSparklingFill,
  RiFacebookCircleFill,
  RiInstagramLine,
  RiGoogleFill,
} from "@remixicon/react";
import { toast } from "sonner";

export function UtmsTab() {
  const [baseUrl, setBaseUrl] = useState("https://seusite.com.br/oferta");
  const [utmSource, setUtmSource] = useState("{{site_source_name}}");
  const [utmMedium, setUtmMedium] = useState("{{placement}}");
  const [utmCampaign, setUtmCampaign] = useState("{{campaign.name}}");
  const [utmContent, setUtmContent] = useState("{{ad.name}}");
  const [utmTerm, setUtmTerm] = useState("{{adset.name}}");
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedParams, setCopiedParams] = useState(false);

  // Monta parâmetros
  const queryParams = new URLSearchParams();
  if (utmSource) queryParams.set("utm_source", utmSource);
  if (utmMedium) queryParams.set("utm_medium", utmMedium);
  if (utmCampaign) queryParams.set("utm_campaign", utmCampaign);
  if (utmContent) queryParams.set("utm_content", utmContent);
  if (utmTerm) queryParams.set("utm_term", utmTerm);

  const queryString = queryParams.toString();
  const fullUrl = baseUrl.includes("?")
    ? `${baseUrl}&${queryString}`
    : `${baseUrl}?${queryString}`;

  const copyFullUrl = () => {
    navigator.clipboard.writeText(fullUrl);
    setCopiedUrl(true);
    toast.success("URL completa copiada!");
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const copyOnlyParams = () => {
    navigator.clipboard.writeText(queryString);
    setCopiedParams(true);
    toast.success("Parâmetros de rastreamento copiados!");
    setTimeout(() => setCopiedParams(false), 2000);
  };

  const applyPreset = (preset: "fb_dynamic" | "google" | "instagram") => {
    if (preset === "fb_dynamic") {
      setUtmSource("{{site_source_name}}");
      setUtmMedium("{{placement}}");
      setUtmCampaign("{{campaign.name}}");
      setUtmContent("{{ad.name}}");
      setUtmTerm("{{adset.name}}");
      toast.info("Parâmetros Dinâmicos da Meta aplicados!");
    } else if (preset === "instagram") {
      setUtmSource("instagram");
      setUtmMedium("bio_or_story");
      setUtmCampaign("organico");
      setUtmContent("link_perfil");
      setUtmTerm("");
      toast.info("Preset Instagram aplicado!");
    } else if (preset === "google") {
      setUtmSource("google");
      setUtmMedium("cpc");
      setUtmCampaign("{campaignid}");
      setUtmContent("{creative}");
      setUtmTerm("{keyword}");
      toast.info("Preset Google Ads aplicado!");
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/40 bg-card/60 p-4 sm:p-5 shadow-xs backdrop-blur-xs">
        <div>
          <div className="text-[14px] font-medium text-foreground">Gerador & Rastreamento de UTMs</div>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            Crie links rastreáveis com parâmetros dinâmicos da Meta para atribuição exata de cada venda.
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className="text-xs font-normal border-blue-500/30 text-blue-400 bg-blue-500/10">
            <RiSparklingFill className="size-3 mr-1" />
            Parâmetros Dinâmicos Meta
          </Badge>
        </div>
      </div>

      {/* Presets Rápidos */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground mr-1">Presets recomendados:</span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => applyPreset("fb_dynamic")}
          className="text-xs h-7 gap-1 border-border/50 text-foreground/80 hover:bg-accent/60"
        >
          <RiFacebookCircleFill className="size-3.5 text-blue-500" />
          Facebook Dinâmico (Recomendado)
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => applyPreset("instagram")}
          className="text-xs h-7 gap-1 border-border/50 text-foreground/80 hover:bg-accent/60"
        >
          <RiInstagramLine className="size-3.5 text-pink-500" />
          Instagram Orgânico
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => applyPreset("google")}
          className="text-xs h-7 gap-1 border-border/50 text-foreground/80 hover:bg-accent/60"
        >
          <RiGoogleFill className="size-3.5 text-amber-500" />
          Google Ads
        </Button>
      </div>

      {/* Formulário de UTM */}
      <div className="rounded-xl border border-border/40 bg-card/60 p-4 sm:p-6 space-y-4 shadow-xs backdrop-blur-xs">
        <div className="space-y-2">
          <Label className="text-xs font-medium">URL de Destino (Sua Página de Vendas)</Label>
          <Input
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://seusite.com.br/oferta"
            className="text-xs font-mono"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">utm_source (Origem)</Label>
            <Input
              value={utmSource}
              onChange={(e) => setUtmSource(e.target.value)}
              className="text-xs font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">utm_medium (Posicionamento / Meio)</Label>
            <Input
              value={utmMedium}
              onChange={(e) => setUtmMedium(e.target.value)}
              className="text-xs font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">utm_campaign (Campanha)</Label>
            <Input
              value={utmCampaign}
              onChange={(e) => setUtmCampaign(e.target.value)}
              className="text-xs font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">utm_content (Anúncio / Criativo)</Label>
            <Input
              value={utmContent}
              onChange={(e) => setUtmContent(e.target.value)}
              className="text-xs font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">utm_term (Conjunto de Anúncios)</Label>
            <Input
              value={utmTerm}
              onChange={(e) => setUtmTerm(e.target.value)}
              className="text-xs font-mono"
            />
          </div>
        </div>

        {/* Preview do Link Gerado */}
        <div className="pt-2 border-t border-border/40 space-y-2">
          <Label className="text-xs font-medium text-foreground">Link Completo com Rastreamento</Label>
          <div className="p-3 rounded-lg bg-background/80 border border-border/40 font-mono text-[11.5px] break-all text-blue-400 select-all">
            {fullUrl}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button
              size="sm"
              onClick={copyFullUrl}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs gap-1.5"
            >
              {copiedUrl ? <RiCheckLine className="size-3.5 text-emerald-300" /> : <RiFileCopyLine className="size-3.5" />}
              {copiedUrl ? "URL Copiada" : "Copiar URL Completa"}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={copyOnlyParams}
              className="text-xs gap-1.5 border-border/50 text-foreground/80 hover:bg-accent/60"
            >
              {copiedParams ? <RiCheckLine className="size-3.5 text-emerald-400" /> : <RiLinkM className="size-3.5" />}
              {copiedParams ? "Parâmetros Copiados" : "Copiar apenas Parâmetros URL"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
