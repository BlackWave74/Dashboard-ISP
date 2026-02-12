import { Users, Award, Clock, CheckCircle } from "lucide-react";

const stats = [
  {
    icon: Users,
    value: "7k+",
    label: "Clientes atendidos",
    desc: "Provedores satisfeitos e em crescimento.",
  },
  {
    icon: Award,
    value: "8+",
    label: "Anos de experiência",
    desc: "Expertise impulsionando o sucesso do seu negócio.",
  },
  {
    icon: Clock,
    value: "24/7",
    label: "Suporte disponível",
    desc: "Sempre prontos para ajudar quando você precisar.",
  },
  {
    icon: CheckCircle,
    value: "50+",
    label: "Projetos entregues",
    desc: "Soluções de sucesso implementadas com excelência.",
  },
];

export default function StatsCards() {
  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((s) => (
        <div
          key={s.label}
          className="group relative overflow-hidden rounded-2xl bg-card/60 p-6 backdrop-blur-sm transition-all duration-300 hover:bg-card/80 hover:shadow-lg hover:shadow-primary/5"
        >
          {/* Subtle top accent line */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <s.icon className="h-5 w-5 text-primary" />
          </div>
          <p className="text-3xl font-extrabold text-foreground">{s.value}</p>
          <p className="mt-1 text-sm font-semibold text-foreground">{s.label}</p>
          <p className="mt-1 text-xs text-muted-foreground">{s.desc}</p>
        </div>
      ))}
    </section>
  );
}
