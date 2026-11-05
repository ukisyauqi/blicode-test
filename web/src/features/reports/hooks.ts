import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { dashboardKeys } from "@/features/dashboard/api";
import {
  classifyPhoto,
  createReport,
  deleteReport,
  getReport,
  getReportHistory,
  listReports,
  updateReport,
  updateReportStatus,
  type ReportPayload,
} from "@/features/reports/api";
import type { ReportFilters } from "@/features/reports/filters";
import type { ReportStatus } from "@/types";

export const reportKeys = {
  all: ["reports"] as const,
  list: (filters: ReportFilters) => ["reports", "list", filters] as const,
  detail: (id: string) => ["reports", "detail", id] as const,
  history: (id: string) => ["reports", "history", id] as const,
};

export function useReports(filters: ReportFilters) {
  return useQuery({
    queryKey: reportKeys.list(filters),
    queryFn: () => listReports(filters),
    placeholderData: (previous) => previous,
  });
}

export function useReport(id: string | undefined) {
  return useQuery({
    queryKey: reportKeys.detail(id ?? ""),
    queryFn: () => getReport(id!),
    enabled: Boolean(id),
  });
}

export function useReportHistory(id: string | undefined) {
  return useQuery({
    queryKey: reportKeys.history(id ?? ""),
    queryFn: () => getReportHistory(id!),
    enabled: Boolean(id),
  });
}

export function useCreateReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createReport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reportKeys.all });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
    },
  });
}

export function useUpdateReport(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ReportPayload) => updateReport(id, input),
    onSuccess: (report) => {
      queryClient.setQueryData(reportKeys.detail(id), report);
      queryClient.invalidateQueries({ queryKey: ["reports", "list"] });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
    },
  });
}

export function useDeleteReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteReport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reportKeys.all });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
    },
  });
}

export function useUpdateReportStatus(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { status: ReportStatus; reason?: string }) => updateReportStatus(id, input),
    onSuccess: (report) => {
      queryClient.setQueryData(reportKeys.detail(id), report);
      queryClient.invalidateQueries({ queryKey: reportKeys.history(id) });
      queryClient.invalidateQueries({ queryKey: ["reports", "list"] });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
    },
  });
}

export function useClassifyPhoto() {
  return useMutation({
    mutationFn: classifyPhoto,
  });
}
