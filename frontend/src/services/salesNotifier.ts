import { playSaleCashSound, vibrateSale, speakVoice } from "@/utils/salesSound";
import { toast } from "sonner";
import { apiRequest } from "./api";

export interface RecentSaleItem {
  id: number;
  external_id: string;
  amount: number;
  product_name: string;
  customer_email?: string;
  country?: string;
  created_at?: string;
  utm_content?: string;
  utm_campaign?: string;
  utm_source?: string;
  ad_name?: string;
}

const STORAGE_KEY_NOTIF = "ninja_sales_notif_enabled";
const STORAGE_KEY_LAST_ID = "ninja_last_seen_sale_id";
const STORAGE_KEY_PREFS = "nexofy_notification_preferences";

export interface NotificationPreferences {
  // Vendas
  sales_pix_created: boolean;
  sales_approved: boolean;
  sales_pix_approved: boolean;
  sales_card_approved: boolean;
  
  // Recuperação
  recovery_rejected: boolean;
  
  // Conta e Assinatura
  account_limits: boolean;
  
  // Novidades e Recursos
  news_features: boolean;
  
  // Resumo da Operação
  daily_summary_enabled: boolean;
  summary_times: {
    morning: boolean;   // 09:00 - Como o dia começou
    midday: boolean;    // 12:00 - Resumo do meio-dia
    afternoon: boolean; // 18:00 - Fechamento da tarde
    night: boolean;     // 23:00 - Resumo do dia
  };
  
  // Canais de Entrega
  channels: {
    new_sale: { email: boolean; push: boolean; sound: boolean };
    daily_summary: { email: boolean; push: boolean };
    scheduled_report: { email: boolean; push: boolean };
    recovery_alert: { email: boolean; push: boolean };
  };

  sound_enabled: boolean;
  voice_enabled: boolean;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  sales_pix_created: true,
  sales_approved: true,
  sales_pix_approved: true,
  sales_card_approved: true,
  recovery_rejected: true,
  account_limits: true,
  news_features: true,
  daily_summary_enabled: true,
  summary_times: {
    morning: true,
    midday: true,
    afternoon: true,
    night: true,
  },
  channels: {
    new_sale: { email: false, push: true, sound: true },
    daily_summary: { email: false, push: true },
    scheduled_report: { email: false, push: false },
    recovery_alert: { email: false, push: true },
  },
  sound_enabled: true,
  voice_enabled: true,
};

export function getNotificationPreferences(): NotificationPreferences {
  if (typeof window === "undefined") return DEFAULT_NOTIFICATION_PREFERENCES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFS);
    if (!raw) return DEFAULT_NOTIFICATION_PREFERENCES;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      ...parsed,
      summary_times: { ...DEFAULT_NOTIFICATION_PREFERENCES.summary_times, ...(parsed.summary_times || {}) },
      channels: {
        new_sale: { ...DEFAULT_NOTIFICATION_PREFERENCES.channels.new_sale, ...(parsed.channels?.new_sale || {}) },
        daily_summary: { ...DEFAULT_NOTIFICATION_PREFERENCES.channels.daily_summary, ...(parsed.channels?.daily_summary || {}) },
        scheduled_report: { ...DEFAULT_NOTIFICATION_PREFERENCES.channels.scheduled_report, ...(parsed.channels?.scheduled_report || {}) },
        recovery_alert: { ...DEFAULT_NOTIFICATION_PREFERENCES.channels.recovery_alert, ...(parsed.channels?.recovery_alert || {}) },
      },
    };
  } catch {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }
}

export function saveNotificationPreferences(prefs: NotificationPreferences): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_PREFS, JSON.stringify(prefs));
  } catch (err) {
    console.error("Falha ao salvar preferências de notificação:", err);
  }
}

export function isSalesNotificationEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(STORAGE_KEY_NOTIF) === "true";
}

/**
 * Exibe notificação nativa com suporte total a Mobile (Android Chrome, iOS PWA) e Desktop.
 */
