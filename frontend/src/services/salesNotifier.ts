import { playSaleCashSound, vibrateSale } from "@/utils/salesSound";
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
}

const STORAGE_KEY_NOTIF = "ninja_sales_notif_enabled";
const STORAGE_KEY_LAST_ID = "ninja_last_seen_sale_id";

export function isSalesNotificationEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(STORAGE_KEY_NOTIF) === "true";
}

export async function requestSalesNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    toast.error("Notificações não são suportadas neste navegador.");
    return false;
  }

  // Toca som de teste imediatamente após interação do usuário para desbloquear AudioContext no celular
  playSaleCashSound();
  vibrateSale();

  if (Notification.permission === "granted") {
    localStorage.setItem(STORAGE_KEY_NOTIF, "true");
    toast.success("Alertas de Vendas ativados com sucesso!", {
      description: "Você ouvirá o plin-plin 🪙 e receberá alertas a cada nova venda!",
    });
    return true;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      localStorage.setItem(STORAGE_KEY_NOTIF, "true");
      toast.success("🔔 Notificações e Som ativados!", {
        description: "Você será avisado em tempo real com o barulhinho de dinheiro!",
      });

      // Notificação de boas-vindas
      new Notification("🎉 NINJA TRACKER Alertas Ativos!", {
        body: "Pronto! Toda venda que você fizer vai tocar aqui com o valor em Reais!",
        icon: "/icons/pwa-192.png",
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
 * Notifica uma nova venda com som, vibração e pop-up nativo do celular
 */
export function notifyNewSale(sale: RecentSaleItem) {
  // 1. Toca o som de dinheiro e vibra
  playSaleCashSound();
  vibrateSale();

  const countryFlag = sale.country === "IT" ? "🇮🇹 Itália" : sale.country === "CH" ? "🇨🇭 Suíça" : "🇧🇷 Brasil";
  const formattedVal = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(sale.amount);

  // 2. Pop-up no sistema operacional (Android, iOS PWA ou Windows/Mac)
  if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
    try {
      new Notification(`🎉 Venda Aprovada: ${formattedVal}!`, {
        body: `📦 ${sale.product_name || "Produto"}\n🌍 ${countryFlag}`,
        icon: "/icons/pwa-192.png",
        badge: "/icons/pwa-192.png",
        tag: `sale-${sale.id}`,
      });
    } catch {
      // Ignora erro de notificação em background
    }
  }

  // 3. Pop-up animado na tela do app
  toast.success(`🎉 VENDA APROVADA: ${formattedVal}!`, {
    description: `${countryFlag} • ${sale.product_name || "Oferta Internacional"}`,
    duration: 8000,
  });
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
