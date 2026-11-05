import { api } from "@/lib/api";
import { type ReportFilters, reportFiltersToQuery } from "@/features/reports/filters";
import type {
  ClassifyResult,
  PaginationMeta,
  Report,
  ReportCategory,
  ReportHistoryEntry,
  ReportStatus,
} from "@/types";

export type ReportPayload = {
  title: string;
  description: string;
  address?: string;
  latitude: number;
  longitude: number;
  category?: ReportCategory;
  photo?: File | null;
};

export type ReportListResult = {
  reports: Report[];
  meta: PaginationMeta;
};

function buildReportFormData(input: ReportPayload): FormData {
  const formData = new FormData();
  formData.set("title", input.title);
  formData.set("description", input.description);
  formData.set("latitude", String(input.latitude));
  formData.set("longitude", String(input.longitude));
  if (input.address?.trim()) formData.set("address", input.address.trim());
  if (input.category) formData.set("category", input.category);
  if (input.photo) formData.set("photo", input.photo);
  return formData;
}

function normalizeListMeta(
  meta: PaginationMeta | undefined,
  reports: Report[],
  filters: ReportFilters,
): PaginationMeta {
  const total = meta?.total ?? reports.length;
  return {
    page: meta?.page ?? filters.page,
    limit: meta?.limit ?? filters.limit,
    total,
    totalPages: meta?.totalPages ?? Math.max(1, Math.ceil(total / filters.limit)),
  };
}

export async function listReports(filters: ReportFilters): Promise<ReportListResult> {
  const response = await api.get<Report[]>("/reports", reportFiltersToQuery(filters));
  const reports = Array.isArray(response.data) ? response.data : [];
  return { reports, meta: normalizeListMeta(response.meta, reports, filters) };
}

export async function getReport(id: string): Promise<Report> {
  const response = await api.get<Report>(`/reports/${id}`);
  return response.data;
}

export async function getReportHistory(id: string): Promise<ReportHistoryEntry[]> {
  const response = await api.get<ReportHistoryEntry[] | { history: ReportHistoryEntry[] }>(
    `/reports/${id}/history`,
  );
  if (Array.isArray(response.data)) return response.data;
  if (response.data && Array.isArray(response.data.history)) return response.data.history;
  return [];
}

export async function createReport(input: ReportPayload): Promise<Report> {
  const response = await api.post<Report>("/reports", buildReportFormData(input));
  return response.data;
}

export async function updateReport(id: string, input: ReportPayload): Promise<Report> {
  const response = await api.put<Report>(`/reports/${id}`, buildReportFormData(input));
  return response.data;
}

export async function deleteReport(id: string): Promise<void> {
  await api.delete<void>(`/reports/${id}`);
}

export async function updateReportStatus(
  id: string,
  input: { status: ReportStatus; reason?: string },
): Promise<Report> {
  const response = await api.patch<Report>(`/reports/${id}/status`, input);
  return response.data;
}

export async function classifyPhoto(file: File): Promise<ClassifyResult> {
  const formData = new FormData();
  formData.set("file", file);
  const response = await api.post<ClassifyResult>("/reports/classify", formData);
  return response.data;
}
