import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { CampaignFormState } from "../hooks/useCampaignForm";
import type { InterestData } from "@/services/campaignCreator";
import { RiCloseLine, RiSearchLine, RiArrowDownSLine } from "@remixicon/react";
import { COUNTRY_OPTIONS, LOCALE_OPTIONS, getLocaleLabels, EXCLUSION_PRESETS } from "../utils/targeting";

interface TargetingSectionProps {
  form: CampaignFormState;
  onUpdate: <K extends keyof CampaignFormState>(key: K, value: CampaignFormState[K]) => void;
  interestResults: InterestData[];
  onSearchInterest: (query: string) => void;
}

export function TargetingSection({
  form, onUpdate, interestResults, onSearchInterest,
}: TargetingSectionProps) {
  const [interestQuery, setInterestQuery] = useState("");
  const [customCountry, setCustomCountry] = useState("");

  const handleInterestSearch = (q: string) => {
    setInterestQuery(q);
    onSearchInterest(q);
  };

  const addInterest = (interest: InterestData) => {
    if (!form.interests.find((i) => i.id === interest.id)) {
      onUpdate("interests", [...form.interests, interest]);
    }
    setInterestQuery("");
  };

  const removeInterest = (id: string) => {
    onUpdate("interests", form.interests.filter((i) => i.id !== id));
  };

  const toggleLocale = (localeKey: number) => {
    if (localeKey === 0) {
      onUpdate("locales", []);
      return;
    }
    const current = form.locales;
    if (current.includes(localeKey)) {
      onUpdate("locales", current.filter((l) => l !== localeKey));
    } else {
      onUpdate("locales", [...current, localeKey]);
    }
  };

  const togglePreset = (countries: string[]) => {
    const current = form.excludedCountries || [];
    const allIn = countries.every((c) => current.includes(c));
    if (allIn) {
      onUpdate("excludedCountries", current.filter((c) => !countries.includes(c)));
    } else {
      const merged = Array.from(new Set([...current, ...countries]));
      onUpdate("excludedCountries", merged);
    }
  };

  const removeExcludedCountry = (code: string) => {
    const current = form.excludedCountries || [];
    onUpdate("excludedCountries", current.filter((c) => c !== code));
  };

  const addCustomCountry = () => {
    const code = customCountry.trim().toUpperCase();
    if (code && code.length === 2) {
      const current = form.excludedCountries || [];
      if (!current.includes(code)) {
        onUpdate("excludedCountries", [...current, code]);
      }
      setCustomCountry("");
    }
  };

  const isAllLocales = form.locales.length === 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Público-Alvo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* País + Idioma */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>País</Label>
            <Select value={form.country} onValueChange={(v) => onUpdate("country", v)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {COUNTRY_OPTIONS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Idioma</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between font-normal h-9 px-3"
                >
                  <span className="truncate text-sm">
                    {getLocaleLabels(form.locales)}
                  </span>
                  <RiArrowDownSLine className="size-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-1" align="start">
                {LOCALE_OPTIONS.map((loc) => {
                  const isAll = loc.value === 0;
                  const checked = isAll ? isAllLocales : form.locales.includes(loc.value);
                  return (
                    <button
                      key={loc.value}
                      onClick={() => toggleLocale(loc.value)}
                      className="flex items-center gap-2 w-full rounded-sm px-2 py-1.5 text-sm hover:bg-accent transition-colors cursor-pointer"
                    >
                      <Checkbox checked={checked} tabIndex={-1} className="pointer-events-none" />
                      {loc.label}
                    </button>
                  );
                })}
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Exclusão Geográfica (Singapura, África, Venezuela, etc.) */}
        <div className="rounded-lg border border-border/70 bg-muted/20 p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-semibold flex items-center gap-1.5 text-foreground">
                <span className="text-amber-500">🚫</span> Exclusões Geográficas (Anti-Bot / Baixa Conversão)
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Elimina tráfego irrelevante, bots ou regiões sem suporte a pagamentos (ex: Singapura, Venezuela, África).
              </p>
            </div>
            {form.excludedCountries && form.excludedCountries.length > 0 && (
              <Badge variant="outline" className="text-xs border-amber-500/40 text-amber-400 bg-amber-500/10">
                {form.excludedCountries.length} excluídos
              </Badge>
            )}
          </div>

          {/* Presets rápidos */}
          <div className="flex flex-wrap gap-2">
            {EXCLUSION_PRESETS.map((preset) => {
              const active = preset.countries.every((c) => form.excludedCountries?.includes(c));
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => togglePreset(preset.countries)}
                  className={`text-xs px-2.5 py-1.5 rounded-md border transition-all flex items-center gap-1.5 cursor-pointer ${
                    active
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/50 font-medium"
                      : "bg-background text-muted-foreground border-border hover:bg-accent hover:text-foreground"
                  }`}
                  title={preset.description}
                >
                  <span className="font-bold">{active ? "✓" : "+"}</span>
                  <span>{preset.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tags dos países excluídos atualmente */}
          {form.excludedCountries && form.excludedCountries.length > 0 && (
            <div className="flex flex-wrap gap-1.5 items-center pt-1">
              <span className="text-xs text-muted-foreground mr-1">Ativos:</span>
              {form.excludedCountries.map((code) => (
                <Badge
                  key={code}
                  variant="secondary"
                  className="gap-1 pr-1 font-mono text-xs bg-red-500/10 text-red-400 border border-red-500/20"
                >
                  {code}
                  <button
                    type="button"
                    onClick={() => removeExcludedCountry(code)}
                    className="hover:text-red-300 transition-colors"
                  >
                    <RiCloseLine className="size-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          {/* Inserir código customizado */}
          <div className="flex items-center gap-2 pt-1">
            <Input
              placeholder="Adicionar código ISO (ex: PK, BD, NG)..."
              value={customCountry}
              onChange={(e) => setCustomCountry(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustomCountry();
                }
              }}
              maxLength={2}
              className="h-8 text-xs max-w-[240px] uppercase font-mono"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addCustomCountry}
              className="h-8 text-xs px-2.5"
              disabled={!customCountry.trim() || customCountry.trim().length !== 2}
            >
              + Excluir
            </Button>
          </div>
        </div>

        {/* Idade + Gênero */}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Idade Mínima</Label>
            <Input type="number" min={18} max={64} value={form.ageMin}
              onChange={(e) => onUpdate("ageMin", parseInt(e.target.value) || 18)} />
          </div>
          <div className="space-y-2">
            <Label>Idade Máxima</Label>
            <Input type="number" min={18} max={65} value={form.ageMax}
              onChange={(e) => onUpdate("ageMax", parseInt(e.target.value) || 65)} />
            <p className="text-xs text-muted-foreground">65 = 65+</p>
          </div>
          <div className="space-y-2">
            <Label>Gênero</Label>
            <Select value={form.gender.toString()} onValueChange={(v) => onUpdate("gender", Number(v))}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Todos</SelectItem>
                <SelectItem value="1">Masculino</SelectItem>
                <SelectItem value="2">Feminino</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Interesses */}
        <div className="space-y-2">
          <Label>Interesses (opcional)</Label>
          <div className="relative">
            <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar interesses..."
              value={interestQuery}
              onChange={(e) => handleInterestSearch(e.target.value)}
              autoComplete="off"
            />
          </div>
          {interestResults.length > 0 && interestQuery && (
            <div className="border rounded-lg max-h-40 overflow-y-auto bg-popover">
              {interestResults.map((i) => (
                <button
                  key={i.id}
                  onClick={() => addInterest(i)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex justify-between"
                >
                  <span>{i.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {i.audience_size > 0 ? `~${(i.audience_size / 1e6).toFixed(1)}M` : ""}
                  </span>
                </button>
              ))}
            </div>
          )}
          {form.interests.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {form.interests.map((i) => (
                <Badge key={i.id} variant="secondary" className="gap-1 pr-1">
                  {i.name}
                  <button onClick={() => removeInterest(i.id)} className="hover:text-destructive">
                    <RiCloseLine className="size-3.5" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
