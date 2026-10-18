import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  RiWhatsappFill,
  RiWifiLine,
  RiWifiOffLine,
  RiSparklingLine,
  RiTimeLine,
  RiQuestionLine,
  RiQrCodeLine,
  RiRefreshLine,
} from "@remixicon/react";
import {
  fetchWhatsAppConfig,
  saveWhatsAppConfig,
  testWhatsAppConnection,
  fetchWhatsAppInstances,
  fetchWhatsAppQrCode,
  type WhatsAppConfig,
  type WhatsAppConnectionTestResult,
} from "@/services/recovery";

export function EvolutionConfigSection() {
  const [config, setConfig] = useState<WhatsAppConfig>({
    base_url: "https://evolution-api-production-87f6.up.railway.app",
    api_key: "1f815cfe8072172908de28aaa6d15cf66829808e4d36181472c6db8d94a240a4",
    instance_name: "ninja_recuperador",
    is_active: true,
    auto_dispatch_enabled: false,
    cadence_delays_minutes: "5,120,1440",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<WhatsAppConnectionTestResult | null>(null);
  const [availableInstances, setAvailableInstances] = useState<string[]>([]);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [isLoadingQr, setIsLoadingQr] = useState(false);
  const [showQrBox, setShowQrBox] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setIsLoading(true);
      const data = await fetchWhatsAppConfig();
      const merged: WhatsAppConfig = {
        base_url: data.base_url || "https://evolution-api-production-87f6.up.railway.app",
        api_key: data.api_key || "1f815cfe8072172908de28aaa6d15cf66829808e4d36181472c6db8d94a240a4",
        instance_name: data.instance_name || "ninja_recuperador",
        is_active: data.is_active ?? true,
        auto_dispatch_enabled: data.auto_dispatch_enabled ?? false,
        cadence_delays_minutes: data.cadence_delays_minutes || "5,120,1440",
      };
      setConfig(merged);
      if (merged.base_url && merged.api_key) {
        testCurrent(merged);
      }
    } catch {
      // Ignora erro inicial
    } finally {
      setIsLoading(false);
    }
  };

  const testCurrent = async (cfgToTest?: WhatsAppConfig) => {
    try {
      setIsTesting(true);
      const target = cfgToTest || config;
      const res = await testWhatsAppConnection(target);
      setTestResult(res);
    } catch (e: any) {
      setTestResult({
        success: false,
        connected: false,
        error: e.message || "Falha na conexão",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleFetchInstances = async () => {
    try {
      setIsTesting(true);
      const res = await fetchWhatsAppInstances();
      if (res.success && res.instances) {
        const names = res.instances.map((i) => i.instanceName).filter(Boolean);
        setAvailableInstances(names);
        if (names.length > 0 && !config.instance_name) {
          setConfig((prev) => ({ ...prev, instance_name: names[0] }));
        }
      }
    } catch {
      // Fallback
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setSaveSuccess(false);
      const saved = await saveWhatsAppConfig(config);
      setConfig(saved);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      testCurrent(saved);
    } catch (e: any) {
      alert("Erro ao salvar configuração: " + (e.message || "Erro desconhecido"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadQrCode = async () => {
    try {
      setIsLoadingQr(true);
      setShowQrBox(true);
      const res = await fetchWhatsAppQrCode();
      if (res.success && res.base64) {
        setQrCodeData(res.base64);
      } else {
        alert("Não foi possível gerar o QR Code: " + (res.error || "A instância já pode estar conectada ou verifique as credenciais."));
      }
    } catch (e: any) {
      alert("Erro ao carregar QR Code: " + (e.message || "Erro desconhecido"));
    } finally {
      setIsLoadingQr(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-border/40">
        <div className="flex items-center gap-2">
          <div className="size-7 rounded-lg bg-[#25D366]/15 border border-[#25D366]/30 flex items-center justify-center text-[#25D366]">
            <RiWhatsappFill className="size-4" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-white">Robô WhatsApp (Evolution API)</h3>
            <p className="text-[10px] text-muted-foreground">Disparo automático e cadência em 1-clique</p>
          </div>
        </div>

        {testResult && (
          <Badge
            variant="outline"
            className={`text-[10px] px-2 py-0.5 flex items-center gap-1 ${
              testResult.connected
                ? "border-emerald-500/40 text-emerald-300 bg-emerald-500/10"
                : "border-rose-500/40 text-rose-300 bg-rose-500/10"
            }`}
          >
            {testResult.connected ? (
              <>
                <RiWifiLine className="size-3 text-emerald-400" />
                <span>Online</span>
              </>
            ) : (
              <>
                <RiWifiOffLine className="size-3 text-rose-400" />
                <span>Offline</span>
              </>
            )}
          </Badge>
        )}
      </div>

      {/* URL da API */}
      <div className="space-y-1">
        <Label className="text-xs text-slate-300">URL Base da Evolution API</Label>
        <Input
          value={config.base_url}
          onChange={(e) => setConfig({ ...config, base_url: e.target.value })}
          placeholder="https://api.seuservidor.com ou http://localhost:8080"
          className="h-8 text-xs font-mono"
          disabled={isLoading || isSaving}
        />
        <p className="text-[10px] text-muted-foreground">Endereço público ou local onde a Evolution API está rodando.</p>
      </div>

      {/* API Key */}
      <div className="space-y-1">
        <Label className="text-xs text-slate-300">Chave de API (Global / Instance Apikey)</Label>
        <Input
          type="password"
          value={config.api_key}
          onChange={(e) => setConfig({ ...config, api_key: e.target.value })}
          placeholder="AUTHENTICATION_API_KEY da sua Evolution"
          className="h-8 text-xs font-mono"
          disabled={isLoading || isSaving}
        />
      </div>

      {/* Nome da Instância */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-slate-300">Nome da Instância</Label>
          <button
            type="button"
            onClick={handleFetchInstances}
            disabled={isTesting || !config.base_url || !config.api_key}
            className="text-[10px] text-emerald-400 hover:text-emerald-300 underline cursor-pointer disabled:opacity-50"
          >
            {isTesting ? "Buscando..." : "Buscar Instâncias"}
          </button>
        </div>
        <Input
          value={config.instance_name}
          onChange={(e) => setConfig({ ...config, instance_name: e.target.value })}
          placeholder="Ex: ninja_whatsapp ou suporte"
          className="h-8 text-xs font-mono"
          disabled={isLoading || isSaving}
        />
        {availableInstances.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            <span className="text-[10px] text-muted-foreground mr-1">Disponíveis:</span>
            {availableInstances.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setConfig({ ...config, instance_name: name })}
                className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 border border-border/60 hover:border-emerald-500 text-slate-200 cursor-pointer"
              >
                {name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Feedback de Teste */}
      {testResult && (
        <div
          className={`p-2.5 rounded-lg border text-[11px] leading-relaxed ${
            testResult.connected
              ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-200"
              : "bg-rose-950/30 border-rose-500/30 text-rose-200"
          }`}
        >
          <div className="font-semibold flex items-center gap-1.5">
            {testResult.connected ? "✅ Conexão Estabelecida" : "⚠️ Instância Indisponível"}
          </div>
          <div className="text-[10px] mt-0.5 opacity-90">
            {testResult.message || testResult.error || (testResult.connected ? "Pronto para disparos." : "Verifique credenciais.")}
          </div>
        </div>
      )}

      {/* Conexão WhatsApp / QR Code */}
      <div className="p-3 rounded-xl bg-slate-900/90 border border-[#25D366]/30 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <RiQrCodeLine className="size-4 text-[#25D366]" />
            <span className="text-xs font-semibold text-white">Conexão WhatsApp (QR Code)</span>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleLoadQrCode}
            disabled={isLoadingQr || !config.instance_name}
            className="h-7 text-[11px] gap-1 border-[#25D366]/40 text-[#25D366] hover:bg-[#25D366]/10 cursor-pointer"
          >
            {isLoadingQr ? (
              <>
                <RiRefreshLine className="size-3 animate-spin" />
                <span>Carregando...</span>
              </>
            ) : (
              <>
                <RiQrCodeLine className="size-3" />
                <span>{showQrBox ? "Atualizar QR Code" : "Escanear QR Code"}</span>
              </>
            )}
          </Button>
        </div>

        {showQrBox && qrCodeData && (
          <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-slate-950 border border-border/60 space-y-2">
            <div className="p-2 bg-white rounded-lg shadow-md">
              <img
                src={qrCodeData}
                alt="QR Code WhatsApp"
                className="w-48 h-48 object-contain"
              />
            </div>
            <p className="text-[10px] text-center text-slate-300 max-w-[260px] leading-relaxed">
              No seu WhatsApp &gt; <strong>Aparelhos Conectados</strong> &gt; <strong>Conectar um aparelho</strong> e aponte para o código.
            </p>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => testCurrent()}
              className="h-6 text-[10px] text-emerald-400 hover:text-emerald-300 cursor-pointer"
            >
              Já escaneei (Verificar Status)
            </Button>
          </div>
        )}
      </div>

      {/* Auto Dispatch Toggle */}
      <div className="p-3 rounded-xl bg-slate-900/80 border border-emerald-500/20 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <RiSparklingLine className="size-3.5 text-amber-400" />
            <span className="text-xs font-semibold text-white">Disparo Automático de Cadência</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.auto_dispatch_enabled}
              onChange={(e) => setConfig({ ...config, auto_dispatch_enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-8 h-4 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-500"></div>
          </label>
        </div>
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          Quando novos carrinhos abandonados ou cartões recusados chegarem via webhook, o robô agenda e dispara
          automaticamente a cadência de 3 passos para o cliente.
        </p>

        {config.auto_dispatch_enabled && (
          <div className="pt-2 border-t border-border/40 space-y-1">
            <Label className="text-[11px] text-slate-300 flex items-center gap-1">
              <RiTimeLine className="size-3 text-emerald-400" />
              Delays dos 3 Passos (Minutos)
            </Label>
            <Input
              value={config.cadence_delays_minutes}
              onChange={(e) => setConfig({ ...config, cadence_delays_minutes: e.target.value })}
              placeholder="5,120,1440"
              className="h-7 text-xs font-mono"
            />
            <p className="text-[9px] text-muted-foreground">
              Padrão: <strong>5 min</strong> (Suporte/3DS) → <strong>120 min / 2h</strong> (Cupom 10% OFF) → <strong>1440 min / 24h</strong> (Último aviso).
            </p>
          </div>
        )}
      </div>

      {/* Botões de Ação */}
      <div className="flex items-center gap-2 pt-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => testCurrent()}
          disabled={isTesting || !config.base_url || !config.api_key}
          className="flex-1 text-xs border-border/60 hover:bg-slate-800 cursor-pointer"
        >
          {isTesting ? "Testando..." : "Testar Conexão"}
        </Button>

        <Button
          type="button"
          size="sm"
          onClick={handleSave}
          disabled={isSaving}
          className="flex-1 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold cursor-pointer shadow-md shadow-emerald-900/30"
        >
          {isSaving ? "Salvando..." : saveSuccess ? "Salvo com Sucesso!" : "Salvar Robô"}
        </Button>
      </div>

      <div className="rounded-lg bg-muted/40 p-2.5 text-[10px] text-muted-foreground space-y-1">
        <div className="font-semibold text-slate-300 flex items-center gap-1">
          <RiQuestionLine className="size-3" />
          Segurança e Auto-Cancelamento
        </div>
        <p>
          Se o cliente realizar o pagamento em qualquer momento, todas as mensagens agendadas restantes para ele
          são <strong>canceladas automaticamente</strong> para que ele não receba mensagens de recuperação após já ter comprado!
        </p>
      </div>
    </div>
  );
}
