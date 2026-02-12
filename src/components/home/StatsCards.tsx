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
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((s, i) => (
        <div
          key={s.title}
          className={`group relative overflow-hidden rounded-2xl p-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl animate-fade-in ${
            s.featured
              ? "bg-gradient-to-br from-primary/30 via-primary/10 to-card/80 shadow-lg shadow-primary/10"
              : "bg-card/50 hover:bg-card/70 hover:shadow-primary/5"
          }`}
          style={{ animationDelay: `${i * 100}ms`, animationFillMode: "both" }}
        >
          {/* Top glow line */}
          <div className={`absolute inset-x-0 top-0 h-px ${
            s.featured
              ? "bg-gradient-to-r from-transparent via-primary to-transparent"
              : "bg-gradient-to-r from-transparent via-primary/30 to-transparent"
          }`} />

          {/* Corner glow for featured */}
          {s.featured && (
            <div
              className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-30 blur-2xl"
              style={{ background: "hsl(270 80% 60%)" }}
              aria-hidden="true"
            />
          )}

          <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
            s.featured ? "bg-primary/25" : "bg-primary/10 group-hover:bg-primary/20"
          }`}>
            <s.icon className="h-5 w-5 text-primary" />
          </div>
          <p className="text-base font-bold text-foreground">{s.title}</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
        </div>
      ))}
    </section>
  );
}
