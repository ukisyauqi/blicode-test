import { Link } from "react-router-dom";
import { ClipboardList, Inbox, Plus, SearchX } from "lucide-react";

import { buttonClassName } from "@/components/ui/button-styles";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { Skeleton, Spinner } from "@/components/ui/Spinner";
import { ReportFiltersPanel } from "@/components/reports/ReportFilters";
import { ReportTable } from "@/components/reports/ReportTable";
import { useAuth } from "@/features/auth/auth-context";
import { useReports } from "@/features/reports/hooks";
import { useReportFilters } from "@/features/reports/filters";
import { useReporterOptions } from "@/features/users/api";
import { getErrorMessage } from "@/lib/utils";

function ReportsSkeleton() {
  return (
    <div className="divide-y divide-slate-100">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="flex items-center gap-4 px-5 py-4">
          <div className="min-w-0 flex-1">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="mt-2 h-3 w-1/3" />
          </div>
          <Skeleton className="hidden h-6 w-20 rounded-full sm:block" />
          <Skeleton className="hidden h-6 w-24 rounded-full sm:block" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function ReportsPage() {
  const { isAdmin } = useAuth();
  const {
    filters,
    searchInput,
    setSearchInput,
    update,
    setPage,
    setLimit,
    reset,
    activeFilterCount,
  } = useReportFilters();
  const reportsQuery = useReports(filters);
  const reporterQuery = useReporterOptions(isAdmin);

  const reports = reportsQuery.data?.reports ?? [];
  const meta = reportsQuery.data?.meta;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Manajemen laporan"
        title="Laporan sampah"
        description={
          isAdmin
            ? "Telusuri seluruh laporan dari semua pengguna, filter berdasarkan status, kategori, tanggal, dan pelapor."
            : "Daftar laporan sampah yang Anda kirimkan beserta status penanganannya."
        }
        actions={
          <Link to="/reports/new" className={buttonClassName({ size: "md" })}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Buat laporan
          </Link>
        }
      />

      <ReportFiltersPanel
        filters={filters}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        onFilterChange={update}
        onReset={reset}
        isAdmin={isAdmin}
        reporters={reporterQuery.data?.users ?? []}
        reportersLoading={reporterQuery.isPending}
        activeFilterCount={activeFilterCount}
      />

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <ClipboardList className="h-4 w-4 text-emerald-600" aria-hidden="true" />
            Hasil pencarian
            {meta && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">
                {meta.total}
              </span>
            )}
          </div>
          {reportsQuery.isFetching && !reportsQuery.isPending && (
            <span className="inline-flex items-center gap-2 text-xs text-slate-500" role="status">
              <Spinner className="h-4 w-4" />
              Memperbarui…
            </span>
          )}
        </div>

        {reportsQuery.isPending ? (
          <ReportsSkeleton />
        ) : reportsQuery.isError ? (
          <div className="p-5">
            <ErrorState
              message={getErrorMessage(reportsQuery.error)}
              onRetry={() => void reportsQuery.refetch()}
            />
          </div>
        ) : reports.length === 0 ? (
          <EmptyState
            icon={
              activeFilterCount > 0 ? (
                <SearchX className="h-6 w-6" />
              ) : (
                <Inbox className="h-6 w-6" />
              )
            }
            title={activeFilterCount > 0 ? "Tidak ada laporan yang cocok" : "Belum ada laporan"}
            description={
              activeFilterCount > 0
                ? "Coba ubah kata kunci atau hapus beberapa filter untuk melihat hasil lainnya."
                : "Belum ada laporan sampah yang tercatat. Buat laporan pertama Anda untuk mulai memantau penanganannya."
            }
            action={
              activeFilterCount > 0 ? (
                <button
                  type="button"
                  onClick={reset}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Reset filter
                </button>
              ) : (
                <Link to="/reports/new" className={buttonClassName({ size: "md" })}>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Buat laporan
                </Link>
              )
            }
          />
        ) : (
          <>
            <ReportTable reports={reports} isAdmin={isAdmin} />
            {meta && <Pagination meta={meta} onPageChange={setPage} onLimitChange={setLimit} />}
          </>
        )}
      </Card>
    </div>
  );
}
