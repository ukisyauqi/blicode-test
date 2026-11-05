import { eq } from "drizzle-orm";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { env } from "../src/config/env.js";
import { db } from "../src/db/index.js";
import { reports } from "../src/db/schema.js";
import { formatDateInZone } from "../src/lib/dateRange.js";
import { app, createReport, registerUser } from "./helpers.js";

async function setCreatedAt(id: string, createdAt: Date) {
  await db.update(reports).set({ createdAt }).where(eq(reports.id, id));
}

const today = () => formatDateInZone(new Date(), env.APP_TIMEZONE);

describe("filter tanggal reports", () => {
  it("laporan hari ini ikut saat filter to hanya tanggal", async () => {
    const owner = await registerUser("owner@example.com");
    await createReport(owner.cookie);

    const response = await request(app)
      .get("/api/reports")
      .query({ to: today() })
      .set("Cookie", owner.cookie);
    expect(response.status).toBe(200);
    expect(response.body.meta.total).toBe(1);
  });

  it("from dan to pada hari yang sama tetap mengembalikan laporan hari ini", async () => {
    const owner = await registerUser("owner@example.com");
    await createReport(owner.cookie);

    const response = await request(app)
      .get("/api/reports")
      .query({ from: today(), to: today() })
      .set("Cookie", owner.cookie);
    expect(response.status).toBe(200);
    expect(response.body.meta.total).toBe(1);
  });

  it("batas tengah malam mengikuti zona Asia/Jakarta", async () => {
    const owner = await registerUser("owner@example.com");
    const lateNight = await createReport(owner.cookie, { title: "23:59 WIB" });
    const earlyMorning = await createReport(owner.cookie, { title: "00:01 WIB" });

    await setCreatedAt(lateNight.id, new Date("2026-11-05T16:59:00Z"));
    await setCreatedAt(earlyMorning.id, new Date("2026-11-05T17:01:00Z"));

    const toFifth = await request(app)
      .get("/api/reports")
      .query({ to: "2026-11-05" })
      .set("Cookie", owner.cookie);
    expect(toFifth.body.meta.total).toBe(1);
    expect(toFifth.body.data[0].id).toBe(lateNight.id);

    const fromSixth = await request(app)
      .get("/api/reports")
      .query({ from: "2026-11-06" })
      .set("Cookie", owner.cookie);
    expect(fromSixth.body.meta.total).toBe(1);
    expect(fromSixth.body.data[0].id).toBe(earlyMorning.id);
  });

  it("ISO timestamp penuh tetap bekerja seperti sebelumnya", async () => {
    const owner = await registerUser("owner@example.com");
    await createReport(owner.cookie);

    const response = await request(app)
      .get("/api/reports")
      .query({
        from: new Date(Date.now() - 60_000).toISOString(),
        to: new Date(Date.now() + 60_000).toISOString(),
      })
      .set("Cookie", owner.cookie);
    expect(response.status).toBe(200);
    expect(response.body.meta.total).toBe(1);
  });

  it("from setelah to ditolak 422", async () => {
    const owner = await registerUser("owner@example.com");
    const response = await request(app)
      .get("/api/reports")
      .query({ from: "2026-11-06", to: "2026-11-05" })
      .set("Cookie", owner.cookie);
    expect(response.status).toBe(422);
  });

  it("format tanggal tidak valid ditolak 422", async () => {
    const owner = await registerUser("owner@example.com");
    const response = await request(app)
      .get("/api/reports")
      .query({ from: "bukan-tanggal" })
      .set("Cookie", owner.cookie);
    expect(response.status).toBe(422);
  });
});

describe("filter tanggal dashboard", () => {
  it("dashboard default menghitung laporan hari ini", async () => {
    const owner = await registerUser("owner@example.com");
    await createReport(owner.cookie);

    const response = await request(app).get("/api/dashboard/stats").set("Cookie", owner.cookie);
    expect(response.status).toBe(200);
    expect(response.body.data.summary.total).toBe(1);
  });

  it("periode custom satu hari menghitung laporan pada hari tersebut", async () => {
    const owner = await registerUser("owner@example.com");
    const report = await createReport(owner.cookie);
    await setCreatedAt(report.id, new Date("2026-11-05T16:59:00Z"));

    const response = await request(app)
      .get("/api/dashboard/stats")
      .query({ from: "2026-11-05", to: "2026-11-05" })
      .set("Cookie", owner.cookie);
    expect(response.status).toBe(200);
    expect(response.body.data.summary.total).toBe(1);
  });

  it("trend mengelompokkan laporan 23:59 WIB ke tanggal lokal yang benar", async () => {
    const owner = await registerUser("owner@example.com");
    const report = await createReport(owner.cookie);
    await setCreatedAt(report.id, new Date("2026-11-05T16:59:00Z"));

    const response = await request(app)
      .get("/api/dashboard/stats")
      .query({ from: "2026-11-05", to: "2026-11-05" })
      .set("Cookie", owner.cookie);
    expect(response.body.data.trend).toEqual([{ date: "2026-11-05", count: 1 }]);
  });

  it("from setelah to ditolak 422", async () => {
    const owner = await registerUser("owner@example.com");
    const response = await request(app)
      .get("/api/dashboard/stats")
      .query({ from: "2026-11-06", to: "2026-11-05" })
      .set("Cookie", owner.cookie);
    expect(response.status).toBe(422);
  });
});
