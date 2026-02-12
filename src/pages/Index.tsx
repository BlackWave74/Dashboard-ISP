import HeroSection from "@/components/home/HeroSection";
import StatsCards from "@/components/home/StatsCards";
import FeaturesGrid from "@/components/home/FeaturesGrid";
import QuickGuide from "@/components/home/QuickGuide";

export default function IndexPage() {
  return (
    <div className="min-h-[calc(100vh-3.5rem)] w-full">
      <div className="mx-auto w-full max-w-[1400px] space-y-20 px-6 py-0 md:px-10">
        <HeroSection />
        <StatsCards />
        <FeaturesGrid />
        <QuickGuide />
      </div>
    </div>
  );
}
