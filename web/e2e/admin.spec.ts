import { expect, test } from "./support/fixtures";

import { loginAs } from "./support/mock-api";

test("admin menolak laporan dan alasan wajib diisi", async ({ page, mockState }) => {
  await loginAs(page, "admin@example.com");
  await page.goto("/reports/report-1");

  await expect(page.getByRole("heading", { name: "Ubah status" })).toBeVisible();
  await page.getByRole("button", { name: "Tolak laporan" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  await dialog.getByRole("button", { name: "Tolak laporan" }).click();
  await expect(dialog.getByText("Alasan penolakan wajib diisi", { exact: true })).toBeVisible();

  await dialog.getByLabel("Alasan penolakan").fill("Lokasi tidak jelas dan laporan duplikat.");
  await dialog.getByRole("button", { name: "Tolak laporan" }).click();

  await expect(page.getByText("Status diubah menjadi Ditolak")).toBeVisible();
  await expect(page.getByText("Lokasi tidak jelas dan laporan duplikat.").first()).toBeVisible();
  await expect(page.getByText("Laporan ditolak", { exact: true })).toBeVisible();

  const report = mockState.reports.find((item) => item.id === "report-1");
  expect(report?.status).toBe("rejected");
  expect(report?.rejectReason).toBe("Lokasi tidak jelas dan laporan duplikat.");
});

test("admin dapat menambah pengguna baru", async ({ page, mockState }) => {
  await loginAs(page, "admin@example.com");
  await page.goto("/users");

  await expect(page.getByRole("heading", { name: "Manajemen pengguna" })).toBeVisible();
  await page.getByRole("button", { name: "Tambah pengguna" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nama lengkap").fill("Dewi Lestari");
  await dialog.getByLabel("Email").fill("dewi@example.com");
  await dialog.getByLabel("Password").fill("password123");
  await dialog.getByRole("button", { name: "Simpan pengguna" }).click();

  await expect(page.getByText("Pengguna dibuat")).toBeVisible();
  await expect(page.getByRole("link", { name: "Dewi Lestari" }).first()).toBeVisible();
  expect(mockState.users.some((user) => user.email === "dewi@example.com")).toBe(true);
});

test("admin tidak dapat mengubah role, status, atau menghapus akun sendiri", async ({ page }) => {
  await loginAs(page, "admin@example.com");
  await page.goto("/users/user-admin");

  await expect(page.getByText("Ini adalah akun Anda sendiri")).toBeVisible();
  await expect(page.getByLabel("Role")).toBeDisabled();
  await expect(page.getByRole("button", { name: "Nonaktifkan pengguna" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Hapus pengguna" })).toBeDisabled();
  await expect(page.getByText("Tidak dapat menonaktifkan akun sendiri.")).toBeVisible();
  await expect(page.getByText("Tidak dapat menghapus akun sendiri.")).toBeVisible();
});

test("admin dapat menonaktifkan pengguna lain dari tabel", async ({ page, mockState }) => {
  await loginAs(page, "admin@example.com");
  await page.goto("/users");

  await page.getByRole("button", { name: "Nonaktifkan Budi Santoso" }).click();
  await expect(page.getByText("Pengguna dinonaktifkan")).toBeVisible();
  const budi = mockState.users.find((user) => user.id === "user-budi");
  expect(budi?.isActive).toBe(false);
});

test("admin melihat nama pelapor dan aktor riwayat", async ({ page }) => {
  await loginAs(page, "admin@example.com");
  await page.goto("/reports");

  await expect(page.getByRole("columnheader", { name: "Pelapor" })).toBeVisible();
  await expect(page.getByRole("cell", { name: /Budi Santoso/ })).toHaveCount(2);

  await page.goto("/reports/report-1");
  await expect(page.getByText("Budi Santoso").first()).toBeVisible();
  await expect(page.getByText(/Budi Santoso ·/)).toBeVisible();
});
