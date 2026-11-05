import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/toast-context";
import { useDeleteReport } from "@/features/reports/hooks";
import { getErrorMessage } from "@/lib/utils";

export function DeleteReportButton({ reportId }: { reportId: string }) {
  const [open, setOpen] = useState(false);
  const mutation = useDeleteReport();
  const navigate = useNavigate();
  const { success, error: showError } = useToast();

  function handleDelete() {
    mutation.mutate(reportId, {
      onSuccess: () => {
        setOpen(false);
        success("Laporan dihapus", "Laporan telah dihapus dari daftar.");
        navigate("/reports", { replace: true });
      },
      onError: (error) => {
        showError("Gagal menghapus laporan", getErrorMessage(error));
      },
    });
  }

  return (
    <>
      <Button
        variant="outline"
        size="md"
        onClick={() => setOpen(true)}
        leftIcon={<Trash2 className="h-4 w-4 text-rose-600" aria-hidden="true" />}
        className="border-rose-200 text-rose-700 hover:bg-rose-50"
      >
        Hapus
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Hapus laporan?"
        description="Laporan akan dihapus dari daftar dan statistik. Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Hapus laporan"
        onConfirm={handleDelete}
        loading={mutation.isPending}
        destructive
      />
    </>
  );
}
