import { useState, useEffect } from "react";
import { Sparkles, Zap, TrendingUp } from "lucide-react";

const words = ["potencial", "crescimento", "eficiência"];

export default function HeroSection() {
  const [wordIdx, setWordIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setWordIdx((p) => (p + 1) % words.length);
        setVisible(true);
      }, 400);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative overflow-hidden rounded-3xl">
      {/* Animated background */}
      <div
        className="absolute inset-0 hero-hue-rotate"
        style={{
          background:
            "linear-gradient(135deg, hsl(270 80% 20%) 0%, hsl(250 70% 15%) 30%, hsl(234 60% 12%) 60%, hsl(280 50% 18%) 100%)",
        }}
      />

      {/* Glow orbs */}
      <div
        className="pointer-events-none absolute -top-20 -left-20 h-[400px] w-[500px] rounded-full opacity-50 blur-[120px]"
        style={{ background: "radial-gradient(circle, hsl(270 90% 55% / 0.6), transparent 70%)" }}
      />
      <div
        className="pointer-events-none absolute -bottom-20 -right-20 h-[350px] w-[450px] rounded-full opacity-40 blur-[100px]"
        style={{ background: "radial-gradient(circle, hsl(234 89% 55% / 0.5), transparent 70%)" }}
      />
      <div
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[300px] w-[600px] rounded-full opacity-20 blur-[100px]"
        style={{ background: "radial-gradient(circle, hsl(280 70% 60% / 0.4), transparent 60%)" }}
      />

      {/* Grid pattern overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `linear-gradient(hsl(0 0% 100%) 1px, transparent 1px), linear-gradient(90deg, hsl(0 0% 100%) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center px-6 py-16 md:py-24">
        {/* Logo */}
        <img
          src="/resouce/ISP-Consulte-v3-branco.png"
          alt="ISP Consulte"
          className="mb-8 h-12 w-auto object-contain drop-shadow-lg md:h-14"
        />

        {/* Badge */}
        <div className="mb-6 flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-1.5 backdrop-blur-sm">
          <Sparkles className="h-3.5 w-3.5 text-[hsl(270_90%_75%)]" />
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
            Plataforma ISP
          </span>
        </div>

        {/* Title */}
        <h1 className="max-w-4xl text-center text-4xl font-extrabold leading-[1.1] tracking-tight text-white md:text-6xl lg:text-7xl">
          Desbloqueando o{" "}
          <span className="relative inline-block">
            <span
              className={`relative z-10 transition-all duration-400 ${
                visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
              }`}
              style={{
                background: "linear-gradient(135deg, hsl(270 90% 75%), hsl(234 89% 72%), hsl(200 90% 70%))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              {words[wordIdx]}
            </span>
            <span
              className="absolute -inset-x-3 -inset-y-2 -z-0 rounded-xl opacity-30 blur-xl"
              style={{ background: "hsl(270 80% 60%)" }}
            />
          </span>{" "}
          do seu provedor
        </h1>

        <p className="mx-auto mt-8 max-w-2xl text-center text-base leading-relaxed text-white/60 md:text-lg">
          <span className="font-semibold text-white/90">Capacitamos provedores a crescerem</span>{" "}
          na era digital com soluções que otimizam operações, aumentam a eficiência e impulsionam resultados.
        </p>

        {/* Mini stats */}
        <div className="mt-10 flex flex-wrap justify-center gap-6 md:gap-10">
          {[
            { icon: Zap, label: "Alta Performance", value: "99.9%" },
            { icon: TrendingUp, label: "Eficiência", value: "100%" },
            { icon: Sparkles, label: "Satisfação", value: "4.9/5" },
          ].map((s, i) => (
            <div
              key={s.label}
              className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.04] px-5 py-3 backdrop-blur-sm"
              style={{
                opacity: 0,
                animation: `fadeSlideUp 0.6s ease-out ${600 + i * 150}ms forwards`,
              }}
            >
              <s.icon className="h-5 w-5 text-[hsl(270_90%_75%)]" />
              <div>
                <p className="text-lg font-bold text-white">{s.value}</p>
                <p className="text-[11px] text-white/40">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
