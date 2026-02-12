import { useAuth } from "@/modules/auth/hooks/useAuth";
import HeroCarousel from "@/components/home/HeroCarousel";
import QuickGuide from "@/components/home/QuickGuide";
import ProfilesSection from "@/components/home/ProfilesSection";
import BenefitsSection from "@/components/home/BenefitsSection";

export default function IndexPage() {
  const { session } = useAuth();

  return (
    <div className="min-h-[calc(100vh-3.5rem)] w-full" style={{ background: "linear-gradient(145deg, hsl(222 47% 5%), hsl(234 50% 8%), hsl(260 40% 7%))" }}>
      <div className="mx-auto w-full max-w-[1900px] space-y-6 p-6 md:p-10">
        {/* Hero header */}
        <section className="rounded-2xl border border-[hsl(var(--dash-border))] p-8 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.8)]" style={{ background: "hsl(var(--dash-surface) / 0.7)" }}>
          <div className="space-y-3 text-center">
            <h1 className="text-4xl font-bold md:text-5xl" style={{ color: "hsl(var(--dash-text))" }}>
              Painel ISP Consulte
            </h1>
            <p className="mx-auto max-w-3xl text-lg" style={{ color: "hsl(var(--dash-text-muted))" }}>
              Um painel para centralizar rotinas do dia a dia: comodato, integrações, tarefas e cadastros.
            </p>
            <p className="mx-auto max-w-3xl text-lg" style={{ color: "hsl(var(--dash-text-muted))" }}>
              Objetivo: reduzir retrabalho, padronizar processos e dar velocidade ao que é repetitivo.
            </p>
          </div>

          <div className="mx-auto mt-8 w-full max-w-5xl">
            <HeroCarousel />
          </div>
        </section>

        {/* Secondary sections */}
        <QuickGuide />
        <ProfilesSection />
        <BenefitsSection />
      </div>
    </div>
  );
}
