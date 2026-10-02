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
  RiFileCopyLine,
  RiCheckLine,
  RiCheckboxCircleLine,
  RiSparklingLine,
  RiPriceTag3Line,
  RiFlashlightLine,
  RiCustomerService2Line,
  RiExternalLinkLine,
} from "@remixicon/react";
import type { RecoveryRow } from "@/services/recovery";

export type RecoveryLanguage = "es" | "it" | "pt" | "de";
export type RecoveryStrategy = "support" | "discount" | "urgency";

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
    subtitle: "Tirar dúvidas e ajudar com a compra",
    icon: RiCustomerService2Line,
  },
  discount: {
    title: "Cupom 10% OFF",
    subtitle: "Oferta exclusiva de fechamento",
    icon: RiPriceTag3Line,
  },
  urgency: {
    title: "Urgência & Vaga",
    subtitle: "Reserva expirando no sistema",
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

  // Fallback baseado no produto (produtos italianos por padrão)
  const pLower = (lead.product || "").toLowerCase();
  if (
    pLower.includes("diagnosi") ||
    pLower.includes("visive") ||
    pLower.includes("connettori")
  ) {
    return "it";
  }
  return "it";
}

function cleanCustomerPhone(phone: string | null | undefined): string {
  if (!phone) return "";
  let digits = phone.replace(/\D/g, "");
  // Se for celular brasileiro sem DDI 55
  if (digits.length === 10 || digits.length === 11) {
    if (!digits.startsWith("55")) {
      digits = "55" + digits;
    }
  }
  return digits;
}

