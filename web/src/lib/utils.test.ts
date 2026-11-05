import { describe, expect, it } from "vitest";

import {
  formatCategoryWithConfidence,
  formatPercent,
  getInitials,
  safeRedirect,
  truncate,
} from "@/lib/utils";

describe("formatCategoryWithConfidence", () => {
  it("menampilkan label dan persentase", () => {
    expect(formatCategoryWithConfidence("plastic", 0.8734)).toBe("Plastik (87%)");
  });

  it("menangani kategori tanpa confidence", () => {
    expect(formatCategoryWithConfidence("organic", null)).toBe("Organik");
    expect(formatCategoryWithConfidence(null, null)).toBe("Belum ditentukan");
  });
});

describe("formatPercent", () => {
  it("membulatkan sesuai digit", () => {
    expect(formatPercent(0.5)).toBe("50%");
    expect(formatPercent(0.534, 1)).toBe("53.4%");
    expect(formatPercent(undefined)).toBe("-");
  });
});

describe("getInitials", () => {
  it("mengambil maksimal dua inisial", () => {
    expect(getInitials("Budi Santoso")).toBe("BS");
    expect(getInitials("  Siti  ")).toBe("S");
    expect(getInitials("Raka Putra Wijaya")).toBe("RP");
  });
});

describe("safeRedirect", () => {
  it("hanya menerima path internal", () => {
    expect(safeRedirect("/reports?status=pending")).toBe("/reports?status=pending");
    expect(safeRedirect("https://evil.example")).toBe("/dashboard");
    expect(safeRedirect("//evil.example")).toBe("/dashboard");
    expect(safeRedirect(null)).toBe("/dashboard");
  });
});

describe("truncate", () => {
  it("memotong teks panjang dengan elipsis", () => {
    expect(truncate("abcdef", 4)).toBe("abc…");
    expect(truncate("abc", 4)).toBe("abc");
  });
});
