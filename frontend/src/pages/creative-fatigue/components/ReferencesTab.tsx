import {
  RiSparklingFill,
  RiCompass3Line,
  RiLightbulbFlashLine,
  RiVideoLine,
  RiArrowRightUpLine,
  RiTrophyLine,
  RiFireLine,
} from "@remixicon/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ReferenceInsight } from "@/services/creativeFatigue";

interface ReferencesTabProps {
  insights: ReferenceInsight[];
  bestBatchName: string;
}

export function ReferencesTab({ insights, bestBatchName }: ReferencesTabProps) {
  return (
    <div className="flex flex-col gap-6">
      {/* Banner de Conexão com o Ecossistema Ninja */}
      <Card className="border-emerald-500/30 bg-gradient-to-r from-emerald-950/30 via-background to-blue-950/20 backdrop-blur-xs p-5 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <RiSparklingFill className="w-4 h-4" />
              </span>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">
                Ninja Ecosystem Intelligence
              </span>
            </div>
            <h2 className="text-lg font-bold text-foreground">
              Ideação da Próxima Leva baseada nos seus Campeões
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              O ecossistema analisa os criativos que bateram a régua na <strong>{bestBatchName}</strong> e cruza com a biblioteca do <strong>Ninja Ads Miner</strong> para sugerir ganchos validados para a sua próxima subida de anúncios.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs h-8 px-3 rounded-lg shadow-sm"
              onClick={() => window.open("/campaigns/create", "_blank")}
            >
              <RiVideoLine className="w-3.5 h-3.5 mr-1.5" />
              Criar Próxima Leva em Massa
            </Button>
          </div>
        </div>
      </Card>

      {/* Insights e Recomendações Estratégicas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {insights.map((insight, idx) => (
          <Card key={idx} className="border-border/50 bg-card/60 backdrop-blur-xs flex flex-col justify-between">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between mb-2">
                <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] font-mono">
                  {insight.source}
                </Badge>
                <RiLightbulbFlashLine className="w-4 h-4 text-amber-400" />
              </div>
              <CardTitle className="text-sm font-bold text-foreground leading-snug">
                {insight.title}
              </CardTitle>
            </CardHeader>

            <CardContent className="pt-0 flex flex-col gap-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                {insight.summary}
              </p>

              <div className="p-2.5 rounded-lg bg-muted/40 border border-border/40 text-[11px]">
                <strong className="text-foreground block mb-0.5">🎯 Ação Sugerida:</strong>
                <span className="text-muted-foreground">{insight.action}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Biblioteca de Formatos Validados para a Próxima Leva */}
      <Card className="border-border/50 bg-card/60 backdrop-blur-xs">
        <CardHeader className="pb-3 border-b border-border/40">
          <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
            <RiCompass3Line className="w-4 h-4 text-emerald-400" />
            Matriz de Formatos Recomendados para Teste
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Taxa de conversão histórica observada em ofertas de tráfego direto por categoria de gancho.
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="p-3.5 rounded-xl border border-border/40 bg-muted/20 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-foreground">UGC / Depoimento Real</span>
                <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">
                  Alta Retenção
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Câmera frontal com iluminação caseira e quebra de expectativa nos primeiros 3 segundos.
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-border/30 text-[10px] text-muted-foreground font-mono">
              Assertividade média: <strong className="text-emerald-400">78%</strong>
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-border/40 bg-muted/20 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-foreground">Estilo Telejornal / Notícia</span>
                <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/30 text-[10px]">
                  Autoridade
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Tarja amarela ou vermelha com manchete de impacto e bancada estilo plantão de notícias.
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-border/30 text-[10px] text-muted-foreground font-mono">
              Assertividade média: <strong className="text-blue-400">65%</strong>
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-border/40 bg-muted/20 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-foreground">Corte de Podcast</span>
                <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-[10px]">
                  Curiosidade
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Microfone Shure com iluminação quente e legenda animada com destaque em amarelo.
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-border/30 text-[10px] text-muted-foreground font-mono">
              Assertividade média: <strong className="text-amber-400">58%</strong>
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-border/40 bg-muted/20 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-foreground">Experimento Visual / Copo</span>
                <Badge className="bg-purple-500/15 text-purple-400 border-purple-500/30 text-[10px]">
                  Mecanismo
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Demonstração visual imediata no primeiro segundo que gera dúvida irresistível.
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-border/30 text-[10px] text-muted-foreground font-mono">
              Assertividade média: <strong className="text-purple-400">52%</strong>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

