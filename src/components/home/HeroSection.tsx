import { useState, useEffect, useRef, useMemo } from "react";
import { Sparkles, Zap, TrendingUp, PartyPopper } from "lucide-react";

const words = ["potencial", "crescimento", "sucesso"];

function AnimatedCounter({ target, suffix = "%", duration = 2000 }: { target: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const [done, setDone] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const visible = useRef(false);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    const runAnimation = () => {
      setDone(false);
      setCount(0);
      const start = performance.now();
      const animate = (now: number) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setCount(Math.round(target * eased));
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setDone(true);
        }
      };
      requestAnimationFrame(animate);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !visible.current) {
          visible.current = true;
          runAnimation();
          interval = setInterval(runAnimation, 10000);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => { observer.disconnect(); clearInterval(interval); };
  }, [target, duration]);

  return (
    <div ref={ref} className="flex items-center gap-2">
      <p className={`text-lg font-bold text-white transition-transform ${done ? "animate-[celebrate_0.5s_ease-out]" : ""}`}>
        {suffix === "/5" ? (count / 10).toFixed(1) : count}
        {suffix}
      </p>
      {done && (
        <PartyPopper
          className="h-4 w-4 text-[hsl(45_100%_65%)] animate-[celebrate_0.5s_ease-out]"
        />
      )}
    </div>
  );
}

// Typewriter effect — only re-triggers when `trigger` increments
function TypewriterWord({ text, trigger }: { text: string; trigger: number }) {
  const [displayed, setDisplayed] = useState("");
  const [showCursor, setShowCursor] = useState(false);
  const lastTrigger = useRef(0);

  useEffect(() => {
    if (trigger === 0 || trigger === lastTrigger.current) return;
    lastTrigger.current = trigger;
    setDisplayed("");
    setShowCursor(true);
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(id);
        setTimeout(() => setShowCursor(false), 600);
      }
    }, 55);
    return () => clearInterval(id);
  }, [trigger, text]);

  return (
    <span className="font-semibold text-white/90">
      {displayed}
      {showCursor && <span className="animate-pulse text-[hsl(270_90%_75%)]">|</span>}
    </span>
  );
}

const subtitleSegments = [
  { text: "Capacitamos provedores", type: "keyword" as const, delay: 0 },
  { text: " a crescerem na era digital com ", type: "plain" as const, delay: 1200 },
  { text: "soluções inteligentes", type: "keyword" as const, delay: 1600 },
  { text: " que otimizam operações, aumentam a ", type: "plain" as const, delay: 3000 },
  { text: "eficiência", type: "keyword" as const, delay: 3400 },
  { text: " e impulsionam ", type: "plain" as const, delay: 4200 },
  { text: "resultados reais.", type: "keyword" as const, delay: 4600 },
];

function AnimatedSubtitle() {
  const ref = useRef<HTMLParagraphElement>(null);
  const [cycle, setCycle] = useState(0);
  const [elapsed, setElapsed] = useState(-1);
  const visible = useRef(false);

  useEffect(() => {
    let loopInterval: ReturnType<typeof setInterval>;
    let ticker: ReturnType<typeof setInterval>;

    const runCycle = () => {
      setCycle((c) => c + 1);
      setElapsed(0);
      ticker = setInterval(() => setElapsed((e) => e + 100), 100);
      const maxDelay = subtitleSegments[subtitleSegments.length - 1].delay + 2000;
      setTimeout(() => clearInterval(ticker), maxDelay);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !visible.current) {
          visible.current = true;
          runCycle();
          loopInterval = setInterval(runCycle, 10000);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => { observer.disconnect(); clearInterval(loopInterval); clearInterval(ticker); };
  }, []);

  return (
    <p ref={ref} className="mx-auto mt-8 max-w-2xl text-center text-base leading-relaxed md:text-lg">
      {subtitleSegments.map((seg, i) => {
        const active = elapsed >= seg.delay;
        if (seg.type === "keyword") {
          return <TypewriterWord key={i} text={seg.text} trigger={active ? cycle : 0} />;
        }
        return (
          <span
            key={i}
            className={`text-white/60 transition-opacity duration-400 ${active ? "opacity-100" : "opacity-0"}`}
          >
            {seg.text}
          </span>
        );
      })}
    </p>
  );
}

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

  const miniStats = [
    { icon: Zap, label: "Alta Performance", target: 99, suffix: ".9%" },
    { icon: TrendingUp, label: "Eficiência", target: 100, suffix: "%" },
    { icon: Sparkles, label: "Satisfação", target: 49, suffix: "/5" },
  ];

  return (
    <section className="relative overflow-hidden rounded-3xl" style={{ minHeight: "520px" }}>
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
      <div className="relative z-10 flex flex-col items-center justify-center px-6 py-16 md:py-24" style={{ minHeight: "520px" }}>
        {/* Logo */}
        <img
          src="/resouce/ISP-Consulte-v3-branco.png"
          alt="ISP Consulte"
          className="mb-8 h-16 w-auto object-contain drop-shadow-lg md:h-20"
        />

        {/* Badge */}
        <div className="mb-6 flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-1.5 backdrop-blur-sm">
          <Sparkles className="h-3.5 w-3.5 text-[hsl(270_90%_75%)]" />
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
            Plataforma ISP
          </span>
        </div>

        {/* Title — fixed height to prevent layout shift */}
        <div className="h-[120px] md:h-[160px] lg:h-[180px] flex items-center justify-center">
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
        </div>

        <AnimatedSubtitle />

        {/* Animated mini stats */}
        <div className="mt-10 flex flex-wrap justify-center gap-6 md:gap-10">
          {miniStats.map((s, i) => (
            <div
              key={s.label}
              className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.04] px-5 py-3 backdrop-blur-sm"
              style={{
                opacity: 0,
                animation: `fadeSlideUp 0.6s ease-out 600ms forwards`,
              }}
            >
              <s.icon className="h-5 w-5 text-[hsl(270_90%_75%)]" />
              <div>
                <AnimatedCounter
                  target={s.target}
                  suffix={s.suffix}
                  duration={2000}
                />
                <p className="text-[11px] text-white/40">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
