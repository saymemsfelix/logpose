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
  const linkText = checkoutLink ? `\n\n👉 Puoi completare qui in sicurezza: ${checkoutLink}` : "";

  if (lang === "it") {
    if (strategy === "support") {
      if (type === "declined_card" || type === "unpaid_pix") {
        return `Ciao ${firstName}! 👋 Ti contatto dal supporto di *${product}*.\n\nHo visto che il tuo pagamento con carta non è andato a buon fine. Nella maggior parte dei casi in Italia si tratta solo della verifica *3D Secure* da autorizzare nell'app della tua banca (PostePay, Intesa, UniCredit, ecc.).\n\nVuoi che verifichiamo insieme o preferisci provare un metodo alternativo (come un'altra carta o PayPal)? 🚀${linkText}`;
      }
      return `Ciao ${firstName}! 👋 Ti scrivo dal team di *${product}*.\n\nHo notato che avevi iniziato la registrazione ma l'ordine non è andato a buon fine. Hai riscontrato qualche difficoltà tecnica o hai bisogno di maggiori informazioni sul programma?\n\nSono qui per darti una mano ad accedere subito! 🚀${linkText}`;
    }
    if (strategy === "discount") {
      return `Ciao ${firstName}! 🎉 So quanto ci tenevi ad accedere a *${product}*.\n\nPer venirti incontro oggi, ho fatto abilitare un coupon esclusivo con il *10% DI SCONTO* valido solo per le prossime 2 ore!\n\nPosso mandarti il link riservato con lo sconto già applicato? 🏷️${linkText}`;
    }
    if (strategy === "urgency") {
      return `Ciao ${firstName}, ti scrivo rapidamente: il tuo posto riservato a tariffa promozionale per *${product}* sta per scadere e verrà sbloccato a breve per la lista d'attesa.\n\nVolevo darti la precedenza prima che il prezzo torni regolare. Vuoi che ti riservi il link prima della chiusura? ⚡${linkText}`;
    }
  }

  if (lang === "es") {
    if (strategy === "support") {
      return `¡Hola ${firstName}! 👋 Te escribo del soporte de *${product}*.\n\nNoté que el banco rechazó el intento de pago con tu tarjeta. Por lo general sucede por una verificación de seguridad preventiva en compras en línea.\n\n¿Deseas que te ayude a probar con otro método para asegurar tu acceso de inmediato? 🚀${linkText}`;
    }
    if (strategy === "discount") {
      return `¡Hola ${firstName}! 🎉 Sé lo importante que es para ti tener acceso a *${product}*.\n\nPara que no te quedes fuera hoy, conseguí un *CUPÓN EXCLUSIVO DEL 10% DE DESCUENTO* válido únicamente por las próximas 2 horas. 🏷️${linkText}`;
    }
    if (strategy === "urgency") {
      return `Hola ${firstName}, te escribo con urgencia: tu reserva para *${product}* con el precio promocional está a punto de expirar en el sistema.\n\n¿Deseas asegurar tu lugar ahora mismo? ⚡${linkText}`;
    }
  }

  if (lang === "pt") {
    if (strategy === "support") {
      return `Olá, ${firstName}! 👋 Vi que sua compra do *${product}* não foi autorizada pelo seu cartão. Geralmente isso ocorre por uma trava de segurança temporária no app do seu banco ou limite online.\n\nQuer que eu te gere um link alternativo para liberar seu acesso agora mesmo? 🚀${linkText}`;
    }
    if (strategy === "discount") {
      return `Oi, ${firstName}! 🎉 Separei um *CUPOM EXCLUSIVO DE 10% OFF* válido pelas próximas 2 horas para você garantir seu acesso ao *${product}*! 🏷️${linkText}`;
    }
    if (strategy === "urgency") {
      return `Olá ${firstName}, sua vaga promocional para o *${product}* expira em instantes e voltará ao valor normal. Posso te enviar o link para garantir sua vaga antes do encerramento? ⚡${linkText}`;
    }
  }

  return `Hallo ${firstName}! 👋 Deine Bestellung für ${product} wurde von der Bank abgebrochen. Bitte prüfe deine 3D-Secure App oder nutze diesen Link: ${checkoutLink || ""}`;
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
  const linkSection = checkoutLink
    ? `\n\n👉 Clicca qui per completare il tuo ordine in sicurezza:\n${checkoutLink}`
    : "";

  if (lang === "it") {
    if (strategy === "support") {
      if (type === "declined_card" || type === "unpaid_pix") {
        return {
          subject: `⚠️ Problema con il tuo ordine per ${product} (Verifica Carta / 3D Secure)`,
          body: `Gentile ${firstName},\n\nTi contattiamo dal supporto clienti di ${product}.\n\nAbbiamo notato che il tuo recente tentativo di pagamento con carta di credito/debito non è andato a buon fine.\n\nNella maggior parte dei casi in Italia, questo accade per uno dei seguenti motivi:\n1. Mancata autorizzazione della notifica 3D Secure nell'app della tua banca (PostePay, Intesa Sanpaolo, UniCredit, BNL, ecc.).\n2. Limite temporaneo per acquisti online sulla carta.\n\nIl tuo ordine è attualmente riservato a tuo nome.${linkSection}\n\nPuoi riprovare con la stessa carta autorizzando l'app, oppure provare con un'altra carta o PayPal.\n\nSe hai bisogno di qualsiasi assistenza, rispondi semplicemente a questa email e saremo felici di aiutarti!\n\nCordiali saluti,\nAssistenza Clienti - ${product}`,
        };
      }
      return {
        subject: `Hai completato la registrazione per ${product}?`,
        body: `Gentile ${firstName},\n\nAbbiamo notato che hai iniziato l'iscrizione a ${product}, ma l'ordine è rimasto in sospeso.\n\nCi tenevamo a verificare se hai riscontrato qualche difficoltà tecnica durante il checkout o se hai domande sul programma.${linkSection}\n\nSiamo a tua completa disposizione: ti basta rispondere a questa email.\n\nUn cordiale saluto,\nTeam ${product}`,
      };
    }
    if (strategy === "discount") {
      return {
        subject: `🎉 Buono Sconto Esclusivo del 10% per ${product}`,
        body: `Ciao ${firstName},\n\nSappiamo quanto desideravi accedere a ${product}.\n\nPer venirti incontro oggi, abbiamo fatto abilitare dal sistema un COUPON ESCLUSIVO con il 10% DI SCONTO, valido esclusivamente per le prossime 2 ore.${linkSection}\n\nNon lasciarti scappare questa opportunità riservata!\n\nA presto,\nTeam ${product}`,
      };
    }
    if (strategy === "urgency") {
      return {
        subject: `⚡ Ultimo Avviso: La tua prenotazione per ${product} sta per scadere`,
        body: `Gentile ${firstName},\n\nTi informiamo che la tua prenotazione a tariffa promozionale per ${product} sta per scadere nel nostro sistema e il posto verrà presto riassegnato.${linkSection}\n\nSe desideri confermare il tuo accesso con le condizioni agevolate prima della chiusura, completa l'ordine adesso o rispondi a questa email.\n\nCordiali saluti,\nTeam ${product}`,
      };
    }
  }

  if (lang === "es") {
    return {
      subject: `⚠️ Problema con el pago de tu orden para ${product}`,
      body: `Hola ${firstName},\n\nNotamos que tu intento de pago con tarjeta para ${product} no fue autorizado por el banco. Por lo general ocurre por una verificación de seguridad en compras por internet.${linkSection}\n\nPuedes intentar nuevamente o responder este correo para recibir asistencia.\n\nSaludos,\nSoporte ${product}`,
    };
  }

  return {
    subject: `⚠️ Informação sobre seu pedido para ${product}`,
    body: `Olá ${firstName},\n\nVimos que sua compra de ${product} não foi autorizada pela operadora do cartão.${linkSection}\n\nVocê pode tentar novamente pelo link acima ou responder este e-mail para receber suporte direto.\n\nAbraços,\nEquipe ${product}`,
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
  const linkText = checkoutLink || "";

  if (lang === "it") {
    if (strategy === "discount") {
      return `Ciao ${firstName}! Coupon 10% OFF attivo per ${product}. Completa qui prima della scadenza: ${linkText}`;
    }
    return `Ciao ${firstName}, il pagamento per ${product} non e andato a buon fine. Completa il tuo ordine qui: ${linkText}`;
  }

  return `Ola ${firstName}, seu pedido de ${product} esta pendente. Complete aqui: ${linkText}`;
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
  const [checkoutLink, setCheckoutLink] = useState(() => {
    return localStorage.getItem("sfy_recovery_checkout_link") || "";
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

      const savedLink = localStorage.getItem("sfy_recovery_checkout_link") || "";
      setCheckoutLink(savedLink);

      // Populate templates
      setCustomWhatsAppText(generateWhatsAppCopy(autoLang, "support", lead, savedLink));
      const emailContent = generateEmailCopy(autoLang, "support", lead, savedLink);
      setCustomEmailSubject(emailContent.subject);
      setCustomEmailBody(emailContent.body);
      setCustomSmsText(generateSmsCopy(autoLang, "support", lead, savedLink));

      setCopied(false);
    }
  }, [lead]);

  // Persist checkout link in localStorage and regenerate previews
  const handleCheckoutLinkChange = (newLink: string) => {
    setCheckoutLink(newLink);
    localStorage.setItem("sfy_recovery_checkout_link", newLink);
    if (lead) {
      setCustomWhatsAppText(generateWhatsAppCopy(selectedLang, selectedStrategy, lead, newLink));
      const emailContent = generateEmailCopy(selectedLang, selectedStrategy, lead, newLink);
      setCustomEmailSubject(emailContent.subject);
      setCustomEmailBody(emailContent.body);
      setCustomSmsText(generateSmsCopy(selectedLang, selectedStrategy, lead, newLink));
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
    window.open(mailtoUrl, "_blank");
  };

  const handleOpenSms = () => {
    if (!cleanPhone) {
      alert("Por favor, digite um número com DDI para envio de SMS.");
      return;
    }
    const smsUrl = `sms:+${cleanPhone}?body=${encodeURIComponent(customSmsText)}`;
    window.open(smsUrl, "_blank");
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
      <DialogContent className="sm:max-w-3xl max-w-3xl w-[96vw] max-h-[92vh] overflow-y-auto bg-[#0b1320] border-zinc-800 shadow-2xl p-5 sm:p-7 text-foreground">
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

        {/* Checkout Link Input (Persistent) */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <RiLinkM className="size-3.5 text-emerald-400" />
            Link de Checkout / Cupom de Recuperação (Salvo automaticamente)
          </label>
          <input
            type="text"
            value={checkoutLink}
            onChange={(e) => handleCheckoutLinkChange(e.target.value)}
            placeholder="Cole seu link de checkout da Hotmart ou página de downsell aqui (ex: https://pay.hotmart.com/...)"
            className="w-full bg-slate-900/60 border border-border/50 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500 placeholder-slate-500"
          />
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
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border/40 shrink-0">
          <div className="w-full sm:w-auto">
            {onMarkRecovered && !lead.recovered && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAsRecovered}
                disabled={isMarking}
                className="w-full sm:w-auto border-border/60 hover:bg-slate-800 text-xs text-slate-300 cursor-pointer"
              >
                <RiCheckboxCircleLine className="size-3.5 mr-1.5 text-emerald-400" />
                {isMarking ? "Salvando..." : "Marcar como Recuperado"}
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyCurrent}
              className="flex-1 sm:flex-none border-border/60 hover:bg-slate-800 text-xs cursor-pointer"
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
                className="flex-1 sm:flex-none bg-[#25D366] hover:bg-[#20ba5a] text-slate-950 font-bold text-xs shadow-lg shadow-[#25D366]/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2"
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
                  className="flex-1 sm:flex-none bg-[#EA4335] hover:bg-[#d93829] text-white font-bold text-xs shadow-lg shadow-[#EA4335]/25 transition-all cursor-pointer px-4 py-2"
                >
                  <RiGoogleFill className="size-4 mr-1.5" />
                  Abrir no Gmail (Web 1-Clique)
                  <RiExternalLinkLine className="size-3.5 ml-1 opacity-80" />
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenEmailApp}
                  title="Abrir no aplicativo padrão do celular (Gmail App / Apple Mail) ou Windows"
                  className="border-border/60 hover:bg-slate-800 text-xs text-slate-300 cursor-pointer"
                >
                  <RiMailSendLine className="size-3.5 mr-1 text-sky-400" />
                  App do Celular
                </Button>
              </>
            )}

            {activeChannel === "sms" && (
              <Button
                size="sm"
                onClick={handleOpenSms}
                disabled={!cleanPhone}
                className="flex-1 sm:flex-none bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-lg shadow-purple-600/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2"
              >
                <RiMessage3Line className="size-4 mr-1.5" />
                Enviar SMS
                <RiExternalLinkLine className="size-3.5 ml-1 opacity-70" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
