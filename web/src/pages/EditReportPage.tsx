import { Navigate, useNavigate, useParams } from "react-router-dom";

import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Spinner";
import { useAuth } from "@/features/auth/auth-context";
import { ReportForm } from "@/features/reports/ReportForm";
import { useReport } from "@/features/reports/hooks";
import { getErrorMessage } from "@/lib/utils";

export function EditReportPage() {
  const { id } = useParams<{ id: string }>();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const reportQuery = useReport(id);

  if (reportQuery.isPending) {
    return (
      <div className="space-y-6">
        <PageHeader title="Edit laporan" backTo="/reports" />
        <Card className="space-y-4 p-6">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </Card>
      </div>
    );
  }

  if (reportQuery.isError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Edit laporan" backTo="/reports" />
        <ErrorState
          title="Laporan tidak dapat dimuat"
          message={getErrorMessage(reportQuery.error)}
          onRetry={() => void reportQuery.refetch()}
        />
      </div>
    );
  }

  const report = reportQuery.data;
  const canEdit = isAdmin || (report.userId === user?.id && report.status === "pending");

  if (!canEdit) return <Navigate to="/403" replace />;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Edit laporan"
        title={report.title}
        description="Perbarui informasi laporan. Jika foto diganti, kategori akan diklasifikasi ulang."
        backTo={`/reports/${report.id}`}
        backLabel="Kembali ke detail laporan"
      />
      <div className="mx-auto max-w-4xl">
        <ReportForm report={report} onSuccess={(updated) => navigate(`/reports/${updated.id}`)} />
      </div>
    </div>
  );
}
