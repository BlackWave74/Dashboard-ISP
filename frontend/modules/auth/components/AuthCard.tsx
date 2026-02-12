"use client";

import Image from "next/image";
import { FormEvent, useMemo, useState } from "react";
import type { UserRole } from "@/modules/auth/hooks/useAuth";
import logoAuth from "@/public/resouce/ISP-Consulte-v3-branco.png";

type AuthCardProps = {
  onLogin: (payload: { email: string; password: string }) => Promise<AuthResult> | AuthResult;
  onRegister?: (payload: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    adminCode?: string;
  }) => Promise<AuthResult> | AuthResult;
  onSuccess: () => void;
};

type AuthResult = {
  success: boolean;
  message?: string;
};

type FormErrors = Record<string, string>;

export function AuthCard({ onLogin, onSuccess }: AuthCardProps) {
  const [generalError, setGeneralError] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [failCount, setFailCount] = useState(0);
  const [lockUntil, setLockUntil] = useState<number | null>(null);
  const now = Date.now();
  const isLocked = lockUntil !== null && now < lockUntil;
  const lockSecondsLeft = isLocked ? Math.ceil((lockUntil - now) / 1000) : 0;

  const hasErrors = useMemo(
    () => Object.values(errors).some(Boolean) || Boolean(generalError),
    [errors, generalError]
  );

  const resetFeedback = () => {
    setErrors({});
    setGeneralError("");
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetFeedback();

    if (isLocked) {
      setGeneralError(`Muitas tentativas. Aguarde ${lockSecondsLeft}s e tente novamente.`);
      return;
    }

    const currentErrors: FormErrors = {};
    if (!loginData.email || !/\S+@\S+\.\S+/.test(loginData.email)) {
      currentErrors.email = "Informe um e-mail válido.";
    }
    if (!loginData.password || loginData.password.length < 4) {
      currentErrors.password = "Informe a senha.";
    }

    if (Object.keys(currentErrors).length > 0) {
      setErrors(currentErrors);
      return;
    }

    setSubmitting(true);
    const result = await Promise.resolve(onLogin(loginData));
    setSubmitting(false);

    if (!result.success) {
      const msg =
        result.message === "Invalid login credentials"
          ? "Credenciais inválidas."
          : result.message ?? "Não foi possível entrar.";
      const next = failCount + 1;
      if (next >= 5) {
        setFailCount(0);
        setLockUntil(Date.now() + 30_000);
        setGeneralError("Muitas tentativas. Aguarde 30s e tente novamente.");
        return;
      }
      setFailCount(next);
      setGeneralError(msg);
      return;
    }

    setFailCount(0);
    setLockUntil(null);
    onSuccess();
  };

  const renderError = (field: string) => {
    if (!errors[field]) return null;
    return <p className="text-sm text-red-400">{errors[field]}</p>;
  };

  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="flex h-full min-h-[560px] w-full rounded-3xl border border-slate-800 bg-[rgba(15,23,42,0.85)] p-9 shadow-[0_25px_70px_-25px_rgba(0,0,0,0.55)] backdrop-blur flex-col">
      <div className="mb-6 flex flex-col items-center gap-3 text-center">
        <div className="flex items-center justify-center">
          <Image
            src={logoAuth}
            alt="ISP Consulte"
            width={112}
            height={112}
            className="h-14 w-auto"
            unoptimized
            priority
          />
        </div>
        <p className="text-[11px] uppercase tracking-[0.28em] text-indigo-300">Painel</p>
        <h1 className="mt-1 text-2xl font-semibold text-white">Acesse sua conta</h1>
        <p className="max-w-sm text-sm text-slate-300 leading-relaxed">
          Faça login para entrar no painel. Se precisar de acesso, fale com seu gerente ou consultor responsável.
        </p>
      </div>

      {hasErrors && generalError && (
        <div className="mb-4 rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-2 text-sm text-red-200">
          {generalError}
        </div>
      )}

      <form className="mt-2 flex-1 space-y-4" onSubmit={handleLogin}>
        <div className="space-y-2">
          <label className="text-sm text-slate-200" htmlFor="login-email">
            E-mail
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            value={loginData.email}
            onChange={(event) => setLoginData((prev) => ({ ...prev, email: event.target.value }))}
            className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-white outline-none ring-2 ring-transparent transition focus:border-indigo-400 focus:ring-indigo-500/30"
            placeholder="seu@email.com"
          />
          {renderError("email")}
        </div>

        <div className="space-y-2">
          <label className="text-sm text-slate-200" htmlFor="login-password">
            Senha
          </label>
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={loginData.password}
              onChange={(event) => setLoginData((prev) => ({ ...prev, password: event.target.value }))}
              className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 pr-10 text-sm text-white outline-none ring-2 ring-transparent transition focus:border-indigo-400 focus:ring-indigo-500/30"
              placeholder="********"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 text-xs text-slate-400 hover:text-white"
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            >
              {showPassword ? "Ocultar" : "Mostrar"}
            </button>
          </div>
          {renderError("password")}
        </div>

        <button
          type="submit"
          disabled={submitting || isLocked}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:bg-indigo-500/60"
        >
          {submitting && (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-transparent" />
          )}
          Entrar
        </button>

        <p className="text-center text-sm text-slate-400">
          <button
            type="button"
            onClick={() => {
              alert("Para recuperar o acesso, fale com seu gerente ou consultor responsável.");
            }}
            className="text-indigo-300 hover:text-indigo-200"
          >
            Esqueci minha senha
          </button>
        </p>
      </form>
    </div>
  );
}








