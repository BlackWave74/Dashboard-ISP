import { Activity, Database, ListChecks, ShieldCheck } from "lucide-react";

const stats = [
  {
    icon: Activity,
    title: "Alta Eficiência",
    desc: "Processos otimizados para máxima produtividade no dia a dia.",
  },
  {
    icon: Database,
    title: "Controle de Dados",
    desc: "Informações organizadas e acessíveis em tempo real.",
  },
  {
    icon: ListChecks,
    title: "Gestão de Tarefas",
    desc: "Acompanhe demandas, prazos e entregas de forma visual.",
  },
  {
    icon: ShieldCheck,
    title: "Resultados Confiáveis",
    desc: "Rastreabilidade e padrão para decisões mais seguras.",
  },
];

export default function StatsCards() {
  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((s) => (
        <div
          key={s.title}
          className="group relative overflow-hidden rounded-2xl bg-card/60 p-6 backdrop-blur-sm transition-all duration-300 hover:bg-card/80 hover:shadow-lg hover:shadow-primary/5"
        >
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <s.icon className="h-5 w-5 text-primary" />
          </div>
          <p className="text-base font-semibold text-foreground">{s.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">{s.desc}</p>
        </div>
      ))}
    </section>
  );
}
