import { expect, test } from "./support/fixtures";

import { loginAs } from "./support/mock-api";

test("halaman terproteksi mengarahkan pengunjung ke login", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?redirect=/);
  await expect(page.getByRole("heading", { name: "Selamat datang kembali" })).toBeVisible();
});

test("user dapat masuk dan melihat dashboard miliknya", async ({ page }) => {
  await loginAs(page, "budi@example.com");
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("heading", { name: "Dashboard laporan" })).toBeVisible();
  await expect(page.getByText("Total laporan", { exact: true })).toBeVisible();
  await expect(page.getByText("Hanya laporan Anda")).toBeVisible();
  await expect(page.getByRole("link", { name: "Pengguna" })).toHaveCount(0);
});

test("kredensial salah menampilkan pesan error dari server", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("budi@example.com");
  await page.getByLabel("Password").fill("password-salah");
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page.getByRole("alert")).toContainText("Email atau password salah");
  await expect(page).toHaveURL(/\/login/);
});

test("user biasa tidak dapat membuka halaman manajemen pengguna", async ({ page }) => {
  await loginAs(page, "budi@example.com");
  await page.goto("/users");
  await expect(page).toHaveURL(/\/403/);
  await expect(page.getByRole("heading", { name: "Akses ditolak" })).toBeVisible();
});

test("registrasi membuat akun user baru dan langsung masuk", async ({ page }) => {
  await page.goto("/register");
  await page.getByLabel("Nama lengkap").fill("Rina Wulandari");
  await page.getByLabel("Email").fill("rina@example.com");
  await page.locator('input[name="password"]').fill("password123");
  await page.locator('input[name="confirmPassword"]').fill("password123");
  await page.getByRole("button", { name: "Daftar" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("heading", { name: "Dashboard laporan" })).toBeVisible();
});
