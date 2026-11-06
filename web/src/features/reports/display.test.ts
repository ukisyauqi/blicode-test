import { describe, expect, it } from "vitest";

import { getHistoryActor, getReportReporter } from "@/features/reports/display";
import type { Report, ReportHistoryEntry, User } from "@/types";

const reporter: User = {
  id: "user-1",
  name: "Budi Santoso",
  email: "budi@example.com",
  role: "user",
};

function report(overrides: Partial<Report>): Report {
  // postalCode dipisah agar spread Partial tidak membuat field wajib jadi opsional.
  const { postalCode = null, ...rest } = overrides;
  return {
    id: "report-1",
    userId: reporter.id,
    title: "Sampah",
    description: "Deskripsi",
    category: "plastic",
    address: null,
    postalCode,
    latitude: -6.2,
    longitude: 106.8,
    photoUrl: null,
    predictedCategory: null,
    predictedConfidence: null,
    status: "pending",
    rejectReason: null,
    createdAt: "2026-11-05T00:00:00.000Z",
    updatedAt: "2026-11-05T00:00:00.000Z",
    ...rest,
  };
}

function history(overrides: Partial<ReportHistoryEntry>): ReportHistoryEntry {
  return {
    id: "history-1",
    reportId: "report-1",
    fromStatus: null,
    toStatus: "pending",
    changedBy: reporter.id,
    note: null,
    createdAt: "2026-11-05T00:00:00.000Z",
    ...overrides,
  };
}

describe("getReportReporter", () => {
  it("memprioritaskan reporter dari API", () => {
    expect(getReportReporter(report({ reporter }))).toEqual(reporter);
  });

  it("mendukung reporter berupa string", () => {
    expect(getReportReporter(report({ reporter: "Budi" }))).toEqual({
      name: "Budi",
      email: "",
    });
  });

  it("fallback ke user lalu reporterName", () => {
    expect(getReportReporter(report({ user: reporter }))).toEqual(reporter);
    expect(getReportReporter(report({ reporterName: "Budi" }))).toEqual({
      name: "Budi",
      email: "",
    });
  });

  it("mengembalikan null jika tidak ada data pelapor", () => {
    expect(getReportReporter(report({}))).toBeNull();
  });
});

describe("getHistoryActor", () => {
  it("memprioritaskan changedByUser", () => {
    expect(getHistoryActor(history({ changedByUser: reporter }))).toBe("Budi Santoso");
  });

  it("mendukung changedBy berupa objek user", () => {
    expect(getHistoryActor(history({ changedBy: reporter }))).toBe("Budi Santoso");
  });

  it("menampilkan Pengguna untuk changedBy string tanpa relasi", () => {
    expect(getHistoryActor(history({ changedBy: reporter.id }))).toBe("Pengguna");
  });
});
