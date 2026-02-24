import HeroSection from "@/components/home/HeroSection";
import StatsCards from "@/components/home/StatsCards";
import FeaturesGrid from "@/components/home/FeaturesGrid";
import QuickGuide from "@/components/home/QuickGuide";
import { usePageSEO } from "@/hooks/usePageSEO";

export default function IndexPage() {
  usePageSEO("/");
  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Full page purple background */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, hsl(270 60% 10%) 0%, hsl(250 50% 8%) 25%, hsl(234 45% 7%) 50%, hsl(260 40% 9%) 75%, hsl(234 45% 6%) 100%)",
        }}
      />
      {/* Subtle orbs */}
      <div
        className="pointer-events-none absolute top-[30%] left-[-10%] h-[600px] w-[600px] rounded-full opacity-20 blur-[160px]"
        style={{ background: "radial-gradient(circle, hsl(270 80% 50%), transparent 70%)" }}
      />
      <div
        className="pointer-events-none absolute top-[60%] right-[-10%] h-[500px] w-[500px] rounded-full opacity-15 blur-[140px]"
        style={{ background: "radial-gradient(circle, hsl(234 89% 50%), transparent 70%)" }}
      />

      <div className="relative z-10 mx-auto w-full max-w-[1400px] space-y-12 sm:space-y-16 px-3 sm:px-6 pt-4 sm:pt-6 md:px-10 pb-16">
        <HeroSection />
        <StatsCards />
        <FeaturesGrid />
        <QuickGuide />
      </div>
    </div>
  );
}
