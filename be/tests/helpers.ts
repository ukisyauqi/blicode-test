import { eq } from "drizzle-orm";
import request from "supertest";
import sharp from "sharp";

import { createApp } from "../src/app.js";
import { db } from "../src/db/index.js";
import { users } from "../src/db/schema.js";

export const app = createApp();

export async function registerUser(email = "user@example.com", password = "password123") {
  const response = await request(app)
    .post("/api/auth/register")
    .send({ name: "User", email, password });
  const cookie = response.headers["set-cookie"]?.[0];
  if (!cookie) throw new Error("cookie login tidak ada");
  return { response, cookie, user: response.body.data };
}

export async function registerAdmin(email = "admin@example.com", password = "password123") {
  const result = await registerUser(email, password);
  await db.update(users).set({ role: "admin" }).where(eq(users.id, result.user.id));
  return { ...result, user: { ...result.user, role: "admin" as const } };
}

export async function imageBuffer(color = "#22aa44") {
  return sharp({ create: { width: 320, height: 240, channels: 3, background: color } })
    .jpeg()
    .toBuffer();
}

export function reportFields(overrides: Record<string, string> = {}) {
  return {
    title: "Sampah di taman",
    description: "Ada tumpukan sampah",
    latitude: "-6.2",
    longitude: "106.8",
    ...overrides,
  };
}

export async function createReport(cookie: string, overrides: Record<string, string> = {}) {
  const response = await request(app)
    .post("/api/reports")
    .set("Cookie", cookie)
    .send(reportFields({ category: "organic", ...overrides }));
  if (response.status !== 201) {
    throw new Error(`create report gagal: ${response.status} ${JSON.stringify(response.body)}`);
  }
  return response.body.data;
}
