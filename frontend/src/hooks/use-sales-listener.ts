import { useEffect, useState, useRef, useCallback } from "react";
import {
  isSalesNotificationEnabled,
  requestSalesNotificationPermission,
  disableSalesNotification,
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
    setIsEnabled(isSalesNotificationEnabled());
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
      speakVoice("Venda aprovada! R$ 97,00! Criativo: CBO teste criativo. Parabéns, você está no lucro de R$ 111,00 hoje!");
    } catch {}
    toast.success("🪙 Ka-ching + Voz testados!", {
      description: "É assim que vai apitar e falar no seu celular a cada venda e status de lucro!",
    });
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
  };
}
