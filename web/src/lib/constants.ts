import type { ReportCategory, ReportStatus } from "@/types";

type StatusMeta = {
  label: string;
  description: string;
  badgeClass: string;
  dotClass: string;
  chartColor: string;
  softClass: string;
};

export const STATUS_META: Record<ReportStatus, StatusMeta> = {
  pending: {
    label: "Menunggu",
    description: "Menunggu tindakan admin",
    badgeClass: "bg-amber-50 text-amber-700 ring-amber-200",
    dotClass: "bg-amber-500",
    chartColor: "#f59e0b",
    softClass: "bg-amber-50 text-amber-700",
  },
  in_progress: {
    label: "Diproses",
    description: "Sedang ditangani",
    badgeClass: "bg-sky-50 text-sky-700 ring-sky-200",
    dotClass: "bg-sky-500",
    chartColor: "#0284c7",
    softClass: "bg-sky-50 text-sky-700",
  },
  completed: {
    label: "Selesai",
    description: "Laporan telah diselesaikan",
    badgeClass: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    dotClass: "bg-emerald-500",
    chartColor: "#059669",
    softClass: "bg-emerald-50 text-emerald-700",
  },
  rejected: {
    label: "Ditolak",
    description: "Laporan ditolak",
    badgeClass: "bg-rose-50 text-rose-700 ring-rose-200",
    dotClass: "bg-rose-500",
    chartColor: "#e11d48",
    softClass: "bg-rose-50 text-rose-700",
  },
};

export const REPORT_STATUSES: ReportStatus[] = ["pending", "in_progress", "completed", "rejected"];

export const STATUS_TRANSITIONS: Record<ReportStatus, ReportStatus[]> = {
  pending: ["in_progress", "rejected"],
  in_progress: ["completed", "rejected"],
  completed: [],
  rejected: [],
};

type CategoryMeta = {
  label: string;
  badgeClass: string;
  chartColor: string;
  emoji: string;
};

export const CATEGORY_META: Record<ReportCategory, CategoryMeta> = {
  organic: {
    label: "Organik",
    badgeClass: "bg-lime-50 text-lime-700 ring-lime-200",
    chartColor: "#65a30d",
    emoji: "🍃",
  },
  plastic: {
    label: "Plastik",
    badgeClass: "bg-sky-50 text-sky-700 ring-sky-200",
    chartColor: "#0284c7",
    emoji: "♳",
  },
  paper: {
    label: "Kertas",
    badgeClass: "bg-orange-50 text-orange-700 ring-orange-200",
    chartColor: "#ea580c",
    emoji: "📄",
  },
};

export const REPORT_CATEGORIES: ReportCategory[] = ["organic", "plastic", "paper"];

export const REPORT_SORT_OPTIONS = [
  { value: "created_at_desc", label: "Terbaru" },
  { value: "created_at_asc", label: "Terlama" },
  { value: "status", label: "Status" },
] as const;

export type ReportSort = (typeof REPORT_SORT_OPTIONS)[number]["value"];

export const REPORT_PAGE_LIMITS = [10, 20, 50] as const;

export const DEFAULT_PAGE_LIMIT = 10;

export const MAX_PHOTO_SIZE = 5 * 1024 * 1024;

export const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export const DEFAULT_MAP_CENTER = { latitude: -6.2088, longitude: 106.8456 };

export const API_DATE_FORMAT = "yyyy-MM-dd";
