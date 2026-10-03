import { useState, useEffect } from "react";
import { Bell, Sparkles, Smartphone, Volume2, CheckCircle2, X } from "lucide-react";
import {
  isSalesNotificationEnabled,
  requestSalesNotificationPermission,
  subscribeToPushNotifications,
  sendTestPushNotification,
} from "@/services/salesNotifier";
import { playSaleCashSound, vibrateSale } from "@/utils/salesSound";
import { toast } from "sonner";

export function MobilePushBanner() {
  const [permission, setPermission] = useState<string>("default");
  const [dismissed, setDismissed] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [tested, setTested] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return;
    }

    const currentPerm = Notification.permission;
    setPermission(currentPerm);

    // Se já estiver permitido, garante a inscrição silenciosa no backend
    if (currentPerm === "granted") {
      subscribeToPushNotifications().catch(() => {});
    }

    const isDismissed = sessionStorage.getItem("ninja_push_banner_dismissed");
    if (isDismissed === "true") {
      setDismissed(true);
    }
  }, []);

  const handleEnable = async () => {
    setLoading(true);
    try {
      playSaleCashSound();
      vibrateSale();

      const ok = await requestSalesNotificationPermission();
      if (ok) {
        setPermission("granted");
        await subscribeToPushNotifications();
        
        // Envia o teste nativo imediato do servidor
        await sendTestPushNotification();
        setTested(true);
        toast.success("🎉 Celular conectado ao Ninja Tracker!", {
          description: "O pop-up de teste foi enviado para o seu aparelho!",
        });
      } else {
        toast.info("Para receber pop-ups, permita as notificações nas configurações do navegador.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao ativar notificações.");
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    setLoading(true);
    try {
      playSaleCashSound();
      vibrateSale();
      await subscribeToPushNotifications();
      const ok = await sendTestPushNotification();
      if (ok) {
        setTested(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("ninja_push_banner_dismissed", "true");
  };

  if (dismissed) return null;

  // Se já está ativo, mostra um botão sutil de teste
  if (permission === "granted") {
    return (
      <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-3 py-1.5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
          <CheckCircle2 className="size-3.5 shrink-0" />
          <span>Pop-ups e som de vendas ativos no aparelho</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleTest}
            disabled={loading}
            className="text-[11px] bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30 transition-colors cursor-pointer"
          >
            {loading ? "Testando..." : "Testar Pop-up 📱"}
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="text-zinc-500 hover:text-zinc-400 p-0.5"
            title="Fechar"
          >
            <X className="size-3" />
          </button>
        </div>
      </div>
    );
  }

  // Se ainda não permitiu, exibe o banner chamativo para ativar com 1 toque
  return (
    <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white p-3 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-2.5 z-40 relative">
      <div className="flex items-center gap-2.5 min-w-0 w-full sm:w-auto">
        <div className="size-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0 shadow-inner">
          <Bell className="size-5 animate-bounce" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs sm:text-sm font-bold flex items-center gap-1.5">
            <span>Ativar Pop-ups de Vendas no Celular</span>
            <span className="bg-amber-400 text-amber-950 font-black text-[9px] px-1.5 py-0.2 rounded-full uppercase tracking-wider">
              Estilo Nexofy
            </span>
          </p>
          <p className="text-[11px] text-blue-100/90 leading-tight">
            Receba avisos instantâneos com som de caixa registradora e voz a cada venda!
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
        <button
          type="button"
          onClick={handleEnable}
          disabled={loading}
          className="w-full sm:w-auto bg-white text-blue-700 hover:bg-blue-50 font-bold px-3.5 py-1.5 rounded-lg text-xs shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
        >
          <Smartphone className="size-3.5" />
          <span>{loading ? "Ativando..." : "Ativar Pop-ups Agora"}</span>
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          className="text-white/70 hover:text-white p-1 rounded-md"
          title="Fechar"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
