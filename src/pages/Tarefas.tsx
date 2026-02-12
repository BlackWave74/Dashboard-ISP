import { ListTodo } from "lucide-react";

export default function TarefasPage() {
  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <ListTodo className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Tarefas</h1>
      </div>
      <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
        <p>Módulo de tarefas será implementado aqui.</p>
        <p className="mt-1 text-sm">Conexão com Supabase já configurada.</p>
      </div>
    </div>
  );
}
