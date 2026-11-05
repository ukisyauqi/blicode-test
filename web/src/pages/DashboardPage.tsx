import { BarChart3, PieChart } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Spinner";
import { useAuth } from "@/features/auth/auth-context";
import { useDashboardStats } from "@/features/dashboard/api";
import {
  CategoryBarChart,
  StatusDonutChart,
  TopLocations,
  TrendChart,
} from "@/features/dashboard/components/DashboardCharts";
import { PeriodFilter } from "@/features/dashboard/components/PeriodFilter";
import { SummaryCards } from "@/features/dashboard/components/SummaryCards";
import { useDashboardPeriod } from "@/features/dashboard/period";
import { formatDate, getErrorMessage } from "@/lib/utils";

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Card key={index} className="p-5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-4 h-8 w-16" />
            <Skeleton className="mt-4 h-3 w-24" />
          </Card>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="p-6">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mx-auto mt-6 h-48 w-48 rounded-full" />
        </Card>
        <Card className="p-6">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-6 h-48 w-full" />
        </Card>
        <Card className="p-6">
          <Skeleton className="h-4 w-32" />
          <div className="mt-5 space-y-2">
            {Array.from({ length: 4 }).map((__, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </div>
        </Card>
      </div>
      <Card className="p-6">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-5 h-56 w-full" />
      </Card>
    </div>
  );
}

export function DashboardPage() {
  const { user, isAdmin } = useAuth();
  const { period, setPeriod } = useDashboardPeriod();
  const statsQuery = useDashboardStats(period.from, period.to);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Ringkasan"
        title={isAdmin ? "Dashboard admin" : "Dashboard laporan"}
        description={
          isAdmin
            ? "Pantau seluruh laporan sampah, status penanganan, dan tren masuknya laporan."
            : "Pantau perkembangan laporan sampah yang Anda kirimkan."
        }
        actions={<PeriodFilter period={period} onChange={setPeriod} />}
      />

      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 ring-1 ring-slate-200">
          <BarChart3 className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
          Periode {formatDate(period.from)} – {formatDate(period.to)}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 ring-1 ring-slate-200">
          <PieChart className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
          {isAdmin ? "Semua pengguna" : "Hanya laporan Anda"}
        </span>
        {user && (
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700 ring-1 ring-emerald-100">
            {isAdmin ? "Admin" : "User"}
          </span>
        )}
      </div>

      {statsQuery.isPending ? (
        <DashboardSkeleton />
      ) : statsQuery.isError ? (
        <ErrorState
          title="Gagal memuat dashboard"
          message={getErrorMessage(statsQuery.error)}
          onRetry={() => void statsQuery.refetch()}
        />
      ) : (
        <div className="space-y-4">
          <SummaryCards summary={statsQuery.data.summary} />

          <div className="grid gap-4 xl:grid-cols-3">
            <StatusDonutChart data={statsQuery.data} />
            <CategoryBarChart data={statsQuery.data} />
            <TopLocations data={statsQuery.data} />
          </div>

          <TrendChart data={statsQuery.data} />
        </div>
      )}
    </div>
  );
}
