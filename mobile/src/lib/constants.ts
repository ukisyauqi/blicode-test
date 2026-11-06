import type { Category, Status } from "../types";

export const CATEGORY_LABEL: Record<Category, string> = {
  organic: "Organik",
  plastic: "Plastik",
  paper: "Kertas",
};

export const STATUS_META: Record<Status, { label: string; fg: string; bg: string }> = {
  pending: { label: "Menunggu", fg: "#92400e", bg: "#fef3c7" },
  in_progress: { label: "Diproses", fg: "#1d4ed8", bg: "#dbeafe" },
  completed: { label: "Selesai", fg: "#15803d", bg: "#dcfce7" },
  rejected: { label: "Ditolak", fg: "#b91c1c", bg: "#fee2e2" },
};

export const CATEGORY_BG: Record<Category, string> = {
  organic: "#dcfce7",
  plastic: "#dbeafe",
  paper: "#fef3c7",
};
