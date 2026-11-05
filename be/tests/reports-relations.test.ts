import { eq } from "drizzle-orm";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { db } from "../src/db/index.js";
import { users } from "../src/db/schema.js";
import { app, createReport } from "./helpers.js";

async function registerNamed(
  email: string,
  name: string,
  role: "admin" | "user" = "user",
): Promise<{ cookie: string; user: { id: string; name: string; email: string; role: string } }> {
  const response = await request(app)
    .post("/api/auth/register")
    .send({ name, email, password: "password123" });
  const user = response.body.data as { id: string; name: string; email: string; role: string };
  if (role === "admin") {
    await db.update(users).set({ role: "admin" }).where(eq(users.id, user.id));
  }
  return { cookie: response.headers["set-cookie"]![0]!, user: { ...user, role } };
}

describe("relasi pelapor dan aktor riwayat", () => {
  it("respons create menyertakan reporter", async () => {
    const owner = await registerNamed("owner@example.com", "Budi Santoso");
    const report = await createReport(owner.cookie);

    expect(report.reporter).toMatchObject({
      id: owner.user.id,
      name: "Budi Santoso",
      email: "owner@example.com",
      role: "user",
    });
  });

  it("list admin menyertakan reporter dan filter reporter_id tetap bekerja", async () => {
    const owner = await registerNamed("owner@example.com", "Budi Santoso");
    const other = await registerNamed("other@example.com", "Siti Aminah");
    const admin = await registerNamed("admin@example.com", "Admin QA", "admin");

    await createReport(owner.cookie, { title: "Satu" });
    await createReport(owner.cookie, { title: "Dua" });
    await createReport(other.cookie, { title: "Tiga" });

    const all = await request(app).get("/api/reports").set("Cookie", admin.cookie);
    expect(all.status).toBe(200);
    expect(all.body.data).toHaveLength(3);
    for (const item of all.body.data) {
      expect(item.reporter?.name).toBeTruthy();
    }

    const filtered = await request(app)
      .get("/api/reports")
      .query({ reporter_id: owner.user.id })
      .set("Cookie", admin.cookie);
    expect(filtered.body.meta.total).toBe(2);
    expect(filtered.body.data.every((item: { reporter: { name: string } }) => item.reporter.name === "Budi Santoso")).toBe(true);
  });

  it("detail laporan menyertakan reporter untuk pemilik dan admin", async () => {
    const owner = await registerNamed("owner@example.com", "Budi Santoso");
    const admin = await registerNamed("admin@example.com", "Admin QA", "admin");
    const report = await createReport(owner.cookie);

    for (const cookie of [owner.cookie, admin.cookie]) {
      const response = await request(app).get(`/api/reports/${report.id}`).set("Cookie", cookie);
      expect(response.status).toBe(200);
      expect(response.body.data.reporter).toMatchObject({
        id: owner.user.id,
        name: "Budi Santoso",
        email: "owner@example.com",
      });
    }
  });

  it("user lain tetap mendapat 404 tanpa kebocoran reporter", async () => {
    const owner = await registerNamed("owner@example.com", "Budi Santoso");
    const other = await registerNamed("other@example.com", "Siti Aminah");
    const report = await createReport(owner.cookie);

    const response = await request(app)
      .get(`/api/reports/${report.id}`)
      .set("Cookie", other.cookie);
    expect(response.status).toBe(404);
    expect(response.body.data).toBeUndefined();
  });

  it("riwayat status menyertakan changedByUser untuk pelapor dan admin", async () => {
    const owner = await registerNamed("owner@example.com", "Budi Santoso");
    const admin = await registerNamed("admin@example.com", "Admin QA", "admin");
    const report = await createReport(owner.cookie);

    await request(app)
      .patch(`/api/reports/${report.id}/status`)
      .set("Cookie", admin.cookie)
      .send({ status: "in_progress" });

    const history = await request(app)
      .get(`/api/reports/${report.id}/history`)
      .set("Cookie", owner.cookie);
    expect(history.status).toBe(200);
    expect(history.body.data).toHaveLength(2);
    expect(history.body.data[0].changedByUser).toMatchObject({
      id: owner.user.id,
      name: "Budi Santoso",
    });
    expect(history.body.data[1].changedByUser).toMatchObject({
      id: admin.user.id,
      name: "Admin QA",
    });
    expect(history.body.data[1].changedBy).toBe(admin.user.id);
  });

  it("user yang sudah di-soft-delete tetap tampil di laporan dan riwayat", async () => {
    const owner = await registerNamed("owner@example.com", "Budi Santoso");
    const admin = await registerNamed("admin@example.com", "Admin QA", "admin");
    const report = await createReport(owner.cookie);

    await db.update(users).set({ deletedAt: new Date() }).where(eq(users.id, owner.user.id));

    const detail = await request(app).get(`/api/reports/${report.id}`).set("Cookie", admin.cookie);
    expect(detail.status).toBe(200);
    expect(detail.body.data.reporter.name).toBe("Budi Santoso");

    const history = await request(app)
      .get(`/api/reports/${report.id}/history`)
      .set("Cookie", admin.cookie);
    expect(history.status).toBe(200);
    expect(history.body.data[0].changedByUser.name).toBe("Budi Santoso");
  });

  it("respons update dan ubah status juga menyertakan reporter", async () => {
    const owner = await registerNamed("owner@example.com", "Budi Santoso");
    const admin = await registerNamed("admin@example.com", "Admin QA", "admin");
    const report = await createReport(owner.cookie);

    const updated = await request(app)
      .put(`/api/reports/${report.id}`)
      .set("Cookie", owner.cookie)
      .send({ title: "Judul baru" });
    expect(updated.status).toBe(200);
    expect(updated.body.data.reporter.name).toBe("Budi Santoso");

    const moved = await request(app)
      .patch(`/api/reports/${report.id}/status`)
      .set("Cookie", admin.cookie)
      .send({ status: "in_progress" });
    expect(moved.status).toBe(200);
    expect(moved.body.data.reporter.name).toBe("Budi Santoso");
  });
});
