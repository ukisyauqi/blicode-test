import { expect, test } from "./support/fixtures";

import { loginAs } from "./support/mock-api";

test("membuat laporan dengan foto dan kategori otomatis", async ({ page, mockState }) => {
  await loginAs(page, "budi@example.com");
  await page.goto("/reports/new");

  await page.getByLabel("Judul laporan").fill("Sampah plastik di depan sekolah");
  await page
    .getByLabel("Deskripsi")
    .fill("Tumpukan botol plastik menutupi sebagian trotoar di depan sekolah dasar.");

  await page.locator('input[type="file"]').setInputFiles("e2e/fixtures/sample.png");
  await expect(page.getByText(/Kategori otomatis: Plastik \(87%\)/)).toBeVisible();
  await expect(page.getByRole("radio", { name: /Plastik/ })).toHaveAttribute(
    "aria-checked",
    "true",
  );

  await page.getByRole("button", { name: "Kirim laporan" }).click();
  await expect(page).toHaveURL(/\/reports\/report-4$/);
  await expect(
    page.getByRole("heading", { name: "Sampah plastik di depan sekolah" }),
  ).toBeVisible();
  await expect(page.getByText("Menunggu").first()).toBeVisible();

  const created = mockState.reports.find((report) => report.id === "report-4");
  expect(created?.title).toBe("Sampah plastik di depan sekolah");
  expect(created?.category).toBe("plastic");
  expect(created?.photoUrl).not.toBeNull();
});

test("filter status dan pencarian tersimpan di URL", async ({ page }) => {
  await loginAs(page, "budi@example.com");
  await page.goto("/reports");

  await page.getByLabel("Status", { exact: true }).selectOption("pending");
  await expect(page).toHaveURL(/status=pending/);
  await expect(page.getByText("Tumpukan sampah plastik di pasar").first()).toBeVisible();
  await expect(page.getByText("Sampah organik di taman kota")).toHaveCount(0);

  await page.getByLabel("Cari laporan").fill("organik");
  await expect(page).toHaveURL(/search=organik/, { timeout: 3_000 });
  await expect(page.getByText("Tidak ada laporan yang cocok")).toBeVisible();

  await page.getByRole("button", { name: "Reset filter" }).first().click();
  await expect(page).not.toHaveURL(/status=pending|search=organik/);
  await expect(page.getByText("Tumpukan sampah plastik di pasar").first()).toBeVisible();
});

test("pemilik dapat menghapus laporan yang masih pending", async ({ page, mockState }) => {
  await loginAs(page, "budi@example.com");
  await page.goto("/reports/report-1");

  await page.getByRole("button", { name: "Hapus" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "Hapus laporan" }).click();

  await expect(page).toHaveURL(/\/reports$/);
  await expect(page.getByText("Laporan dihapus")).toBeVisible();
  expect(mockState.reports.some((report) => report.id === "report-1")).toBe(false);
});
