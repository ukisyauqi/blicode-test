import { ArrowRight, Clock } from "lucide-react";

import { StatusBadge } from "@/components/reports/StatusBadge";
import { getHistoryActor } from "@/features/reports/display";
import { formatDateTime } from "@/lib/utils";
import type { ReportHistoryEntry } from "@/types";

export function StatusHistory({ entries }: { entries: ReportHistoryEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-5 text-sm text-slate-500">
        <Clock className="h-4 w-4" aria-hidden="true" />
        Belum ada riwayat status.
      </div>
    );
  }

  return (
    <ol className="relative space-y-5 border-l border-slate-200 pl-6">
      {entries.map((entry, index) => (
        <li key={entry.id ?? `${entry.toStatus}-${index}`} className="relative">
          <span
            className="absolute top-1.5 -left-[1.85rem] h-3 w-3 rounded-full border-2 border-white bg-emerald-500 shadow ring-1 ring-slate-200"
            aria-hidden="true"
          />
          <div className="flex flex-wrap items-center gap-2">
            {entry.fromStatus ? (
              <>
                <StatusBadge status={entry.fromStatus} />
                <ArrowRight className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                <StatusBadge status={entry.toStatus} />
              </>
            ) : (
              <>
                <span className="text-xs font-semibold text-slate-500">Laporan dibuat</span>
                <ArrowRight className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                <StatusBadge status={entry.toStatus} />
              </>
            )}
          </div>
          {entry.note && <p className="mt-2 text-sm text-slate-600">{entry.note}</p>}
          <p className="mt-1 text-xs text-slate-500">
            {getHistoryActor(entry)} · {formatDateTime(entry.createdAt)}
          </p>
        </li>
      ))}
    </ol>
  );
}
