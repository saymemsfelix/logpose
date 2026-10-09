import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  RiWhatsappFill,
  RiGoogleFill,
  RiMailSendLine,
  RiMessage3Line,
  RiFileCopyLine,
  RiCheckLine,
  RiCheckboxCircleLine,
  RiSparklingLine,
  RiPriceTag3Line,
  RiFlashlightLine,
  RiCustomerService2Line,
  RiExternalLinkLine,
  RiAlertLine,
  RiLinkM,
  RiSmartphoneLine,
} from "@remixicon/react";
import type { RecoveryRow } from "@/services/recovery";

export type RecoveryLanguage = "it" | "es" | "pt" | "de";
export type RecoveryStrategy = "support" | "discount" | "urgency";
export type RecoveryChannelTab = "whatsapp" | "email" | "sms";

interface WhatsAppRecoveryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: RecoveryRow | null;
  onMarkRecovered?: (id: string) => Promise<void>;
}

const LANGUAGE_LABELS: Record<
  RecoveryLanguage,
  { name: string; flag: string; countryCode: string }
> = {
  it: { name: "Italiano", flag: "🇮🇹", countryCode: "IT / CH" },
  es: { name: "Español LATAM", flag: "🇪🇸", countryCode: "MX / ES / AR" },
  pt: { name: "Português BR", flag: "🇧🇷", countryCode: "BR" },
  de: { name: "Deutsch", flag: "🇩🇪", countryCode: "DE / AT / CH" },
};

const STRATEGY_LABELS: Record<
  RecoveryStrategy,
  { title: string; subtitle: string; icon: typeof RiCustomerService2Line }
> = {
  support: {
    title: "Suporte & Amigável",
    subtitle: "Tirar dúvidas e ajudar com a aprovação da compra",
    icon: RiCustomerService2Line,
  },
  discount: {
    title: "Cupom 10% OFF",
    subtitle: "Oferta exclusiva para fechar a compra agora",
    icon: RiPriceTag3Line,
  },
  urgency: {
    title: "Urgência & Vaga",
    subtitle: "Reserva de vaga expirando no sistema",
    icon: RiFlashlightLine,
  },
};

function detectLanguage(lead: RecoveryRow | null): RecoveryLanguage {
  if (!lead) return "it";
  const country = (lead.customerCountry || "").toUpperCase();
  const phone = (lead.customerPhone || "").replace(/\D/g, "");

  if (country === "IT" || phone.startsWith("39")) return "it";
  if (country === "BR" || phone.startsWith("55")) return "pt";
  if (
    ["MX", "ES", "CO", "AR", "CL", "PE", "UY", "EC", "VE"].includes(country) ||
    phone.startsWith("52") ||
    phone.startsWith("34") ||
    phone.startsWith("54") ||
    phone.startsWith("57")
  ) {
    return "es";
  }
  if (["DE", "AT"].includes(country) || phone.startsWith("49") || phone.startsWith("43")) {
    return "de";
  }
  if (country === "CH" || phone.startsWith("41")) return "it";

  return "it";
}

function cleanCustomerPhone(
  phone: string | null | undefined,
  country?: string | null,
  lang?: RecoveryLanguage
): string {
  if (!phone) return "";
  let digits = phone.replace(/\D/g, "");
  if (!digits) return "";

  const cUpper = (country || "").toUpperCase();

  if (digits.startsWith("39") && digits.length >= 11) return digits;
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) return digits;
  if (digits.startsWith("52") && digits.length >= 12) return digits;
  if (digits.startsWith("34") && digits.length >= 11) return digits;
  if (digits.startsWith("49") && digits.length >= 11) return digits;
  if (digits.startsWith("41") && digits.length >= 11) return digits;

  if (cUpper === "IT" || lang === "it" || digits.startsWith("3")) {
    if (!digits.startsWith("39")) {
      digits = "39" + digits;
    }
    return digits;
  }

  if (cUpper === "BR" || lang === "pt") {
    if (!digits.startsWith("55") && (digits.length === 10 || digits.length === 11)) {
      digits = "55" + digits;
    }
    return digits;
  }

  return digits;
}

// Catálogo mestre dos infoprodutos e suas URLs de checkout/oferta no novidadesonline.net
export interface ProductCatalogItem {
  id: string;
  displayName: string;
  matchPatterns: string[];
  offerUrl: string;
}

export const PRODUCT_OFFER_CATALOG: ProductCatalogItem[] = [
  {
    id: "120_diagnosi_hardware_software",
    displayName: "120 Diagnosi Visive per Hardware e Software",
    matchPatterns: ["120 diagnosi", "diagnosi visive", "hardware e software", "diagnosi", "hardware"],
    offerUrl: "https://novidadesonline.net/120DiagnosiVisiveHardwareeSoftware/",
  },
  {
    id: "patologie_della_pittura",
    displayName: "Patologie della Pittura",
    matchPatterns: ["patologie della pittura", "patologie", "pittura", "patologias da pintura", "pintura"],
    offerUrl: "https://novidadesonline.net/patologie-della-pittura/",
  },
  {
    id: "100_guide_tornitura_fresatura",
    displayName: "100 Guide Parametri Tornitura e Fresatura",
    matchPatterns: ["tornitura", "fresatura", "parametri tornitura", "100 guide"],
    offerUrl: "https://novidadesonline.net/100GuideParametriTornituraeFresaturaItaliano/",
  },
  {
    id: "100_mappe_navigazione_aerea",
    displayName: "100 Mappe Visive di Navigazione Aerea",
    matchPatterns: ["navigazione aerea", "mappe visive", "navigazione", "aerea"],
    offerUrl: "https://novidadesonline.net/100MappeVisivediNavigazioneAereaItaliano/",
  },
  {
    id: "impianti_idrosanitari",
    displayName: "Impianti Idrosanitari",
    matchPatterns: ["impianti idrosanitari", "idrosanitari", "idrosanitario", "impianti"],
    offerUrl: "https://novidadesonline.net/ImpiantiIdrosanitariItaliano/",
  },
  {
    id: "impermepro_visivo",
    displayName: "ImpermePro Visivo",
    matchPatterns: ["impermepro", "impermeabilizzazione", "imperme", "impermeabili"],
    offerUrl: "https://novidadesonline.net/ImpermeProVisivoItaliano/",
  },
  {
    id: "prontuario_visivo_saldatura",
    displayName: "Prontuario Visivo della Saldatura",
    matchPatterns: ["saldatura", "prontuario", "saldature", "visivo della saldatura"],
    offerUrl: "https://novidadesonline.net/ProntuarioVisivodellaSaldatura/",
  },
  {
    id: "atlas_escrituras_latam",
    displayName: "Atlas de las Escrituras Latam",
    matchPatterns: ["atlas", "escrituras", "atlas de las escrituras", "latam"],
    offerUrl: "https://novidadesonline.net/AtlasdelasEscriturasLatam/",
  },
];

