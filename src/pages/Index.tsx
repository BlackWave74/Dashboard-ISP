import { Home, ListTodo, UserPlus, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/modules/auth/hooks/useAuth";

const cards = [
  { title: "Tarefas", desc: "Acompanhe e gerencie tarefas", icon: ListTodo, url: "/tarefas", color: "text-blue-500" },
  { title: "Usuários", desc: "Cadastro e gestão de usuários", icon: UserPlus, url: "/usuarios", color: "text-emerald-500" },
  { title: "Comodato", desc: "Controle de equipamentos", icon: Package, url: "/comodato", color: "text-amber-500" },
];

export default function IndexPage() {
  const { session } = useAuth();
  const navigate = useNavigate();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">
          Olá, {session?.name || "Usuário"} 👋
        </h1>
        <p className="mt-1 text-muted-foreground">
          Bem-vindo ao painel ISP Consulte.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <button
            key={card.title}
            onClick={() => navigate(card.url)}
            className="flex items-start gap-4 rounded-xl border border-border bg-card p-5 text-left shadow-sm transition-all hover:shadow-md hover:border-primary/30"
          >
            <div className={`mt-0.5 rounded-lg bg-muted p-2.5 ${card.color}`}>
              <card.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-card-foreground">{card.title}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{card.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
