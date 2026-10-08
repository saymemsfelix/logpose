import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RiEyeLine, RiEyeOffLine } from "@remixicon/react";

interface LoginFormProps {
  onSubmit: (data: { email: string; password: string }) => void;
  error: string;
  loading: boolean;
}

export function LoginForm({ onSubmit, error, loading }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Modo de redefinição de senha
  const [isResetMode, setIsResetMode] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ email, password });
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetMessage(null);

    if (newPassword !== confirmPassword) {
      setResetMessage({ text: "As senhas não coincidem.", type: "error" });
      return;
    }

    if (newPassword.length < 6) {
      setResetMessage({ text: "A senha deve ter pelo menos 6 caracteres.", type: "error" });
      return;
    }

    setResetLoading(true);
    try {
      const resp = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          new_password: newPassword,
          confirm_password: confirmPassword,
        }),
      });

      const resData = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        throw new Error(resData.detail || "Erro ao redefinir senha.");
      }

      setResetMessage({ text: "Senha redefinida com sucesso! Você já pode entrar.", type: "success" });
      setPassword(newPassword);
      setTimeout(() => {
        setIsResetMode(false);
        setResetMessage(null);
      }, 1500);
    } catch (err) {
      setResetMessage({
        text: err instanceof Error ? err.message : "Falha ao redefinir senha.",
        type: "error",
      });
    } finally {
      setResetLoading(false);
    }
  };

  if (isResetMode) {
    return (
      <div className="rounded-xl border border-white/10 bg-black/50 backdrop-blur-xl shadow-2xl p-6">
        <h2 className="text-lg font-semibold text-white mb-2">Redefinir Senha</h2>
        <p className="text-xs text-white/60 mb-5">
          Crie uma nova senha para acessar o painel Ninja's Tracker.
        </p>

        <form onSubmit={handleResetSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reset-email" className="text-white/80">
              E-mail do Administrador
            </Label>
            <Input
              id="reset-email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-white/10 border-white/15 text-white placeholder:text-white/40 focus:border-primary"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reset-password" className="text-white/80">
              Nova Senha (mínimo 6 caracteres)
            </Label>
            <Input
              id="reset-password"
              type="password"
              placeholder="Digite sua nova senha"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              className="bg-white/10 border-white/15 text-white placeholder:text-white/40 focus:border-primary"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reset-confirm" className="text-white/80">
              Confirmar Nova Senha
            </Label>
            <Input
              id="reset-confirm"
              type="password"
              placeholder="Confirme sua nova senha"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="bg-white/10 border-white/15 text-white placeholder:text-white/40 focus:border-primary"
            />
          </div>

          {resetMessage && (
            <p
              className={`text-sm text-center ${
                resetMessage.type === "success" ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {resetMessage.text}
            </p>
          )}

          <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white" disabled={resetLoading}>
            {resetLoading ? "Salvando nova senha..." : "Salvar Nova Senha"}
          </Button>

          <button
            type="button"
            onClick={() => {
              setIsResetMode(false);
              setResetMessage(null);
            }}
            className="w-full text-center text-xs text-white/50 hover:text-white pt-2 transition-colors"
          >
            ← Voltar para o Login
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-black/50 backdrop-blur-xl shadow-2xl p-6">
      <h2 className="text-lg font-semibold text-white mb-5">Entrar</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="login-email" className="text-white/80">
            Email
          </Label>
          <Input
            id="login-email"
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="bg-white/10 border-white/15 text-white placeholder:text-white/40 focus:border-primary"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="login-password" className="text-white/80">
              Senha
            </Label>
            <button
              type="button"
              onClick={() => {
                setIsResetMode(true);
                setResetMessage(null);
              }}
              className="text-xs text-emerald-400/90 hover:text-emerald-300 transition-colors"
            >
              Esqueceu ou quer redefinir?
            </button>
          </div>
          <div className="relative">
            <Input
              id="login-password"
              type={showPassword ? "text" : "password"}
              placeholder="Sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-white/10 border-white/15 text-white placeholder:text-white/40 focus:border-primary"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
            >
              {showPassword ? (
                <RiEyeOffLine className="size-4" />
              ) : (
                <RiEyeLine className="size-4" />
              )}
            </button>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-400 text-center">{error}</p>
        )}

        <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white" disabled={loading}>
          {loading ? "Entrando..." : "Entrar"}
        </Button>
      </form>
    </div>
  );
}
