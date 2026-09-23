import { useState } from "react";
import {
  RiFileCopyLine,
  RiCheckLine,
  RiInformationLine,
  RiCodeSSlashLine,
  RiCheckDoubleLine,
} from "@remixicon/react";
import { toast } from "sonner";

export function UtmsTab() {
  const [copiedMeta, setCopiedMeta] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // Parâmetros dinâmicos oficiais para o campo de Rastreamento da Meta
  const metaUrlParams =
    "utm_source=FB&utm_campaign={{campaign.name}}|{{campaign.id}}&utm_content={{adset.name}}|{{adset.id}}&utm_term={{ad.name}}|{{ad.id}}&src={{ad.id}}";

  // Script de repasse automático de UTMs para páginas de vendas / presell
  const utmScriptCode = `<script>
/**
 * SFY Tracking Script - Repasse Automático de UTMs ao Checkout
 * Cole antes do fechamento da tag </head> da sua página de vendas
 */
(function() {
  function getParams() {
    var params = new URLSearchParams(window.location.search);
    var keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'src', 'sck'];
    var stored = {};
    keys.forEach(function(k) {
      var val = params.get(k);
      if (val) {
        stored[k] = val;
        try { sessionStorage.setItem('sfy_' + k, val); } catch(e) {}
      } else {
        try {
          var s = sessionStorage.getItem('sfy_' + k);
          if (s) stored[k] = s;
        } catch(e) {}
      }
    });
    return stored;
  }

  function appendParamsToLinks() {
    var data = getParams();
    var query = [];
    for (var k in data) {
      if (data[k]) query.push(encodeURIComponent(k) + '=' + encodeURIComponent(data[k]));
    }
    if (query.length === 0) return;
    var qs = query.join('&');

    var links = document.querySelectorAll('a[href*="hotmart.com"], a[href*="pay.hotmart.com"], a[href*="kiwify.com.br"], a[href*="checkout"]');
    links.forEach(function(link) {
      var href = link.getAttribute('href');
      if (href) {
        var sep = href.indexOf('?') !== -1 ? '&' : '?';
        link.setAttribute('href', href + sep + qs);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', appendParamsToLinks);
  } else {
    appendParamsToLinks();
  }
})();
</script>`;

  const hotmartWebhookUrl =
    "https://logpose-1zuu.onrender.com/api/webhook/hotmart/uq_GVXf_vUiq9m0wAyUeb4SND0EjmQl8";

  const copyMetaParams = () => {
    navigator.clipboard.writeText(metaUrlParams);
    setCopiedMeta(true);
    toast.success("Parâmetros do Meta Ads copiados com sucesso!");
    setTimeout(() => setCopiedMeta(false), 2000);
  };

  const copyScript = () => {
    navigator.clipboard.writeText(utmScriptCode);
    setCopiedScript(true);
    toast.success("Script da Página de Vendas copiado com sucesso!");
    setTimeout(() => setCopiedScript(false), 2000);
  };

  const copyWebhook = () => {
    navigator.clipboard.writeText(hotmartWebhookUrl);
    setCopiedWebhook(true);
    toast.success("URL do Webhook da Hotmart copiada com sucesso!");
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      {/* Banner de Introdução Explicativa */}
      <div className="rounded-xl border border-blue-500/20 bg-gradient-to-r from-blue-950/40 via-blue-900/20 to-slate-900/40 p-4 sm:p-5 dark:border-blue-500/20 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <RiInformationLine className="size-5" />
          </div>
          <div>
            <h2 className="text-[15px] font-semibold text-zinc-900 dark:text-white">
              Como funciona o Traqueamento de Vendas e Anúncios no SFY
            </h2>
            <p className="mt-1 text-[13px] text-zinc-600 dark:text-zinc-300 leading-relaxed">
              Para você saber no Dashboard <strong>qual anúncio exato gerou cada venda</strong>, quanto gastou e qual o seu <strong>ROAS real</strong>, siga os 3 passos simples abaixo. Copie cada código e cole no local indicado.
            </p>
          </div>
        </div>
      </div>

      {/* PASSO 1: NO SEU ANÚNCIO (META ADS) */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 sm:p-6 dark:border-zinc-800 dark:bg-zinc-900 shadow-xs relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800/80 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="flex size-7 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white shadow-xs">
              1
            </span>
            <div>
              <h3 className="text-[15px] font-semibold text-zinc-900 dark:text-white">
                Cole este código no seu Anúncio dentro do Meta Ads
              </h3>
              <p className="text-[12px] text-zinc-500 dark:text-zinc-400">
                Obrigatório para registrar qual campanha, conjunto e criativo venderam
              </p>
            </div>
          </div>
          <span className="inline-flex items-center rounded-md bg-blue-500/10 px-2.5 py-1 text-[11.5px] font-medium text-blue-400 border border-blue-500/20">
            Onde colar: Gerenciador de Anúncios da Meta
          </span>
        </div>

        {/* Instrução passo a passo com breadcrumb visual */}
        <div className="mt-4 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 p-3.5 border border-zinc-200/60 dark:border-zinc-700/60">
          <p className="text-[12.5px] font-medium text-zinc-700 dark:text-zinc-200">
            📍 Caminho exato no Gerenciador de Anúncios do Facebook:
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[12px] text-zinc-600 dark:text-zinc-300 font-mono">
            <span className="rounded bg-zinc-200/70 dark:bg-zinc-700/70 px-2 py-0.5">Gerenciador de Anúncios</span>
            <span>➔</span>
            <span className="rounded bg-zinc-200/70 dark:bg-zinc-700/70 px-2 py-0.5">Editar seu Anúncio</span>
            <span>➔</span>
            <span className="rounded bg-zinc-200/70 dark:bg-zinc-700/70 px-2 py-0.5">Role até &quot;Rastreamento&quot;</span>
            <span>➔</span>
            <span className="rounded bg-blue-500/20 text-blue-400 px-2 py-0.5 font-bold">Campo &quot;Parâmetros de URL&quot;</span>
          </div>
        </div>

        {/* Bloco de Código com Botão Copiar */}
        <div className="mt-4">
          <label className="text-[12px] font-medium text-zinc-500 dark:text-zinc-400">
            Código dos Parâmetros de URL:
          </label>
          <div className="mt-1.5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="min-w-0 flex-1 overflow-x-auto rounded-lg bg-zinc-950 px-3.5 py-3 font-mono text-[12.5px] text-emerald-400 border border-zinc-800 whitespace-nowrap scrollbar-thin select-all">
              {metaUrlParams}
            </div>
            <button
              type="button"
              onClick={copyMetaParams}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-[13px] font-semibold text-white hover:bg-blue-500 transition-all shadow-sm hover:shadow-blue-500/20 active:scale-98 cursor-pointer"
            >
              {copiedMeta ? (
                <>
                  <RiCheckLine className="h-4 w-4 text-emerald-300" />
                  <span>Copiado!</span>
                </>
              ) : (
                <>
                  <RiFileCopyLine className="h-4 w-4" />
                  <span>Copiar Parâmetros do Anúncio</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Dica importante */}
        <div className="mt-3 flex items-center gap-2 text-[12px] text-amber-500 dark:text-amber-400 bg-amber-500/10 px-3 py-2 rounded-lg border border-amber-500/20">
          <span>⚠️</span>
          <span>
            <strong>Atenção:</strong> Cole exatamente no campo <em>&quot;Parâmetros de URL&quot;</em>. <strong>NÃO</strong> adicione ponto de interrogação (<code className="font-bold">?</code>) no começo. O Meta faz a substituição dos dados dinamicamente a cada clique.
          </span>
        </div>
      </div>

      {/* PASSO 2: NA SUA PÁGINA DE VENDAS / PRESELL / VSL */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 sm:p-6 dark:border-zinc-800 dark:bg-zinc-900 shadow-xs relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800/80 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="flex size-7 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white shadow-xs">
              2
            </span>
            <div>
              <h3 className="text-[15px] font-semibold text-zinc-900 dark:text-white">
                Cole este script na sua Página de Vendas / Presell / VSL
              </h3>
              <p className="text-[12px] text-zinc-500 dark:text-zinc-400">
                Garante que os botões de compra recebam o ID do anúncio ao abrir o checkout
              </p>
            </div>
          </div>
          <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-2.5 py-1 text-[11.5px] font-medium text-emerald-400 border border-emerald-500/20">
            Onde colar: No &lt;head&gt; do seu site
          </span>
        </div>

        {/* Instrução passo a passo com breadcrumb visual */}
        <div className="mt-4 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 p-3.5 border border-zinc-200/60 dark:border-zinc-700/60">
          <p className="text-[12.5px] font-medium text-zinc-700 dark:text-zinc-200">
            📍 Onde colocar no seu construtor de páginas:
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[12px] text-zinc-600 dark:text-zinc-300 font-mono">
            <span className="rounded bg-zinc-200/70 dark:bg-zinc-700/70 px-2 py-0.5">WordPress (Elementor) / GreatPages / Atomicat / Webflow</span>
            <span>➔</span>
            <span className="rounded bg-zinc-200/70 dark:bg-zinc-700/70 px-2 py-0.5">Configurações da Página</span>
            <span>➔</span>
            <span className="rounded bg-emerald-500/20 text-emerald-400 px-2 py-0.5 font-bold">Código Customizado / Cabeçalho (&lt;head&gt;)</span>
          </div>
        </div>

        {/* Descrição do funcionamento */}
        <p className="mt-3 text-[12.5px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
          Este script captura as UTMs e o código do anúncio (<code className="text-xs bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">src</code>) que o lead trouxe do Facebook e injeta automaticamente em todos os botões de checkout da página (Hotmart, Kiwify, etc.), mesmo se ele rolar a página ou demorar para comprar.
        </p>

        {/* Bloco de Código com Botão Copiar */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[12px] font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
              <RiCodeSSlashLine className="size-4 text-emerald-400" />
              <span>Script de Repasse de UTMs:</span>
            </label>
            <button
              type="button"
              onClick={copyScript}
              className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-emerald-400 hover:text-emerald-300 cursor-pointer transition-colors"
            >
              {copiedScript ? (
                <>
                  <RiCheckLine className="size-3.5" />
                  <span>Copiado!</span>
                </>
              ) : (
                <>
                  <RiFileCopyLine className="size-3.5" />
                  <span>Copiar Script</span>
                </>
              )}
            </button>
          </div>
          <div className="max-h-48 overflow-y-auto rounded-lg bg-zinc-950 p-3.5 font-mono text-[11.5px] text-zinc-300 border border-zinc-800 scrollbar-thin select-all">
            <pre className="whitespace-pre-wrap">{utmScriptCode}</pre>
          </div>
        </div>
      </div>

      {/* PASSO 3: NA HOTMART (WEBHOOK DE VENDAS) */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 sm:p-6 dark:border-zinc-800 dark:bg-zinc-900 shadow-xs relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800/80 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="flex size-7 items-center justify-center rounded-full bg-orange-600 text-xs font-bold text-white shadow-xs">
              3
            </span>
            <div>
              <h3 className="text-[15px] font-semibold text-zinc-900 dark:text-white">
                Cadastre o Webhook na sua conta Hotmart
              </h3>
              <p className="text-[12px] text-zinc-500 dark:text-zinc-400">
                Envia instantaneamente cada venda aprovada para o SFY calcular seu lucro e ROAS
              </p>
            </div>
          </div>
          <span className="inline-flex items-center rounded-md bg-orange-500/10 px-2.5 py-1 text-[11.5px] font-medium text-orange-400 border border-orange-500/20">
            Onde colar: Painel da Hotmart
          </span>
        </div>

        {/* Instrução passo a passo com breadcrumb visual */}
        <div className="mt-4 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 p-3.5 border border-zinc-200/60 dark:border-zinc-700/60">
          <p className="text-[12.5px] font-medium text-zinc-700 dark:text-zinc-200">
            📍 Onde cadastrar dentro da Hotmart:
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[12px] text-zinc-600 dark:text-zinc-300 font-mono">
            <span className="rounded bg-zinc-200/70 dark:bg-zinc-700/70 px-2 py-0.5">Hotmart</span>
            <span>➔</span>
            <span className="rounded bg-zinc-200/70 dark:bg-zinc-700/70 px-2 py-0.5">Ferramentas</span>
            <span>➔</span>
            <span className="rounded bg-zinc-200/70 dark:bg-zinc-700/70 px-2 py-0.5">Webhook (Configurações de Envio)</span>
            <span>➔</span>
            <span className="rounded bg-orange-500/20 text-orange-400 px-2 py-0.5 font-bold">Cadastrar Webhook</span>
          </div>
          <p className="mt-2.5 text-[12px] text-zinc-500 dark:text-zinc-400">
            Marque os eventos: <strong>Compra Aprovada</strong>, <strong>Compra Completa</strong> e <strong>Cancelamento / Reembolso</strong>.
          </p>
        </div>

        {/* Bloco de Código com Botão Copiar */}
        <div className="mt-4">
          <label className="text-[12px] font-medium text-zinc-500 dark:text-zinc-400">
            URL do Webhook da Hotmart (pronta para uso):
          </label>
          <div className="mt-1.5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="min-w-0 flex-1 overflow-x-auto rounded-lg bg-zinc-950 px-3.5 py-3 font-mono text-[12.5px] text-orange-400 border border-zinc-800 whitespace-nowrap scrollbar-thin select-all">
              {hotmartWebhookUrl}
            </div>
            <button
              type="button"
              onClick={copyWebhook}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-orange-600 px-5 py-3 text-[13px] font-semibold text-white hover:bg-orange-500 transition-all shadow-sm hover:shadow-orange-500/20 active:scale-98 cursor-pointer"
            >
              {copiedWebhook ? (
                <>
                  <RiCheckLine className="h-4 w-4 text-emerald-300" />
                  <span>Copiado!</span>
                </>
              ) : (
                <>
                  <RiFileCopyLine className="h-4 w-4" />
                  <span>Copiar URL do Webhook</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* RESUMO / CHECKLIST DE CONCLUSÃO */}
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 sm:p-5 dark:border-emerald-500/20">
        <div className="flex items-center gap-2.5 text-emerald-400 font-semibold text-[14px]">
          <RiCheckDoubleLine className="size-5" />
          <span>Tudo pronto para traquear 100%!</span>
        </div>
        <p className="mt-1 text-[12.5px] text-zinc-600 dark:text-zinc-300 leading-relaxed">
          Com os parâmetros no anúncio (Passo 1), o script na sua página (Passo 2) e o webhook na Hotmart (Passo 3), qualquer venda gerada será automaticamente atribuída ao seu anúncio e plotada com gráfico de lucros e ROAS real no Dashboard do <strong>SFY</strong>!
        </p>
      </div>
    </div>
  );
}
