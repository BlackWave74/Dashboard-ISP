import { useState } from "react";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { IntegrationCard } from "@/modules/integrations/components/IntegrationCard";
import { IntegrationModal } from "@/modules/integrations/components/IntegrationModal";
import { useIntegrations } from "@/modules/integrations/hooks/useIntegrations";
import { IntegrationWithState } from "@/modules/integrations/types/integration";

export default function ConfiguracoesPage() {
  const { session } = useAuth();
  const isAdmin = session?.role === "admin";

  const {
    filteredIntegrations,
    searchTerm,
    setSearchTerm,
    loading: loadingIntegrations,
    connectIntegration,
    disconnectIntegration,
  } = useIntegrations(session?.email ?? null, { canManage: isAdmin });

  const [selectedIntegration, setSelectedIntegration] =
    useState<IntegrationWithState | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = (integration: IntegrationWithState) => {
    setSelectedIntegration(integration);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedIntegration(null);
  };

  return (
    <div className="flex-1 space-y-6">
      <section className="mx-auto flex w-full max-w-[1900px] flex-col gap-6 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.8)]">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-white">Integrações</h1>
              <p className="text-sm text-white/50">
                Conecte seus serviços em poucos cliques.
              </p>
            </div>
            <div className="relative w-full max-w-sm">
              <input
                type="search"
                value={searchTerm}
                placeholder="Buscar por nome ou descrição..."
                onChange={(event) => setSearchTerm(event.target.value)}
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2 pr-9 text-sm text-white outline-none ring-2 ring-transparent transition focus:border-[hsl(234_89%_64%)] focus:ring-[hsl(234_89%_64%/0.3)]"
              />
              <svg
                className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-white/30"
                aria-hidden
                viewBox="0 0 20 20"
                fill="none"
              >
                <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="2" />
                <path
                  d="m14 14 4 4"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>

          {!isAdmin && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              Você está logado como usuário. Apenas administradores podem conectar ou
              desconectar integrações.
            </div>
          )}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          {loadingIntegrations ? (
            Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-36 animate-pulse rounded-2xl border border-white/[0.08] bg-white/[0.03]"
              />
            ))
          ) : filteredIntegrations.length === 0 ? (
            <div className="col-span-full rounded-xl border border-dashed border-white/[0.08] bg-white/[0.02] px-6 py-12 text-center text-white/40">
              Nenhuma integração encontrada para a busca atual.
            </div>
          ) : (
            filteredIntegrations.map((integration) => (
              <IntegrationCard
                key={integration.id}
                integration={integration}
                canManage={isAdmin}
                onSelect={openModal}
              />
            ))
          )}
        </div>
      </section>

      <IntegrationModal
        key={selectedIntegration?.id ?? "sem-integracao"}
        open={isModalOpen}
        integration={selectedIntegration}
        readOnly={!isAdmin}
        readOnlyReason="Somente administradores podem conectar ou desconectar integrações."
        onClose={closeModal}
        onSave={connectIntegration}
        onDisconnect={disconnectIntegration}
      />
    </div>
  );
}
