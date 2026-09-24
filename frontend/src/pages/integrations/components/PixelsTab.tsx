import { useState, useEffect } from "react";
import {
  RiPlayCircleLine,
  RiCheckLine,
  RiFileCopyLine,
  RiShieldCheckLine,
} from "@remixicon/react";
import { toast } from "sonner";

interface PixelItem {
  id: string;
  name: string;
  pixelId: string;
  status: "active" | "testing";
}

export function PixelsTab() {
  const [allowedDomains, setAllowedDomains] = useState(() => {
    return localStorage.getItem("sfy_allowed_domains") || localStorage.getItem("logpose_allowed_domains") || "novidadesonline.net";
  });
  const [copiedScript, setCopiedScript] = useState(false);

  const [pixels] = useState<PixelItem[]>([
    {
      id: "px_1",
      name: "Pixel Principal (CONTA BR 1.5k)",
      pixelId: "949690764845924",
      status: "active",
    },
  ]);

  useEffect(() => {
    localStorage.setItem("sfy_allowed_domains", allowedDomains);
  }, [allowedDomains]);

  const handleSaveDomains = () => {
    localStorage.setItem("sfy_allowed_domains", allowedDomains);
    toast.success("Domínios salvos com sucesso!");
  };

  const pixelScriptCode = `<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '949690764845924');
fbq('track', 'PageView');
</script>`;

  const copyScript = () => {
    navigator.clipboard.writeText(pixelScriptCode);
    setCopiedScript(true);
    toast.success("Código da Tag copiado!");
    setTimeout(() => setCopiedScript(false), 2000);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* 1. Pixels do Meta */}
      <div className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-5 dark:border-zinc-800 dark:bg-zinc-900 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h3 className="text-[14px] font-medium text-zinc-900 dark:text-zinc-100">
            Pixels do Meta
          </h3>
          <a
            href="https://business.facebook.com"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-[12px] text-blue-500 hover:text-blue-400 font-medium"
          >
            <RiPlayCircleLine className="h-4 w-4" />
            Aprenda como configurar o pixel aqui
          </a>
        </div>

        {pixels.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-[13px] font-medium text-zinc-600 dark:text-zinc-300">
              Nenhum pixel encontrado
            </p>
            <p className="text-[12px] text-zinc-400 mt-0.5">
              Conecte a conta do Facebook na aba Anúncios.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {pixels.map((px) => (
              <div
                key={px.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200/80 bg-zinc-50/50 p-3.5 dark:border-zinc-800/80 dark:bg-zinc-800/40"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-zinc-900 dark:text-zinc-100">
                      {px.name}
                    </span>
                    <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                      <RiShieldCheckLine className="h-3 w-3 mr-1" />
                      Ativo
                    </span>
                  </div>
                  <p className="mt-0.5 font-mono text-[11.5px] text-zinc-400">
                    Dataset ID: {px.pixelId}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. Código do pixel para a página de vendas */}
      <div className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-5 dark:border-zinc-800 dark:bg-zinc-900 shadow-xs">
        <h3 className="text-[14px] font-medium text-zinc-900 dark:text-zinc-100">
          Código do pixel para a página de vendas
        </h3>
        <p className="mt-1 text-[12px] text-zinc-500 dark:text-zinc-400">
          Domínios onde essa Tag vai rodar (um por linha, ex: minhaloja.com). Vazio = aceita qualquer domínio.
        </p>

        <div className="mt-3 space-y-3">
          <textarea
            value={allowedDomains}
            onChange={(e) => setAllowedDomains(e.target.value)}
            rows={3}
            placeholder="ex: novidadesonline.net"
            className="w-full rounded-lg border border-zinc-200 bg-zinc-50 p-3 font-mono text-[12.5px] text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-100"
          />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleSaveDomains}
              className="rounded-lg border border-zinc-200 px-3.5 py-1.5 text-[12.5px] font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Salvar domínios
            </button>

            <button
              type="button"
              onClick={copyScript}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-[12.5px] font-medium text-white hover:bg-blue-500 transition-colors shadow-xs cursor-pointer"
            >
              {copiedScript ? (
                <>
                  <RiCheckLine className="h-3.5 w-3.5 text-emerald-300" />
                  <span>Copiado!</span>
                </>
              ) : (
                <>
                  <RiFileCopyLine className="h-3.5 w-3.5" />
                  <span>Copiar Tag do Pixel</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
