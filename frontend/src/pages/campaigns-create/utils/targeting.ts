/**
 * Opções de país e idioma para targeting do Facebook Ads.
 * Os codes são ISO 3166-1 alpha-2 para países.
 * Os locale keys vêm da Meta Marketing API (type=adlocale).
 */

export interface CountryOption {
  value: string;
  label: string;
}

export interface LocaleOption {
  value: number;
  label: string;
}

/** Países disponíveis para seleção */
export const COUNTRY_OPTIONS: CountryOption[] = [
  { value: "BR", label: "Brasil" },
  { value: "WORLDWIDE", label: "Mundo Inteiro" },
  { value: "IT", label: "Itália" },
  { value: "CH", label: "Suíça" },
  { value: "US", label: "Estados Unidos" },
  { value: "ES", label: "Espanha" },
  { value: "FR", label: "França" },
  { value: "DE", label: "Alemanha" },
  { value: "PT", label: "Portugal" },
];

/**
 * Locale keys da Meta Marketing API.
 * 0 = Todos os idiomas (não envia locales na API).
 * 10 = Italiano
 */
export const LOCALE_OPTIONS: LocaleOption[] = [
  { value: 0, label: "Todos os idiomas" },
  { value: 10, label: "Italiano" },
  { value: 16, label: "Português" },
  { value: 6, label: "Inglês" },
  { value: 23, label: "Espanhol" },
  { value: 1, label: "Francês" },
  { value: 5, label: "Alemão" },
];

/** Presets rápidos de exclusão de tráfego de baixa qualidade/bot */
export interface ExclusionPreset {
  id: string;
  label: string;
  description: string;
  countries: string[];
}

export const EXCLUSION_PRESETS: ExclusionPreset[] = [
  {
    id: "singapore",
    label: "Singapura (SG)",
    description: "Evita cliques de bots e regulamentação restrita",
    countries: ["SG"],
  },
  {
    id: "venezuela",
    label: "Venezuela (VE)",
    description: "Problemas recorrentes de aprovação e cartões",
    countries: ["VE"],
  },
  {
    id: "africa",
    label: "Principais Países da África",
    description: "Nigéria, África do Sul, Egito, Quênia, Marrocos, Argélia, Tunísia, Angola",
    countries: ["NG", "ZA", "EG", "KE", "MA", "DZ", "TN", "AO", "MZ", "GH"],
  },
  {
    id: "cheap_bots",
    label: "Índia, Taiwan e Paquistão",
    description: "Tráfego de volume alto com baixa conversão e bots",
    countries: ["IN", "TW", "PK", "BD", "PH"],
  },
];

/** Valor padrão para país */
export const DEFAULT_COUNTRY = "WORLDWIDE";

/** Exclusões padrão recomendadas para campanhas Mundo Inteiro */
export const DEFAULT_EXCLUDED_COUNTRIES: string[] = ["SG", "VE", "IN", "TW"];

/** Valor padrão para locales — todos os idiomas */
export const DEFAULT_LOCALES: number[] = [];

/**
 * Retorna o label do país pelo value.
 */
export function getCountryLabel(value: string): string {
  return COUNTRY_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

/**
 * Retorna labels dos locales selecionados.
 */
export function getLocaleLabels(locales: number[]): string {
  if (locales.length === 0) return "Todos os idiomas";
  return locales
    .map((v) => LOCALE_OPTIONS.find((o) => o.value === v)?.label ?? String(v))
    .join(", ");
}
