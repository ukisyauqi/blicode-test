import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { CATEGORY_META, REPORT_CATEGORIES, REPORT_STATUSES, STATUS_META } from "@/lib/constants";
import type {
  DashboardCategoryPoint,
  DashboardLocationPoint,
  DashboardStats,
  DashboardStatusPoint,
  DashboardSummary,
  DashboardTrendPoint,
  ReportCategory,
  ReportStatus,
} from "@/types";

export const dashboardKeys = {
  all: ["dashboard"] as const,
  stats: (from: string, to: string) => ["dashboard", "stats", from, to] as const,
};

type RawRecord = Record<string, unknown>;

function toNumber(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function asRecord(value: unknown): RawRecord {
  return typeof value === "object" && value !== null ? (value as RawRecord) : {};
}

function readCount(record: RawRecord): number {
  return toNumber(record.count ?? record.total ?? record.value ?? record._count);
}

function normalizeByStatus(raw: unknown, summary: DashboardSummary): DashboardStatusPoint[] {
  const counts = new Map<ReportStatus, number>();

  if (Array.isArray(raw)) {
    for (const item of raw) {
      const record = asRecord(item);
      const status = record.status;
      if (typeof status === "string" && REPORT_STATUSES.includes(status as ReportStatus)) {
        counts.set(status as ReportStatus, readCount(record));
      }
    }
  } else {
    const record = asRecord(raw);
    for (const status of REPORT_STATUSES) {
      if (status in record) counts.set(status, toNumber(record[status]));
    }
  }

  return REPORT_STATUSES.map((status) => ({
    status,
    count: counts.get(status) ?? summary[status] ?? 0,
  }));
}

function normalizeByCategory(raw: unknown): DashboardCategoryPoint[] {
  const counts = new Map<ReportCategory, number>();

  if (Array.isArray(raw)) {
    for (const item of raw) {
      const record = asRecord(item);
      const category = record.category;
      if (typeof category === "string" && REPORT_CATEGORIES.includes(category as ReportCategory)) {
        counts.set(category as ReportCategory, readCount(record));
      }
    }
  } else {
    const record = asRecord(raw);
    for (const category of REPORT_CATEGORIES) {
      if (category in record) counts.set(category, toNumber(record[category]));
    }
  }

  return REPORT_CATEGORIES.map((category) => ({
    category,
    count: counts.get(category) ?? 0,
  }));
}

function normalizeTrend(raw: unknown): DashboardTrendPoint[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      const record = asRecord(item);
      const dateValue = record.date ?? record.day ?? record.createdAt ?? record.created_at;
      const date = typeof dateValue === "string" ? dateValue.slice(0, 10) : "";
      return { date, count: readCount(record) };
    })
    .filter((point) => point.date);
}

function normalizeLocations(raw: unknown): DashboardLocationPoint[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      const record = asRecord(item);
      const nested = asRecord(record.location);
      const latitudeValue = record.latitude ?? record.lat ?? nested.latitude ?? nested.lat;
      const longitudeValue = record.longitude ?? record.lng ?? nested.longitude ?? nested.lng;
      const addressValue = record.address ?? nested.address ?? record.label;
      const postalValue =
        record.postalCode ?? record.postal_code ?? record.postcode ?? nested.postalCode;
      return {
        postalCode: typeof postalValue === "string" && postalValue.trim() ? postalValue.trim() : null,
        latitude: latitudeValue === undefined ? null : toNumber(latitudeValue),
        longitude: longitudeValue === undefined ? null : toNumber(longitudeValue),
        address: typeof addressValue === "string" ? addressValue : null,
        count: readCount(record),
      };
    })
    .filter((point) => point.count > 0);
}

export function normalizeDashboardStats(raw: unknown): DashboardStats {
  const record = asRecord(raw);
  const rawSummary = asRecord(record.summary);

  const summary: DashboardSummary = {
    total: toNumber(rawSummary.total ?? record.total),
    pending: toNumber(rawSummary.pending),
    in_progress: toNumber(rawSummary.in_progress ?? rawSummary.inProgress),
    completed: toNumber(rawSummary.completed),
    rejected: toNumber(rawSummary.rejected),
  };

  const byStatus = normalizeByStatus(record.byStatus, summary);
  const statusTotal = byStatus.reduce((sum, point) => sum + point.count, 0);

  if (summary.total === 0 && statusTotal > 0) summary.total = statusTotal;
  for (const point of byStatus) {
    if (summary[point.status] === 0) summary[point.status] = point.count;
  }
  if (summary.total === 0) {
    summary.total = summary.pending + summary.in_progress + summary.completed + summary.rejected;
  }

  return {
    summary,
    byStatus,
    byCategory: normalizeByCategory(record.byCategory),
    trend: normalizeTrend(record.trend),
    topLocations: normalizeLocations(record.topLocations),
  };
}

export async function getDashboardStats(from: string, to: string): Promise<DashboardStats> {
  const response = await api.get<unknown>("/dashboard/stats", { from, to });
  return normalizeDashboardStats(response.data);
}

export function useDashboardStats(from: string, to: string) {
  return useQuery({
    queryKey: dashboardKeys.stats(from, to),
    queryFn: () => getDashboardStats(from, to),
  });
}

export const dashboardChartMeta = {
  statuses: REPORT_STATUSES.map((status) => ({
    status,
    label: STATUS_META[status].label,
    color: STATUS_META[status].chartColor,
  })),
  categories: REPORT_CATEGORIES.map((category) => ({
    category,
    label: CATEGORY_META[category].label,
    color: CATEGORY_META[category].chartColor,
  })),
};
