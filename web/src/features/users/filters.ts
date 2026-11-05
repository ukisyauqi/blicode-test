import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { type UserFilters, type UserStatusFilter } from "@/features/users/api";
import { DEFAULT_PAGE_LIMIT, REPORT_PAGE_LIMITS } from "@/lib/constants";
import type { Role } from "@/types";

export const DEFAULT_USER_FILTERS: UserFilters = {
  search: "",
  role: "",
  status: "all",
  page: 1,
  limit: DEFAULT_PAGE_LIMIT,
};

function parseUserFilters(params: URLSearchParams): UserFilters {
  const role = params.get("role") ?? "";
  const status = params.get("status") ?? "all";
  const page = Number.parseInt(params.get("page") ?? "", 10);
  const limit = Number.parseInt(params.get("limit") ?? "", 10);

  return {
    search: params.get("search") ?? "",
    role: role === "admin" || role === "user" ? (role as Role) : "",
    status:
      status === "active" || status === "inactive" || status === "all"
        ? (status as UserStatusFilter)
        : "all",
    page: Number.isFinite(page) && page > 0 ? page : 1,
    limit: REPORT_PAGE_LIMITS.includes(limit as (typeof REPORT_PAGE_LIMITS)[number])
      ? limit
      : DEFAULT_PAGE_LIMIT,
  };
}

function serializeUserFilters(filters: UserFilters, existing?: URLSearchParams): URLSearchParams {
  const params = new URLSearchParams(existing);
  const setOrDelete = (key: string, value: string) => {
    if (value) params.set(key, value);
    else params.delete(key);
  };

  setOrDelete("search", filters.search.trim());
  setOrDelete("role", filters.role);
  setOrDelete("status", filters.status === "all" ? "" : filters.status);
  setOrDelete("page", filters.page > 1 ? String(filters.page) : "");
  setOrDelete("limit", filters.limit !== DEFAULT_PAGE_LIMIT ? String(filters.limit) : "");
  return params;
}

export function useUsersFilters() {
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => parseUserFilters(params), [params]);
  const [searchInput, setSearchInput] = useState(filters.search);

  useEffect(() => {
    setSearchInput(filters.search);
  }, [filters.search]);

  const apply = useCallback(
    (next: UserFilters) => {
      setParams((current) => serializeUserFilters(next, current), { replace: true });
    },
    [setParams],
  );

  const update = useCallback(
    (patch: Partial<UserFilters>) => {
      apply({
        ...filters,
        ...patch,
        ...(!("page" in patch) && !("limit" in patch) ? { page: 1 } : {}),
      });
    },
    [apply, filters],
  );

  useEffect(() => {
    const trimmed = searchInput.trim();
    if (trimmed === filters.search.trim()) return;
    const timer = window.setTimeout(() => {
      apply({ ...filters, search: trimmed, page: 1 });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput, filters, apply]);

  const setPage = useCallback(
    (page: number) => apply({ ...filters, page: Math.max(1, page) }),
    [apply, filters],
  );

  const setLimit = useCallback(
    (limit: number) => apply({ ...filters, limit, page: 1 }),
    [apply, filters],
  );

  const reset = useCallback(() => {
    setSearchInput("");
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        for (const key of ["search", "role", "status", "page", "limit"]) next.delete(key);
        return next;
      },
      { replace: true },
    );
  }, [setParams]);

  const activeFilterCount = [
    filters.search.trim(),
    filters.role,
    filters.status !== "all" ? filters.status : "",
  ].filter(Boolean).length;

  return {
    filters,
    searchInput,
    setSearchInput,
    update,
    setPage,
    setLimit,
    reset,
    activeFilterCount,
  };
}
