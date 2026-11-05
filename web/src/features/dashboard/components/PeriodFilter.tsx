import { CalendarDays } from "lucide-react";

import { Input } from "@/components/ui/Input";
import type { DashboardPeriod, DashboardPeriodKey } from "@/features/dashboard/period";
import { cn } from "@/lib/utils";

const presets: Array<{ key: DashboardPeriodKey; label: string }> = [
  { key: "7d", label: "7 hari" },
  { key: "30d", label: "30 hari" },
  { key: "custom", label: "Kustom" },
];

export function PeriodFilter({
  period,
  onChange,
}: {
  period: DashboardPeriod;
  onChange: (key: DashboardPeriodKey, from?: string, to?: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
      <div className="flex items-center gap-1">
        <span className="hidden items-center gap-1.5 px-2 text-xs font-semibold text-slate-500 sm:flex">
          <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
          Periode
        </span>
        <div className="flex w-full rounded-xl bg-slate-100 p-1 sm:w-auto">
          {presets.map((preset) => (
            <button
              key={preset.key}
              type="button"
              onClick={() => onChange(preset.key)}
              className={cn(
                "flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition sm:flex-none",
                period.key === preset.key
                  ? "bg-white text-emerald-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-700",
              )}
              aria-pressed={period.key === preset.key}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {period.key === "custom" && (
        <div className="mt-2 grid gap-2 border-t border-slate-100 px-1 pt-3 sm:grid-cols-2">
          <Input
            label="Dari"
            type="date"
            value={period.from}
            max={period.to}
            onChange={(event) => onChange("custom", event.target.value, period.to)}
            containerClassName="[&_label]:text-xs"
          />
          <Input
            label="Sampai"
            type="date"
            value={period.to}
            min={period.from}
            onChange={(event) => onChange("custom", period.from, event.target.value)}
            containerClassName="[&_label]:text-xs"
          />
        </div>
      )}
    </div>
  );
}
