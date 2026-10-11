import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RiFileCopyLine,
  RiAddLine,
  RiLoader4Line,
  RiFocus3Line,
} from "@remixicon/react";
import type { CampaignData, CampaignAdSetData } from "@/services/campaigns";

interface NewAdSetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: CampaignData | null;
  initialSourceAdSet?: CampaignAdSetData | null;
  onDuplicate: (
    sourceAdSetId: string,
    data: {
      new_name?: string;
      new_bid_amount?: number;
      new_daily_budget?: number;
      status?: string;
    },
  ) => Promise<any>;
  onCreate: (
    campaignId: string,
    data: {
      name: string;
      bid_strategy?: string;
      bid_amount?: number;
      daily_budget?: number;
      copy_ads_from_adset_id?: string;
      status?: string;
    },
  ) => Promise<any>;
}

export function NewAdSetModal({
  open,
  onOpenChange,
  campaign,
  initialSourceAdSet,
  onDuplicate,
  onCreate,
}: NewAdSetModalProps) {
  const [tab, setTab] = useState<"duplicate" | "create">("duplicate");
  const [loading, setLoading] = useState(false);

  // Duplicação state
  const [selectedSourceId, setSelectedSourceId] = useState("");
  const [dupName, setDupName] = useState("");
  const [dupBidAmount, setDupBidAmount] = useState("");
  const [dupBudget, setDupBudget] = useState("");
  const [dupActive, setDupActive] = useState(false);

  // Criação do zero state
  const [createName, setCreateName] = useState("");
  const [createBidStrategy, setCreateBidStrategy] = useState("BID_CAP");
  const [createBidAmount, setCreateBidAmount] = useState("");
  const [createBudget, setCreateBudget] = useState("");
  const [copyAdsFrom, setCopyAdsFrom] = useState("none");
  const [createActive, setCreateActive] = useState(false);

  useEffect(() => {
    if (open && campaign) {
      const source = initialSourceAdSet || campaign.adsets[0];
      if (source) {
        setSelectedSourceId(source.id);
        setDupName(`${source.name} - Cópia`);
        setDupBidAmount(source.bid_amount && source.bid_amount > 0 ? String(source.bid_amount) : "");
        setDupBudget(source.budget > 0 ? String(source.budget) : "");
      } else {
        setTab("create");
      }
      setCreateName(`Conjunto ${campaign.adsets.length + 1}`);
      setCreateBidStrategy("BID_CAP");
      setCreateBidAmount(source?.bid_amount ? String(source.bid_amount) : "90");
      setCreateBudget(source?.budget ? String(source.budget) : "");
      setCopyAdsFrom(source ? source.id : "none");
    }
  }, [open, campaign, initialSourceAdSet]);

  if (!campaign) return null;

  const isAbo = campaign.budget_type === "ABO";

  const handleSourceChange = (id: string) => {
    setSelectedSourceId(id);
    const source = campaign.adsets.find((a) => a.id === id);
    if (source) {
      setDupName(`${source.name} - Cópia`);
      setDupBidAmount(source.bid_amount && source.bid_amount > 0 ? String(source.bid_amount) : "");
      setDupBudget(source.budget > 0 ? String(source.budget) : "");
    }
  };

  const handleDuplicateSubmit = async () => {
    if (!selectedSourceId) return;
    setLoading(true);
    try {
      const numBid = parseFloat(dupBidAmount.replace(",", "."));
      const numBudget = parseFloat(dupBudget.replace(",", "."));

      await onDuplicate(selectedSourceId, {
        new_name: dupName.trim() || undefined,
        new_bid_amount: !isNaN(numBid) && numBid > 0 ? numBid : undefined,
        new_daily_budget: isAbo && !isNaN(numBudget) && numBudget > 0 ? numBudget : undefined,
        status: dupActive ? "ACTIVE" : "PAUSED",
      });
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubmit = async () => {
    if (!createName.trim()) return;
    setLoading(true);
    try {
      const numBid = parseFloat(createBidAmount.replace(",", "."));
      const numBudget = parseFloat(createBudget.replace(",", "."));

      await onCreate(campaign.id, {
        name: createName.trim(),
        bid_strategy: createBidStrategy,
        bid_amount: !isNaN(numBid) && numBid > 0 ? numBid : undefined,
        daily_budget: isAbo && !isNaN(numBudget) && numBudget > 0 ? numBudget : undefined,
        copy_ads_from_adset_id: copyAdsFrom !== "none" ? copyAdsFrom : undefined,
        status: createActive ? "ACTIVE" : "PAUSED",
      });
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !loading && onOpenChange(o)}>
      <DialogContent className="sm:max-w-[480px] border-border/60 shadow-2xl backdrop-blur-md">
        <DialogHeader className="gap-1">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
              <RiAddLine className="size-4" />
            </div>
            <DialogTitle className="text-base font-semibold">
              Adicionar Conjunto na Campanha
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground line-clamp-1" title={campaign.name}>
            Campanha: <strong className="text-foreground/90 font-medium">{campaign.name}</strong>
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-3">
            <TabsTrigger value="duplicate" disabled={campaign.adsets.length === 0} className="text-xs gap-1.5">
              <RiFileCopyLine className="size-3.5" />
              Duplicar Existente
            </TabsTrigger>
            <TabsTrigger value="create" className="text-xs gap-1.5">
              <RiAddLine className="size-3.5" />
              Criar do Zero
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: DUPLICAR DE EXISTENTE */}
          <TabsContent value="duplicate" className="space-y-3.5 mt-0">
            {campaign.adsets.length > 0 ? (
              <>
                <div className="grid gap-1.5">
                  <Label className="text-xs font-medium text-foreground/80">
                    Conjunto Base para Duplicação
                  </Label>
                  <Select value={selectedSourceId} onValueChange={handleSourceChange} disabled={loading}>
                    <SelectTrigger className="text-xs h-9">
                      <SelectValue placeholder="Selecione um conjunto" />
                    </SelectTrigger>
                    <SelectContent>
                      {campaign.adsets.map((as_) => (
                        <SelectItem key={as_.id} value={as_.id} className="text-xs">
                          {as_.name} ({as_.ads.length} anúncio{as_.ads.length !== 1 ? "s" : ""})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">
                    Todos os criativos e anúncios do conjunto serão copiados para o novo conjunto.
                  </p>
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="dup-name" className="text-xs font-medium text-foreground/80">
                    Nome do Novo Conjunto
                  </Label>
                  <Input
                    id="dup-name"
                    value={dupName}
                    onChange={(e) => setDupName(e.target.value)}
                    placeholder="Ex: Conjunto 02 - Bid Cap R$ 90"
                    className="text-xs h-9 border-border/70"
                    disabled={loading}
                  />
                </div>

                {/* Novo Bid Cap */}
                <div className="grid gap-1.5 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                  <Label htmlFor="dup-bid" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <RiFocus3Line className="size-3.5 text-emerald-500" />
                    Novo Lance / Bid Cap (R$)
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                      R$
                    </span>
                    <Input
                      id="dup-bid"
                      type="number"
                      min={1}
                      step={1}
                      value={dupBidAmount}
                      onChange={(e) => setDupBidAmount(e.target.value)}
                      placeholder="Ex: 90.00"
                      className="pl-9 text-xs font-semibold tabular-nums h-9 border-emerald-500/30 focus-visible:ring-emerald-500/30"
                      disabled={loading}
                    />
                  </div>
                  <div className="flex items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-muted-foreground">Atalhos:</span>
                    {[50, 75, 90, 120].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setDupBidAmount(String(val))}
                        className="px-2 py-0.5 rounded text-[10px] bg-muted hover:bg-muted/80 text-foreground border border-border/40 transition-colors"
                      >
                        R$ {val}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Orçamento ABO se aplicável */}
                {isAbo && (
                  <div className="grid gap-1.5">
                    <Label htmlFor="dup-budget" className="text-xs font-medium text-foreground/80">
                      Orçamento Diário (ABO)
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                        R$
                      </span>
                      <Input
                        id="dup-budget"
                        type="number"
                        min={1}
                        step={10}
                        value={dupBudget}
                        onChange={(e) => setDupBudget(e.target.value)}
                        placeholder="Ex: 50.00"
                        className="pl-9 text-xs font-semibold tabular-nums h-9 border-border/70"
                        disabled={loading}
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/20 border border-border/40">
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-foreground">Iniciar Ativo</span>
                    <span className="text-[10px] text-muted-foreground">Se desmarcado, inicia pausado para revisão</span>
                  </div>
                  <Switch checked={dupActive} onCheckedChange={setDupActive} disabled={loading} />
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground py-4 text-center">
                Esta campanha ainda não possui conjuntos para duplicar.
              </p>
            )}
          </TabsContent>

          {/* TAB 2: CRIAR DO ZERO */}
          <TabsContent value="create" className="space-y-3.5 mt-0">
            <div className="grid gap-1.5">
              <Label htmlFor="create-name" className="text-xs font-medium text-foreground/80">
                Nome do Conjunto
              </Label>
              <Input
                id="create-name"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="Ex: Aberto 25-50 | Bid Cap R$ 90"
                className="text-xs h-9 border-border/70"
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-xs font-medium text-foreground/80">
                  Estratégia de Lance
                </Label>
                <Select value={createBidStrategy} onValueChange={setCreateBidStrategy} disabled={loading}>
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BID_CAP" className="text-xs">Bid Cap (Teto)</SelectItem>
                    <SelectItem value="COST_CAP" className="text-xs">Cost Cap (Custo)</SelectItem>
                    <SelectItem value="VOLUME" className="text-xs">Maior Volume (Sem Cap)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {createBidStrategy !== "VOLUME" && (
                <div className="grid gap-1.5">
                  <Label htmlFor="create-bid" className="text-xs font-medium text-foreground/80">
                    Lance Máximo (R$)
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                      R$
                    </span>
                    <Input
                      id="create-bid"
                      type="number"
                      min={1}
                      step={1}
                      value={createBidAmount}
                      onChange={(e) => setCreateBidAmount(e.target.value)}
                      placeholder="90.00"
                      className="pl-9 text-xs font-semibold tabular-nums h-9 border-emerald-500/30"
                      disabled={loading}
                    />
                  </div>
                </div>
              )}
            </div>

            {isAbo && (
              <div className="grid gap-1.5">
                <Label htmlFor="create-budget" className="text-xs font-medium text-foreground/80">
                  Orçamento Diário (ABO)
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                    R$
                  </span>
                  <Input
                    id="create-budget"
                    type="number"
                    min={1}
                    step={10}
                    value={createBudget}
                    onChange={(e) => setCreateBudget(e.target.value)}
                    placeholder="Ex: 50.00"
                    className="pl-9 text-xs font-semibold tabular-nums h-9 border-border/70"
                    disabled={loading}
                  />
                </div>
              </div>
            )}

            {campaign.adsets.length > 0 && (
              <div className="grid gap-1.5">
                <Label className="text-xs font-medium text-foreground/80">
                  Copiar Anúncios de um Conjunto Existente
                </Label>
                <Select value={copyAdsFrom} onValueChange={setCopyAdsFrom} disabled={loading}>
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="text-xs">Não copiar (conjunto vazio)</SelectItem>
                    {campaign.adsets.map((as_) => (
                      <SelectItem key={as_.id} value={as_.id} className="text-xs">
                        {as_.name} ({as_.ads.length} anúncio{as_.ads.length !== 1 ? "s" : ""})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/20 border border-border/40">
              <div className="flex flex-col">
                <span className="text-xs font-medium text-foreground">Iniciar Ativo</span>
                <span className="text-[10px] text-muted-foreground">Se desmarcado, inicia pausado para revisão</span>
              </div>
              <Switch checked={createActive} onCheckedChange={setCreateActive} disabled={loading} />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2 sm:gap-0 pt-2">
          <Button variant="outline" size="sm" disabled={loading} onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            size="sm"
            disabled={
              loading ||
              (tab === "duplicate" && (!selectedSourceId || !dupName.trim())) ||
              (tab === "create" && !createName.trim())
            }
            onClick={tab === "duplicate" ? handleDuplicateSubmit : handleCreateSubmit}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
          >
            {loading ? (
              <>
                <RiLoader4Line className="size-3.5 animate-spin mr-1.5" />
                Criando no Meta Ads...
              </>
            ) : tab === "duplicate" ? (
              "Duplicar Conjunto"
            ) : (
              "Criar Conjunto"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
