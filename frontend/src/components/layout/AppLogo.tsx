import { useState } from "react";

interface AppLogoProps {
  className?: string;
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
}

export function AppLogo({ className = "", onClick, size = "md" }: AppLogoProps) {
  const [hasError, setHasError] = useState(false);
  const [retryWithAlt, setRetryWithAlt] = useState(false);

  // Tamanhos padronizados caso não seja sobrescrito por className
  const sizeClasses = {
    sm: "h-9",
    md: "h-12",
    lg: "h-16",
  }[size];

  if (hasError) {
    // Fallback Vectorial Luxo — Impossível quebrar mesmo offline ou com cache corrompido
    return (
      <div
        onClick={onClick}
        className={`flex items-center gap-2.5 px-2 py-1 select-none transition-transform hover:scale-[1.02] active:scale-[0.98] ${
          onClick ? "cursor-pointer" : ""
        } ${className}`}
        title="NINJA'S TRACKER"
      >
        <div className="relative flex items-center justify-center shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/20 via-teal-500/10 to-transparent border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.25)]">
          {/* Ícone Estilizado Shuriken / Alvo de Rastreamento */}
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="w-5 h-5 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]"
          >
            <path
              d="M12 2L14.2 9.8L22 12L14.2 14.2L12 22L9.8 14.2L2 12L9.8 9.8L12 2Z"
              fill="currentColor"
              stroke="#fbbf24"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
            <circle cx="12" cy="12" r="2.5" fill="#0f172a" stroke="#34d399" strokeWidth="1.2" />
          </svg>
        </div>

        <div className="flex flex-col">
          <div className="flex items-center gap-1 font-extrabold tracking-wider text-sm leading-none bg-gradient-to-r from-amber-200 via-emerald-300 to-teal-100 bg-clip-text text-transparent drop-shadow-sm font-sans">
            <span>NINJA'S</span>
            <span className="text-white/90">TRACKER</span>
          </div>
          <span className="text-[9px] font-semibold tracking-widest text-emerald-400/80 uppercase leading-tight mt-0.5">
            Performance
          </span>
        </div>
      </div>
    );
  }

  // Imagem WebP de alta definição com retry e fallback automático
  const imageSrc = retryWithAlt ? "/logo_light.webp" : "/logo_dark.webp?v=ninja_2026";

  return (
    <img
      src={imageSrc}
      alt="NINJA'S TRACKER"
      className={`w-auto object-contain drop-shadow-md hover:scale-[1.02] transition-transform duration-200 ${sizeClasses} ${
        onClick ? "cursor-pointer" : ""
      } ${className}`}
      onClick={onClick}
      onError={() => {
        if (!retryWithAlt) {
          // Primeira tentativa de recuperação: tenta caminho alternativo
          setRetryWithAlt(true);
        } else {
          // Segunda falha: ativa fallback visual garantido
          setHasError(true);
        }
      }}
    />
  );
}
