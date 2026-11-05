import { Link, useParams } from "react-router-dom";
import { CalendarDays, Edit3, History, MapPin, SearchX, Tag, UserRound } from "lucide-react";

import { ReportMap } from "@/components/map/ReportMap";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Spinner";
import { ReportPhoto } from "@/components/reports/ReportPhoto";
import { CategoryBadge, StatusBadge } from "@/components/reports/StatusBadge";
import { StatusHistory } from "@/components/reports/StatusHistory";
import { buttonClassName } from "@/components/ui/button-styles";
import { useAuth } from "@/features/auth/auth-context";
import { DeleteReportButton } from "@/features/reports/DeleteReportButton";
import { StatusActions } from "@/features/reports/StatusActions";
import { getReportReporter } from "@/features/reports/display";
import { useReport, useReportHistory } from "@/features/reports/hooks";
import { ApiError } from "@/lib/api";
import { STATUS_META } from "@/lib/constants";
import {
  categoryLabel,
  formatCategoryWithConfidence,
  formatCoordinates,
  formatDate,
  formatDateTime,
  getErrorMessage,
} from "@/lib/utils";

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-2/3" />
      </div>
      <Card className="p-6">
        <div className="flex gap-3">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </Card>
      <div className="grid gap-5 lg:grid-cols-[1.7fr_1fr]">
        <div className="space-y-5">
          <Card className="p-6">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-4 h-24 w-full" />
          </Card>
          <Card className="p-6">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-4 h-64 w-full" />
          </Card>
        </div>
        <Card className="p-6">
          <Skeleton className="h-4 w-24" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-4 w-full" />
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function DetailRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
        {icon}
      </span>
      <div className="min-w-0">
        <dt className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{label}</dt>
        <dd className="mt-0.5 text-sm break-words text-slate-800">{children}</dd>
      </div>
    </div>
  );
}

