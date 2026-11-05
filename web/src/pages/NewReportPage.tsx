import { useNavigate } from "react-router-dom";

import { PageHeader } from "@/components/ui/PageHeader";
import { ReportForm } from "@/features/reports/ReportForm";

export function NewReportPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Laporan baru"
        title="Buat laporan sampah"
        description="Lengkapi informasi, unggah foto bila ada, dan tandai lokasi sampah pada peta."
        backTo="/reports"
        backLabel="Kembali ke daftar laporan"
      />
      <div className="mx-auto max-w-4xl">
        <ReportForm onSuccess={(report) => navigate(`/reports/${report.id}`)} />
      </div>
    </div>
  );
}