export async function showNativeNotification(title: string, options: NotificationOptions = {}) {
  if (typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "granted") {
    return;
  }

  const defaultOpts: NotificationOptions = {
    icon: "/icons/pwa-192.png",
    badge: "/icons/pwa-192.png",
    ...options,
  };

  // 1. Tenta via ServiceWorker (OBRIGATÓRIO para Mobile Android e PWA iOS)
  if ("serviceWorker" in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg && typeof reg.showNotification === "function") {
        await reg.showNotification(title, defaultOpts);
        return;
      }
    } catch {
      // continua para fallback
    }
  }

  // 2. Fallback direto para desktop
  try {
    new Notification(title, defaultOpts);
  } catch {
    // Ignora se bloqueado
  }
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Registra o navegador / celular no backend para Web Push contínuo em segundo plano
 */
export async function subscribeToPushNotifications(): Promise<boolean> {
  if (
    typeof window === "undefined" ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window)
  ) {
    return false;
  }

  try {
    let reg = await navigator.serviceWorker.getRegistration();
    if (!reg) {
      reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    }
    const readyReg = await navigator.serviceWorker.ready;
    let sub = await readyReg.pushManager.getSubscription();

    if (!sub) {
      // 1. Busca a chave pública VAPID do servidor
      const keyData = await apiRequest<{ public_key: string }>("/notifications/vapid-key");
      if (!keyData?.public_key) {
        throw new Error("Chave VAPID não retornada pelo servidor");
      }

      // 2. Inscreve o Service Worker
      sub = await readyReg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyData.public_key),
      });
    }

    // 3. Envia os dados da inscrição para o backend salvar no banco
    if (sub) {
      const subJson = sub.toJSON();
      await apiRequest("/notifications/subscribe", {
        method: "POST",
        body: {
          endpoint: sub.endpoint,
          keys: subJson.keys,
          user_agent: navigator.userAgent,
        },
      });
      console.log("✅ Web Push celular inscrito com sucesso no Ninja Tracker!");
      return true;
    }
  } catch (err) {
    console.error("Falha ao registrar Web Push no celular:", err);
  }
  return false;
}

/**
 * Envia um push de teste imediato do servidor para o celular (venda, recuperação ou lucro)
 */
export async function sendTestPushNotification(
  testType: "sale" | "recovery" | "profit" = "sale"
): Promise<boolean> {
  try {
    const res = await apiRequest<{ status: string; message: string; sent_count: number }>(
      "/notifications/test",
      {
        method: "POST",
        body: { test_type: testType },
      }
    );
    if (res?.sent_count && res.sent_count > 0) {
      toast.success(res.message);
      return true;
    } else {
      toast.warning(res?.message || "Nenhum celular cadastrado para receber notificações.");
      return false;
    }
  } catch (err) {
    toast.error("Erro ao enviar pop-up de teste do servidor.");
    return false;
  }
}

export async function requestSalesNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    toast.error("Notificações não são suportadas neste navegador.");
    return false;
  }

  // Toca som de teste e voz imediatamente após interação do usuário para desbloquear AudioContext no celular
  playSaleCashSound();
  vibrateSale();
  try {
    speakVoice("Alertas Ninja Tracker ativados com sucesso! Bora lucrar.");
  } catch {}

  if (Notification.permission === "granted") {
    localStorage.setItem(STORAGE_KEY_NOTIF, "true");
    await subscribeToPushNotifications();

    toast.success("🔔 Alertas no Celular Ativos!", {
      description: "Você receberá pop-ups mesmo com a tela bloqueada ou navegador fechado!",
    });
    await showNativeNotification("🎉 NINJA TRACKER Alertas Ativos!", {
      body: "Notificações móveis prontas! Vendas, criativos e lucros aparecerão aqui em tempo real.",
      tag: "ninja-welcome",
    });
    return true;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      localStorage.setItem(STORAGE_KEY_NOTIF, "true");
      await subscribeToPushNotifications();

      toast.success("🔔 Notificações e Som ativados no Celular!", {
        description: "Você será avisado em tempo real com som de moedas, criativo e pop-up estilo Nexofy!",
      });

      await showNativeNotification("🎉 NINJA TRACKER Alertas Ativos!", {
        body: "Pronto! Toda venda vai avisar no celular com o valor e criativo!",
        tag: "ninja-welcome",
      });
      return true;
    } else {
      localStorage.setItem(STORAGE_KEY_NOTIF, "false");
      toast.info("Permissão de notificação negada no navegador.");
      return false;
    }
  } catch (err) {
    console.error("Erro ao pedir permissão de notificação:", err);
    return false;
  }
}

