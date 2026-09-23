import { useState } from "react";
import {
  RiFileCopyLine,
  RiCheckLine,
  RiInformationLine,
} from "@remixicon/react";
import { toast } from "sonner";

export function UtmsTab() {
  const [copiedMeta, setCopiedMeta] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  const metaUrlParams =
    "utm_source=FB&utm_campaign={{campaign.name}}|{{campaign.id}}&utm_medium={{adset.name}}|{{adset.id}}&utm_content={{ad.name}}|{{ad.id}}&utm_term={{placement}}&src={{campaign.name}}|{{adset.name}}|{{ad.name}}";

  const utmScriptCode = `<script>
(function() {
  var urlParams = new URLSearchParams(window.location.search);
  var utms = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'src', 'sck', 'ttclid'];
  var data = {};
  utms.forEach(function(u) {
    var v = urlParams.get(u);
    if (v) {
      data[u] = v;
      sessionStorage.setItem('lp_' + u, v);
    }
  });
})();
</script>`;

  const copyMetaParams = () => {
    navigator.clipboard.writeText(metaUrlParams);
    setCopiedMeta(true);
    toast.success("Parâmetros de URL do Meta Ads copiados!");
    setTimeout(() => setCopiedMeta(false), 2000);
  };

  const copyScript = () => {
    navigator.clipboard.writeText(utmScriptCode);
    setCopiedScript(true);
    toast.success("Script de captura de UTM copiado!");
    setTimeout(() => setCopiedScript(false), 2000);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* 1. Parâmetros de URL do Meta Ads */}
      <div className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-5 dark:border-zinc-800 dark:bg-zinc-900 shadow-xs">
        <h3 className="text-[14px] font-medium text-zinc-900 dark:text-zinc-100">
          Parâmetros de URL do Meta Ads
        </h3>
        <p className="mt-1 text-[12px] text-zinc-500 dark:text-zinc-400">
          Cole em <strong className="text-zinc-700 dark:text-zinc-300">Parâmetros de URL</strong> na configuração do anúncio no Gerenciador da Meta. O Meta substitui os campos automaticamente em cada clique.
        </p>

        <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="min-w-0 flex-1 overflow-x-auto rounded-lg bg-zinc-100 dark:bg-zinc-800/80 px-3 py-2.5 font-mono text-[12px] text-zinc-700 dark:text-zinc-300 border border-zinc-200/50 dark:border-zinc-700/50 whitespace-nowrap scrollbar-thin">
            {metaUrlParams}
          </div>
          <button
            type="button"
            onClick={copyMetaParams}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-[12.5px] font-medium text-white hover:bg-blue-500 transition-colors shadow-xs cursor-pointer"
          >
            {copiedMeta ? (
              <>
                <RiCheckLine className="h-4 w-4 text-emerald-300" />
                <span>Copiado!</span>
              </>
            ) : (
              <>
                <RiFileCopyLine className="h-4 w-4" />
                <span>Copiar código</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. Script de captura de UTM (opcional) */}
      <div className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-5 dark:border-zinc-800 dark:bg-zinc-900 shadow-xs">
        <h3 className="text-[14px] font-medium text-zinc-900 dark:text-zinc-100">
          Script de captura de UTM (opcional)
        </h3>
        <p className="mt-1 text-[12px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
          Complementa a Tag da aba <strong className="text-zinc-700 dark:text-zinc-300">Pixels</strong> (que já captura UTM + fbclid/gclid + fbp/fbc) com campos extras que ela não cobre: <code className="text-xs bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">src</code>, <code className="text-xs bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">sck</code> (afiliados) e <code className="text-xs bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">ttclid</code> (TikTok Ads). Só cole isso se usar algum desses. Cole antes do <code className="text-xs font-mono">&lt;/head&gt;</code>, junto com o código da aba Pixels, os dois convivem sem conflito.
        </p>

        <div className="mt-4">
          <button
            type="button"
            onClick={copyScript}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-[12.5px] font-medium text-white hover:bg-blue-500 transition-colors shadow-xs cursor-pointer"
          >
            {copiedScript ? (
              <>
                <RiCheckLine className="h-4 w-4 text-emerald-300" />
                <span>Copiado!</span>
              </>
            ) : (
              <>
                <RiFileCopyLine className="h-4 w-4" />
                <span>Copiar código</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Banner Informativo Inferior */}
      <div className="flex items-center gap-2 rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-3.5 text-[12px] text-zinc-500 dark:border-zinc-800/80 dark:bg-zinc-900/50 dark:text-zinc-400">
        <RiInformationLine className="h-4 w-4 shrink-0 text-blue-500" />
        <span>
          O Pixel do Meta e a Tag do LogPose (eventos, dedupe com a Conversions API) ficam na aba <strong>Pixels</strong>, é de lá que você copia o código pra página de vendas.
        </span>
      </div>
    </div>
  );
}
