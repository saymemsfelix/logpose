import { useEffect, useRef } from "react";
import { Globe2 } from "lucide-react";
import type { CountryData } from "@/types/dashboard";

interface LogPoseCountryProps {
  countries?: CountryData[];
  hideValues?: boolean;
}

export function LogPoseCountry({ countries = [], hideValues = false }: LogPoseCountryProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Animação da esfera 3D pontilhada
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let angleY = 0;
    let angleX = 0.2;

    const width = 220;
    const height = 220;
    canvas.width = width * 2;
    canvas.height = height * 2;
    ctx.scale(2, 2);

    const radius = 70;
    const particleCount = 280;

    // Gerar pontos na superfície de uma esfera (Distribuição Fibonacci)
    const points: { x: number; y: number; z: number }[] = [];
    const phi = Math.PI * (3 - Math.sqrt(5)); // Golden ratio angle

    for (let i = 0; i < particleCount; i++) {
      const y = 1 - (i / (particleCount - 1)) * 2; // y vai de 1 a -1
      const radiusAtY = Math.sqrt(1 - y * y);
      const theta = phi * i;

      const x = Math.cos(theta) * radiusAtY;
      const z = Math.sin(theta) * radiusAtY;

      points.push({
        x: x * radius,
        y: y * radius,
        z: z * radius,
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;

      angleY += 0.008;

      const cosY = Math.cos(angleY);
      const sinY = Math.sin(angleY);
      const cosX = Math.cos(angleX);
      const sinX = Math.sin(angleX);

      // Desenhar anel orbital sutil
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, radius * 1.15, radius * 0.35, 0.2, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(59, 130, 246, 0.15)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Ordenar pontos pela profundidade (Z)
      const projected = points.map((p) => {
        // Rotação Y
        const x1 = p.x * cosY + p.z * sinY;
        const z1 = -p.x * sinY + p.z * cosY;

        // Rotação X
        const y2 = p.y * cosX - z1 * sinX;
        const z2 = p.y * sinX + z1 * cosX;

        return {
          x: centerX + x1,
          y: centerY + y2,
          z: z2,
        };
      });

      projected.sort((a, b) => a.z - b.z);

      // Renderizar partículas com cor e brilho baseado na distância
      for (const p of projected) {
        // Normalizar Z entre 0 (fundo) e 1 (frente)
        const alpha = Math.max(0.12, (p.z + radius) / (radius * 2));
        const size = Math.max(1, 1.2 + alpha * 1.8);

        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);

        if (alpha > 0.6) {
          ctx.fillStyle = `rgba(96, 165, 250, ${alpha})`;
          ctx.shadowColor = "rgba(59, 130, 246, 0.8)";
          ctx.shadowBlur = 4;
        } else {
          ctx.fillStyle = `rgba(37, 99, 235, ${alpha * 0.6})`;
          ctx.shadowBlur = 0;
        }
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const formatCurrency = (val: number) => {
    if (hideValues) return "••••••";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val);
  };

  const hasData = countries && countries.length > 0;

  return (
    <div className="rounded-xl border border-zinc-200/80 bg-white dark:border-zinc-800/80 dark:bg-[#0f172a]/60 backdrop-blur-sm flex h-full min-w-0 flex-col p-4 sm:p-5 shadow-xs">
      <div className="text-[17px] font-bold tracking-tight">
        <span className="text-zinc-900 dark:text-white">SFY </span>
        <span className="inline-block bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-400 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(59,130,246,0.35)]">
          Country
        </span>
      </div>
      <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">
        Origem e distribuição geográfica dos seus compradores
      </p>

      <div className="mt-4 flex flex-1 flex-col sm:flex-row items-center gap-6">
        {/* Globo 3D Canvas */}
        <div className="relative mx-auto h-[220px] w-[220px] shrink-0 sm:mx-0 flex items-center justify-center">
          <canvas
            ref={canvasRef}
            style={{ width: "220px", height: "220px" }}
            className="block"
          />
        </div>

        {/* Lista de países */}
        <div className="min-w-0 flex-1 w-full">
          {!hasData ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <Globe2 className="h-8 w-8 text-zinc-300 dark:text-zinc-700 mb-2" />
              <p className="text-[13px] text-zinc-500 dark:text-zinc-400 font-medium">
                Nenhuma venda com país identificado neste período.
              </p>
              <span className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1 max-w-xs">
                As vendas aprovadas terão seus países detectados automaticamente aqui.
              </span>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {countries.map((c) => (
                <div
                  key={c.code}
                  className="rounded-lg border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/40 p-2.5 transition-colors"
                >
                  <div className="flex items-center justify-between text-[13px]">
                    <div className="flex items-center gap-2 font-medium text-zinc-900 dark:text-zinc-100">
                      <span className="text-base">
                        {c.code === "BR" ? "🇧🇷" : c.code === "PT" ? "🇵🇹" : c.code === "US" ? "🇺🇸" : "🌐"}
                      </span>
                      <span>{c.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold tabular-nums text-zinc-900 dark:text-white">
                        {formatCurrency(c.revenue)}
                      </span>
                      <span className="ml-2 text-[11px] text-zinc-400 dark:text-zinc-500">
                        ({c.sales} {c.sales === 1 ? "venda" : "vendas"})
                      </span>
                    </div>
                  </div>

                  {c.percentage !== undefined && (
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-400"
                        style={{ width: `${Math.min(c.percentage, 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
