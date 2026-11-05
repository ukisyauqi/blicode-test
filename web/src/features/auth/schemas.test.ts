import { describe, expect, it } from "vitest";

import { changePasswordSchema, loginSchema, registerSchema } from "@/features/auth/schemas";
import { reportSchema } from "@/features/reports/schemas";

describe("loginSchema", () => {
  it("menerima email dan password valid", () => {
    expect(loginSchema.safeParse({ email: "budi@example.com", password: "rahasia" }).success).toBe(
      true,
    );
  });

  it("menolak email tidak valid dan password kosong", () => {
    const result = loginSchema.safeParse({ email: "bukan-email", password: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((issue) => issue.path.join("."));
      expect(paths).toContain("email");
      expect(paths).toContain("password");
    }
  });
});

describe("registerSchema", () => {
  it("menolak konfirmasi password yang berbeda", () => {
    const result = registerSchema.safeParse({
      name: "Budi",
      email: "budi@example.com",
      password: "rahasia123",
      confirmPassword: "rahasia456",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["confirmPassword"]);
    }
  });

  it("menolak password kurang dari 8 karakter", () => {
    const result = registerSchema.safeParse({
      name: "Budi",
      email: "budi@example.com",
      password: "pendek",
      confirmPassword: "pendek",
    });
    expect(result.success).toBe(false);
  });
});

describe("changePasswordSchema", () => {
  it("menerima password baru yang cocok", () => {
    expect(
      changePasswordSchema.safeParse({
        currentPassword: "lama12345",
        newPassword: "baru12345",
        confirmPassword: "baru12345",
      }).success,
    ).toBe(true);
  });
});

describe("reportSchema", () => {
  it("menerima kategori opsional saat ada foto", () => {
    const result = reportSchema.safeParse({
      title: "Sampah plastik",
      description: "Tumpukan sampah plastik di pinggir jalan",
      latitude: -6.2,
      longitude: 106.8,
    });
    expect(result.success).toBe(true);
  });

  it("menolak koordinat di luar rentang", () => {
    const result = reportSchema.safeParse({
      title: "Sampah plastik",
      description: "Tumpukan sampah plastik di pinggir jalan",
      latitude: -91,
      longitude: 200,
    });
    expect(result.success).toBe(false);
  });
});
