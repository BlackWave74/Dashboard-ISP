import { useAuth } from "@/modules/auth/hooks/useAuth";
import HeroCarousel from "@/components/home/HeroCarousel";
import QuickGuide from "@/components/home/QuickGuide";
import ProfilesSection from "@/components/home/ProfilesSection";
import BenefitsSection from "@/components/home/BenefitsSection";

export default function IndexPage() {
  const { session } = useAuth();

  const greeting = session?.name
    ? `Olá, ${session.name.split(" ")[0]}`
    : "Olá";

  return (
    <div className="min-h-[calc(100vh-3.5rem)] w-full">
      <div className="mx-auto w-full max-w-[1900px] space-y-6 p-5 md:p-8">
        {/* Header */}
        <section className="space-y-3 text-center">
          <h1 className="text-4xl font-bold text-foreground md:text-5xl">
            Painel ISP Consulte
          </h1>
          <p className="mx-auto max-w-3xl text-lg text-muted-foreground">
            Um painel para centralizar rotinas do dia a dia: comodato, integrações,
            tarefas e cadastros.
          </p>
          <p className="mx-auto max-w-3xl text-lg text-muted-foreground">
            Objetivo: reduzir retrabalho, padronizar processos e dar velocidade ao
            que é repetitivo.
          </p>
        </section>

        {/* Hero slides */}
        <HeroCarousel />

        {/* Quick guide */}
        <QuickGuide />

        {/* Profiles */}
        <ProfilesSection />

        {/* Benefits */}
        <BenefitsSection />
      </div>
    </div>
  );
}
