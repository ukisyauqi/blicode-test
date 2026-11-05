import { useState } from "react";
import { CheckCircle2, Play, ShieldX, XCircle } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/toast-context";
import { useUpdateReportStatus } from "@/features/reports/hooks";
import { STATUS_META, STATUS_TRANSITIONS } from "@/lib/constants";
import { getErrorMessage } from "@/lib/utils";
import type { Report, ReportStatus } from "@/types";

const actionMeta: Record<
  Exclude<ReportStatus, "pending">,
  { label: string; loadingLabel: string; icon: React.ReactNode; variant: "primary" | "danger" }
> = {
  in_progress: {
    label: "Mulai proses",
    loadingLabel: "Memulai…",
    icon: <Play className="h-4 w-4" aria-hidden="true" />,
    variant: "primary",
  },
  completed: {
    label: "Selesaikan",
    loadingLabel: "Menyelesaikan…",
    icon: <CheckCircle2 className="h-4 w-4" aria-hidden="true" />,
    variant: "primary",
  },
  rejected: {
    label: "Tolak laporan",
    loadingLabel: "Menolak…",
    icon: <XCircle className="h-4 w-4" aria-hidden="true" />,
    variant: "danger",
  },
};

export function StatusActions({ report }: { report: Report }) {
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const mutation = useUpdateReportStatus(report.id);
  const { success, error: showError } = useToast();

  const allowed = STATUS_TRANSITIONS[report.status];

  async function applyStatus(status: ReportStatus, note?: string) {
    setActionError(null);
    try {
      await mutation.mutateAsync({ status, reason: note });
      success(
        `Status diubah menjadi ${STATUS_META[status].label}`,
        "Riwayat laporan telah diperbarui.",
      );
      return true;
    } catch (error) {
      const message = getErrorMessage(error);
      if (note !== undefined) setReasonError(message);
      else setActionError(message);
      showError("Gagal mengubah status", message);
      return false;
    }
  }

  function handleReject() {
    if (!reason.trim()) {
      setReasonError("Alasan penolakan wajib diisi");
      return;
    }
    void applyStatus("rejected", reason.trim()).then((applied) => {
      if (applied) {
        setRejectOpen(false);
        setReason("");
        setReasonError(null);
      }
    });
  }

  return (
    <Card>
      <CardHeader
        title="Ubah status"
        description="Aksi tersedia sesuai transisi status yang valid."
        action={<span className="text-xs font-semibold text-slate-500">Admin</span>}
      />
      <CardContent className="space-y-3">
        {actionError && (
          <div
            role="alert"
            className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700"
          >
            {actionError}
          </div>
        )}

        {allowed.length === 0 ? (
          <div className="flex items-start gap-2.5 rounded-xl bg-slate-50 px-4 py-4 text-sm text-slate-500">
            <ShieldX className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
            Status{" "}
            <strong className="font-semibold text-slate-700">
              {STATUS_META[report.status].label}
            </strong>{" "}
            bersifat final. Tidak ada aksi status lain yang tersedia.
          </div>
        ) : (
          allowed.map((status) => {
            const meta = actionMeta[status as Exclude<ReportStatus, "pending">];
            return (
              <Button
                key={status}
                variant={meta.variant}
                className="w-full"
                loading={mutation.isPending && mutation.variables?.status === status}
                disabled={mutation.isPending}
                leftIcon={meta.icon}
                onClick={() => {
                  if (status === "rejected") {
                    setRejectOpen(true);
                    setReasonError(null);
                  } else {
                    void applyStatus(status);
                  }
                }}
              >
                {meta.label}
              </Button>
            );
          })
        )}

        {report.status === "rejected" && report.rejectReason && (
          <div className="rounded-xl bg-rose-50 p-3 text-xs text-rose-700">
            <p className="font-semibold">Alasan penolakan</p>
            <p className="mt-1">{report.rejectReason}</p>
          </div>
        )}
      </CardContent>

      <Dialog
        open={rejectOpen}
        onOpenChange={(open) => {
          setRejectOpen(open);
          if (!open) {
            setReason("");
            setReasonError(null);
          }
        }}
        title="Tolak laporan"
        description="Alasan penolakan wajib diisi dan akan terlihat pada riwayat laporan."
        size="sm"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setRejectOpen(false)}
              disabled={mutation.isPending}
            >
              Batal
            </Button>
            <Button
              variant="danger"
              loading={mutation.isPending}
              onClick={handleReject}
              leftIcon={<XCircle className="h-4 w-4" aria-hidden="true" />}
            >
              Tolak laporan
            </Button>
          </>
        }
      >
        <Textarea
          label="Alasan penolakan"
          placeholder="Contoh: laporan duplikat atau lokasi tidak jelas"
          value={reason}
          onChange={(event) => {
            setReason(event.target.value);
            if (reasonError) setReasonError(null);
          }}
          error={reasonError ?? undefined}
          rows={4}
          required
          autoFocus
        />
      </Dialog>
    </Card>
  );
}
