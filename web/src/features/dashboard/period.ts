import { useCallback, useEffect, useMemo, useState } from "react";
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

function presetRange(key: "7d" | "30d"): Pick<DashboardPeriod, "from" | "to"> {
  const today = new Date();
  if (key === "7d") {
    return { from: formatDateOnly(subDays(today, 6)), to: formatDateOnly(today) };
  }
  return { from: formatDateOnly(subDays(today, 29)), to: formatDateOnly(today) };
}

function resolvePeriod(
  params: URLSearchParams,
  fallback: Pick<DashboardPeriod, "from" | "to">,
): DashboardPeriod {
  const rawPeriod = params.get("period") ?? "30d";
  const key: DashboardPeriodKey =
    rawPeriod === "7d" || rawPeriod === "custom" ? rawPeriod : "30d";
  if (key === "7d" || key === "30d") return { key, ...presetRange(key) };
  const rawFrom = params.get("from") ?? "";
  const rawTo = params.get("to") ?? "";
  return {
    key,
    from: isDateInput(rawFrom) ? rawFrom : fallback.from,
    to: isDateInput(rawTo) ? rawTo : fallback.to,
  };
}

function samePeriod(a: DashboardPeriod, b: DashboardPeriod): boolean {
  return a.key === b.key && a.from === b.from && a.to === b.to;
}

export function useDashboardPeriod() {
  const [params, setParams] = useSearchParams();
  const fallback = useMemo(() => defaultRange(), []);
  const urlPeriod = useMemo(() => resolvePeriod(params, fallback), [params, fallback]);
  // Optimistic local state so the active preset and range update immediately on click.
  // React Router's useSearchParams can lag a render behind window.location in some
  // navigation flows, which previously left the URL and UI out of sync.
  const [period, setPeriodState] = useState<DashboardPeriod>(urlPeriod);

  useEffect(() => {
    setPeriodState((current) => (samePeriod(current, urlPeriod) ? current : urlPeriod));
  }, [urlPeriod]);

  const setPeriod = useCallback(
    (nextKey: DashboardPeriodKey, nextFrom?: string, nextTo?: string) => {
      let next: DashboardPeriod;
      if (nextKey === "7d" || nextKey === "30d") {
        next = { key: nextKey, ...presetRange(nextKey) };
      } else {
        const range = defaultRange();
        next = {
          key: "custom",
          from: isDateInput(nextFrom ?? "") ? (nextFrom as string) : range.from,
          to: isDateInput(nextTo ?? "") ? (nextTo as string) : range.to,
        };
      }
      setPeriodState(next);

      const nextParams = new URLSearchParams();
      nextParams.set("period", nextKey);
      if (nextKey === "custom") {
        nextParams.set("from", next.from);
        nextParams.set("to", next.to);
      }
      setParams(nextParams, { replace: true });
    },
    [setParams],
  );

  return { period, setPeriod };
}
