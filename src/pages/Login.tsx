import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  Eye, EyeOff, LogIn,
  BarChart3, Users, Clock, CheckCircle2,
  TrendingUp, PieChart, Activity,
} from "lucide-react";
import { useAuth } from "@/modules/auth/hooks/useAuth";

/* ---------- decorative data ---------- */
const barData = [35, 55, 45, 75, 50, 65, 85, 55, 70, 80, 60, 90];

const features = [
  { icon: BarChart3, label: "Projetos & Métricas", desc: "Acompanhe o progresso de cada projeto" },
  { icon: Users, label: "Gestão de Equipe", desc: "Veja quem está conectado e produzindo" },
  { icon: Clock, label: "Horas & Prazos", desc: "Controle de tempo em tempo real" },
  { icon: CheckCircle2, label: "Tarefas", desc: "Gerencie e conclua demandas" },
  { icon: TrendingUp, label: "Relatórios", desc: "Dados para decisões inteligentes" },
  { icon: PieChart, label: "Análises", desc: "Gráficos detalhados por setor" },
];

/* ---------- donut ring (SVG) ---------- */
const DonutChart = () => (
  <svg viewBox="0 0 100 100" className="login-donut">
    <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(222 30% 15%)" strokeWidth="9" />
    <circle
      cx="50" cy="50" r="40" fill="none"
      stroke="url(#donutGrad)" strokeWidth="9"
      strokeDasharray="0 251.3"
      strokeLinecap="round"
      transform="rotate(-90 50 50)"
    />
    <defs>
      <linearGradient id="donutGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="hsl(234 89% 65%)" />
        <stop offset="100%" stopColor="hsl(280 75% 60%)" />
      </linearGradient>
    </defs>
    <text x="50" y="46" textAnchor="middle" fill="hsl(210 40% 98%)" fontSize="16" fontWeight="800">100%</text>
    <text x="50" y="62" textAnchor="middle" fill="hsl(234 89% 72%)" fontSize="9" fontWeight="700">EFICIÊNCIA</text>
  </svg>
);

/* ---------- sparkline (SVG) ---------- */
const Sparkline = () => {
  const points = [10, 30, 20, 45, 35, 55, 40, 60, 50, 70];
  const w = 140, h = 45;
  const d = points.map((p, i) => `${(i / (points.length - 1)) * w},${h - (p / 70) * h}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="login-sparkline">
      <polyline points={d} fill="none" stroke="url(#sparkGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="hsl(234 89% 65%)" />
          <stop offset="100%" stopColor="hsl(280 75% 60%)" />
        </linearGradient>
      </defs>
    </svg>
  );
};

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [rememberMe, setRememberMe] = useState(() => {
    try { return localStorage.getItem("login_remember") === "1"; } catch { return false; }
  });
  const [email, setEmail] = useState(() => {
    try { return rememberMe ? (localStorage.getItem("login_email") ?? "") : ""; } catch { return ""; }
  });
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
      try {
        if (rememberMe) {
          localStorage.setItem("login_remember", "1");
          localStorage.setItem("login_email", email);
        } else {
          localStorage.removeItem("login_remember");
          localStorage.removeItem("login_email");
        }
      } catch { /* ignore */ }
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
        {/* -------- LEFT: Overview Card -------- */}
        <div className="login-overview-side">
          <div className="login-overview-card">
            <p className="login-overview-desc">
              Dashboards, métricas, desempenho da equipe, tarefas e muito mais — tudo em um só lugar.
            </p>

            {/* Charts grid — equal sizing */}
            <div className="login-charts-grid">
              <div className="login-chart-cell">
                <div className="login-chart-cell-header">
                  <Activity size={14} />
                  <span>Desempenho</span>
                </div>
                <div className="login-chart-bars">
                  {barData.map((h, i) => (
                    <div
                      key={i}
                      className="login-chart-bar"
                      style={{ height: `${h}%`, animationDelay: `${i * 0.06}s` }}
                    />
                  ))}
                </div>
              </div>

              <div className="login-chart-cell">
                <div className="login-chart-cell-header">
                  <TrendingUp size={14} />
                  <span>Crescimento</span>
                </div>
                <Sparkline />
                <DonutChart />
              </div>
            </div>

            {/* Feature grid */}
            <div className="login-features-grid">
              {features.map((f) => (
                <div key={f.label} className="login-feature-item">
                  <f.icon size={16} className="login-feature-icon" />
                  <div>
                    <span className="login-feature-label">{f.label}</span>
                    <span className="login-feature-desc">{f.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* -------- RIGHT: Login Form -------- */}
        <div className="login-form-side">
          <div className="login-form-inner">
            <div className="login-card-logo">
              <img
                src="/resouce/ISP-Consulte-v3-branco.png"
                alt="ISP Consulte"
                className="login-logo-img"
              />
            </div>

            <div className="login-heading">
              <h1 className="login-title">Bem-vindo de volta!</h1>
              <p className="login-subtitle">
                Entre com suas credenciais para continuar.
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
                    placeholder=""
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

              <div className="login-remember">
                <label className="login-remember-label">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="login-remember-checkbox"
                  />
                  <span>Lembrar credenciais</span>
                </label>
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
                className="login-forgot-link"
                onClick={() => {
                  setError("Para recuperar o acesso, entre em contato com seu gerente ou consultor responsável.");
                }}
              >
                Esqueci minha senha
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="login-footer">
        <p>Desenvolvido pelo time <span className="login-overview-highlight">ISP Consulte</span></p>
        <p>São Paulo, Brasil · Todos os direitos reservados · {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}
