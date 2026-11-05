import { Link } from "react-router-dom";
import { CheckCircle2, ClipboardList, Clock3, LoaderCircle, XCircle } from "lucide-react";

import { STATUS_META } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { DashboardSummary } from "@/types";

const cards = [
  {
    key: "total" as const,
    label: "Total laporan",
    icon: ClipboardList,
    iconClass: "bg-emerald-50 text-emerald-600 ring-emerald-100",
    href: "/reports",
  },
  {
    key: "pending" as const,
    label: STATUS_META.pending.label,
    icon: Clock3,
    iconClass: "bg-amber-50 text-amber-600 ring-amber-100",
    href: "/reports?status=pending",
  },
  {
    key: "in_progress" as const,
    label: STATUS_META.in_progress.label,
    icon: LoaderCircle,
    iconClass: "bg-sky-50 text-sky-600 ring-sky-100",
    href: "/reports?status=in_progress",
  },
  {
    key: "completed" as const,
    label: STATUS_META.completed.label,
    icon: CheckCircle2,
    iconClass: "bg-emerald-50 text-emerald-600 ring-emerald-100",
    href: "/reports?status=completed",
  },
  {
    key: "rejected" as const,
    label: STATUS_META.rejected.label,
    icon: XCircle,
    iconClass: "bg-rose-50 text-rose-600 ring-rose-100",
    href: "/reports?status=rejected",
  },
];

export function SummaryCards({ summary }: { summary: DashboardSummary }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
      {cards.map((card) => (
        <Link
          key={card.key}
          to={card.href}
          className={cn(
            "group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md sm:p-5",
            card.key === "total" && "col-span-2 sm:col-span-1",
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                {card.label}
              </p>
              <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                {summary[card.key].toLocaleString("id-ID")}
              </p>
            </div>
            <span
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1",
                card.iconClass,
              )}
            >
              <card.icon className="h-5 w-5" aria-hidden="true" />
            </span>
          </div>
          <p className="mt-3 text-xs text-slate-400 transition group-hover:text-emerald-600">
            Lihat laporan →
          </p>
        </Link>
      ))}
    </div>
  );
}
