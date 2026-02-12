export default function HeroSection() {
  return (
    <section className="relative flex flex-col items-center pt-8 text-center">
      {/* Purple gradient orbs */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 h-[600px] w-[800px] -translate-x-1/2 rounded-full opacity-40 blur-[140px]"
        style={{ background: "radial-gradient(circle, hsl(270 80% 50% / 0.5), hsl(234 89% 55% / 0.3), transparent 70%)" }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -top-10 right-[-10%] h-[350px] w-[450px] rounded-full opacity-25 blur-[100px]"
        style={{ background: "radial-gradient(circle, hsl(280 70% 55% / 0.5), transparent 70%)" }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute top-20 left-[-5%] h-[250px] w-[350px] rounded-full opacity-20 blur-[100px]"
        style={{ background: "radial-gradient(circle, hsl(260 80% 60% / 0.4), transparent 70%)" }}
        aria-hidden="true"
      />

      <h1 className="relative z-10 max-w-4xl text-4xl font-extrabold leading-[1.1] tracking-tight text-foreground md:text-6xl lg:text-7xl">
        Desbloqueando o{" "}
        <span className="relative inline-block">
          <span className="relative z-10">potencial</span>
          <span
            className="absolute -inset-x-2 -inset-y-1 -z-0 rounded-lg opacity-20 blur-md"
            style={{ background: "hsl(270 80% 60%)" }}
            aria-hidden="true"
          />
        </span>{" "}
        do seu provedor
      </h1>

      <p className="relative z-10 mx-auto mt-8 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
        <span className="font-semibold text-foreground">Capacitamos provedores a crescerem</span>{" "}
        na era digital com soluções que otimizam operações, aumentam a eficiência e impulsionam resultados.
      </p>
    </section>
  );
}
