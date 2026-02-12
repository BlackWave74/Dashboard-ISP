import { useAuth } from "@/modules/auth/hooks/useAuth";
import HeroSection from "@/components/home/HeroSection";
import StatsCards from "@/components/home/StatsCards";
import FeaturesGrid from "@/components/home/FeaturesGrid";
import QuickGuide from "@/components/home/QuickGuide";

export default function IndexPage() {
  const { session } = useAuth();

  return (
    <div className="min-h-[calc(100vh-3.5rem)] w-full">
      <div className="mx-auto w-full max-w-[1400px] space-y-16 px-6 py-10 md:px-10">
        <HeroSection name={session?.name} />
        <StatsCards />
        <FeaturesGrid />
        <QuickGuide />
      </div>
    </div>
  );
}