export function disableSalesNotification() {
  localStorage.setItem(STORAGE_KEY_NOTIF, "false");
  toast.info("Alertas sonoros de venda desativados.");
}

/**
 * Notifica uma nova venda com som Ka-Ching, voz do criativo e pop-up nativo do celular (estilo UTMify)
 */
export function notifyNewSale(sale: RecentSaleItem) {
  const prefs = getNotificationPreferences();

  // 1. Toca o som de dinheiro e vibra se habilitado
  if (prefs.sound_enabled && prefs.channels.new_sale.sound) {
    playSaleCashSound();
    vibrateSale();
  }

  const countryFlag =
    sale.country === "IT"
      ? "🇮🇹 Itália"
      : sale.country === "CH"
      ? "🇨🇭 Suíça"
      : sale.country === "MX"
      ? "🇲🇽 México"
      : sale.country === "ES"
      ? "🇪🇸 Espanha"
      : "🇧🇷 Brasil";

  const formattedVal = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(sale.amount);

  const creative = sale.ad_name || sale.utm_content || "Criativo Anúncio";

  // 2. Voz estilo UTMify falando o valor e o criativo
  if (prefs.voice_enabled && prefs.channels.new_sale.sound) {
    try {
      speakVoice(`Venda aprovada! ${formattedVal}! Criativo: ${creative}.`);
    } catch (err) {
      console.warn("Falha na fala:", err);
    }
  }

  // 3. Pop-up nativo no sistema operacional (Android, iOS PWA ou Windows/Mac)
  if (prefs.channels.new_sale.push) {
    showNativeNotification(`💰 Nova Venda: ${formattedVal}!`, {
      body: `🎨 Criativo: ${creative}\n📦 ${sale.product_name || "Produto"}\n🌍 ${countryFlag} • Venda Aprovada`,
      tag: `sale-${sale.id}`,
      vibrate: [200, 100, 200, 100, 300],
      data: { url: "/dashboard" },
    } as unknown as NotificationOptions);
  }

  // 4. Pop-up animado na tela do app
  toast.success(`🎉 VENDA APROVADA: ${formattedVal}!`, {
    description: `🎨 Criativo: ${creative} • 🌍 ${countryFlag}`,
    duration: 8000,
  });
}

/**
 * Notifica o balanço diário de lucro / status (estilo UTMify)
 */
export function notifyProfitStatus(profit: number, roas: number, salesCount: number) {
  const formattedProfit = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(profit);

  // 1. Voz estilo UTMify falando o lucro
  try {
    if (profit >= 0) {
      speakVoice(`Parabéns! Você está no lucro de ${formattedProfit} hoje!`);
    } else {
      speakVoice(`Atenção: Você está na perda de ${formattedProfit} hoje.`);
    }
  } catch (err) {
    console.warn("Falha na fala:", err);
  }

  // 2. Notificação nativa no celular
  if (profit >= 0) {
    showNativeNotification(`📈 Ninja Tracker: Lucro de ${formattedProfit}!`, {
      body: `Você está no LUCRO hoje com ${salesCount} vendas (ROAS ${roas.toFixed(2)}x). Bora escalar! 🚀`,
      tag: "ninja-daily-profit",
      vibrate: [150, 100, 250],
      data: { url: "/dashboard" },
    } as unknown as NotificationOptions);
  } else {
    showNativeNotification(`⚠️ Ninja Tracker: Atenção às Métricas`, {
      body: `Balanço atual: ${formattedProfit} (${salesCount} vendas). Fique atento aos custos de tráfego.`,
      tag: "ninja-daily-profit",
      vibrate: [250, 100, 250],
      data: { url: "/dashboard" },
    } as unknown as NotificationOptions);
  }
}

/**
 * Busca vendas mais recentes da API
 */
export async function fetchLatestSales(sinceId?: number): Promise<RecentSaleItem[]> {
  const query = sinceId ? `?since_id=${sinceId}` : "";
  return apiRequest<RecentSaleItem[]>(`/sales/latest${query}`);
}

export function getLastSeenSaleId(): number {
  const val = localStorage.getItem(STORAGE_KEY_LAST_ID);
  return val ? parseInt(val, 10) : 0;
}

export function setLastSeenSaleId(id: number) {
  localStorage.setItem(STORAGE_KEY_LAST_ID, id.toString());
}
