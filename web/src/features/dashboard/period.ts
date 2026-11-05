import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { subDays } from "date-fns";

import { formatDateOnly } from "@/lib/utils";

export type DashboardPeriodKey = "7d" | "30d" | "custom";

export type DashboardPeriod = {
  key: DashboardPeriodKey;
  from: string;
  to: string;
};

function isDateInput(value: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00`).getTime())
  );
}

function defaultRange(): { from: string; to: string } {
  const today = new Date();
  return {
    from: formatDateOnly(subDays(today, 29)),
    to: formatDateOnly(today),
  };
}

export function useDashboardPeriod() {
  const [params, setParams] = useSearchParams();
  const fallback = useMemo(() => defaultRange(), []);
  const rawPeriod = params.get("period") ?? "30d";
  const key: DashboardPeriodKey = rawPeriod === "7d" || rawPeriod === "custom" ? rawPeriod : "30d";

  const period = useMemo<DashboardPeriod>(() => {
    const today = new Date();
    if (key === "7d") {
      return {
        key,
        from: formatDateOnly(subDays(today, 6)),
        to: formatDateOnly(today),
      };
    }
    if (key === "30d") {
      return {
        key,
        from: formatDateOnly(subDays(today, 29)),
        to: formatDateOnly(today),
      };
    }
    const rawFrom = params.get("from") ?? "";
    const rawTo = params.get("to") ?? "";
    return {
      key,
      from: isDateInput(rawFrom) ? rawFrom : fallback.from,
      to: isDateInput(rawTo) ? rawTo : fallback.to,
    };
  }, [fallback, key, params]);

  function setPeriod(nextKey: DashboardPeriodKey, nextFrom?: string, nextTo?: string) {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.set("period", nextKey);
        if (nextKey === "custom") {
          const range = defaultRange();
          next.set("from", isDateInput(nextFrom ?? "") ? (nextFrom as string) : range.from);
          next.set("to", isDateInput(nextTo ?? "") ? (nextTo as string) : range.to);
        } else {
          next.delete("from");
          next.delete("to");
        }
        return next;
      },
      { replace: true },
    );
  }

  return { period, setPeriod };
}