function generateCopy(
  lang: RecoveryLanguage,
  strategy: RecoveryStrategy,
  lead: RecoveryRow | null
): string {
  if (!lead) return "";
  const firstName = (lead.customerName || "Cliente").trim().split(" ")[0];
  const product = (lead.product || "nosso treinamento").replace(/\.\.\.$/, "");
  const type = lead.type || "abandoned_cart";

  if (lang === "it") {
    if (strategy === "support") {
      if (type === "declined_card") {
        return `Ciao ${firstName}! 👋 Ti contatto dal supporto di *${product}*.\n\nHo visto che la tua banca ha bloccato il tentativo di pagamento con carta. Spesso si tratta solo della verifica 3D Secure nell'app bancaria.\n\nVuoi che verifichiamo insieme o preferisci provare un metodo alternativo per attivare subito il tuo accesso? 🚀`;
      }
      if (type === "unpaid_pix") {
        return `Ciao ${firstName}! 👋 Il tuo ordine per *${product}* è attualmente in attesa di conferma del pagamento.\n\nSe hai bisogno di assistenza tecnica o desideri completarlo subito, rispondimi pure qui su WhatsApp e ti aiuto immediatamente!`;
      }
      return `Ciao ${firstName}! 👋 Ti scrivo dal team di *${product}*.\n\nHo notato che avevi iniziato la registrazione ma l'ordine non è andato a buon fine. Hai riscontrato qualche difficoltà tecnica o hai bisogno di maggiori informazioni sul programma?\n\nSono qui su WhatsApp per darti una mano ad accedere subito! 🚀`;
    }
    if (strategy === "discount") {
      return `Ciao ${firstName}! 🎉 So quanto ci tenevi ad accedere a *${product}*.\n\nPer venirti incontro oggi, ho fatto abilitare un coupon esclusivo con il *10% DI SCONTO* valido solo per le prossime 2 ore!\n\nPosso mandarti il link riservato con lo sconto già applicato? 🏷️`;
    }
    if (strategy === "urgency") {
      return `Ciao ${firstName}, ti scrivo rapidamente: il tuo posto riservato a tariffa promozionale per *${product}* sta per scadere e verrà sbloccato a breve per la lista d'attesa.\n\nVolevo darti la precedenza prima che il prezzo torni regolare. Vuoi che ti riservi il link prima della chiusura? ⚡`;
    }
  }

  if (lang === "es") {
    if (strategy === "support") {
      if (type === "declined_card") {
        return `¡Hola ${firstName}! 👋 Te escribo del soporte de *${product}*.\n\nNoté que el banco rechazó el intento de pago con tu tarjeta. Por lo general sucede por una verificación de seguridad preventiva en compras en línea.\n\n¿Deseas que te ayude a probar con otro método para asegurar tu acceso de inmediato? 🚀`;
      }
      if (type === "unpaid_pix") {
        return `¡Hola ${firstName}! 👋 Tu orden para *${product}* quedó pendiente de confirmación de pago.\n\nSi necesitas ayuda con el comprobante o prefieres otro medio de pago, avísame por aquí y te ayudo con gusto.`;
      }
      return `¡Hola ${firstName}! 👋 Te escribo del equipo de *${product}*.\n\nNoté que iniciaste tu compra pero no llegaste a completarla. ¿Tuviste alguna duda con el acceso o algún inconveniente con el pago?\n\nEstoy aquí en WhatsApp para ayudarte a acceder ahora mismo 🚀`;
    }
    if (strategy === "discount") {
      return `¡Hola ${firstName}! 🎉 Sé lo importante que es para ti tener acceso a *${product}*.\n\nPara que no te quedes fuera hoy, conseguí un *CUPÓN EXCLUSIVO DEL 10% DE DESCUENTO* válido únicamente por las próximas 2 horas.\n\n¿Te gustaría que te comparta el enlace con el descuento ya aplicado? 🏷️`;
    }
    if (strategy === "urgency") {
      return `Hola ${firstName}, te escribo con urgencia: tu reserva para *${product}* con el precio promocional está a punto de expirar en el sistema.\n\nComo habías empezado el registro, quise darte prioridad antes de que vuelva al valor regular. ¿Deseas asegurar tu lugar ahora mismo? ⚡`;
    }
  }

  if (lang === "pt") {
    if (strategy === "support") {
      if (type === "declined_card") {
        return `Olá, ${firstName}! 👋 Vi que sua compra do *${product}* não foi autorizada pelo seu cartão. Geralmente isso ocorre por uma trava de segurança temporária no app do seu banco ou limite online.\n\nQuer que eu te gere um link alternativo ou PIX com liberação instantânea no WhatsApp? 🚀`;
      }
      if (type === "unpaid_pix") {
        return `Olá, ${firstName}! 👋 Seu PIX para acessar o *${product}* foi gerado com sucesso, mas ainda não identificamos a confirmação.\n\nO acesso é liberado no mesmo instante após o pagamento! Precisa do código novamente ou prefere cartão?`;
      }
      return `Olá, ${firstName}! 👋 Tudo bem? Vi que você começou a inscrição no *${product}*, mas o pedido acabou não sendo concluído.\n\nFicou com alguma dúvida sobre o conteúdo ou teve dificuldade no pagamento? Posso te ajudar a liberar seu acesso agora mesmo! 🚀`;
    }
    if (strategy === "discount") {
      return `Oi, ${firstName}! 🎉 Separei uma condição única para você não ficar de fora do *${product}*: consegui autorização com a equipe para liberar um *CUPOM EXCLUSIVO DE 10% OFF* válido pelas próximas 2 horas!\n\nQuer que eu te envie o link com o desconto ativado? 🏷️`;
    }
    if (strategy === "urgency") {
      return `Olá ${firstName}, passando para avisar que sua vaga com valor promocional para o *${product}* expira em instantes e voltará ao valor normal.\n\nComo você já tinha preenchido seus dados, dei preferência para você. Posso te enviar o link para garantir sua vaga antes do encerramento? ⚡`;
    }
  }

  if (lang === "de") {
    if (strategy === "support") {
      if (type === "declined_card") {
        return `Hallo ${firstName}! 👋 Ich schreibe dir bezüglich deiner Bestellung für *${product}*.\n\nDeine Kartenzahlung wurde leider von der Bank abgewiesen. Oft liegt das an der 3D-Secure-Bestätigung in deiner Banking-App.\n\nMöchtest du es mit einer alternativen Zahlungsart versuchen, damit dein Zugang direkt freigeschaltet wird? 🚀`;
      }
      if (type === "unpaid_pix") {
        return `Hallo ${firstName}! 👋 Deine Bestellung für *${product}* ist noch offen und wartet auf Bestätigung.\n\nFalls du Fragen oder Probleme bei der Zahlung hast, sag mir einfach kurz hier Bescheid!`;
      }
      return `Hallo ${firstName}! 👋 Ich schreibe dir vom Team von *${product}*.\n\nIch habe gesehen, dass du deine Bestellung begonnen, aber noch nicht abgeschlossen hast. Gab es ein technisches Problem oder hast du noch offene Fragen?\n\nIch helfe dir gerne direkt hier über WhatsApp weiter! 🚀`;
    }
    if (strategy === "discount") {
      return `Hallo ${firstName}! 🎉 Da du großes Interesse an *${product}* hattest, habe ich einen exklusiven Gutschein für dich freigeschaltet: *10% RABATT*, gültig für die nächsten 2 Stunden!\n\nSoll ich dir den direkten Link mit dem aktivierten Rabatt senden? 🏷️`;
    }
    if (strategy === "urgency") {
      return `Hallo ${firstName}, ein wichtiger Hinweis: Deine Reservierung zum Sonderpreis für *${product}* läuft in Kürze ab.\n\nDa du den Checkout bereits gestartet hattest, wollte ich dir noch den Vorzug geben, bevor der reguläre Preis gilt. Möchtest du dir den Zugang jetzt sichern? ⚡`;
    }
  }

  return "";
}

