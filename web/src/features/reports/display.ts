import type { Report, ReportHistoryEntry, User } from "@/types";

export function getReportReporter(report: Report): Pick<User, "name" | "email"> | null {
  if (report.reporter) {
    if (typeof report.reporter === "string") return { name: report.reporter, email: "" };
    return report.reporter;
  }
  if (report.user) return report.user;
  if (report.reporterName) return { name: report.reporterName, email: "" };
  return null;
}

export function getHistoryActor(entry: ReportHistoryEntry): string {
  if (typeof entry.changedBy === "object" && entry.changedBy !== null) {
    return entry.changedBy.name;
  }
  if (entry.changedByUser) return entry.changedByUser.name;
  if (entry.user) return entry.user.name;
  if (typeof entry.changedBy === "string" && entry.changedBy.length > 0) {
    return "Pengguna";
  }
  return "Sistem";
}
