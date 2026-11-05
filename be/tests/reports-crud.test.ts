import request from "supertest";
import { describe, expect, it } from "vitest";

import { app, createReport, registerAdmin, registerUser } from "./helpers.js";

describe("CRUD laporan", () => {
  it("list dibatasi ke pemilik, admin melihat semua, reporter_id hanya untuk admin", async () => {
    const owner = await registerUser("owner@example.com");
    const other = await registerUser("other@example.com");
    const admin = await registerAdmin();

    await createReport(owner.cookie, { title: "Satu" });
    await createReport(owner.cookie, { title: "Dua" });
    await createReport(other.cookie, { title: "Tiga" });

    const own = await request(app).get("/api/reports").set("Cookie", owner.cookie);
    expect(own.status).toBe(200);
    expect(own.body.data).toHaveLength(2);
    expect(own.body.meta).toMatchObject({ page: 1, limit: 10, total: 2, totalPages: 1 });

    const all = await request(app).get("/api/reports").set("Cookie", admin.cookie);
    expect(all.body.meta.total).toBe(3);

    const filtered = await request(app)
      .get("/api/reports")
      .query({ reporter_id: owner.user.id })
      .set("Cookie", admin.cookie);
    expect(filtered.body.meta.total).toBe(2);
  });

  it("get hanya untuk pemilik atau admin", async () => {
    const owner = await registerUser("owner@example.com");
    const other = await registerUser("other@example.com");
    const admin = await registerAdmin();
    const report = await createReport(owner.cookie);

    expect(
      (await request(app).get(`/api/reports/${report.id}`).set("Cookie", owner.cookie)).status,
    ).toBe(200);
    expect(
      (await request(app).get(`/api/reports/${report.id}`).set("Cookie", other.cookie)).status,
    ).toBe(404);
    expect(
      (await request(app).get(`/api/reports/${report.id}`).set("Cookie", admin.cookie)).status,
    ).toBe(200);
  });

  it("update hanya saat pending untuk pemilik, admin selalu boleh", async () => {
    const owner = await registerUser("owner@example.com");
    const admin = await registerAdmin();
    const report = await createReport(owner.cookie);

    const updated = await request(app)
      .put(`/api/reports/${report.id}`)
      .set("Cookie", owner.cookie)
      .send({ title: "Judul baru", category: "paper" });
    expect(updated.status).toBe(200);
    expect(updated.body.data).toMatchObject({ title: "Judul baru", category: "paper" });

    await request(app)
      .patch(`/api/reports/${report.id}/status`)
      .set("Cookie", admin.cookie)
      .send({ status: "in_progress" });

    const denied = await request(app)
      .put(`/api/reports/${report.id}`)
      .set("Cookie", owner.cookie)
      .send({ title: "Tidak boleh" });
    expect(denied.status).toBe(409);

    const byAdmin = await request(app)
      .put(`/api/reports/${report.id}`)
      .set("Cookie", admin.cookie)
      .send({ title: "Diubah admin" });
    expect(byAdmin.status).toBe(200);
    expect(byAdmin.body.data.title).toBe("Diubah admin");
  });

  it("update tanpa perubahan ditolak 422", async () => {
    const owner = await registerUser("owner@example.com");
    const report = await createReport(owner.cookie);
    const response = await request(app)
      .put(`/api/reports/${report.id}`)
      .set("Cookie", owner.cookie)
      .send({});
    expect(response.status).toBe(422);
  });

  it("delete adalah soft delete dan hanya saat pending", async () => {
    const owner = await registerUser("owner@example.com");
    const admin = await registerAdmin();
    const report = await createReport(owner.cookie);

    expect(
      (await request(app).delete(`/api/reports/${report.id}`).set("Cookie", owner.cookie)).status,
    ).toBe(204);
    expect(
      (await request(app).get(`/api/reports/${report.id}`).set("Cookie", owner.cookie)).status,
    ).toBe(404);

    const second = await createReport(owner.cookie, { title: "Kedua" });
    await request(app)
      .patch(`/api/reports/${second.id}/status`)
      .set("Cookie", admin.cookie)
      .send({ status: "in_progress" });

    expect(
      (await request(app).delete(`/api/reports/${second.id}`).set("Cookie", owner.cookie)).status,
    ).toBe(409);
    expect(
      (await request(app).delete(`/api/reports/${second.id}`).set("Cookie", admin.cookie)).status,
    ).toBe(204);
  });

  it("filter, pencarian, urutan, dan pagination", async () => {
    const owner = await registerUser("owner@example.com");
    const admin = await registerAdmin();
    await createReport(owner.cookie, {
      title: "Botol plastik",
      description: "plastik",
      category: "plastic",
    });
    await createReport(owner.cookie, {
      title: "Kertas bekas",
      description: "kertas",
      category: "paper",
    });
    await createReport(owner.cookie, {
      title: "Daun kering",
      description: "organik",
      category: "organic",
    });
    const fourth = await createReport(owner.cookie, {
      title: "Botol kaca",
      description: "plastik",
      category: "plastic",
    });

    await request(app)
      .patch(`/api/reports/${fourth.id}/status`)
      .set("Cookie", admin.cookie)
      .send({ status: "in_progress" });

    const byCategory = await request(app)
      .get("/api/reports")
      .query({ category: "plastic" })
      .set("Cookie", owner.cookie);
    expect(byCategory.body.meta.total).toBe(2);

    const bySearch = await request(app)
      .get("/api/reports")
      .query({ search: "kertas" })
      .set("Cookie", owner.cookie);
    expect(bySearch.body.data).toHaveLength(1);

    const byStatus = await request(app)
      .get("/api/reports")
      .query({ status: "in_progress" })
      .set("Cookie", owner.cookie);
    expect(byStatus.body.data[0].id).toBe(fourth.id);

    const page = await request(app)
      .get("/api/reports")
      .query({ page: 2, limit: 3, sort: "created_at_asc" })
      .set("Cookie", owner.cookie);
    expect(page.body.data).toHaveLength(1);
    expect(page.body.meta).toMatchObject({ page: 2, limit: 3, total: 4, totalPages: 2 });

    const byDate = await request(app)
      .get("/api/reports")
      .query({
        from: new Date(Date.now() - 60_000).toISOString(),
        to: new Date(Date.now() + 60_000).toISOString(),
      })
      .set("Cookie", owner.cookie);
    expect(byDate.body.meta.total).toBe(4);
  });
});
