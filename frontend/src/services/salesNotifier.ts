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
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();

    if (!sub) {
      // 1. Busca a chave pública VAPID do servidor
      const keyData = await apiRequest<{ public_key: string }>("/notifications/vapid-key");
      if (!keyData?.public_key) {
        throw new Error("Chave VAPID não retornada pelo servidor");
      }

      // 2. Inscreve o Service Worker
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyData.public_key),
      });
    }

    // 3. Envia os dados da inscrição para o backend salvar no banco
    if (sub) {
      const subJson = sub.toJSON();
      await apiRequest("/notifications/subscribe", {
        method: "POST",
        body: JSON.stringify({
          endpoint: sub.endpoint,
          keys: subJson.keys,
          user_agent: navigator.userAgent,
        }),
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
 * Envia um push de teste imediato do servidor para o celular
 */
export async function sendTestPushNotification(): Promise<boolean> {
  try {
    const res = await apiRequest<{ status: string; message: string; sent_count: number }>(
      "/notifications/test",
      { method: "POST" }
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
  // 1. Toca o som de dinheiro e vibra
  playSaleCashSound();
  vibrateSale();

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
  try {
    speakVoice(`Venda aprovada! ${formattedVal}! Criativo: ${creative}.`);
  } catch (err) {
    console.warn("Falha na fala:", err);
  }

  // 3. Pop-up nativo no sistema operacional (Android, iOS PWA ou Windows/Mac)
  showNativeNotification(`💰 Nova Venda: ${formattedVal}!`, {
    body: `🎨 Criativo: ${creative}\n📦 ${sale.product_name || "Produto"}\n🌍 ${countryFlag} • Venda Aprovada`,
    tag: `sale-${sale.id}`,
    vibrate: [200, 100, 200, 100, 300],
    data: { url: "/dashboard" },
  });

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
    });
  } else {
    showNativeNotification(`⚠️ Ninja Tracker: Atenção às Métricas`, {
      body: `Balanço atual: ${formattedProfit} (${salesCount} vendas). Fique atento aos custos de tráfego.`,
      tag: "ninja-daily-profit",
      vibrate: [250, 100, 250],
      data: { url: "/dashboard" },
    });
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
