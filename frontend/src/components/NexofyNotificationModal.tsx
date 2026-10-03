import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Bell,
  AlertTriangle,
  Volume2,
  Smartphone,
  Clock,
  Sparkles,
  CheckCircle2,
  CreditCard,
  QrCode,
  DollarSign,
  ShieldAlert,
} from "lucide-react";
import {
  getNotificationPreferences,
  saveNotificationPreferences,
  DEFAULT_NOTIFICATION_PREFERENCES,
  type NotificationPreferences,
  isSalesNotificationEnabled,
  requestSalesNotificationPermission,
  subscribeToPushNotifications,
  sendTestPushNotification,
  showNativeNotification,
} from "@/services/salesNotifier";
import { playSaleCashSound, vibrateSale, speakVoice } from "@/utils/salesSound";
import { toast } from "sonner";

interface NexofyNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshDashboard?: () => void;
}

export function NexofyNotificationModal({
  isOpen,
  onClose,
  onRefreshDashboard,
}: NexofyNotificationModalProps) {
  const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES);
  const [pushGranted, setPushGranted] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setPrefs(getNotificationPreferences());
      const hasPerm = typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted";
      setPushGranted(isSalesNotificationEnabled() || hasPerm);
      if (hasPerm) {
        subscribeToPushNotifications().catch(() => {});
      }
    }
  }, [isOpen]);

  const handleToggle = (key: keyof NotificationPreferences) => {
    setPrefs((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      saveNotificationPreferences(updated);
      return updated;
    });
  };

  const handleToggleTime = (timeKey: keyof NotificationPreferences["summary_times"]) => {
    setPrefs((prev) => {
      const updated = {
        ...prev,
        summary_times: {
          ...prev.summary_times,
          [timeKey]: !prev.summary_times[timeKey],
        },
      };
      saveNotificationPreferences(updated);
      return updated;
    });
  };

  const handleToggleChannel = (
    category: keyof NotificationPreferences["channels"],
    channel: "email" | "push" | "sound"
  ) => {
    setPrefs((prev) => {
      const currentCat = prev.channels[category] as Record<string, boolean>;
      const updated = {
        ...prev,
        channels: {
          ...prev.channels,
          [category]: {
            ...currentCat,
            [channel]: !currentCat[channel],
          },
        },
      };
      saveNotificationPreferences(updated);
      return updated;
    });
  };

  const handleEnablePush = async () => {
    const ok = await requestSalesNotificationPermission();
    setPushGranted(ok);
    if (ok) {
      await subscribeToPushNotifications();
      await sendTestPushNotification();
      toast.success("🔔 Notificações e Pop-ups ativados com sucesso!");
    }
  };

  const handleTestNotification = async () => {
    setIsTesting(true);

    // 1. Toca o som de caixa registradora e vibra
    if (prefs.sound_enabled) {
      playSaleCashSound();
      vibrateSale();
    }

    // 2. Sintetiza a voz no estilo UTMify
    if (prefs.voice_enabled) {
      try {
        speakVoice("Venda aprovada! R$ 97,00! Criativo: CBO teste criativo. Parabéns, você está no lucro de R$ 111,00 hoje!");
      } catch {}
    }

    // 3. Garante que o aparelho esteja cadastrado no backend e envia push do servidor também!
    await subscribeToPushNotifications();
    await sendTestPushNotification();

    // 4. Dispara o pop-up nativo do sistema/celular
    showNativeNotification("💰 Nova Venda Aprovada: R$ 97,00!", {
      body: "🎨 Criativo: CBO teste criativo\n📦 Infoproduto Escala Máxima\n🇧🇷 Brasil • Pix Compensado",
      tag: "test-sale",
      vibrate: [200, 100, 200, 100, 300],
    } as unknown as NotificationOptions);

    // 5. Toast interativo na tela
    toast.success("🎉 VENDA APROVADA: R$ 97,00!", {
      description: "🎨 Criativo: CBO teste criativo • 🇧🇷 Brasil • Pop-up disparado com sucesso!",
      duration: 6000,
    });

    setTimeout(() => setIsTesting(false), 800);
  };

  const handleSaveAll = async () => {
    saveNotificationPreferences(prefs);
    await subscribeToPushNotifications();
    toast.success("✅ Configurações salvas!", {
      description: "Suas preferências foram salvas e o dispositivo conectado para receber pop-ups!",
    });
    onRefreshDashboard?.();
    onClose();
  };

  const handleResetDefaults = () => {
    setPrefs(DEFAULT_NOTIFICATION_PREFERENCES);
    saveNotificationPreferences(DEFAULT_NOTIFICATION_PREFERENCES);
    toast.info("Configurações restauradas para o padrão.");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[92vh] p-0 overflow-hidden flex flex-col bg-[#0B0F19] text-white border-zinc-800 shadow-2xl">
        {/* Banner Superior Vermelho (Idêntico ao da Nexofy) */}
        <div className="bg-red-600 text-white px-4 py-2.5 flex items-center justify-between text-xs sm:text-sm font-medium shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="size-4 shrink-0 text-white" />
            <span className="truncate">
              Você está no plano PRO. Todos os alertas de vendas e push estão disponíveis.
            </span>
          </div>
          <button
            type="button"
            onClick={() => toast.info("Sua conta já possui acesso ilimitado aos alertas do SFY / Ninja Tracker!")}
            className="bg-white text-red-600 font-bold px-3 py-1 rounded text-xs hover:bg-zinc-100 transition-colors shrink-0 shadow-sm cursor-pointer ml-2"
          >
            Fazer upgrade
          </button>
        </div>

        {/* Header do Pop-up */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-zinc-800/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0">
              <Bell className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Configurações de Pop-up & Notificações
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-400 mt-0.5">
                Escolha o que você deseja receber na tela, no celular, sons e horários de resumo.
              </DialogDescription>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-medium shrink-0">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="hidden sm:inline">Notificações ativas · usado hoje</span>
            <span className="sm:hidden">Ativas</span>
          </div>
        </div>

        {/* Conteúdo com Scroll */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 text-sm">
          {/* Status do Navegador / Web Push */}
          {!pushGranted && (
            <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-xs">
                <Smartphone className="size-4 shrink-0 text-amber-400" />
                <span>
                  O navegador ainda não concedeu permissão para notificações na tela de bloqueio e celular.
                </span>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={handleEnablePush}
                className="bg-amber-500 hover:bg-amber-600 text-black font-semibold text-xs shrink-0"
              >
                Permitir no Celular
              </Button>
            </div>
          )}

          {/* CARD 1: VENDAS */}
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold tracking-wider text-zinc-400 uppercase flex items-center gap-1.5">
                <DollarSign className="size-3.5 text-blue-400" />
                VENDAS
              </span>
              <span className="text-[11px] text-zinc-500">Alertas instantâneos</span>
            </div>

            <div className="space-y-2.5 pt-1">
              {/* PIX gerado */}
              <label className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-800/40 cursor-pointer transition-colors">
                <div className="flex items-center gap-2.5">
                  <QrCode className="size-4 text-emerald-400" />
                  <span className="text-xs sm:text-sm font-medium text-zinc-200">PIX gerado</span>
                </div>
                <Checkbox
                  checked={prefs.sales_pix_created}
                  onCheckedChange={() => handleToggle("sales_pix_created")}
                  className="data-checked:bg-blue-600 data-checked:border-blue-600 border-zinc-700"
                />
              </label>

              {/* Nova venda aprovada */}
              <label className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-800/40 cursor-pointer transition-colors">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="size-4 text-emerald-400" />
                  <span className="text-xs sm:text-sm font-medium text-zinc-200">Nova venda aprovada</span>
                </div>
                <Checkbox
                  checked={prefs.sales_approved}
                  onCheckedChange={() => handleToggle("sales_approved")}
                  className="data-checked:bg-blue-600 data-checked:border-blue-600 border-zinc-700"
                />
              </label>

              {/* Venda aprovada no PIX */}
              <label className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-800/40 cursor-pointer transition-colors">
                <div className="flex items-center gap-2.5">
                  <QrCode className="size-4 text-teal-400" />
                  <span className="text-xs sm:text-sm font-medium text-zinc-200">Venda aprovada no PIX</span>
                </div>
                <Checkbox
                  checked={prefs.sales_pix_approved}
                  onCheckedChange={() => handleToggle("sales_pix_approved")}
                  className="data-checked:bg-blue-600 data-checked:border-blue-600 border-zinc-700"
                />
              </label>

              {/* Venda aprovada no cartão */}
              <label className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-800/40 cursor-pointer transition-colors">
                <div className="flex items-center gap-2.5">
                  <CreditCard className="size-4 text-blue-400" />
                  <span className="text-xs sm:text-sm font-medium text-zinc-200">Venda aprovada no cartão</span>
                </div>
                <Checkbox
                  checked={prefs.sales_card_approved}
                  onCheckedChange={() => handleToggle("sales_card_approved")}
                  className="data-checked:bg-blue-600 data-checked:border-blue-600 border-zinc-700"
                />
              </label>
            </div>
          </div>

          {/* CARD 2: RECUPERAÇÃO */}
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-4 space-y-2">
            <span className="text-xs font-bold tracking-wider text-zinc-400 uppercase flex items-center gap-1.5">
              <ShieldAlert className="size-3.5 text-amber-400" />
              RECUPERAÇÃO
            </span>

            <label className="flex items-start justify-between p-2 rounded-lg hover:bg-zinc-800/40 cursor-pointer transition-colors">
              <div className="space-y-1 pr-4">
                <div className="text-xs sm:text-sm font-medium text-zinc-200">Venda recusada</div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Receba um alerta quando uma tentativa de pagamento for recusada e acesse rapidamente a Recuperação de Vendas.
                </p>
              </div>
              <Checkbox
                checked={prefs.recovery_rejected}
                onCheckedChange={() => handleToggle("recovery_rejected")}
                className="data-checked:bg-blue-600 data-checked:border-blue-600 border-zinc-700 mt-1"
              />
            </label>
          </div>

          {/* CARD 3: CONTA E ASSINATURA */}
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-4 space-y-2">
            <span className="text-xs font-bold tracking-wider text-zinc-400 uppercase flex items-center gap-1.5">
              CONTA E ASSINATURA
            </span>

            <label className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-800/40 cursor-pointer transition-colors">
              <span className="text-xs sm:text-sm font-medium text-zinc-200">
                Limite do plano, renovação e pagamento
              </span>
              <Checkbox
                checked={prefs.account_limits}
                onCheckedChange={() => handleToggle("account_limits")}
                className="data-checked:bg-blue-600 data-checked:border-blue-600 border-zinc-700"
              />
            </label>
          </div>

          {/* CARD 4: NOVIDADES E RECURSOS */}
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-4 space-y-2">
            <span className="text-xs font-bold tracking-wider text-zinc-400 uppercase flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-indigo-400" />
              NOVIDADES E RECURSOS
            </span>

            <label className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-800/40 cursor-pointer transition-colors">
              <span className="text-xs sm:text-sm font-medium text-zinc-200">
                Novidades e atualizações da plataforma
              </span>
              <Checkbox
                checked={prefs.news_features}
                onCheckedChange={() => handleToggle("news_features")}
                className="data-checked:bg-blue-600 data-checked:border-blue-600 border-zinc-700"
              />
            </label>
          </div>

          {/* CARD 5: RESUMO DA OPERAÇÃO (Horários da Nexofy) */}
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold tracking-wider text-zinc-400 uppercase flex items-center gap-1.5">
                <Clock className="size-3.5 text-blue-400" />
                RESUMO DA OPERAÇÃO
              </span>
              <span className="text-[11px] text-zinc-500">Relatórios Automáticos</span>
            </div>

            <label className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-800/40 cursor-pointer transition-colors">
              <span className="text-xs sm:text-sm font-medium text-zinc-200">
                Receber meu resumo diário
              </span>
              <Checkbox
                checked={prefs.daily_summary_enabled}
                onCheckedChange={() => handleToggle("daily_summary_enabled")}
                className="data-checked:bg-blue-600 data-checked:border-blue-600 border-zinc-700"
              />
            </label>

            {/* Sub-horários */}
            {prefs.daily_summary_enabled && (
              <div className="pl-4 pr-1 space-y-2 border-l-2 border-blue-500/30 ml-2">
                <label className="flex items-center justify-between py-1 px-2 rounded hover:bg-zinc-800/40 cursor-pointer">
                  <span className="text-xs text-zinc-300">09:00 — Como o dia começou</span>
                  <Checkbox
                    checked={prefs.summary_times.morning}
                    onCheckedChange={() => handleToggleTime("morning")}
                    className="data-checked:bg-blue-600 data-checked:border-blue-600 border-zinc-700"
                  />
                </label>

                <label className="flex items-center justify-between py-1 px-2 rounded hover:bg-zinc-800/40 cursor-pointer">
                  <span className="text-xs text-zinc-300">12:00 — Resumo do meio-dia</span>
                  <Checkbox
                    checked={prefs.summary_times.midday}
                    onCheckedChange={() => handleToggleTime("midday")}
                    className="data-checked:bg-blue-600 data-checked:border-blue-600 border-zinc-700"
                  />
                </label>

                <label className="flex items-center justify-between py-1 px-2 rounded hover:bg-zinc-800/40 cursor-pointer">
                  <span className="text-xs text-zinc-300">18:00 — Fechamento da tarde</span>
                  <Checkbox
                    checked={prefs.summary_times.afternoon}
                    onCheckedChange={() => handleToggleTime("afternoon")}
                    className="data-checked:bg-blue-600 data-checked:border-blue-600 border-zinc-700"
                  />
                </label>

                <label className="flex items-center justify-between py-1 px-2 rounded hover:bg-zinc-800/40 cursor-pointer">
                  <span className="text-xs text-zinc-300">23:00 — Resumo do dia</span>
                  <Checkbox
                    checked={prefs.summary_times.night}
                    onCheckedChange={() => handleToggleTime("night")}
                    className="data-checked:bg-blue-600 data-checked:border-blue-600 border-zinc-700"
                  />
                </label>
              </div>
            )}

            <p className="text-[11px] text-zinc-400 pl-2">
              Cada horário mostra o acumulado do dia até aquele momento — marque um ou vários.
            </p>
          </div>

          {/* BOTÃO INTERATIVO: Enviar notificação de teste (Exato da screenshot) */}
          <div className="pt-1">
            <button
              type="button"
              onClick={handleTestNotification}
              disabled={isTesting}
              className="w-full py-3 px-4 rounded-xl border border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-blue-500/10 cursor-pointer active:scale-[0.99]"
            >
              <span>🪙</span>
              <span>{isTesting ? "Disparando som e pop-up..." : "Enviar notificação de teste"}</span>
            </button>
          </div>

          {/* CARD 6: MATRIZ DE CANAIS (E-MAIL vs PUSH vs SOM/VOZ) */}
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-4 space-y-3">
            <div>
              <p className="text-xs text-zinc-300/90 leading-relaxed">
                Escolha por onde receber cada tipo de aviso. O canal <b>"Push"</b> envia alertas instantâneos com som e vibração no celular ou computador.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400 font-semibold">
                    <th className="text-left py-2 px-2">Tipo de Aviso</th>
                    <th className="text-center py-2 px-3">E-MAIL</th>
                    <th className="text-center py-2 px-3">PUSH</th>
                    <th className="text-center py-2 px-3">SOM & VOZ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {/* Nova Venda */}
                  <tr>
                    <td className="py-2.5 px-2 font-medium text-zinc-200">Nova venda</td>
                    <td className="text-center py-2.5 px-3">
                      <Checkbox
                        checked={prefs.channels.new_sale.email}
                        onCheckedChange={() => handleToggleChannel("new_sale", "email")}
                        className="border-zinc-700"
                      />
                    </td>
                    <td className="text-center py-2.5 px-3">
                      <Checkbox
                        checked={prefs.channels.new_sale.push}
                        onCheckedChange={() => handleToggleChannel("new_sale", "push")}
                        className="data-checked:bg-blue-600 data-checked:border-blue-600 border-zinc-700"
                      />
                    </td>
                    <td className="text-center py-2.5 px-3">
                      <Checkbox
                        checked={prefs.channels.new_sale.sound}
                        onCheckedChange={() => handleToggleChannel("new_sale", "sound")}
                        className="data-checked:bg-emerald-600 data-checked:border-emerald-600 border-zinc-700"
                      />
                    </td>
                  </tr>

                  {/* Resumo Diário */}
                  <tr>
                    <td className="py-2.5 px-2 font-medium text-zinc-200">Resumo diário</td>
                    <td className="text-center py-2.5 px-3">
                      <Checkbox
                        checked={prefs.channels.daily_summary.email}
                        onCheckedChange={() => handleToggleChannel("daily_summary", "email")}
                        className="border-zinc-700"
                      />
                    </td>
                    <td className="text-center py-2.5 px-3">
                      <Checkbox
                        checked={prefs.channels.daily_summary.push}
                        onCheckedChange={() => handleToggleChannel("daily_summary", "push")}
                        className="data-checked:bg-blue-600 data-checked:border-blue-600 border-zinc-700"
                      />
                    </td>
                    <td className="text-center py-2.5 px-3 text-zinc-600">-</td>
                  </tr>

                  {/* Relatório Agendado */}
                  <tr>
                    <td className="py-2.5 px-2 font-medium text-zinc-200">Relatório agendado</td>
                    <td className="text-center py-2.5 px-3">
                      <Checkbox
                        checked={prefs.channels.scheduled_report.email}
                        onCheckedChange={() => handleToggleChannel("scheduled_report", "email")}
                        className="border-zinc-700"
                      />
                    </td>
                    <td className="text-center py-2.5 px-3">
                      <Checkbox
                        checked={prefs.channels.scheduled_report.push}
                        onCheckedChange={() => handleToggleChannel("scheduled_report", "push")}
                        className="data-checked:bg-blue-600 data-checked:border-blue-600 border-zinc-700"
                      />
                    </td>
                    <td className="text-center py-2.5 px-3 text-zinc-600">-</td>
                  </tr>

                  {/* Ação de Automação / Recuperação */}
                  <tr>
                    <td className="py-2.5 px-2 font-medium text-zinc-200">Ação de automação</td>
                    <td className="text-center py-2.5 px-3">
                      <Checkbox
                        checked={prefs.channels.recovery_alert.email}
                        onCheckedChange={() => handleToggleChannel("recovery_alert", "email")}
                        className="border-zinc-700"
                      />
                    </td>
                    <td className="text-center py-2.5 px-3">
                      <Checkbox
                        checked={prefs.channels.recovery_alert.push}
                        onCheckedChange={() => handleToggleChannel("recovery_alert", "push")}
                        className="data-checked:bg-blue-600 data-checked:border-blue-600 border-zinc-700"
                      />
                    </td>
                    <td className="text-center py-2.5 px-3 text-zinc-600">-</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* AJUSTES ADICIONAIS: Som e Voz */}
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-4 space-y-3">
            <span className="text-xs font-bold tracking-wider text-zinc-400 uppercase flex items-center gap-1.5">
              <Volume2 className="size-3.5 text-emerald-400" />
              EFEITOS SONOROS & VOZ INTELIGENTE
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <label className="flex items-center justify-between p-2.5 rounded-lg border border-zinc-800 bg-zinc-950/40 hover:bg-zinc-800/40 cursor-pointer transition-colors">
                <div className="flex items-center gap-2">
                  <span>🪙</span>
                  <span className="text-xs font-medium text-zinc-200">Som de Moedas</span>
                </div>
                <Checkbox
                  checked={prefs.sound_enabled}
                  onCheckedChange={() => handleToggle("sound_enabled")}
                  className="data-checked:bg-emerald-600 data-checked:border-emerald-600 border-zinc-700"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-lg border border-zinc-800 bg-zinc-950/40 hover:bg-zinc-800/40 cursor-pointer transition-colors">
                <div className="flex items-center gap-2">
                  <span>🗣️</span>
                  <span className="text-xs font-medium text-zinc-200">Voz com Criativo</span>
                </div>
                <Checkbox
                  checked={prefs.voice_enabled}
                  onCheckedChange={() => handleToggle("voice_enabled")}
                  className="data-checked:bg-emerald-600 data-checked:border-emerald-600 border-zinc-700"
                />
              </label>
            </div>
          </div>

          {/* Suporte Rápido WhatsApp (Igual ao botão verde da screenshot) */}
          <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
                <svg className="size-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.698c.99.54 1.787.87 2.8.87 3.18 0 5.766-2.587 5.767-5.767.001-3.182-2.585-5.768-5.771-5.768zm7.39 5.765c0 4.077-3.313 7.39-7.39 7.39-1.22 0-2.38-.3-3.41-.85l-4.73 1.24 1.26-4.61c-.65-1.1-1.02-2.37-1.02-3.73 0-4.077 3.313-7.39 7.39-7.39s7.5 3.313 7.5 7.39z"/>
                </svg>
              </div>
              <div>
                <h5 className="text-xs font-semibold text-white">Canal de Notificações no WhatsApp</h5>
                <p className="text-[11px] text-zinc-400">Receba suas vendas diretamente no seu grupo ou conversa privada.</p>
              </div>
            </div>
            <a
              href="https://wa.me/?text=Ol%C3%A1%2C%20gostaria%20de%20ativar%20alertas%20de%20venda%20no%20meu%20WhatsApp"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs px-3 py-1.5 rounded-lg transition-colors shrink-0 shadow-sm"
            >
              Conectar
            </a>
          </div>
        </div>

        {/* Rodapé Fixo */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-800 bg-zinc-950/80 shrink-0">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
          >
            Restaurar Padrão
          </button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="border-zinc-800 text-zinc-300 hover:bg-zinc-800"
            >
              Fechar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveAll}
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold"
            >
              Salvar Preferências
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
