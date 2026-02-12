import { useAuth } from "@/modules/auth/hooks/useAuth";
import HeroCarousel from "@/components/home/HeroCarousel";
import ProjectsSection from "@/components/home/ProjectsSection";

export default function IndexPage() {
  const { session } = useAuth();

  const greeting = session?.name
    ? `Olá, ${session.name.split(" ")[0]}`
    : "Olá";

  return (
    <div className="min-h-[calc(100vh-3.5rem)] w-full">
      <div className="mx-auto w-full max-w-[1900px] space-y-6 p-5 md:p-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">{greeting} 👋</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Aqui está o resumo do seu painel operacional.
          </p>
        </div>

        {/* Hero slides */}
        <HeroCarousel />

        {/* Projects section with tabs */}
        <ProjectsSection />
      </div>
    </div>
  );
}
