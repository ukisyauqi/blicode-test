import { unprocessable } from "./errors.js";
export type ReportStatus = "pending" | "in_progress" | "completed" | "rejected";
export type ReportCategory = "organic" | "plastic" | "paper";

const allowed: Record<ReportStatus, readonly ReportStatus[]> = {
  pending: ["in_progress", "rejected"],
  in_progress: ["completed", "rejected"],
  completed: [],
  rejected: [],
};

export function assertTransition(from: ReportStatus, to: ReportStatus): void {
  if (from === to) throw unprocessable("Status tujuan sama dengan status saat ini");
  if (!allowed[from].includes(to)) {
    throw unprocessable(`Transisi status ${from} ke ${to} tidak diizinkan`);
  }
}
