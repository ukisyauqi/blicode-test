import { describe, expect, it } from "vitest";

import { normalizeDashboardStats } from "@/features/dashboard/api";

describe("normalizeDashboardStats", () => {
  it("menormalkan summary dan array status/kategori", () => {
    const stats = normalizeDashboardStats({
      summary: { total: 10, pending: 2, in_progress: 3, completed: 4, rejected: 1 },
      byStatus: [
        { status: "pending", count: 2 },
        { status: "in_progress", count: 3 },
        { status: "completed", count: 4 },
        { status: "rejected", count: 1 },
      ],
      byCategory: [
        { category: "organic", count: 4 },
        { category: "plastic", count: 5 },
        { category: "paper", count: 1 },
      ],
      trend: [{ date: "2026-01-01T00:00:00.000Z", count: 3 }],
      topLocations: [
        { postalCode: "10310", latitude: -6.2, longitude: 106.8, address: "Jakarta", count: 4 },
      ],
    });

    expect(stats.summary).toEqual({
      total: 10,
      pending: 2,
      in_progress: 3,
      completed: 4,
      rejected: 1,
    });
    expect(stats.byStatus.every((point) => point.count >= 0)).toBe(true);
    expect(stats.byCategory).toHaveLength(3);
    expect(stats.trend[0]).toEqual({ date: "2026-01-01", count: 3 });
    expect(stats.topLocations[0]?.address).toBe("Jakarta");
    expect(stats.topLocations[0]?.postalCode).toBe("10310");
  });

  it("mendukung bentuk objek dan menghitung total dari status", () => {
    const stats = normalizeDashboardStats({
      byStatus: { pending: 1, in_progress: 2, completed: 3, rejected: 4 },
      byCategory: { organic: 2, plastic: 3, paper: 1 },
      topLocations: [{ location: { lat: -6.1, lng: 106.7, address: "Bandung" }, total: 2 }],
    });

    expect(stats.summary.total).toBe(10);
    expect(stats.summary.completed).toBe(3);
    expect(stats.topLocations[0]).toEqual({
      postalCode: null,
      latitude: -6.1,
      longitude: 106.7,
      address: "Bandung",
      count: 2,
    });
  });

  it("mengembalikan struktur kosong untuk data tidak valid", () => {
    const stats = normalizeDashboardStats(null);
    expect(stats.summary.total).toBe(0);
    expect(stats.byStatus).toHaveLength(4);
    expect(stats.byCategory).toHaveLength(3);
    expect(stats.trend).toEqual([]);
  });
});
