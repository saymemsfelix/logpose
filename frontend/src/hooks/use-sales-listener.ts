import { useEffect, useState, useRef, useCallback } from "react";
import {
  isSalesNotificationEnabled,
  requestSalesNotificationPermission,
  disableSalesNotification,
  subscribeToPushNotifications,
  sendTestPushNotification,
  notifyNewSale,
  fetchLatestSales,
  getLastSeenSaleId,
  setLastSeenSaleId,
  RecentSaleItem,
} from "@/services/salesNotifier";
import { playSaleCashSound, vibrateSale, speakVoice } from "@/utils/salesSound";
import { API_BASE_URL } from "@/services/api";
import { toast } from "sonner";

export function useSalesListener(onNewSale?: () => void) {
  const [isEnabled, setIsEnabled] = useState<boolean>(false);
  const initializedRef = useRef(false);
  const seenIdsRef = useRef<Set<number>>(new Set());
  const sseRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const enabled = isSalesNotificationEnabled();
    setIsEnabled(enabled);

    // Se as notificações já estiverem permitidas no navegador, garante a inscrição Push no backend
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      subscribeToPushNotifications().catch(() => {});
    }
  }, []);

  const toggleNotifications = async () => {
    if (isEnabled) {
      disableSalesNotification();
      setIsEnabled(false);
    } else {
      const ok = await requestSalesNotificationPermission();
      setIsEnabled(ok);
    }
  };

  const testAlertSound = () => {
    playSaleCashSound();
    vibrateSale();
    try {
      speakVoice("Teste Ninja Tracker. Alertas instantâneos com inteligência operacional ativados.");
    } catch {}
    toast.success("🪙 Alerta de Som e Voz Testados!", {
      description: "Notificações inteligentes em tempo real (< 300ms) prontas para suas vendas!",
    });
  };

  const testPushNotification = async () => {
    await sendTestPushNotification();
  };

  // Processa uma venda garantindo que nunca notifique duplicado
  const handleIncomingSale = useCallback((sale: RecentSaleItem) => {
    if (!sale || !sale.id) return;
    if (seenIdsRef.current.has(sale.id)) return;

    const lastId = getLastSeenSaleId();

    if (!initializedRef.current) {
      seenIdsRef.current.add(sale.id);
      if (sale.id > lastId) {
        setLastSeenSaleId(sale.id);
      }
      initializedRef.current = true;
      return;
    }

    if (sale.id > lastId) {
      seenIdsRef.current.add(sale.id);
      setLastSeenSaleId(sale.id);
      notifyNewSale(sale);
      onNewSale?.();
    }
  }, [onNewSale]);

  // Checagem ativa (fallback resiliente e sincronização inicial)
  const checkNewSales = useCallback(async () => {
    try {
      const lastId = getLastSeenSaleId();
      const latest = await fetchLatestSales();

      if (!latest || latest.length === 0) return;

      const highestCurrentId = Math.max(...latest.map((s) => s.id));

      // Na primeira execução após carregar o app, sincroniza o estado base
      if (!initializedRef.current || lastId === 0) {
        latest.forEach((s) => seenIdsRef.current.add(s.id));
        setLastSeenSaleId(highestCurrentId);
        initializedRef.current = true;
        return;
      }

      // Vendas novas que entraram depois do último ID registrado
      const newSales = latest.filter((s) => s.id > lastId && !seenIdsRef.current.has(s.id));

      if (newSales.length > 0) {
        // Notifica as vendas novas (da mais antiga para a mais recente)
        newSales.reverse().forEach((sale) => {
          seenIdsRef.current.add(sale.id);
          notifyNewSale(sale);
        });

        setLastSeenSaleId(highestCurrentId);
        onNewSale?.();
      }
    } catch {
      // Falha temporária de rede tratada silenciosamente
    }
  }, [onNewSale]);

  // Conexão Server-Sent Events (SSE) para entrega instantânea (< 300ms)
  useEffect(() => {
    // 1. Sincroniza dados iniciais
    checkNewSales();

    // 2. Conecta canal SSE em tempo real
    let eventSource: EventSource | null = null;
    try {
      const streamUrl = `${API_BASE_URL}/sales/stream`;
      eventSource = new EventSource(streamUrl);
      sseRef.current = eventSource;

      eventSource.onmessage = (event) => {
        try {
          if (!event.data || event.data.trim() === "" || event.data.startsWith(":")) return;
          const sale: RecentSaleItem = JSON.parse(event.data);
          handleIncomingSale(sale);
        } catch (parseErr) {
          console.warn("Erro ao ler evento SSE de venda:", parseErr);
        }
      };

      eventSource.onerror = () => {
        // EventSource nativo reconecta automaticamente
      };
    } catch (e) {
      console.warn("Falha ao inicializar SSE, utilizando polling fallback:", e);
    }

    // 3. Fallback polling ágil (a cada 4 segundos) para cobrir eventuais falhas de SSE/proxy
    const interval = setInterval(checkNewSales, 4000);

    // 4. Gatilhos instantâneos quando o usuário volta para a aba ou foca a janela
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkNewSales();
      }
    };
    const handleFocus = () => {
      checkNewSales();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      sseRef.current = null;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [checkNewSales, handleIncomingSale]);

  return {
    isEnabled,
    toggleNotifications,
    testAlertSound,
    testPushNotification,
  };
}
