import { existsSync } from "node:fs";

import { eq } from "drizzle-orm";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";

import { env } from "../src/config/env.js";
import { db } from "../src/db/index.js";
import { reportStatusHistory, reports } from "../src/db/schema.js";
import { loadClassifier } from "../src/ml/classifier.js";
import { app, createReport, imageBuffer, registerUser, reportFields } from "./helpers.js";

const modelAvailable = existsSync(env.ML_MODEL_PATH);

beforeAll(async () => {
  if (modelAvailable) await loadClassifier();
});

describe("POST /api/reports", () => {
  it("butuh login", async () => {
    const response = await request(app)
      .post("/api/reports")
      .send(reportFields({ category: "organic" }));
    expect(response.status).toBe(401);
  });

  it("tanpa foto dan tanpa kategori ditolak 422", async () => {
    const { cookie } = await registerUser();
    const response = await request(app)
      .post("/api/reports")
      .set("Cookie", cookie)
      .send(reportFields());
    expect(response.status).toBe(422);
  });

  it("tanpa foto dengan kategori menyimpan laporan tanpa predicted", async () => {
    const { cookie, user } = await registerUser();
    const response = await request(app)
      .post("/api/reports")
      .set("Cookie", cookie)
      .send(reportFields({ category: "paper" }));

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      userId: user.id,
      category: "paper",
      predictedCategory: null,
      predictedConfidence: null,
      status: "pending",
      photoUrl: null,
    });
    expect(response.body.data.latitude).toBe(-6.2);
  });

  it.skipIf(!modelAvailable)(
    "foto mengisi kategori otomatis dan menyimpan predicted_*",
    async () => {
      const { cookie } = await registerUser();
      const response = await request(app)
        .post("/api/reports")
        .set("Cookie", cookie)
        .field(reportFields())
        .attach("photo", await imageBuffer(), { filename: "foto.jpg", contentType: "image/jpeg" });

      expect(response.status).toBe(201);
      const report = response.body.data;
      expect(["organic", "plastic", "paper"]).toContain(report.predictedCategory);
      expect(report.category).toBe(report.predictedCategory);
      expect(report.predictedConfidence).toBeGreaterThan(0);
      expect(report.predictedConfidence).toBeLessThanOrEqual(1);
      expect(report.photoUrl).toMatch(/^\/uploads\/.+\.jpg$/);

      const history = await db
        .select()
        .from(reportStatusHistory)
        .where(eq(reportStatusHistory.reportId, report.id));
      expect(history).toHaveLength(1);
      expect(history[0]).toMatchObject({ fromStatus: null, toStatus: "pending" });
    },
  );

  it.skipIf(!modelAvailable)("kategori dari klien menimpa hasil model", async () => {
    const { cookie } = await registerUser();
    const response = await request(app)
      .post("/api/reports")
      .set("Cookie", cookie)
      .field(reportFields({ category: "paper" }))
      .attach("photo", await imageBuffer(), { filename: "foto.jpg", contentType: "image/jpeg" });

    expect(response.status).toBe(201);
    expect(response.body.data.category).toBe("paper");
    expect(response.body.data.predictedCategory).not.toBeNull();
  });

  it.skipIf(!modelAvailable)(
    "ganti foto memperbarui predicted_* tanpa mengubah kategori",
    async () => {
      const { cookie } = await registerUser();
      const created = await createReport(cookie, { category: "paper" });

      const updated = await request(app)
        .put(`/api/reports/${created.id}`)
        .set("Cookie", cookie)
        .attach("photo", await imageBuffer("#aa3322"), {
          filename: "foto.jpg",
          contentType: "image/jpeg",
        });

      expect(updated.status).toBe(200);
      expect(updated.body.data.category).toBe("paper");
      expect(updated.body.data.predictedCategory).not.toBeNull();
      expect(updated.body.data.photoUrl).toMatch(/^\/uploads\/.+\.jpg$/);
    },
  );

  it.skipIf(!modelAvailable)("foto tidak valid saat update ditolak 400", async () => {
    const { cookie } = await registerUser();
    const created = await createReport(cookie, { category: "paper" });

    const updated = await request(app)
      .put(`/api/reports/${created.id}`)
      .set("Cookie", cookie)
      .attach("photo", Buffer.from("bukan gambar"), {
        filename: "foto.jpg",
        contentType: "image/jpeg",
      });

    expect(updated.status).toBe(400);
  });

  it("file bukan gambar ditolak 400 dan laporan tidak dibuat", async () => {
    const { cookie } = await registerUser();
    const response = await request(app)
      .post("/api/reports")
      .set("Cookie", cookie)
      .field(reportFields({ category: "paper" }))
      .attach("photo", Buffer.from("bukan gambar"), {
        filename: "foto.jpg",
        contentType: "image/jpeg",
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("INVALID_IMAGE");
  });

  it("tipe file selain JPEG/PNG/WebP ditolak 400", async () => {
    const { cookie } = await registerUser();
    const response = await request(app)
      .post("/api/reports")
      .set("Cookie", cookie)
      .field(reportFields({ category: "paper" }))
      .attach("photo", await imageBuffer(), { filename: "foto.gif", contentType: "image/gif" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("INVALID_FILE_TYPE");
  });
});

describe("POST /api/reports/classify", () => {
  it("butuh login", async () => {
    const response = await request(app)
      .post("/api/reports/classify")
      .attach("file", await imageBuffer(), { filename: "foto.jpg", contentType: "image/jpeg" });
    expect(response.status).toBe(401);
  });

  it("tanpa file ditolak 422", async () => {
    const { cookie } = await registerUser();
    const response = await request(app).post("/api/reports/classify").set("Cookie", cookie);
    expect(response.status).toBe(422);
  });

  it.skipIf(!modelAvailable)("mengembalikan saran kategori tanpa menyimpan laporan", async () => {
    const { cookie } = await registerUser();
    const response = await request(app)
      .post("/api/reports/classify")
      .set("Cookie", cookie)
      .attach("file", await imageBuffer(), { filename: "foto.jpg", contentType: "image/jpeg" });

    expect(response.status).toBe(200);
    expect(response.body.data.category).toBeTruthy();
    expect(Object.keys(response.body.data.probabilities).sort()).toEqual([
      "organic",
      "paper",
      "plastic",
    ]);
    expect(typeof response.body.data.needsReview).toBe("boolean");
    expect(response.body.data.needsReview).toBe(response.body.data.confidence < 0.5);
    expect(await db.select().from(reports)).toHaveLength(0);
  });

  it("file bukan gambar ditolak 400", async () => {
    const { cookie } = await registerUser();
    const response = await request(app)
      .post("/api/reports/classify")
      .set("Cookie", cookie)
      .attach("file", Buffer.from("bukan gambar"), {
        filename: "foto.jpg",
        contentType: "image/jpeg",
      });
    expect(response.status).toBe(400);
  });
});
