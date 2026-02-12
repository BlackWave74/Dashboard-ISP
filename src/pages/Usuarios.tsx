import { UserPlus } from "lucide-react";

export default function UsuariosPage() {
  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <UserPlus className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Usuários</h1>
      </div>
      <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
        <p>Cadastro e gestão de usuários será implementado aqui.</p>
      </div>
    </div>
  );
}
