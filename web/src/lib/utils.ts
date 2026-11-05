import { format, isValid, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import { API_URL, ApiError } from "@/lib/api";
import { CATEGORY_META, STATUS_META } from "@/lib/constants";
import type { ReportCategory, ReportStatus } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = parseISO(value);
  return isValid(date) ? date : null;
}

export function formatDate(value: string | null | undefined, fallback = "-"): string {
  const date = parseDate(value);
  if (!date) return fallback;
  return format(date, "d MMM yyyy", { locale: idLocale });
}

export function formatDateTime(value: string | null | undefined, fallback = "-"): string {
  const date = parseDate(value);
  if (!date) return fallback;
  return format(date, "d MMM yyyy, HH:mm", { locale: idLocale });
}

export function formatDateOnly(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function formatLongDate(value: string | null | undefined, fallback = "-"): string {
  const date = parseDate(value);
  if (!date) return fallback;
  return format(date, "EEEE, d MMMM yyyy", { locale: idLocale });
}

export function formatPercent(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return `${(value * 100).toFixed(digits)}%`;
}

export function formatCategoryWithConfidence(
  category: ReportCategory | null | undefined,
  confidence: number | null | undefined,
): string {
  if (!category) return "Belum ditentukan";
  if (confidence === null || confidence === undefined) return CATEGORY_META[category].label;
  return `${CATEGORY_META[category].label} (${formatPercent(confidence)})`;
}

export function statusLabel(status: ReportStatus): string {
  return STATUS_META[status].label;
}

export function categoryLabel(category: ReportCategory): string {
  return CATEGORY_META[category].label;
}

export function getErrorMessage(error: unknown, fallback = "Terjadi kesalahan"): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function resolvePhotoUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^(https?:)?\/\//.test(path) || path.startsWith("data:")) return path;
  if (typeof window === "undefined") return path;

  try {
    const base = new URL(API_URL, window.location.origin);
    return new URL(path.startsWith("/") ? path : `/${path}`, base.origin).toString();
  } catch {
    return path;
  }
}

export function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function truncate(value: string, max = 80): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trimEnd()}…`;
}

export function formatCoordinates(latitude: number, longitude: number): string {
  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
}

export function plural(count: number, singular: string, pluralWord = `${singular}`): string {
  return `${count} ${count === 1 ? singular : pluralWord}`;
}

export function safeRedirect(value: string | null, fallback = "/dashboard"): string {
  if (!value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}

export function toLocalDateInput(value: string | Date): string {
  const date = typeof value === "string" ? parseISO(value) : value;
  return isValid(date) ? format(date, "yyyy-MM-dd") : "";
}
