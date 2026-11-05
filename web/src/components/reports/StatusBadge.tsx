import { CATEGORY_META, STATUS_META } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { ReportCategory, ReportStatus } from "@/types";

export function StatusBadge({ status, className }: { status: ReportStatus; className?: string }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
        meta.badgeClass,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dotClass)} aria-hidden="true" />
      {meta.label}
    </span>
  );
}

export function CategoryBadge({
  category,
  className,
}: {
  category: ReportCategory;
  className?: string;
}) {
  const meta = CATEGORY_META[category];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
        meta.badgeClass,
        className,
      )}
    >
      <span aria-hidden="true">{meta.emoji}</span>
      {meta.label}
    </span>
  );
}
