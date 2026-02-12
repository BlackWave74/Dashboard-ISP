import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, LogIn, Shield } from "lucide-react";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setError("Informe um e-mail válido.");
      return;
    }
    if (!password || password.length < 4) {
      setError("A senha deve ter pelo menos 4 caracteres.");
      return;
    }

    setSubmitting(true);

    // TODO: conectar com Supabase Auth
    // Simulação temporária
    await new Promise((r) => setTimeout(r, 1200));

    // Placeholder: aceitar qualquer login
    localStorage.setItem("auth_session", JSON.stringify({ email, name: email.split("@")[0] }));
    setSubmitting(false);
    navigate("/");
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden"
      style={{ background: "hsl(var(--login-bg))" }}>
      
      {/* Background effects */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, hsl(var(--login-accent) / 0.4), transparent 70%)" }} />
        <div className="absolute -bottom-32 -right-32 h-[400px] w-[400px] rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, hsl(234 89% 50% / 0.5), transparent 70%)" }} />
      </div>

      <div className="relative z-10 mx-auto grid w-full max-w-[1060px] gap-8 px-6 lg:grid-cols-2 lg:items-center">
        
        {/* Left — Hero */}
        <div className="hidden flex-col gap-6 lg:flex">
          <div className="flex items-center gap-2">
            <Shield className="h-8 w-8" style={{ color: "hsl(var(--login-accent-glow))" }} />
            <span className="text-xl font-bold" style={{ color: "hsl(var(--login-text))" }}>ISP Consulte</span>
          </div>

          <h1 className="text-4xl font-bold leading-tight" style={{ color: "hsl(var(--login-text))" }}>
            Gerencie tudo em
            <br />
            <span style={{ color: "hsl(var(--login-accent-glow))" }}>um só lugar.</span>
          </h1>
          <p className="max-w-md text-base leading-relaxed" style={{ color: "hsl(var(--login-text-muted))" }}>
            Acesse chamados, rotinas e métricas do seu provedor — com uma interface rápida, moderna e segura.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-4">
            {[
              { label: "Acesso rápido", desc: "Atalhos para as telas principais" },
              { label: "Acompanhamento", desc: "Status e prazos em tempo real" },
              { label: "Organização", desc: "Tudo centralizado" },
              { label: "Segurança", desc: "Dados protegidos" },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border p-4"
                style={{
                  borderColor: "hsl(var(--login-card-border))",
                  background: "hsl(var(--login-card) / 0.6)",
                }}
              >
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "hsl(var(--login-accent-glow))" }}>
                  {item.label}
                </p>
                <p className="mt-1 text-sm" style={{ color: "hsl(var(--login-text-muted))" }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Right — Login Card */}
        <div
          className="mx-auto w-full max-w-md rounded-2xl border p-8 shadow-2xl backdrop-blur lg:mx-0 lg:ml-auto"
          style={{
            borderColor: "hsl(var(--login-card-border))",
            background: "hsl(var(--login-card) / 0.85)",
          }}
        >
          <div className="mb-8 flex flex-col items-center gap-2 text-center lg:hidden">
            <Shield className="h-8 w-8" style={{ color: "hsl(var(--login-accent-glow))" }} />
            <span className="text-lg font-bold" style={{ color: "hsl(var(--login-text))" }}>ISP Consulte</span>
          </div>

          <p className="text-xs font-semibold uppercase tracking-[0.25em]" style={{ color: "hsl(var(--login-accent-glow))" }}>
            Painel
          </p>
          <h2 className="mt-1 text-2xl font-bold" style={{ color: "hsl(var(--login-text))" }}>
            Acesse sua conta
          </h2>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: "hsl(var(--login-text-muted))" }}>
            Faça login para entrar no painel.
          </p>

          {error && (
            <div className="mt-4 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium" style={{ color: "hsl(var(--login-text))" }}>
                E-mail
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition focus:ring-2"
                style={{
                  borderColor: "hsl(var(--login-card-border))",
                  background: "hsl(var(--login-bg))",
                  color: "hsl(var(--login-text))",
                  // @ts-expect-error custom property
                  "--tw-ring-color": "hsl(var(--login-accent) / 0.4)",
                }}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium" style={{ color: "hsl(var(--login-text))" }}>
                Senha
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border px-3 py-2.5 pr-10 text-sm outline-none transition focus:ring-2"
                  style={{
                    borderColor: "hsl(var(--login-card-border))",
                    background: "hsl(var(--login-bg))",
                    color: "hsl(var(--login-text))",
                    // @ts-expect-error custom property
                    "--tw-ring-color": "hsl(var(--login-accent) / 0.4)",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 transition hover:opacity-80"
                  style={{ color: "hsl(var(--login-text-muted))" }}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:opacity-60"
              style={{
                background: "hsl(var(--login-accent))",
                color: "hsl(var(--primary-foreground))",
              }}
            >
              {submitting ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <LogIn className="h-4 w-4" />
              )}
              Entrar
            </button>
          </form>

          <p className="mt-5 text-center text-sm" style={{ color: "hsl(var(--login-text-muted))" }}>
            <button
              type="button"
              onClick={() => alert("Para recuperar o acesso, fale com seu gerente ou consultor responsável.")}
              className="transition hover:underline"
              style={{ color: "hsl(var(--login-accent-glow))" }}
            >
              Esqueci minha senha
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}