export function WhatsAppRecoveryModal({
  open,
  onOpenChange,
  lead,
  onMarkRecovered,
}: WhatsAppRecoveryModalProps) {
  const [selectedLang, setSelectedLang] = useState<RecoveryLanguage>("it");
  const [selectedStrategy, setSelectedStrategy] = useState<RecoveryStrategy>("support");
  const [customText, setCustomText] = useState("");
  const [copied, setCopied] = useState(false);
  const [isMarking, setIsMarking] = useState(false);

  // Auto detect language when lead changes
  useEffect(() => {
    if (lead) {
      const autoLang = detectLanguage(lead);
      setSelectedLang(autoLang);
      setSelectedStrategy("support");
      setCustomText(generateCopy(autoLang, "support", lead));
      setCopied(false);
    }
  }, [lead]);

  // When user switches language or strategy, update the message
  const handleLanguageChange = (lang: RecoveryLanguage) => {
    setSelectedLang(lang);
    setCustomText(generateCopy(lang, selectedStrategy, lead));
  };

  const handleStrategyChange = (strategy: RecoveryStrategy) => {
    setSelectedStrategy(strategy);
    setCustomText(generateCopy(selectedLang, strategy, lead));
  };

  const rawPhone = lead?.customerPhone || "";
  const cleanPhone = useMemo(() => cleanCustomerPhone(rawPhone), [rawPhone]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(customText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleOpenWhatsApp = () => {
    if (!cleanPhone) {
      alert("Este cliente não possui telefone/WhatsApp cadastrado.");
      return;
    }
    const encoded = encodeURIComponent(customText);
    const url = `https://wa.me/${cleanPhone}?text=${encoded}`;
    window.open(url, "_blank");
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

  const eventBadgeText = {
    abandoned_cart: "Carrinho Abandonado",
    declined_card: "Cartão Recusado",
    unpaid_pix: "PIX Não Pago",
    trial: "Trial",
    unidentified: "Não Identificado",
  }[lead.type] || lead.type;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-[#0f172a]/95 border-border/50 backdrop-blur-xl shadow-2xl p-6 sm:p-7 text-foreground">
        <DialogHeader className="space-y-1.5 pb-2 border-b border-border/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center size-9 rounded-lg bg-[#25D366]/15 border border-[#25D366]/30 text-[#25D366]">
                <RiWhatsappFill className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold tracking-tight text-white flex items-center gap-2">
                  Recuperação WhatsApp 1-Click
                  <Badge variant="outline" className="text-[11px] font-normal border-[#25D366]/40 text-[#25D366] bg-[#25D366]/10">
                    Live Direct Response
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Gere mensagens de alta conversão personalizadas para o idioma e motivo da desistência.
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Lead Summary Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-900/60 border border-border/40 text-xs">
          <div>
            <div className="text-[10px] text-muted-foreground uppercase font-medium">Cliente</div>
            <div className="font-semibold text-white truncate">{lead.customerName}</div>
            <div className="text-[11px] text-muted-foreground truncate">{lead.customerEmail}</div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase font-medium">WhatsApp / Tel</div>
            <div className="font-mono text-emerald-400 font-medium">
              {rawPhone || "Não informado"}
            </div>
            <div className="text-[10px] text-muted-foreground">
              País: <span className="font-semibold text-white">{lead.customerCountry || "Auto"}</span>
            </div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase font-medium">Evento & Valor</div>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 mt-0.5">
              {eventBadgeText}
            </Badge>
            <div className="font-mono font-bold text-white text-[11px] mt-0.5">
              R$ {lead.amount.toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase font-medium">Produto</div>
            <div className="font-medium text-slate-200 truncate mt-0.5" title={lead.product}>
              {lead.product}
            </div>
          </div>
        </div>

        {/* Language Tabs (4 Languages requested) */}
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
                  className={`flex items-center gap-2 p-2.5 rounded-lg border text-left transition-all ${
                    isSelected
                      ? "border-emerald-500/60 bg-emerald-500/10 text-white shadow-sm ring-1 ring-emerald-500/30"
                      : "border-border/40 bg-slate-900/40 text-slate-300 hover:bg-slate-800/60 hover:border-border"
                  }`}
                >
                  <span className="text-xl leading-none">{info.flag}</span>
                  <div className="overflow-hidden">
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
                  className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-left transition-all ${
                    isSelected
                      ? "border-emerald-500/60 bg-emerald-500/10 text-white shadow-sm ring-1 ring-emerald-500/30"
                      : "border-border/40 bg-slate-900/40 text-slate-300 hover:bg-slate-800/60 hover:border-border"
                  }`}
                >
                  <Icon className={`size-4 mt-0.5 shrink-0 ${isSelected ? "text-emerald-400" : "text-muted-foreground"}`} />
                  <div>
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

        {/* Live Preview / Editable WhatsApp Bubble */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <RiSparklingLine className="size-3.5 text-amber-400" />
              Preview da Mensagem (Editável)
            </label>
            <button
              type="button"
              onClick={() => setCustomText(generateCopy(selectedLang, selectedStrategy, lead))}
              className="text-[11px] text-muted-foreground hover:text-emerald-400 underline underline-offset-2 transition-colors"
            >
              Restaurar Original
            </button>
          </div>

          <div className="relative rounded-xl border border-emerald-500/20 bg-[#0b141a] p-4 shadow-inner">
            <div className="absolute top-3 right-3 flex items-center gap-1 text-[10px] text-emerald-400/80 font-mono">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
              WhatsApp Web Format
            </div>

            {/* Simulated Chat Bubble */}
            <div className="bg-[#005c4b] text-white rounded-lg rounded-tl-none p-3 shadow-md max-w-full text-xs font-sans leading-relaxed whitespace-pre-wrap selection:bg-emerald-300 selection:text-slate-900">
              <Textarea
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                className="w-full bg-transparent border-0 p-0 text-xs text-white placeholder-slate-300 focus-visible:ring-0 resize-none min-h-[110px]"
                placeholder="Escreva ou edite a mensagem..."
              />
              <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-emerald-200/80">
                <span>{new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                <span className="text-sky-300 font-bold">✓✓</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-3 border-t border-border/40">
          <div className="w-full sm:w-auto">
            {onMarkRecovered && !lead.recovered && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAsRecovered}
                disabled={isMarking}
                className="w-full sm:w-auto border-border/60 hover:bg-slate-800 text-xs text-slate-300"
              >
                <RiCheckboxCircleLine className="size-3.5 mr-1.5 text-emerald-400" />
                {isMarking ? "Salvando..." : "Marcar como Recuperado"}
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="flex-1 sm:flex-none border-border/60 hover:bg-slate-800 text-xs"
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

            <Button
              size="sm"
              onClick={handleOpenWhatsApp}
              disabled={!cleanPhone}
              className="flex-1 sm:flex-none bg-[#25D366] hover:bg-[#20ba5a] text-slate-950 font-semibold text-xs shadow-lg shadow-[#25D366]/20 transition-all"
            >
              <RiWhatsappFill className="size-4 mr-1.5" />
              Abrir no WhatsApp
              <RiExternalLinkLine className="size-3.5 ml-1 opacity-70" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