export function ReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, isAdmin } = useAuth();
  const reportQuery = useReport(id);
  const historyQuery = useReportHistory(id);

  if (reportQuery.isPending) return <DetailSkeleton />;

  if (reportQuery.isError) {
    if (reportQuery.error instanceof ApiError && reportQuery.error.status === 404) {
      return (
        <div className="space-y-6">
          <PageHeader title="Detail laporan" backTo="/reports" />
          <EmptyState
            icon={<SearchX className="h-6 w-6" />}
            title="Laporan tidak ditemukan"
            description="Laporan mungkin sudah dihapus atau tidak dapat Anda akses."
            action={
              <Link to="/reports" className={buttonClassName({ size: "md" })}>
                Kembali ke daftar laporan
              </Link>
            }
          />
        </div>
      );
    }
    return (
      <div className="space-y-6">
        <PageHeader title="Detail laporan" backTo="/reports" />
        <ErrorState
          message={getErrorMessage(reportQuery.error)}
          onRetry={() => void reportQuery.refetch()}
        />
      </div>
    );
  }

  const report = reportQuery.data;
  const reporter = getReportReporter(report);
  const isOwner = report.userId === user?.id;
  const canEdit = isAdmin || (isOwner && report.status === "pending");
  const canDelete = isAdmin || (isOwner && report.status === "pending");
  const corrected =
    report.predictedCategory && report.predictedCategory !== report.category
      ? report.predictedCategory
      : null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Detail laporan"
        title={report.title}
        description={`Dibuat ${formatDateTime(report.createdAt)}${reporter ? ` oleh ${reporter.name}` : ""}`}
        backTo="/reports"
        backLabel="Kembali ke daftar laporan"
        actions={
          <>
            {canEdit && (
              <Link
                to={`/reports/${report.id}/edit`}
                className={buttonClassName({ variant: "outline", size: "md" })}
              >
                <Edit3 className="h-4 w-4" aria-hidden="true" />
                Edit
              </Link>
            )}
            {canDelete && <DeleteReportButton reportId={report.id} />}
          </>
        }
      />

      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={report.status} />
          <CategoryBadge category={report.category} />
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
            {formatDateTime(report.createdAt)}
          </span>
          {isAdmin && reporter && (
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
              <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
              {reporter.name}
            </span>
          )}
          {report.address && (
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              {report.address}
            </span>
          )}
        </div>
      </Card>

      {report.status === "rejected" && report.rejectReason && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-800">
          <p className="font-semibold">Laporan ditolak</p>
          <p className="mt-1 text-rose-700">{report.rejectReason}</p>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1.7fr_1fr]">
        <div className="space-y-5">
          <Card>
            <CardHeader title="Deskripsi" />
            <CardContent>
              <p className="text-sm leading-relaxed whitespace-pre-line text-slate-700">
                {report.description}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader
              title="Foto laporan"
              description={report.photoUrl ? undefined : "Pelapor tidak mengunggah foto."}
            />
            <CardContent>
              <ReportPhoto
                src={report.photoUrl}
                alt={`Foto laporan ${report.title}`}
                aspect="aspect-[16/10]"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Lokasi" description={report.address ?? "Lokasi pada peta"} />
            <CardContent>
              <ReportMap
                latitude={report.latitude}
                longitude={report.longitude}
                title={report.title}
                address={report.address}
              />
              <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
                <MapPin className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                {formatCoordinates(report.latitude, report.longitude)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader
              title="Riwayat status"
              description="Setiap perubahan status dicatat otomatis."
              action={
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                  <History className="h-3.5 w-3.5" aria-hidden="true" />
                  {historyQuery.data?.length ?? 0} catatan
                </span>
              }
            />
            <CardContent>
              {historyQuery.isPending ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <Skeleton key={index} className="h-12 w-full" />
                  ))}
                </div>
              ) : historyQuery.isError ? (
                <div className="rounded-xl bg-slate-50 px-4 py-4 text-sm text-slate-500">
                  Riwayat status tidak dapat dimuat.{" "}
                  <button
                    type="button"
                    onClick={() => void historyQuery.refetch()}
                    className="font-semibold text-emerald-700 hover:underline"
                  >
                    Coba lagi
                  </button>
                </div>
              ) : (
                <StatusHistory entries={historyQuery.data ?? []} />
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          {isAdmin && <StatusActions report={report} />}

          <Card>
            <CardHeader title="Informasi laporan" />
            <CardContent>
              <dl className="space-y-4">
                <DetailRow
                  icon={<UserRound className="h-4 w-4" aria-hidden="true" />}
                  label="Pelapor"
                >
                  {reporter?.name ?? "-"}
                  {isAdmin && reporter?.email && (
                    <span className="block text-xs text-slate-500">{reporter.email}</span>
                  )}
                </DetailRow>

                <DetailRow
                  icon={<Tag className="h-4 w-4" aria-hidden="true" />}
                  label="Kategori akhir"
                >
                  {categoryLabel(report.category)}
                  {report.predictedCategory && (
                    <span className="mt-1 block text-xs text-slate-500">
                      Prediksi model:{" "}
                      {formatCategoryWithConfidence(
                        report.predictedCategory,
                        report.predictedConfidence,
                      )}
                    </span>
                  )}
                  {corrected && (
                    <span className="mt-1 block text-xs text-amber-700">
                      Kategori dikoreksi dari prediksi model.
                    </span>
                  )}
                </DetailRow>

                <DetailRow
                  icon={<CalendarDays className="h-4 w-4" aria-hidden="true" />}
                  label="Dibuat"
                >
                  {formatDate(report.createdAt)}
                </DetailRow>

                <DetailRow
                  icon={<History className="h-4 w-4" aria-hidden="true" />}
                  label="Diperbarui"
                >
                  {formatDateTime(report.updatedAt)}
                </DetailRow>

                <DetailRow
                  icon={<MapPin className="h-4 w-4" aria-hidden="true" />}
                  label="Koordinat"
                >
                  {formatCoordinates(report.latitude, report.longitude)}
                  {report.address && (
                    <span className="mt-1 block text-xs text-slate-500">{report.address}</span>
                  )}
                </DetailRow>
              </dl>

              <div className="mt-5 rounded-xl bg-slate-50 px-3 py-2.5 text-xs text-slate-500">
                Status saat ini:{" "}
                <strong className="font-semibold text-slate-700">
                  {STATUS_META[report.status].label}
                </strong>{" "}
                — {STATUS_META[report.status].description}.
              </div>
            </CardContent>
          </Card>

          {!isAdmin && isOwner && report.status === "pending" && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Laporan masih menunggu. Anda dapat mengedit atau menghapusnya selama status belum
              diproses.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
