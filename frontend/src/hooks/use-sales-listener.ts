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
} from "@/services/salesNotifier";
import { playSaleCashSound, vibrateSale, speakVoice } from "@/utils/salesSound";
import { toast } from "sonner";

export function useSalesListener(onNewSale?: () => void) {
  const [isEnabled, setIsEnabled] = useState<boolean>(false);
  const initializedRef = useRef(false);

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
      speakVoice("Teste de áudio Ninja Tracker. Alertas sonoros, de voz e notificações ativados com sucesso.");
    } catch {}
    toast.success("🪙 Alerta de Som e Voz Testados!", {
      description: "É assim que vai apitar e falar no seu dispositivo a cada venda e status real do dashboard!",
    });
  };

  const testPushNotification = async () => {
    await sendTestPushNotification();
  };

  // Polling em background a cada 15 segundos para novas vendas
  const checkNewSales = useCallback(async () => {
    try {
      const lastId = getLastSeenSaleId();
      const latest = await fetchLatestSales();

      if (!latest || latest.length === 0) return;

      const highestCurrentId = Math.max(...latest.map((s) => s.id));

      // Na primeira execução após carregar o app, só guarda o ID mais alto
      if (!initializedRef.current || lastId === 0) {
        setLastSeenSaleId(highestCurrentId);
        initializedRef.current = true;
        return;
      }

      // Vendas novas que entraram depois do último ID registrado
      const newSales = latest.filter((s) => s.id > lastId);

      if (newSales.length > 0) {
        // Notifica as vendas novas (da mais antiga para a mais recente)
        newSales.reverse().forEach((sale) => {
          notifyNewSale(sale);
        });

        setLastSeenSaleId(highestCurrentId);
        onNewSale?.();
      }
    } catch {
      // Ignora falhas temporárias de rede
    }
  }, [onNewSale]);

  useEffect(() => {
    // Executa a primeira checagem para inicializar o ID
    checkNewSales();

    const interval = setInterval(checkNewSales, 15000);
    return () => clearInterval(interval);
  }, [checkNewSales]);

  return {
    isEnabled,
    toggleNotifications,
    testAlertSound,
    testPushNotification,
  };
}