export function findCatalogItemForProduct(productName?: string | null): ProductCatalogItem | undefined {
  if (!productName) return undefined;
  const pNorm = productName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  return PRODUCT_OFFER_CATALOG.find((item) =>
    item.matchPatterns.some((pattern) => {
      const patNorm = pattern
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      return pNorm.includes(patNorm);
    })
  );
}

export function getProductStorageKey(productName?: string | null): string {
  if (!productName) return "default_product";
  const catalogItem = findCatalogItemForProduct(productName);
  if (catalogItem) return catalogItem.id;

  return (
    productName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "_")
      .replace(/_+/g, "_")
      .trim() || "default_product"
  );
}

export type LinkResolutionSource =
  | "catalog_auto"
  | "custom_saved"
  | "lead_checkout_url"
  | "global_fallback"
  | "empty";

export interface LinkResolutionResult {
  link: string;
  source: LinkResolutionSource;
  matchedCatalogItem?: ProductCatalogItem;
}

export function resolveDefaultProductLink(lead: RecoveryRow | null): LinkResolutionResult {
  if (!lead) return { link: "", source: "empty" };

  const storageKey = getProductStorageKey(lead.product);
  const catalogItem = findCatalogItemForProduct(lead.product);

  // 1. Link personalizado salvo previamente pelo usuário para este produto específico
  const customSaved = localStorage.getItem(`ninja_prod_link_${storageKey}`);
  if (customSaved && customSaved.trim().length > 0) {
    return {
      link: customSaved.trim(),
      source: "custom_saved",
      matchedCatalogItem: catalogItem,
    };
  }

  // 2. Link direto de checkout vindo do webhook / lead
  if (lead.checkoutUrl && lead.checkoutUrl.startsWith("http")) {
    return {
      link: lead.checkoutUrl.trim(),
      source: "lead_checkout_url",
      matchedCatalogItem: catalogItem,
    };
  }

  // 3. Link oficial do catálogo reconhecido
  if (catalogItem) {
    return {
      link: catalogItem.offerUrl,
      source: "catalog_auto",
      matchedCatalogItem: catalogItem,
    };
  }

  // 4. Fallback global anterior
  const globalFallback = localStorage.getItem("sfy_recovery_checkout_link") || "";
  if (globalFallback && globalFallback.trim().length > 0) {
    return {
      link: globalFallback.trim(),
      source: "global_fallback",
    };
  }

  return { link: "", source: "empty" };
}

function generateWhatsAppCopy(
  lang: RecoveryLanguage,
  strategy: RecoveryStrategy,
  lead: RecoveryRow | null,
  checkoutLink?: string
): string {
  if (!lead) return "";
  const firstName = (lead.customerName || "Cliente").trim().split(" ")[0];
  const product = (lead.product || "nosso treinamento").replace(/\.\.\.$/, "");
  const type = lead.type || "declined_card";
  const linkToUse = checkoutLink?.trim() || "";
  const itLinkCta = linkToUse
    ? `\n\n👉 Se desideri completare subito il tuo acquisto e accedere al materiale, ecco il link sicuro:\n${linkToUse}`
    : "";
  const esLinkCta = linkToUse
    ? `\n\n👉 Si deseas completar tu compra ahora y liberar tu acceso inmediato, aquí tienes el enlace seguro:\n${linkToUse}`
    : "";
  const ptLinkCta = linkToUse
    ? `\n\n👉 Se quiser completar sua compra e liberar seu acesso agora, segue o link seguro:\n${linkToUse}`
    : "";

  if (lang === "it") {
    if (strategy === "support") {
      if (type === "declined_card" || type === "unpaid_pix") {
        return `Ciao ${firstName}! 👋 Ti contatto dal supporto di *${product}*.\n\nHo visto che il tuo pagamento con carta non è andato a buon fine. Nella maggior parte dei casi in Italia si tratta solo della verifica *3D Secure* da autorizzare nell'app della tua banca (PostePay, Intesa, UniCredit, ecc.).${itLinkCta}\n\nVuoi che verifichiamo insieme o preferisci provare un metodo alternativo (come un'altra carta o PayPal)? 🚀\n\nQualsiasi dubbio sono a tua completa disposizione!\n_Equipe Info Courses_`;
      }
      return `Ciao ${firstName}! 👋 Ti scrivo dal team di *${product}*.\n\nHo notato che avevi iniziato l'iscrizione ma l'ordine è rimasto in sospeso. Hai riscontrato qualche difficoltà tecnica o hai dubbi sul programma?${itLinkCta}\n\nPer qualsiasi domanda sono a tua completa disposizione: ti basta rispondermi qui! 🚀\n\n_Equipe Info Courses_`;
    }
    if (strategy === "discount") {
      return `Ciao ${firstName}! 🎉 So quanto ci tenevi ad accedere a *${product}*.\n\nPer venirti incontro oggi, ho fatto abilitare un coupon esclusivo con il *10% DI SCONTO* valido solo per le prossime 2 ore!${itLinkCta}\n\nApprofitta dell'offerta riservata prima della chiusura. Per qualsiasi dubbio sono qui a tua disposizione! 🏷️\n\n_Equipe Info Courses_`;
    }
    if (strategy === "urgency") {
      return `Ciao ${firstName}, ti scrivo rapidamente: la tua prenotazione a tariffa promozionale per *${product}* sta per scadere e il posto verrà presto sbloccato per la lista d'attesa.${itLinkCta}\n\nVolevo darti la precedenza prima che il preço torni regolare. Se hai bisogno di supporto, rispondimi subito! ⚡\n\n_Equipe Info Courses_`;
    }
  }

  if (lang === "es") {
    if (strategy === "support") {
      return `¡Hola ${firstName}! 👋 Te escribo del soporte de *${product}*.\n\nNoté que iniciaste tu registro pero la orden quedó pendiente. ¿Tuviste algún inconveniente técnico en el checkout o alguna duda sobre el programa?${esLinkCta}\n\n¡Cualquier duda estoy a tu completa disposición por aquí! 🚀\n\n_Equipo Info Courses_`;
    }
    if (strategy === "discount") {
      return `¡Hola ${firstName}! 🎉 Sé lo importante que es para ti tener acceso a *${product}*.\n\nPara que no te quedes fuera hoy, conseguí un *CUPÓN EXCLUSIVO DEL 10% DE DESCUENTO* válido únicamente por las próximas 2 horas.${esLinkCta}\n\n¡Cualquier duda estoy a la orden! 🏷️\n\n_Equipo Info Courses_`;
    }
    if (strategy === "urgency") {
      return `Hola ${firstName}, te escribo con urgencia: tu reserva para *${product}* con el precio promocional está a punto de expirar en el sistema.${esLinkCta}\n\n¿Deseas asegurar tu lugar ahora mismo? ⚡\n\n_Equipo Info Courses_`;
    }
  }

  if (lang === "pt") {
    if (strategy === "support") {
      return `Olá, ${firstName}! 👋 Vi que você iniciou seu pedido do *${product}*, mas ele ficou pendente. Teve alguma dificuldade técnica no checkout?${ptLinkCta}\n\nQualquer dúvida estou à sua inteira disposição, só me responder aqui! 🚀\n\n_Equipe Info Courses_`;
    }
    if (strategy === "discount") {
      return `Oi, ${firstName}! 🎉 Separei um *CUPOM EXCLUSIVO DE 10% OFF* válido pelas próximas 2 horas para você garantir seu acesso ao *${product}*!${ptLinkCta}\n\nQualquer dúvida estou à disposição! 🏷️\n\n_Equipe Info Courses_`;
    }
    if (strategy === "urgency") {
      return `Olá ${firstName}, sua vaga promocional para o *${product}* expira em instantes e voltará ao valor normal.${ptLinkCta}\n\nPosso te ajudar a garantir sua vaga antes do encerramento? ⚡\n\n_Equipe Info Courses_`;
    }
  }

  return `Hallo ${firstName}! 👋 Deine Bestellung für ${product} wurde noch nicht abgeschlossen. Hier ist dein sicherer Link: ${checkoutLink || ""}\n\nTeam Info Courses`;
}

