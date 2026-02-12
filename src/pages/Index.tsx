import { useAuth } from "@/modules/auth/hooks/useAuth";
import HeroCarousel from "@/components/home/HeroCarousel";
import QuickGuide from "@/components/home/QuickGuide";
import ProfilesSection from "@/components/home/ProfilesSection";
import BenefitsSection from "@/components/home/BenefitsSection";

export default function IndexPage() {
  const { session } = useAuth();

  return (
    <div className="min-h-[calc(100vh-3.5rem)] w-full bg-background">
      <div className="mx-auto w-full max-w-[1900px] space-y-6 p-6 md:p-10">
        {/* Hero header */}
        <section className="animate-fade-in rounded-2xl border border-border bg-card/70 p-8 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.8)]">
          <div className="space-y-3 text-center">
            <h1 className="text-4xl font-bold text-foreground md:text-5xl">
              Painel ISP Consulte
            </h1>
            <p className="mx-auto max-w-3xl text-lg text-muted-foreground">
              Um painel para centralizar rotinas do dia a dia: comodato, integrações, tarefas e cadastros.
            </p>
            <p className="mx-auto max-w-3xl text-lg text-muted-foreground">
              Objetivo: reduzir retrabalho, padronizar processos e dar velocidade ao que é repetitivo.
            </p>
          </div>

          <div className="mx-auto mt-8 w-full max-w-5xl">
            <HeroCarousel />
          </div>
        </section>

        {/* Secondary sections */}
        <div className="animate-fade-in" style={{ animationDelay: "0.1s", animationFillMode: "both" }}>
          <QuickGuide />
        </div>
        <div className="animate-fade-in" style={{ animationDelay: "0.2s", animationFillMode: "both" }}>
          <ProfilesSection />
        </div>
        <div className="animate-fade-in" style={{ animationDelay: "0.3s", animationFillMode: "both" }}>
          <BenefitsSection />
        </div>
      </div>
    </div>
  );
}
