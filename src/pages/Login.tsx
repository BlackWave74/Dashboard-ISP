import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, LogIn, BarChart3, Users, Clock, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/modules/auth/hooks/useAuth";

/* ---------- mini chart data (decorative) ---------- */
const barData = [40, 65, 45, 80, 55, 70, 90, 60, 75, 85];
const stats = [
  { icon: BarChart3, label: "Projetos ativos", value: "24", color: "hsl(var(--login-accent-glow))" },
  { icon: Users, label: "Usuários conectados", value: "128", color: "hsl(234 89% 72%)" },
  { icon: Clock, label: "Horas trabalhadas", value: "1.2k", color: "hsl(280 80% 65%)" },
  { icon: CheckCircle2, label: "Tarefas concluídas", value: "846", color: "hsl(160 70% 50%)" },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
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
    const result = await login({ email, password });
    setSubmitting(false);

    if (result.success) {
      navigate("/");
    } else {
      setError(result.message || "Credenciais inválidas.");
    }
  };

  return (
    <div className="login-wrapper">
      {/* Ambient blobs */}
      <div className="login-blob login-blob--1" />
      <div className="login-blob login-blob--2" />
      <div className="login-blob login-blob--3" />

      <div className="login-container">
        {/* -------- LEFT: Login Form -------- */}
        <div className="login-form-side">
          <div className="login-form-inner">
            {/* Logo */}
            <div className="login-logo-row">
              <img
                src="/resouce/ISP-Consulte-v3-branco.png"
                alt="ISP Consulte"
                className="login-logo-img"
              />
            </div>

            <div className="login-heading">
              <p className="login-label">Painel de Gestão</p>
              <h1 className="login-title">Acesse sua conta</h1>
              <p className="login-subtitle">
                Faça login para acessar o painel completo.
              </p>
            </div>

            {error && <div className="login-error">{error}</div>}

            <form className="login-form" onSubmit={handleSubmit}>
              <div className="login-field">
                <label htmlFor="email">E-mail</label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                />
              </div>

              <div className="login-field">
                <label htmlFor="password">Senha</label>
                <div className="login-password-wrap">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    className="login-eye-btn"
                    onClick={() => setShowPassword((p) => !p)}
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={submitting} className="login-submit">
                {submitting ? (
                  <span className="login-spinner" />
                ) : (
                  <LogIn size={16} />
                )}
                Entrar
              </button>
            </form>

            <p className="login-forgot">
              <button
                type="button"
                onClick={() =>
                  alert("Para recuperar o acesso, fale com seu gerente ou consultor responsável.")
                }
              >
                Esqueci minha senha
              </button>
            </p>
          </div>
        </div>

        {/* -------- RIGHT: Analytics Preview -------- */}
        <div className="login-analytics-side">
          <div className="login-analytics-inner">
            <h2 className="login-analytics-title">
              Visão geral do seu
              <br />
              <span className="login-analytics-highlight">provedor</span>
            </h2>
            <p className="login-analytics-desc">
              Acompanhe métricas, tarefas e desempenho da equipe em tempo real.
            </p>

            {/* Stats grid */}
            <div className="login-stats-grid">
              {stats.map((s) => (
                <div key={s.label} className="login-stat-card">
                  <s.icon size={20} style={{ color: s.color }} />
                  <div>
                    <span className="login-stat-value">{s.value}</span>
                    <span className="login-stat-label">{s.label}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Decorative bar chart */}
            <div className="login-chart-section">
              <p className="login-chart-label">Desempenho semanal</p>
              <div className="login-chart-bars">
                {barData.map((h, i) => (
                  <div
                    key={i}
                    className="login-chart-bar"
                    style={{
                      height: `${h}%`,
                      animationDelay: `${i * 0.08}s`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
