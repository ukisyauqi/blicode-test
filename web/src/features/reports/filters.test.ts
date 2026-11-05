import { describe, expect, it } from "vitest";

import {
  countActiveFilters,
  DEFAULT_REPORT_FILTERS,
  parseReportFilters,
  reportFiltersToQuery,
  serializeReportFilters,
} from "@/features/reports/filters";

describe("parseReportFilters", () => {
  it("mengembalikan default untuk query kosong", () => {
    expect(parseReportFilters(new URLSearchParams())).toEqual(DEFAULT_REPORT_FILTERS);
  });

  it("membaca filter yang valid", () => {
    const filters = parseReportFilters(
      new URLSearchParams({
        search: "plastik",
        status: "in_progress",
        category: "plastic",
        from: "2026-01-01",
        to: "2026-01-31",
        reporter: "user-1",
        sort: "created_at_asc",
        page: "2",
        limit: "20",
      }),
    );

    expect(filters).toMatchObject({
      search: "plastik",
      status: "in_progress",
      category: "plastic",
      from: "2026-01-01",
      to: "2026-01-31",
      reporterId: "user-1",
      sort: "created_at_asc",
      page: 2,
      limit: 20,
    });
  });

  it("mengabaikan nilai yang tidak valid", () => {
    const filters = parseReportFilters(
      new URLSearchParams({
        status: "unknown",
        category: "metal",
        from: "31-01-2026",
        sort: "nama",
        page: "-4",
        limit: "1000",
      }),
    );

    expect(filters.status).toBe("");
    expect(filters.category).toBe("");
    expect(filters.from).toBe("");
    expect(filters.sort).toBe("created_at_desc");
    expect(filters.page).toBe(1);
    expect(filters.limit).toBe(10);
  });
});

describe("serializeReportFilters", () => {
  it("tidak menulis nilai default ke URL", () => {
    const params = serializeReportFilters(DEFAULT_REPORT_FILTERS);
    expect(params.toString()).toBe("");
  });

  it("menulis filter dan mempertahankan parameter lain", () => {
    const params = serializeReportFilters(
      {
        ...DEFAULT_REPORT_FILTERS,
        search: "  botol  ",
        status: "pending",
        sort: "status",
        page: 3,
        limit: 50,
      },
      new URLSearchParams({ tab: "baru" }),
    );

    expect(params.get("search")).toBe("botol");
    expect(params.get("status")).toBe("pending");
    expect(params.get("sort")).toBe("status");
    expect(params.get("page")).toBe("3");
    expect(params.get("limit")).toBe("50");
    expect(params.get("tab")).toBe("baru");
  });
});

describe("countActiveFilters", () => {
  it("menghitung filter aktif tanpa pagination dan sort default", () => {
    expect(countActiveFilters(DEFAULT_REPORT_FILTERS)).toBe(0);
    expect(
      countActiveFilters({
        ...DEFAULT_REPORT_FILTERS,
        search: "sampah",
        category: "organic",
        sort: "status",
      }),
    ).toBe(3);
  });
});

describe("reportFiltersToQuery", () => {
  it("memakai reporter_id untuk API", () => {
    const query = reportFiltersToQuery({
      ...DEFAULT_REPORT_FILTERS,
      reporterId: "abc",
      status: "completed",
    });
    expect(query.reporter_id).toBe("abc");
    expect(query.status).toBe("completed");
    expect(query.page).toBe(1);
    expect(query.limit).toBe(10);
  });
});