function generateEmailCopy(
  lang: RecoveryLanguage,
  strategy: RecoveryStrategy,
  lead: RecoveryRow | null,
  checkoutLink?: string
): { subject: string; body: string } {
  if (!lead) return { subject: "", body: "" };
  const firstName = (lead.customerName || "Cliente").trim().split(" ")[0];
  const product = (lead.product || "nosso treinamento").replace(/\.\.\.$/, "");
  const type = lead.type || "declined_card";
  const linkToUse = checkoutLink?.trim() || "";

  if (lang === "it") {
    if (strategy === "support") {
      if (type === "declined_card" || type === "unpaid_pix") {
        return {
          subject: `⚠️ Problema con il tuo ordine per ${product} (Verifica Carta / 3D Secure)`,
          body: `Gentile ${firstName},\n\nTi contattiamo dal supporto clienti di ${product}.\n\nAbbiamo notato che il tuo recente tentativo di pagamento con carta di credito/debito non è andato a buon fine.\n\nNella maggior parte dei casi in Italia, questo accade per uno dei seguenti motivi:\n1. Mancata autorizzazione della notifica 3D Secure nell'app della tua banca (PostePay, Intesa Sanpaolo, UniCredit, BNL, ecc.).\n2. Limite temporaneo per acquisti online sulla carta.\n\nIl tuo ordine è attualmente riservato a tuo nome.${
            linkToUse
              ? `\n\nSe desideri completare subito il tuo acquisto e accedere al materiale, trovi qui il link sicuro:\n👉 ${linkToUse}`
              : ""
          }\n\nPuoi riprovare con la stessa carta autorizzando l'app, oppure provare con un'altra carta o PayPal.\n\nSe hai bisogno di qualsiasi assistenza o hai domande, siamo a tua completa disposizione: ti basta rispondere direttamente a questa email.\n\nUn cordiale saluto,\nTeam ${product}\nEquipe Info Courses`,
        };
      }
      return {
        subject: `Hai completato la registrazione per ${product}?`,
        body: `Gentile ${firstName},\n\nAbbiamo notato che hai iniziato l'iscrizione a ${product}, ma l'ordine è rimasto in sospeso.\n\nCi tenevamo a verificare se hai riscontrato qualche difficoltà tecnica durante il checkout o se hai domande sul programma.${
          linkToUse
            ? `\n\nSe desideri completare subito il tuo acquisto e accedere al materiale, trovi qui il link sicuro:\n👉 ${linkToUse}`
            : ""
        }\n\nSiamo a tua completa disposizione per qualsiasi dubbio o chiarimento: ti basta rispondere a questa email.\n\nUn cordiale saluto,\nTeam ${product}\nEquipe Info Courses`,
      };
    }
    if (strategy === "discount") {
      return {
        subject: `🎉 Buono Sconto Esclusivo del 10% per ${product}`,
        body: `Ciao ${firstName},\n\nSappiamo quanto desideravi accedere a ${product}.\n\nPer venirti incontro oggi, abbiamo fatto abilitare dal sistema un COUPON ESCLUSIVO con il 10% DI SCONTO, valido esclusivamente per le prossime 2 ore.${
          linkToUse
            ? `\n\nPuoi approfittare dell'offerta e completare il tuo ordine direttamente qui:\n👉 ${linkToUse}`
            : ""
        }\n\nNon lasciarti scappare questa opportunità riservata! Per qualsiasi dubbio o necessità, siamo a tua completa disposizione: rispondi pure a questa email.\n\nUn cordiale saluto,\nTeam ${product}\nEquipe Info Courses`,
      };
    }
    if (strategy === "urgency") {
      return {
        subject: `⚡ Ultimo Avviso: La tua prenotazione per ${product} sta per scadere`,
        body: `Gentile ${firstName},\n\nTi informiamo che la tua prenotazione a tariffa promozionale per ${product} sta per scadere nel nostro sistema e il posto verrà presto riassegnato alla lista d'attesa.${
          linkToUse
            ? `\n\nSe desideri confermare il tuo accesso con le condizioni agevolate prima della chiusura, puoi completare l'ordine direttamente da questo link sicuro:\n👉 ${linkToUse}`
            : ""
        }\n\nSe hai bisogno di qualsiasi aiuto o chiarimento, rispondi semplicemente a questa email e saremo felici di assisterti.\n\nUn cordiale saluto,\nTeam ${product}\nEquipe Info Courses`,
      };
    }
  }

  if (lang === "es") {
    if (strategy === "support") {
      return {
        subject: `¿Completaste tu registro para ${product}?`,
        body: `Hola ${firstName},\n\nNotamos que iniciaste tu registro para ${product}, pero la orden quedó pendiente.\n\nQueríamos verificar si tuviste alguna dificultad técnica durante el checkout o si tienes preguntas sobre el programa.${
          linkToUse
            ? `\n\nSi deseas completar tu compra ahora y liberar tu acceso inmediato, aquí tienes el enlace seguro:\n👉 ${linkToUse}`
            : ""
        }\n\nCualquier duda que tengas, estamos a tu completa disposición: solo responde a este correo.\n\nAtentamente,\nEquipo Info Courses`,
      };
    }
    if (strategy === "discount") {
      return {
        subject: `🎉 Cupón Exclusivo de 10% de Descuento para ${product}`,
        body: `Hola ${firstName},\n\nSabemos cuánto deseabas acceder a ${product}.\n\nPara ayudarte hoy, activamos un CUPÓN EXCLUSIVO con el 10% DE DESCUENTO válido únicamente por las próximas 2 horas.${
          linkToUse
            ? `\n\nPuedes aprovechar la oferta y completar tu orden aquí:\n👉 ${linkToUse}`
            : ""
        }\n\n¡Cualquier duda, estamos a tu disposición!\n\nAtentamente,\nEquipo Info Courses`,
      };
    }
    if (strategy === "urgency") {
      return {
        subject: `⚡ Último Aviso: Tu reserva para ${product} está por expirar`,
        body: `Hola ${firstName},\n\nTe informamos que tu reserva con precio promocional para ${product} está a punto de expirar en nuestro sistema.${
          linkToUse
            ? `\n\nPara confirmar tu cupo antes del cierre, completa tu orden aquí:\n👉 ${linkToUse}`
            : ""
        }\n\nSi necesitas asistencia, responde directamente a este correo.\n\nAtentamente,\nEquipo Info Courses`,
      };
    }
  }

  if (lang === "pt") {
    if (strategy === "support") {
      return {
        subject: `Você concluiu sua inscrição no ${product}?`,
        body: `Olá, ${firstName}!\n\nNotamos que você iniciou sua inscrição no ${product}, mas o pedido ficou pendente.\n\nQueríamos verificar se você teve alguma dificuldade técnica durante o checkout ou se tem alguma dúvida sobre o conteúdo.${
          linkToUse
            ? `\n\nSe quiser completar sua compra e liberar seu acesso imediato, segue o link seguro:\n👉 ${linkToUse}`
            : ""
        }\n\nQualquer dúvida, estamos à sua inteira disposição: basta responder a este e-mail!\n\nAtenciosamente,\nEquipe Info Courses`,
      };
    }
    if (strategy === "discount") {
      return {
        subject: `🎉 Cupom Exclusivo de 10% OFF para ${product}`,
        body: `Oi, ${firstName}!\n\nSeparei um cupom especial de 10% OFF válido pelas próximas 2 horas para você garantir seu acesso ao ${product}!${
          linkToUse
            ? `\n\nAproveite e garanta sua vaga com desconto no link seguro abaixo:\n👉 ${linkToUse}`
            : ""
        }\n\nQualquer dúvida estou à disposição, só responder a este e-mail.\n\nAtenciosamente,\nEquipe Info Courses`,
      };
    }
    if (strategy === "urgency") {
      return {
        subject: `⚡ Último Aviso: Sua vaga promocional no ${product} vai expirar`,
        body: `Olá, ${firstName}!\n\nSua vaga com valor promocional para o ${product} expira em instantes no sistema e voltará ao valor original.${
          linkToUse
            ? `\n\nPara garantir sua vaga com condição especial antes do encerramento, acesse aqui:\n👉 ${linkToUse}`
            : ""
        }\n\nSe precisar de qualquer ajuda, basta responder a este e-mail.\n\nAtenciosamente,\nEquipe Info Courses`,
      };
    }
  }

  return {
    subject: `Deine Bestellung für ${product}`,
    body: `Hallo ${firstName},\n\nwir haben festgestellt, dass deine Bestellung für ${product} noch nicht abgeschlossen wurde.\n\n${
      linkToUse ? `Hier ist dein sicherer Link zum Abschließen:\n👉 ${linkToUse}\n\n` : ""
    }Bei Fragen antworte einfach auf diese E-Mail.\n\nMit freundlichen Grüßen,\nTeam Info Courses`,
  };
}

function generateSmsCopy(
  lang: RecoveryLanguage,
  strategy: RecoveryStrategy,
  lead: RecoveryRow | null,
  checkoutLink?: string
): string {
  if (!lead) return "";
  const firstName = (lead.customerName || "Cliente").trim().split(" ")[0];
  const product = (lead.product || "ordine").replace(/\.\.\.$/, "");
  const linkText = checkoutLink?.trim() || "";

  if (lang === "it") {
    if (strategy === "discount") {
      return `Ciao ${firstName}! Coupon 10% OFF attivo per ${product}. Completa qui prima della scadenza: ${linkText} - Equipe Info Courses`;
    }
    return `Ciao ${firstName}, completa il tuo ordine per ${product} con accesso immediato qui: ${linkText}. Dubbi? Rispondi pure. Equipe Info Courses`;
  }

  if (lang === "es") {
    return `Hola ${firstName}, completa tu orden para ${product} con acceso inmediato aqui: ${linkText}. Equipo Info Courses`;
  }

  return `Ola ${firstName}, seu pedido de ${product} esta pendente. Complete sua compra aqui: ${linkText} - Equipe Info Courses`;
}

export function WhatsAppRecoveryModal({
  open,
  onOpenChange,
  lead,
  onMarkRecovered,
}: WhatsAppRecoveryModalProps) {
  const [activeChannel, setActiveChannel] = useState<RecoveryChannelTab>("whatsapp");
  const [selectedLang, setSelectedLang] = useState<RecoveryLanguage>("it");
  const [selectedStrategy, setSelectedStrategy] = useState<RecoveryStrategy>("support");

  // Input states
  const [phoneInput, setPhoneInput] = useState("");
  const [checkoutLink, setCheckoutLink] = useState("");
  const [linkResolution, setLinkResolution] = useState<LinkResolutionResult>({
    link: "",
    source: "empty",
  });

  // Custom text states
  const [customWhatsAppText, setCustomWhatsAppText] = useState("");
  const [customEmailSubject, setCustomEmailSubject] = useState("");
  const [customEmailBody, setCustomEmailBody] = useState("");
  const [customSmsText, setCustomSmsText] = useState("");

  const [copied, setCopied] = useState(false);
  const [isMarking, setIsMarking] = useState(false);

  // Lead change effect
  useEffect(() => {
    if (lead) {
      const autoLang = detectLanguage(lead);
      setSelectedLang(autoLang);
      setSelectedStrategy("support");
      setPhoneInput(lead.customerPhone || "");

      const hasPhone = Boolean(lead.customerPhone && lead.customerPhone.trim().length >= 7);
      const defaultChannel: RecoveryChannelTab = hasPhone ? "whatsapp" : "email";
      setActiveChannel(defaultChannel);

      // Resolução inteligente do link do produto da oferta
      const resolved = resolveDefaultProductLink(lead);
      setLinkResolution(resolved);
      const initialLink = resolved.link;
      setCheckoutLink(initialLink);

      // Popula templates pré-configurados
      setCustomWhatsAppText(generateWhatsAppCopy(autoLang, "support", lead, initialLink));
      const emailContent = generateEmailCopy(autoLang, "support", lead, initialLink);
      setCustomEmailSubject(emailContent.subject);
      setCustomEmailBody(emailContent.body);
      setCustomSmsText(generateSmsCopy(autoLang, "support", lead, initialLink));

      setCopied(false);
    }
  }, [lead]);

  // Persist checkout link in localStorage per product key & global fallback
  const handleCheckoutLinkChange = (newLink: string) => {
    setCheckoutLink(newLink);
    localStorage.setItem("sfy_recovery_checkout_link", newLink);

    if (lead?.product) {
      const storageKey = getProductStorageKey(lead.product);
      localStorage.setItem(`ninja_prod_link_${storageKey}`, newLink);
      const catalogItem = findCatalogItemForProduct(lead.product);
      setLinkResolution({
        link: newLink,
        source: newLink === catalogItem?.offerUrl ? "catalog_auto" : "custom_saved",
        matchedCatalogItem: catalogItem,
      });
    }

    if (lead) {
      setCustomWhatsAppText(generateWhatsAppCopy(selectedLang, selectedStrategy, lead, newLink));
      const emailContent = generateEmailCopy(selectedLang, selectedStrategy, lead, newLink);
      setCustomEmailSubject(emailContent.subject);
      setCustomEmailBody(emailContent.body);
      setCustomSmsText(generateSmsCopy(selectedLang, selectedStrategy, lead, newLink));
    }
  };

  const handleRestoreCatalogLink = () => {
    if (!lead) return;
    const catalogItem = findCatalogItemForProduct(lead.product);
    if (catalogItem) {
      const storageKey = getProductStorageKey(lead.product);
      localStorage.removeItem(`ninja_prod_link_${storageKey}`);
      handleCheckoutLinkChange(catalogItem.offerUrl);
    }
  };

  const handleLanguageChange = (lang: RecoveryLanguage) => {
    setSelectedLang(lang);
    if (lead) {
      setCustomWhatsAppText(generateWhatsAppCopy(lang, selectedStrategy, lead, checkoutLink));
      const emailContent = generateEmailCopy(lang, selectedStrategy, lead, checkoutLink);
      setCustomEmailSubject(emailContent.subject);
      setCustomEmailBody(emailContent.body);
      setCustomSmsText(generateSmsCopy(lang, selectedStrategy, lead, checkoutLink));
    }
  };

  const handleStrategyChange = (strategy: RecoveryStrategy) => {
    setSelectedStrategy(strategy);
    if (lead) {
      setCustomWhatsAppText(generateWhatsAppCopy(selectedLang, strategy, lead, checkoutLink));
      const emailContent = generateEmailCopy(selectedLang, strategy, lead, checkoutLink);
      setCustomEmailSubject(emailContent.subject);
      setCustomEmailBody(emailContent.body);
      setCustomSmsText(generateSmsCopy(selectedLang, strategy, lead, checkoutLink));
    }
  };

  const cleanPhone = useMemo(
    () => cleanCustomerPhone(phoneInput || lead?.customerPhone, lead?.customerCountry, selectedLang),
    [phoneInput, lead?.customerPhone, lead?.customerCountry, selectedLang]
  );

  const handleCopyCurrent = async () => {
    try {
      let textToCopy = customWhatsAppText;
      if (activeChannel === "email") {
        textToCopy = `Oggetto: ${customEmailSubject}\n\n${customEmailBody}`;
      } else if (activeChannel === "sms") {
        textToCopy = customSmsText;
      }
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleOpenWhatsApp = () => {
    if (!cleanPhone) {
      alert("Por favor, digite um número de WhatsApp com DDI (ex: 39340...).");
      return;
    }
    const encoded = encodeURIComponent(customWhatsAppText);
    const url = `https://wa.me/${cleanPhone}?text=${encoded}`;
    window.open(url, "_blank");
  };

  const handleOpenGmail = () => {
    if (!lead?.customerEmail || lead.customerEmail === "—") {
      alert("Nenhum e-mail de cliente disponível.");
      return;
    }
    const to = encodeURIComponent(lead.customerEmail.trim());
    const su = encodeURIComponent(customEmailSubject);
    const body = encodeURIComponent(customEmailBody);
    // URL oficial de composição direta do Gmail Web com Para, Assunto e Texto pré-preenchidos
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${su}&body=${body}`;
    window.open(gmailUrl, "_blank", "noopener,noreferrer");
  };

  const handleOpenEmailApp = () => {
    if (!lead?.customerEmail || lead.customerEmail === "—") {
      alert("Nenhum e-mail de cliente disponível.");
      return;
    }
    const mailtoUrl = `mailto:${encodeURIComponent(lead.customerEmail.trim())}?subject=${encodeURIComponent(
      customEmailSubject
    )}&body=${encodeURIComponent(customEmailBody)}`;
    // Dispara o aplicativo de e-mail padrão do Android/iOS/Windows sem abrir aba em branco
    window.location.href = mailtoUrl;
  };

  const handleOpenSms = () => {
    if (!cleanPhone) {
      alert("Por favor, digite um número com DDI para envio de SMS.");
      return;
    }
    const isIOS = typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);
    const separator = isIOS ? "&" : "?";
    const smsUrl = `sms:+${cleanPhone}${separator}body=${encodeURIComponent(customSmsText)}`;
    // Dispara o aplicativo nativo de SMS (Google Mensagens / Samsung Mensagens) sem aba em branco
    window.location.href = smsUrl;
  };

  const handleOpenGoogleMessagesWeb = () => {
    window.open("https://messages.google.com/web", "_blank", "noopener,noreferrer");
  };

  const handleMarkAsRecovered = async () => {
    if (!lead || !onMarkRecovered) return;
    try {
      setIsMarking(true);
      await onMarkRecovered(lead.id);
      onOpenChange(false);
    } finally {
      setIsMarking(false);
    }
  };

  if (!lead) return null;

  const hasPhone = Boolean(lead.customerPhone && lead.customerPhone.trim().length >= 7);
  const isItalian = (lead.customerCountry || "").toUpperCase() === "IT" || selectedLang === "it";

  const eventBadgeText =
    isItalian && lead.type === "unpaid_pix"
      ? "Cartão Recusado"
      : {
          abandoned_cart: "Carrinho Abandonado",
          declined_card: "Cartão Recusado",
          unpaid_pix: "PIX Não Pago",
          trial: "Trial",
          unidentified: "Não Identificado",
        }[lead.type] || lead.type;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-w-4xl lg:max-w-5xl w-[96vw] max-h-[92vh] overflow-y-auto bg-[#0b1320] border border-zinc-800 shadow-2xl p-5 sm:p-7 text-foreground">
        <DialogHeader className="space-y-1.5 pb-2 border-b border-border/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className={`flex items-center justify-center size-9 rounded-lg border ${
                  activeChannel === "whatsapp"
                    ? "bg-[#25D366]/15 border-[#25D366]/30 text-[#25D366]"
                    : activeChannel === "email"
                    ? "bg-sky-500/15 border-sky-500/30 text-sky-400"
                    : "bg-purple-500/15 border-purple-500/30 text-purple-400"
                }`}
              >
                {activeChannel === "whatsapp" && <RiWhatsappFill className="size-5" />}
                {activeChannel === "email" && <RiMailSendLine className="size-5" />}
                {activeChannel === "sms" && <RiMessage3Line className="size-5" />}
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold tracking-tight text-white flex items-center gap-2 flex-wrap">
                  Recuperação Omnichannel 1-Click
                  <Badge
                    variant="outline"
                    className="text-[11px] font-normal border-emerald-500/40 text-emerald-400 bg-emerald-500/10"
                  >
                    Direct Response Ninja
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Gere mensagens de alta conversão para WhatsApp, E-mail e SMS focadas no mercado italiano/internacional.
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Channel Selection Tabs */}
        <div className="flex items-center gap-2 border-b border-border/40 pb-2.5">
          <button
            type="button"
            onClick={() => setActiveChannel("whatsapp")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeChannel === "whatsapp"
                ? "bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/40 shadow-sm"
                : "text-muted-foreground hover:bg-slate-800/80 hover:text-white"
            }`}
          >
            <RiWhatsappFill className="size-4" />
            <span>WhatsApp</span>
            {hasPhone && <span className="size-1.5 rounded-full bg-[#25D366]" />}
          </button>

          <button
            type="button"
            onClick={() => setActiveChannel("email")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeChannel === "email"
                ? "bg-sky-500/20 text-sky-400 border border-sky-500/40 shadow-sm"
                : "text-muted-foreground hover:bg-slate-800/80 hover:text-white"
            }`}
          >
            <RiMailSendLine className="size-4" />
            <span>E-mail</span>
            <Badge variant="secondary" className="text-[9px] px-1 py-0 h-3.5 bg-sky-500/10 text-sky-400">
              Disparo Direto
            </Badge>
          </button>

          <button
            type="button"
            onClick={() => setActiveChannel("sms")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeChannel === "sms"
                ? "bg-purple-500/20 text-purple-400 border border-purple-500/40 shadow-sm"
                : "text-muted-foreground hover:bg-slate-800/80 hover:text-white"
            }`}
          >
            <RiMessage3Line className="size-4" />
            <span>SMS</span>
          </button>
        </div>

        {/* Lead Alert: Missing Phone on Hotmart */}
        {!hasPhone && activeChannel === "whatsapp" && (
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
            <RiAlertLine className="size-4 shrink-0 mt-0.5" />
            <div className="flex-1">
              <strong className="font-semibold">Telefone não capturado pela Hotmart neste pedido.</strong>
              <p className="text-[11px] text-amber-200/90 mt-0.5">
                O cliente informou apenas o e-mail no checkout. Recomendamos mudar para a aba{" "}
                <button
                  type="button"
                  onClick={() => setActiveChannel("email")}
                  className="font-bold underline text-amber-100 hover:text-white cursor-pointer"
                >
                  E-mail
                </button>{" "}
                acima para disparar a recuperação agora com 1 clique!
              </p>
            </div>
          </div>
        )}

        {/* Lead Summary Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-900/80 border border-border/40 text-xs">
          <div className="min-w-0">
            <div className="text-[10px] text-muted-foreground uppercase font-medium">Cliente</div>
            <div className="font-semibold text-white truncate" title={lead.customerName}>
              {lead.customerName}
            </div>
            <div className="text-[11px] text-muted-foreground truncate" title={lead.customerEmail}>
              {lead.customerEmail}
            </div>
          </div>

          <div className="min-w-0">
            <div className="text-[10px] text-muted-foreground uppercase font-medium">WhatsApp / Tel</div>
            <input
              type="text"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              placeholder="Digite com DDI (ex: 39340...)"
              className="mt-0.5 w-full bg-slate-800/80 border border-border/60 rounded px-2 py-1 text-xs font-mono text-emerald-400 focus:outline-none focus:border-emerald-500"
            />
            <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
              {cleanPhone ? (
                <span>
                  wa.me/<strong className="text-emerald-300">+{cleanPhone}</strong>
                </span>
              ) : (
                <span className="text-amber-400">Sem telefone no checkout</span>
              )}
            </div>
          </div>

          <div className="min-w-0">
            <div className="text-[10px] text-muted-foreground uppercase font-medium">Evento & Valor</div>
            <div className="mt-0.5 flex items-center gap-1.5 flex-wrap">
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                {eventBadgeText}
              </Badge>
              <span className="font-mono font-bold text-white text-[12px]">
                R$ {lead.amount.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="min-w-0">
            <div className="text-[10px] text-muted-foreground uppercase font-medium">Produto</div>
            <div className="font-medium text-slate-200 truncate mt-0.5" title={lead.product}>
              {lead.product}
            </div>
          </div>
        </div>

        {/* Checkout Link Input with Product Intelligence */}
        <div className="space-y-2 p-3.5 rounded-xl bg-slate-900/90 border border-emerald-500/30 shadow-inner">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <RiLinkM className="size-3.5 text-emerald-400" />
              Link da Oferta / Checkout do Produto (Injetado automaticamente no texto)
            </label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {linkResolution.source === "catalog_auto" && (
                <Badge
                  variant="outline"
                  className="text-[10px] font-medium border-emerald-500/40 text-emerald-300 bg-emerald-500/10 flex items-center gap-1.5"
                >
                  <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Link Padrão Detectado ({linkResolution.matchedCatalogItem?.displayName || lead.product})
                </Badge>
              )}
              {linkResolution.source === "custom_saved" && (
                <Badge
                  variant="outline"
                  className="text-[10px] font-medium border-sky-500/40 text-sky-300 bg-sky-500/10 flex items-center gap-1.5"
                >
                  <span className="size-1.5 rounded-full bg-sky-400" />
                  Personalizado Salvo para este Produto
                </Badge>
              )}
              {linkResolution.source === "lead_checkout_url" && (
                <Badge
                  variant="outline"
                  className="text-[10px] font-medium border-purple-500/40 text-purple-300 bg-purple-500/10"
                >
                  URL Recebida da Hotmart
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={checkoutLink}
              onChange={(e) => handleCheckoutLinkChange(e.target.value)}
              placeholder="Cole seu link de checkout ou página de vendas aqui (ex: https://novidadesonline.net/...)"
              className="flex-1 bg-slate-950 border border-border/60 rounded-lg px-3 py-1.5 text-xs font-mono text-emerald-300 focus:outline-none focus:border-emerald-500 placeholder-slate-500"
            />
            {checkoutLink && (
              <a
                href={checkoutLink}
                target="_blank"
                rel="noopener noreferrer"
                title="Abrir o link em nova aba para validar"
                className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border/60 bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-200 font-medium transition-colors cursor-pointer"
              >
                <span>Testar Link</span>
                <RiExternalLinkLine className="size-3 text-slate-400" />
              </a>
            )}
            {linkResolution.source === "custom_saved" && linkResolution.matchedCatalogItem && (
              <button
                type="button"
                onClick={handleRestoreCatalogLink}
                title="Restaurar link padrão do catálogo"
                className="shrink-0 text-[11px] text-muted-foreground hover:text-emerald-400 underline underline-offset-2 transition-colors cursor-pointer"
              >
                Restaurar Padrão
              </button>
            )}
          </div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>
              💡 O link é salvo automaticamente para <strong className="text-slate-300">{lead.product}</strong> e incorporado no Call to Action (CTA) em {LANGUAGE_LABELS[selectedLang].name}.
            </span>
          </div>
        </div>

        {/* Language Tabs */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
            <span>Idioma da Mensagem</span>
            <span className="text-[11px] text-muted-foreground font-normal">
              Detectado: <strong className="text-emerald-400">{LANGUAGE_LABELS[selectedLang].name}</strong>
            </span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(Object.keys(LANGUAGE_LABELS) as RecoveryLanguage[]).map((lang) => {
              const info = LANGUAGE_LABELS[lang];
              const isSelected = selectedLang === lang;
              return (
                <button
                  key={lang}
                  type="button"
                  onClick={() => handleLanguageChange(lang)}
                  className={`flex items-center gap-2 p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                    isSelected
                      ? "border-emerald-500/60 bg-emerald-500/10 text-white shadow-sm ring-1 ring-emerald-500/30"
                      : "border-border/40 bg-slate-900/40 text-slate-300 hover:bg-slate-800/60 hover:border-border"
                  }`}
                >
                  <span className="text-xl leading-none">{info.flag}</span>
                  <div className="overflow-hidden min-w-0 flex-1">
                    <div className="text-xs font-medium truncate">{info.name}</div>
                    <div className="text-[10px] text-muted-foreground">{info.countryCode}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Copy Strategy Selection */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">
            Ângulo / Estratégia de Conversão
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {(Object.keys(STRATEGY_LABELS) as RecoveryStrategy[]).map((strat) => {
              const info = STRATEGY_LABELS[strat];
              const isSelected = selectedStrategy === strat;
              const Icon = info.icon;
              return (
                <button
                  key={strat}
                  type="button"
                  onClick={() => handleStrategyChange(strat)}
                  className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                    isSelected
                      ? "border-emerald-500/60 bg-emerald-500/10 text-white shadow-sm ring-1 ring-emerald-500/30"
                      : "border-border/40 bg-slate-900/40 text-slate-300 hover:bg-slate-800/60 hover:border-border"
                  }`}
                >
                  <Icon
                    className={`size-4 mt-0.5 shrink-0 ${
                      isSelected ? "text-emerald-400" : "text-muted-foreground"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold">{info.title}</div>
                    <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                      {info.subtitle}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* CHANNEL CONTENT: WHATSAPP */}
        {activeChannel === "whatsapp" && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <RiSparklingLine className="size-3.5 text-amber-400" />
                Preview do WhatsApp (Editável)
              </label>
              <button
                type="button"
                onClick={() =>
                  setCustomWhatsAppText(
                    generateWhatsAppCopy(selectedLang, selectedStrategy, lead, checkoutLink)
                  )
                }
                className="text-[11px] text-muted-foreground hover:text-emerald-400 underline underline-offset-2 transition-colors cursor-pointer"
              >
                Restaurar Original
              </button>
            </div>

            <div className="relative rounded-xl border border-emerald-500/20 bg-[#0b141a] p-4 shadow-inner">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-emerald-500/10 text-[11px] text-emerald-400/90 font-mono">
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                  WhatsApp Web Format
                </span>
                <span className="text-[10px] text-zinc-400 font-sans">
                  {cleanPhone ? `Destinatário: +${cleanPhone}` : "⚠️ Sem número cadastrado"}
                </span>
              </div>

              <div className="bg-[#005c4b] text-white rounded-lg rounded-tl-none p-3.5 shadow-md max-w-full text-xs font-sans leading-relaxed whitespace-pre-wrap">
                <Textarea
                  value={customWhatsAppText}
                  onChange={(e) => setCustomWhatsAppText(e.target.value)}
                  className="w-full bg-transparent border-0 p-0 text-xs text-white placeholder-slate-300 focus-visible:ring-0 resize-none min-h-[120px]"
                  placeholder="Escreva ou edite a mensagem..."
                />
                <div className="flex items-center justify-end gap-1 mt-1.5 text-[10px] text-emerald-200/80">
                  <span>
                    {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className="text-sky-300 font-bold">✓✓</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CHANNEL CONTENT: EMAIL */}
        {activeChannel === "email" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <RiMailSendLine className="size-3.5 text-sky-400" />
                E-mail de Recuperação (Editável)
              </label>
              <button
                type="button"
                onClick={() => {
                  const content = generateEmailCopy(selectedLang, selectedStrategy, lead, checkoutLink);
                  setCustomEmailSubject(content.subject);
                  setCustomEmailBody(content.body);
                }}
                className="text-[11px] text-muted-foreground hover:text-sky-400 underline underline-offset-2 transition-colors cursor-pointer"
              >
                Restaurar Original
              </button>
            </div>

            <div className="space-y-2 rounded-xl border border-sky-500/20 bg-slate-950/70 p-3.5 shadow-inner">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium text-slate-400 w-16">Para:</span>
                <span className="text-xs font-mono text-sky-300 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                  {lead.customerEmail}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium text-slate-400 w-16">Assunto:</span>
                <input
                  type="text"
                  value={customEmailSubject}
                  onChange={(e) => setCustomEmailSubject(e.target.value)}
                  className="flex-1 bg-slate-900 border border-border/60 rounded px-2.5 py-1 text-xs text-white font-medium focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="pt-1">
                <Textarea
                  value={customEmailBody}
                  onChange={(e) => setCustomEmailBody(e.target.value)}
                  className="w-full bg-slate-900 border border-border/60 rounded-lg p-3 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-sky-500 min-h-[150px] leading-relaxed"
                  placeholder="Corpo do e-mail de recuperação..."
                />
              </div>
            </div>

            {/* Mobile / App Helper Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-300 bg-sky-950/40 border border-sky-500/25 rounded-lg px-3 py-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <RiSmartphoneLine className="size-4 text-sky-400 shrink-0" />
                <span>
                  No <strong>celular Android</strong>: use <strong>App de E-mail (Celular / Padrão)</strong> para abrir o <em>Outlook, Samsung Email ou Gmail App</em> com a mensagem pronta.
                </span>
              </div>
              {cleanPhone && (
                <div className="flex items-center gap-1 shrink-0 text-[10px] text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                  <span>WhatsApp/SMS (+{cleanPhone})</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CHANNEL CONTENT: SMS */}
        {activeChannel === "sms" && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <RiMessage3Line className="size-3.5 text-purple-400" />
                Preview do SMS Direto
              </label>
              <button
                type="button"
                onClick={() =>
                  setCustomSmsText(generateSmsCopy(selectedLang, selectedStrategy, lead, checkoutLink))
                }
                className="text-[11px] text-muted-foreground hover:text-purple-400 underline underline-offset-2 transition-colors cursor-pointer"
              >
                Restaurar Original
              </button>
            </div>

            <div className="rounded-xl border border-purple-500/20 bg-slate-950 p-3.5 shadow-inner">
              <Textarea
                value={customSmsText}
                onChange={(e) => setCustomSmsText(e.target.value)}
                className="w-full bg-slate-900 border border-border/60 rounded-lg p-3 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-purple-500 min-h-[80px]"
                placeholder="Texto curto do SMS..."
              />
              <div className="text-[10px] text-muted-foreground mt-1 flex justify-between">
                <span>Caracteres: {customSmsText.length}</span>
                <span>{cleanPhone ? `Destino: +${cleanPhone}` : "Sem número com DDI"}</span>
              </div>
            </div>

            {/* Mobile / App Helper Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-300 bg-purple-950/40 border border-purple-500/25 rounded-lg px-3 py-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <RiSmartphoneLine className="size-4 text-purple-400 shrink-0" />
                <span>
                  No <strong>celular Android</strong>: abre o <strong>Google Mensagens</strong> ou <strong>Samsung Mensagens</strong> pronto para enviar sem custos adicionais.
                </span>
              </div>
              <button
                type="button"
                onClick={handleOpenGoogleMessagesWeb}
                className="hidden sm:inline-flex items-center gap-1 text-[10px] text-purple-300 hover:text-white underline cursor-pointer"
                title="Parear SMS do seu celular com o computador em messages.google.com/web"
              >
                <span>Usar no PC via Web</span>
                <RiExternalLinkLine className="size-2.5" />
              </button>
            </div>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3.5 border-t border-border/50 shrink-0">
          <div className="flex items-center gap-2">
            {onMarkRecovered && !lead.recovered && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAsRecovered}
                disabled={isMarking}
                className="border-emerald-500/40 hover:bg-emerald-500/10 text-xs text-emerald-300 cursor-pointer"
              >
                <RiCheckboxCircleLine className="size-3.5 mr-1.5 text-emerald-400" />
                {isMarking ? "Salvando..." : "Marcar como Recuperado"}
              </Button>
            )}
            {lead.recovered && (
              <Badge variant="outline" className="text-xs border-emerald-500/50 text-emerald-400 bg-emerald-500/10 py-1 px-2.5">
                <RiCheckboxCircleLine className="size-3.5 mr-1" />
                Recuperado
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyCurrent}
              className="border-border/60 hover:bg-slate-800 text-xs cursor-pointer"
            >
              {copied ? (
                <>
                  <RiCheckLine className="size-3.5 mr-1.5 text-emerald-400" />
                  Copiado!
                </>
              ) : (
                <>
                  <RiFileCopyLine className="size-3.5 mr-1.5" />
                  Copiar Mensagem
                </>
              )}
            </Button>

            {activeChannel === "whatsapp" && (
              <Button
                size="sm"
                onClick={handleOpenWhatsApp}
                disabled={!cleanPhone}
                className="bg-[#25D366] hover:bg-[#20ba5a] text-slate-950 font-bold text-xs shadow-lg shadow-[#25D366]/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2"
              >
                <RiWhatsappFill className="size-4 mr-1.5" />
                Abrir no WhatsApp
                <RiExternalLinkLine className="size-3.5 ml-1 opacity-70" />
              </Button>
            )}

            {activeChannel === "email" && (
              <>
                <Button
                  size="sm"
                  onClick={handleOpenGmail}
                  title="Abre a tela de composição do Gmail Web em nova aba (ideal para PC)"
                  className="bg-[#EA4335] hover:bg-[#d93829] text-white font-semibold text-xs shadow-md shadow-[#EA4335]/25 transition-all cursor-pointer px-3.5 py-2"
                >
                  <RiGoogleFill className="size-4 mr-1.5" />
                  Abrir no Gmail (Web)
                  <RiExternalLinkLine className="size-3.5 ml-1 opacity-80" />
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenEmailApp}
                  title="Abre diretamente no app de e-mail padrão do seu celular Android/iOS (Outlook, Samsung Email, Gmail App) ou do sistema"
                  className="border-sky-500/50 bg-sky-500/10 hover:bg-sky-500/20 text-xs text-sky-200 font-medium transition-all cursor-pointer px-3.5 py-2"
                >
                  <RiSmartphoneLine className="size-3.5 mr-1.5 text-sky-400" />
                  App de E-mail (Celular / Padrão)
                </Button>

                {cleanPhone && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleOpenSms}
                    title={`Disparar SMS rápido para o celular do cliente (+${cleanPhone})`}
                    className="border-purple-500/40 hover:bg-purple-500/15 text-xs text-purple-300 font-medium transition-all cursor-pointer px-3 py-2"
                  >
                    <RiMessage3Line className="size-3.5 mr-1 text-purple-400" />
                    Enviar SMS (+{cleanPhone})
                  </Button>
                )}
              </>
            )}

            {activeChannel === "sms" && (
              <>
                <Button
                  size="sm"
                  onClick={handleOpenSms}
                  disabled={!cleanPhone}
                  title="Abre o aplicativo nativo de SMS do celular (Google Mensagens, Samsung Mensagens) com o texto pronto"
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-lg shadow-purple-600/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2"
                >
                  <RiSmartphoneLine className="size-4 mr-1.5" />
                  Abrir no App de SMS (Celular)
                  <RiExternalLinkLine className="size-3.5 ml-1 opacity-70" />
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenGoogleMessagesWeb}
                  title="Acessar o Google Mensagens Web no computador para disparar SMS usando seu celular Android"
                  className="border-purple-500/40 hover:bg-purple-500/10 text-xs text-purple-300 cursor-pointer px-3 py-2"
                >
                  <RiExternalLinkLine className="size-3.5 mr-1 text-purple-400" />
                  Google Mensagens Web (PC)
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
