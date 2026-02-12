interface HeroSectionProps {
  name?: string;
}

export default function HeroSection({ name }: HeroSectionProps) {
  const greeting = name ? `Olá, ${name.split(" ")[0]}!` : "";

  return (
    <section className="relative flex flex-col items-center text-center">
      {/* Decorative gradient orbs */}
      <div
        className="pointer-events-none absolute -top-32 left-1/2 h-[500px] w-[700px] -translate-x-1/2 rounded-full opacity-30 blur-[120px]"
        style={{ background: "radial-gradient(circle, hsl(234 89% 55% / 0.5), transparent 70%)" }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -top-20 right-0 h-[300px] w-[400px] rounded-full opacity-20 blur-[100px]"
        style={{ background: "radial-gradient(circle, hsl(280 70% 50% / 0.4), transparent 70%)" }}
        aria-hidden="true"
      />

      {greeting && (
        <p className="relative z-10 mb-4 text-sm font-medium text-muted-foreground">
          {greeting}
        </p>
      )}

      <h1 className="relative z-10 max-w-3xl text-4xl font-extrabold leading-tight tracking-tight text-foreground md:text-6xl">
        Desbloqueando o{" "}
        <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          potencial
        </span>{" "}
        do seu provedor
      </h1>

      <p className="relative z-10 mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
        Capacitamos provedores a crescerem na era digital com soluções que otimizam operações,
        aumentam a eficiência e impulsionam resultados.
      </p>
    </section>
  );
}
