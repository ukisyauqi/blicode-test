import request from "supertest";
import { describe, expect, it } from "vitest";

import { app, createReport, registerAdmin, registerUser } from "./helpers.js";

describe("status dan riwayat", () => {
  it("hanya admin yang bisa mengubah status", async () => {
    const owner = await registerUser("owner@example.com");
    const report = await createReport(owner.cookie);
    const response = await request(app)
      .patch(`/api/reports/${report.id}/status`)
      .set("Cookie", owner.cookie)
      .send({ status: "in_progress" });
    expect(response.status).toBe(403);
  });

  it("transisi valid, transisi tidak valid 422", async () => {
    const owner = await registerUser("owner@example.com");
    const admin = await registerAdmin();
    const report = await createReport(owner.cookie);

    const invalid = await request(app)
      .patch(`/api/reports/${report.id}/status`)
      .set("Cookie", admin.cookie)
      .send({ status: "completed" });
    expect(invalid.status).toBe(422);

    const moved = await request(app)
      .patch(`/api/reports/${report.id}/status`)
      .set("Cookie", admin.cookie)
      .send({ status: "in_progress" });
    expect(moved.status).toBe(200);
    expect(moved.body.data.status).toBe("in_progress");

    const same = await request(app)
      .patch(`/api/reports/${report.id}/status`)
      .set("Cookie", admin.cookie)
      .send({ status: "in_progress" });
    expect(same.status).toBe(422);

    const completed = await request(app)
      .patch(`/api/reports/${report.id}/status`)
      .set("Cookie", admin.cookie)
      .send({ status: "completed" });
    expect(completed.status).toBe(200);

    expect(
      (
        await request(app)
          .patch(`/api/reports/${report.id}/status`)
          .set("Cookie", admin.cookie)
          .send({ status: "rejected", reason: "Terlambat" })
      ).status,
    ).toBe(422);
  });

  it("rejected wajib reason dan tercatat di riwayat", async () => {
    const owner = await registerUser("owner@example.com");
    const admin = await registerAdmin();
    const report = await createReport(owner.cookie);

    const withoutReason = await request(app)
      .patch(`/api/reports/${report.id}/status`)
      .set("Cookie", admin.cookie)
      .send({ status: "rejected" });
    expect(withoutReason.status).toBe(422);

    const rejected = await request(app)
      .patch(`/api/reports/${report.id}/status`)
      .set("Cookie", admin.cookie)
      .send({ status: "rejected", reason: "Lokasi tidak jelas" });
    expect(rejected.status).toBe(200);
    expect(rejected.body.data).toMatchObject({
      status: "rejected",
      rejectReason: "Lokasi tidak jelas",
    });

    const history = await request(app)
      .get(`/api/reports/${report.id}/history`)
      .set("Cookie", owner.cookie);
    expect(history.status).toBe(200);
    expect(history.body.data).toHaveLength(2);
    expect(history.body.data[0]).toMatchObject({ fromStatus: null, toStatus: "pending" });
    expect(history.body.data[1]).toMatchObject({
      fromStatus: "pending",
      toStatus: "rejected",
      note: "Lokasi tidak jelas",
    });
  });
});

describe("dashboard", () => {
  it("admin melihat semua, user hanya miliknya", async () => {
    const owner = await registerUser("owner@example.com");
    const other = await registerUser("other@example.com");
    const admin = await registerAdmin();
    await createReport(owner.cookie, { category: "organic", postalCode: "10310" });
    await createReport(owner.cookie, { category: "plastic", postalCode: "10310" });
    await createReport(other.cookie, { category: "paper", postalCode: "10250" });

    const own = await request(app).get("/api/dashboard/stats").set("Cookie", owner.cookie);
    expect(own.status).toBe(200);
    expect(own.body.data.summary.total).toBe(2);
    expect(own.body.data.byCategory).toEqual(
      expect.arrayContaining([
        { category: "organic", count: 1 },
        { category: "plastic", count: 1 },
      ]),
    );
    expect(own.body.data.trend).toHaveLength(1);
    expect(own.body.data.topLocations[0]).toMatchObject({
      postalCode: "10310",
      count: 2,
    });

    const all = await request(app).get("/api/dashboard/stats").set("Cookie", admin.cookie);
    expect(all.body.data.summary.total).toBe(3);
    expect(all.body.data.summary.pending).toBe(3);
  });
});
