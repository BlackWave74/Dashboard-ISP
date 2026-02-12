import { Activity, Database, ListChecks, ShieldCheck } from "lucide-react";

const stats = [
  {
    icon: Activity,
    title: "Alta Eficiência",
    desc: "Processos otimizados para máxima produtividade no dia a dia.",
    featured: false,
  },
  {
    icon: Database,
    title: "Controle de Dados",
    desc: "Informações organizadas e acessíveis em tempo real.",
    featured: true,
  },
  {
    icon: ListChecks,
    title: "Gestão de Tarefas",
    desc: "Acompanhe demandas, prazos e entregas de forma visual.",
    featured: false,
  },
  {
    icon: ShieldCheck,
    title: "Resultados Confiáveis",
    desc: "Rastreabilidade e padrão para decisões mais seguras.",
    featured: false,
  },
];

export default function StatsCards() {
  return (
    <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((s, i) => (
        <div
          key={s.title}
          className={`group relative overflow-hidden rounded-2xl p-6 backdrop-blur-sm transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl ${
            s.featured
              ? "bg-gradient-to-br from-primary/40 via-primary/15 to-card/80 shadow-xl shadow-primary/15 scale-[1.02]"
              : "bg-card/40 hover:bg-card/60 hover:shadow-primary/10"
          }`}
          style={{
            opacity: 0,
            animation: `fadeSlideUp 0.6s ease-out ${i * 150}ms forwards`,
          }}
        >
          {/* Top glow line */}
          <div className={`absolute inset-x-0 top-0 h-px ${
            s.featured
              ? "bg-gradient-to-r from-transparent via-primary/80 to-transparent"
              : "bg-gradient-to-r from-transparent via-primary/20 to-transparent"
          }`} />

          {/* Left accent line for featured */}
          {s.featured && (
            <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-primary/60 to-transparent" />
          )}

          {/* Corner glow for featured */}
          {s.featured && (
            <div
              className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full opacity-40 blur-3xl"
              style={{ background: "hsl(270 80% 55%)" }}
              aria-hidden="true"
            />
          )}

          <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-300 ${
            s.featured
              ? "bg-primary/30 shadow-md shadow-primary/20"
              : "bg-primary/10 group-hover:bg-primary/20 group-hover:shadow-md group-hover:shadow-primary/10"
          }`}>
            <s.icon className={`h-5 w-5 transition-transform duration-300 group-hover:scale-110 ${
              s.featured ? "text-primary-foreground" : "text-primary"
            }`} />
          </div>
          <p className="text-base font-bold text-foreground">{s.title}</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
        </div>
      ))}
    </section>
  );
}
