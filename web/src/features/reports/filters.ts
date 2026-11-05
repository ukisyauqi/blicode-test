import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import {
  DEFAULT_PAGE_LIMIT,
  REPORT_CATEGORIES,
  REPORT_PAGE_LIMITS,
  REPORT_SORT_OPTIONS,
  REPORT_STATUSES,
  type ReportSort,
} from "@/lib/constants";
import type { ReportCategory, ReportStatus } from "@/types";

export type ReportFilters = {
  search: string;
  status: ReportStatus | "";
  category: ReportCategory | "";
  from: string;
  to: string;
  reporterId: string;
  sort: ReportSort;
  page: number;
  limit: number;
};

export const DEFAULT_REPORT_FILTERS: ReportFilters = {
  search: "",
  status: "",
  category: "",
  from: "",
  to: "",
  reporterId: "",
  sort: "created_at_desc",
  page: 1,
  limit: DEFAULT_PAGE_LIMIT,
};

function isDateInput(value: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00`).getTime())
  );
}

export function parseReportFilters(params: URLSearchParams): ReportFilters {
  const status = params.get("status") ?? "";
  const category = params.get("category") ?? "";
  const sort = params.get("sort") ?? "";
  const page = Number.parseInt(params.get("page") ?? "", 10);
  const limit = Number.parseInt(params.get("limit") ?? "", 10);
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";

  return {
    search: params.get("search") ?? "",
    status: REPORT_STATUSES.includes(status as ReportStatus) ? (status as ReportStatus) : "",
    category: REPORT_CATEGORIES.includes(category as ReportCategory)
      ? (category as ReportCategory)
      : "",
    from: isDateInput(from) ? from : "",
    to: isDateInput(to) ? to : "",
    reporterId: params.get("reporter") ?? "",
    sort: REPORT_SORT_OPTIONS.some((option) => option.value === sort)
      ? (sort as ReportSort)
      : DEFAULT_REPORT_FILTERS.sort,
    page: Number.isFinite(page) && page > 0 ? page : 1,
    limit: REPORT_PAGE_LIMITS.includes(limit as (typeof REPORT_PAGE_LIMITS)[number])
      ? limit
      : DEFAULT_PAGE_LIMIT,
  };
}

export function serializeReportFilters(
  filters: ReportFilters,
  existing?: URLSearchParams,
): URLSearchParams {
  const params = new URLSearchParams(existing);
  const setOrDelete = (key: string, value: string) => {
    if (value) params.set(key, value);
    else params.delete(key);
  };

  setOrDelete("search", filters.search.trim());
  setOrDelete("status", filters.status);
  setOrDelete("category", filters.category);
  setOrDelete("from", filters.from);
  setOrDelete("to", filters.to);
  setOrDelete("reporter", filters.reporterId);
  setOrDelete("sort", filters.sort === DEFAULT_REPORT_FILTERS.sort ? "" : filters.sort);
  setOrDelete("page", filters.page > 1 ? String(filters.page) : "");
  setOrDelete("limit", filters.limit !== DEFAULT_REPORT_FILTERS.limit ? String(filters.limit) : "");

  return params;
}

export function reportFiltersToQuery(filters: ReportFilters): Record<string, string | number> {
  return {
    search: filters.search.trim(),
    status: filters.status,
    category: filters.category,
    from: filters.from,
    to: filters.to,
    reporter_id: filters.reporterId,
    sort: filters.sort,
    page: filters.page,
    limit: filters.limit,
  };
}

export function countActiveFilters(filters: ReportFilters): number {
  return [
    filters.search.trim(),
    filters.status,
    filters.category,
    filters.from,
    filters.to,
    filters.reporterId,
    filters.sort !== DEFAULT_REPORT_FILTERS.sort ? filters.sort : "",
  ].filter(Boolean).length;
}

export function useReportFilters() {
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => parseReportFilters(params), [params]);
  const [searchInput, setSearchInput] = useState(filters.search);

  useEffect(() => {
    setSearchInput(filters.search);
  }, [filters.search]);

  const applyParams = useCallback(
    (next: ReportFilters) => {
      setParams((current) => serializeReportFilters(next, current), { replace: true });
    },
    [setParams],
  );

  const update = useCallback(
    (patch: Partial<ReportFilters>) => {
      const next: ReportFilters = {
        ...filters,
        ...patch,
        ...(!("page" in patch) && !("limit" in patch) ? { page: 1 } : {}),
      };
      applyParams(next);
    },
    [applyParams, filters],
  );

  useEffect(() => {
    const trimmed = searchInput.trim();
    if (trimmed === filters.search.trim()) return;
    const timer = window.setTimeout(() => {
      applyParams({ ...filters, search: trimmed, page: 1 });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput, filters, applyParams]);

  const setPage = useCallback(
    (page: number) => {
      applyParams({ ...filters, page: Math.max(1, page) });
    },
    [applyParams, filters],
  );

  const setLimit = useCallback(
    (limit: number) => {
      applyParams({ ...filters, limit, page: 1 });
    },
    [applyParams, filters],
  );

  const reset = useCallback(() => {
    setSearchInput("");
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        for (const key of [
          "search",
          "status",
          "category",
          "from",
          "to",
          "reporter",
          "sort",
          "page",
          "limit",
        ]) {
          next.delete(key);
        }
        return next;
      },
      { replace: true },
    );
  }, [setParams]);

  return {
    filters,
    searchInput,
    setSearchInput,
    update,
    setPage,
    setLimit,
    reset,
    activeFilterCount: countActiveFilters(filters),
  };
}
