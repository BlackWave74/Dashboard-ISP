import { useAuth } from "@/modules/auth/hooks/useAuth";
import KpiCards from "@/components/home/KpiCards";
import RevenueChart from "@/components/home/RevenueChart";
import OverviewDonut from "@/components/home/OverviewDonut";
import RecentActivity from "@/components/home/RecentActivity";

export default function IndexPage() {
  const { session } = useAuth();

  const greeting = session?.name
    ? `Olá, ${session.name.split(" ")[0]}`
    : "Olá";

  return (
    <div className="min-h-[calc(100vh-3.5rem)] w-full">
      <div className="mx-auto w-full max-w-[1900px] space-y-5 p-5 md:p-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">{greeting} 👋</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Aqui está o resumo do seu painel operacional.
          </p>
        </div>

        {/* KPI row */}
        <KpiCards />

        {/* Charts row */}
        <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
          <RevenueChart />
          <OverviewDonut />
        </div>

        {/* Activity table */}
        <RecentActivity />
      </div>
    </div>
  );
}
