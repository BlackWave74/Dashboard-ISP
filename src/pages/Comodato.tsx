import { Package } from "lucide-react";

export default function ComodatoPage() {
  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Package className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Comodato</h1>
      </div>
      <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
        <p>Controle de equipamentos em comodato será implementado aqui.</p>
      </div>
    </div>
  );
}
