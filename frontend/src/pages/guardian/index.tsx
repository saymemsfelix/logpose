import { useState, useEffect } from "react";
import {
  RiShieldCheckLine,
  RiPlayLine,
  RiAddLine,
  RiAlertLine,
  RiPauseCircleLine,
  RiPulseLine,
  RiHistoryLine,
  RiDeleteBinLine,
  RiEditLine,
  RiCheckDoubleLine,
  RiRefreshLine,
} from "@remixicon/react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getGuardianRules,
  updateGuardianRule,
  createGuardianRule,
  deleteGuardianRule,
  getGuardianLogs,
  clearGuardianLogs,
  evaluateGuardian,
  type GuardianRuleData,
  type GuardianLogData,
} from "@/services/guardian";

export default function GuardianPage() {
  const [rules, setRules] = useState<GuardianRuleData[]>([]);
  const [logs, setLogs] = useState<GuardianLogData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<GuardianRuleData | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formConditionType, setFormConditionType] = useState<GuardianRuleData["condition_type"]>("spend_without_sales");
  const [formThreshold, setFormThreshold] = useState<number>(80);
  const [formSecondaryThreshold, setFormSecondaryThreshold] = useState<number>(0);
  const [formAction, setFormAction] = useState<GuardianRuleData["action"]>("pause");

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [r, l] = await Promise.all([getGuardianRules(), getGuardianLogs(50)]);
      setRules(r);
      setLogs(l);
    } catch {
      toast.error("Erro ao carregar dados do Guardião");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleActive = async (rule: GuardianRuleData, checked: boolean) => {
    try {
      setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, is_active: checked } : r)));
      await updateGuardianRule(rule.id, { is_active: checked });
      toast.success(checked ? `Regra "${rule.name}" ativada!` : `Regra "${rule.name}" desativada`);
    } catch {
      toast.error("Erro ao alterar status da regra");
      loadData();
    }
  };

  const handleEvaluate = async (dryRun: boolean = false) => {
    try {
      setIsEvaluating(true);
      const res = await evaluateGuardian(dryRun);
      if (res.actions_taken > 0) {
        toast.success(res.message);
      } else {
        toast.info(res.message);
      }
      const updatedLogs = await getGuardianLogs(50);
      setLogs(updatedLogs);
    } catch {
      toast.error("Erro ao executar varredura do Guardião");
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingRule(null);
    setFormName("");
    setFormDescription("");
    setFormConditionType("spend_without_sales");
    setFormThreshold(80);
    setFormSecondaryThreshold(0);
    setFormAction("pause");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (rule: GuardianRuleData) => {
    setEditingRule(rule);
    setFormName(rule.name);
    setFormDescription(rule.description || "");
    setFormConditionType(rule.condition_type);
    setFormThreshold(rule.threshold_value);
    setFormSecondaryThreshold(rule.secondary_threshold);
    setFormAction(rule.action);
    setIsModalOpen(true);
  };

  const handleSaveRule = async () => {
    if (!formName.trim()) {
      toast.error("Informe o nome da regra");
      return;
    }

    try {
      if (editingRule) {
        await updateGuardianRule(editingRule.id, {
          name: formName,
          description: formDescription,
          condition_type: formConditionType,
          threshold_value: Number(formThreshold),
          secondary_threshold: Number(formSecondaryThreshold),
          action: formAction,
        });
        toast.success("Regra atualizada com sucesso!");
      } else {
        await createGuardianRule({
          name: formName,
          description: formDescription,
          entity_type: "adset",
          condition_type: formConditionType,
          threshold_value: Number(formThreshold),
          secondary_threshold: Number(formSecondaryThreshold),
          action: formAction,
          is_active: true,
        });
        toast.success("Nova regra criada!");
      }
      setIsModalOpen(false);
      loadData();
    } catch {
      toast.error("Erro ao salvar regra");
    }
  };

  const handleDeleteRule = async (ruleId: number) => {
    if (!confirm("Tem certeza que deseja excluir esta regra?")) return;
    try {
      await deleteGuardianRule(ruleId);
      toast.success("Regra excluída");
      loadData();
    } catch {
      toast.error("Erro ao excluir regra");
    }
  };

  const handleClearLogs = async () => {
    if (!confirm("Deseja limpar todo o histórico de logs?")) return;
    try {
      await clearGuardianLogs();
      setLogs([]);
      toast.success("Histórico de auditoria limpo");
    } catch {
      toast.error("Erro ao limpar logs");
    }
  };

  const activeRulesCount = rules.filter((r) => r.is_active).length;

  return (
    <div className="flex flex-col gap-6 p-6 min-h-screen bg-background">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-border/50">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <RiShieldCheckLine className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                O Guardião de Lucro
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-xs">
                  Anti-Prejuízo 24/7
                </Badge>
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Regras automatizadas de Stop-Loss, proteção de Bid Cap e detecção de escala no Meta Ads.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={isLoading}
            className="text-xs border-border/80 hover:bg-muted/60"
          >
            <RiRefreshLine className={`w-4 h-4 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleEvaluate(true)}
            disabled={isEvaluating}
            className="text-xs border-border/80 hover:bg-muted/60"
            title="Simula a execução sem pausar nada no Meta Ads"
          >
            <RiPulseLine className="w-4 h-4 mr-1.5 text-blue-400" />
            Simular Agora
          </Button>

          <Button
            size="sm"
            onClick={() => handleEvaluate(false)}
            disabled={isEvaluating}
            className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30 text-xs"
          >
            {isEvaluating ? (
              <RiRefreshLine className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <RiPlayLine className="w-4 h-4 mr-1.5" />
            )}
            Executar Varredura
          </Button>

          <Button
            size="sm"
            onClick={handleOpenCreateModal}
            className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs"
          >
            <RiAddLine className="w-4 h-4 mr-1.5" />
            Nova Regra
          </Button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card/70 border-border/60 shadow-sm backdrop-blur">
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs flex items-center justify-between">
              Status da Proteção
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </CardDescription>
            <CardTitle className="text-xl font-bold text-emerald-400">Ativa 24h</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 text-xs text-muted-foreground">
            Verificação contínua contra desperdício de verba
          </CardContent>
        </Card>

        <Card className="bg-card/70 border-border/60 shadow-sm backdrop-blur">
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs">Regras em Execução</CardDescription>
            <CardTitle className="text-xl font-bold text-foreground">
              {activeRulesCount} <span className="text-xs text-muted-foreground font-normal">de {rules.length} regras</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 text-xs text-muted-foreground">
            {activeRulesCount > 0 ? "Monitorando conjuntos ativos" : "Nenhuma regra ligada"}
          </CardContent>
        </Card>

        <Card className="bg-card/70 border-border/60 shadow-sm backdrop-blur">
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs">Ações Registradas</CardDescription>
            <CardTitle className="text-xl font-bold text-amber-400">
              {logs.length} <span className="text-xs text-muted-foreground font-normal">eventos</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 text-xs text-muted-foreground">
            {logs.filter((l) => l.action_taken === "paused").length} pausas automáticas efetuadas
          </CardContent>
        </Card>

        <Card className="bg-card/70 border-border/60 shadow-sm backdrop-blur">
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs">Stop-Loss Ativo</CardDescription>
            <CardTitle className="text-xl font-bold text-cyan-400">R$ 80,00</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 text-xs text-muted-foreground">
            Limite máximo de gasto diário sem venda
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs: Regras & Logs */}
      <Tabs defaultValue="rules" className="w-full">
        <TabsList className="bg-muted/50 p-1 border border-border/50">
          <TabsTrigger value="rules" className="gap-2 text-xs">
            <RiShieldCheckLine className="w-4 h-4 text-emerald-400" />
            Regras de Proteção ({rules.length})
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2 text-xs">
            <RiHistoryLine className="w-4 h-4 text-blue-400" />
            Histórico de Auditoria ({logs.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: RULES */}
        <TabsContent value="rules" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rules.map((rule) => {
              const isSpendWithoutSales = rule.condition_type === "spend_without_sales";
              const isCpaAbove = rule.condition_type === "cpa_above";
              const isRoasAbove = rule.condition_type === "roas_above";

              return (
                <Card
                  key={rule.id}
                  className={`bg-card/90 border transition-all ${
                    rule.is_active
                      ? "border-border/80 shadow-md hover:border-emerald-500/40"
                      : "border-border/40 opacity-70"
                  }`}
                >
                  <CardHeader className="p-5 pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              rule.is_active ? "bg-emerald-400" : "bg-zinc-600"
                            }`}
                          />
                          <h3 className="font-semibold text-base text-foreground">{rule.name}</h3>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {rule.description || "Sem descrição"}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <Switch
                          checked={rule.is_active}
                          onCheckedChange={(checked) => handleToggleActive(rule, checked)}
                        />
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-5 pt-0">
                    <div className="flex flex-wrap items-center gap-2 pt-2 pb-3 border-t border-border/40 text-xs">
                      <Badge variant="secondary" className="bg-muted text-foreground/90 font-mono">
                        {isSpendWithoutSales && `Gasto >= R$ ${rule.threshold_value.toFixed(2)} sem venda`}
                        {isCpaAbove && `CPA > R$ ${rule.threshold_value.toFixed(2)}`}
                        {isRoasAbove && `ROAS >= ${rule.threshold_value.toFixed(1)}x`}
                        {rule.condition_type === "ctr_below" && `CTR < ${rule.threshold_value}%`}
                        {rule.condition_type === "frequency_above" && `Frequência > ${rule.threshold_value}`}
                      </Badge>

                      <Badge
                        variant="outline"
                        className={
                          rule.action === "pause"
                            ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                            : "bg-blue-500/10 text-blue-400 border-blue-500/30"
                        }
                      >
                        {rule.action === "pause" ? "🛑 Ação: Pausar no Meta" : "🔔 Ação: Notificar Alerta"}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs text-muted-foreground">
                      <span>Alvo: {rule.entity_type === "adset" ? "Conjuntos de Anúncios" : "Campanhas"}</span>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => handleOpenEditModal(rule)}
                        >
                          <RiEditLine className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-rose-400"
                          onClick={() => handleDeleteRule(rule.id)}
                        >
                          <RiDeleteBinLine className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* TAB 2: AUDIT LOGS */}
        <TabsContent value="logs" className="mt-4">
          <Card className="bg-card/90 border-border/60">
            <CardHeader className="p-4 border-b border-border/40 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Registro de Eventos do Guardião</CardTitle>
                <CardDescription className="text-xs">
                  Histórico de todas as pausas automáticas, alertas e verificações de proteção.
                </CardDescription>
              </div>
              {logs.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearLogs}
                  className="text-xs text-rose-400 border-rose-500/30 hover:bg-rose-500/10"
                >
                  <RiDeleteBinLine className="w-3.5 h-3.5 mr-1" />
                  Limpar Histórico
                </Button>
              )}
            </CardHeader>

            <CardContent className="p-0">
              {logs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <RiCheckDoubleLine className="w-10 h-10 mx-auto text-emerald-500/50 mb-2" />
                  <p className="text-sm font-medium">Nenhum evento registrado ainda.</p>
                  <p className="text-xs mt-1">
                    Execute a varredura para testar seus conjuntos contra as regras ativas.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border/40">
                      <tr>
                        <th className="py-3 px-4">Data / Hora</th>
                        <th className="py-3 px-4">Regra Disparada</th>
                        <th className="py-3 px-4">Entidade Afetada</th>
                        <th className="py-3 px-4">Ação Tomada</th>
                        <th className="py-3 px-4">Motivo & Métricas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {logs.map((log) => {
                        const dateFormatted = log.created_at
                          ? new Date(log.created_at).toLocaleString("pt-BR", {
                              day: "2-digit",
                              month: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "-";

                        return (
                          <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                            <td className="py-3 px-4 text-muted-foreground font-mono">{dateFormatted}</td>
                            <td className="py-3 px-4 font-medium text-foreground">{log.rule_name}</td>
                            <td className="py-3 px-4">
                              <span className="font-semibold text-foreground/90">{log.entity_name}</span>
                              <span className="text-[10px] text-muted-foreground block font-mono">
                                ID: {log.entity_id}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              {log.action_taken === "paused" ? (
                                <Badge className="bg-rose-500/10 text-rose-400 border-rose-500/30 gap-1">
                                  <RiPauseCircleLine className="w-3 h-3" />
                                  Pausado no Meta
                                </Badge>
                              ) : log.action_taken === "pause_failed" ? (
                                <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/40">
                                  Erro ao pausar
                                </Badge>
                              ) : (
                                <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/30 gap-1">
                                  <RiAlertLine className="w-3 h-3" />
                                  Notificação
                                </Badge>
                              )}
                            </td>
                            <td className="py-3 px-4 max-w-xs text-muted-foreground">
                              <p className="line-clamp-2">{log.message}</p>
                              {log.metrics_snapshot && (
                                <div className="text-[10px] font-mono text-zinc-400 mt-1">
                                  Gasto: R$ {log.metrics_snapshot.spend || 0} | Vendas: {log.metrics_snapshot.sales || 0} | CPA: R$ {log.metrics_snapshot.cpa || 0}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* MODAL: Criar / Editar Regra */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <RiShieldCheckLine className="w-5 h-5 text-emerald-400" />
              {editingRule ? "Editar Regra do Guardião" : "Criar Nova Regra de Proteção"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-semibold">Nome da Regra</Label>
              <Input
                placeholder="Ex: Stop-Loss R$ 80 sem vendas"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Descrição / Orientação</Label>
              <Input
                placeholder="O que esta regra faz..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="mt-1 text-xs"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Gatilho de Condição</Label>
              <Select
                value={formConditionType}
                onValueChange={(val) => setFormConditionType(val as GuardianRuleData["condition_type"])}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione a condição" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="spend_without_sales">
                    🛑 Gasto sem Vendas (Stop-Loss diário)
                  </SelectItem>
                  <SelectItem value="cpa_above">
                    🎯 Teto de CPA Excedido (Bid Cap Guard)
                  </SelectItem>
                  <SelectItem value="roas_above">
                    🚀 ROAS acima da Meta (Alerta de Escala)
                  </SelectItem>
                  <SelectItem value="ctr_below">
                    📉 CTR abaixo do Mínimo (Criativo Ruim)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">
                  {formConditionType === "spend_without_sales" && "Gasto Máximo (R$)"}
                  {formConditionType === "cpa_above" && "Teto de CPA (R$)"}
                  {formConditionType === "roas_above" && "ROAS Mínimo (x)"}
                  {formConditionType === "ctr_below" && "CTR Mínimo (%)"}
                </Label>
                <Input
                  type="number"
                  step="any"
                  value={formThreshold}
                  onChange={(e) => setFormThreshold(parseFloat(e.target.value) || 0)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">
                  {formConditionType === "cpa_above" || formConditionType === "roas_above"
                    ? "Mínimo de Vendas"
                    : "Mínimo Gasto (R$)"}
                </Label>
                <Input
                  type="number"
                  step="any"
                  value={formSecondaryThreshold}
                  onChange={(e) => setFormSecondaryThreshold(parseFloat(e.target.value) || 0)}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Ação Executada ao Disparar</Label>
              <Select
                value={formAction}
                onValueChange={(val) => setFormAction(val as GuardianRuleData["action"])}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione a ação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pause">🛑 Pausar Conjunto no Meta Ads Imediatamente</SelectItem>
                  <SelectItem value="notify">🔔 Apenas Registrar Alerta no Dashboard</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSaveRule} className="bg-emerald-600 hover:bg-emerald-500 text-white">
              Salvar Regra
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
