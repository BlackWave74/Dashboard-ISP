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

const miniStats = [
  { value: "24", label: "Projetos", color: "hsl(234 89% 72%)" },
  { value: "1.2k", label: "Horas", color: "hsl(280 80% 65%)" },
  { value: "846", label: "Concluídas", color: "hsl(160 70% 50%)" },
];

/* ---------- donut ring (SVG) ---------- */
const DonutChart = () => (
  <svg viewBox="0 0 80 80" className="login-donut">
    <circle cx="40" cy="40" r="32" fill="none" stroke="hsl(222 30% 15%)" strokeWidth="8" />
    <circle
      cx="40" cy="40" r="32" fill="none"
      stroke="url(#donutGrad)" strokeWidth="8"
      strokeDasharray="140 60"
      strokeLinecap="round"
      transform="rotate(-90 40 40)"
    />
    <defs>
      <linearGradient id="donutGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="hsl(234 89% 65%)" />
        <stop offset="100%" stopColor="hsl(280 75% 60%)" />
      </linearGradient>
    </defs>
    <text x="40" y="38" textAnchor="middle" fill="hsl(210 40% 98%)" fontSize="12" fontWeight="800">70%</text>
    <text x="40" y="50" textAnchor="middle" fill="hsl(215 20% 55%)" fontSize="6">eficiência</text>
  </svg>
);

/* ---------- sparkline (SVG) ---------- */
const Sparkline = () => {
  const points = [10, 30, 20, 45, 35, 55, 40, 60, 50, 70];
  const w = 120, h = 40;
  const d = points.map((p, i) => `${(i / (points.length - 1)) * w},${h - (p / 70) * h}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="login-sparkline">
      <polyline points={d} fill="none" stroke="url(#sparkGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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

      {/* Centered Logo */}
      <div className="login-top-logo">
        <img
          src="/resouce/ISP-Consulte-v3-branco.png"
          alt="ISP Consulte"
          className="login-top-logo-img"
        />
      </div>

      <div className="login-container">
        {/* -------- LEFT: Analytics / Features -------- */}
        <div className="login-analytics-side">
          <div className="login-analytics-inner">
            <h2 className="login-analytics-title">
              Tudo sobre seu provedor
              <br />
              <span className="login-analytics-highlight">em um só lugar.</span>
            </h2>
            <p className="login-analytics-desc">
              Após o login, você terá acesso a dashboards completos com métricas,
              desempenho da equipe, tarefas e muito mais.
            </p>

            {/* Mini stats row */}
            <div className="login-mini-stats">
              {miniStats.map((s) => (
                <div key={s.label} className="login-mini-stat">
                  <span className="login-mini-stat-value" style={{ color: s.color }}>{s.value}</span>
                  <span className="login-mini-stat-label">{s.label}</span>
                </div>
              ))}
            </div>

            {/* Charts row */}
            <div className="login-charts-row">
              <div className="login-chart-card">
                <div className="login-chart-card-header">
                  <Activity size={14} style={{ color: "hsl(234 89% 72%)" }} />
                  <span>Desempenho semanal</span>
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

              <div className="login-chart-card login-chart-card--small">
                <div className="login-chart-card-header">
                  <TrendingUp size={14} style={{ color: "hsl(280 80% 65%)" }} />
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
            {/* Mobile logo */}
            <div className="login-mobile-logo">
              <img
                src="/resouce/ISP-Consulte-v3-branco.png"
                alt="ISP Consulte"
                className="login-logo-img"
              />
            </div>

            <div className="login-heading">
              <h1 className="login-title">Bem-vindo de volta</h1>
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
      </div>
    </div>
  );
}
