import { eq } from "drizzle-orm";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { db } from "../src/db/index.js";
import { users } from "../src/db/schema.js";
import { app } from "./helpers.js";

describe("auth", () => {
  it("register membuat user biasa dan mengabaikan role dari klien", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({ name: "Ani", email: "Ani@Example.com", password: "password123", role: "admin" });

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      name: "Ani",
      email: "ani@example.com",
      role: "user",
    });
    expect(response.headers["set-cookie"]?.[0]).toContain("token=");
  });

  it("email duplikat ditolak 409", async () => {
    const body = { name: "Ani", email: "ani@example.com", password: "password123" };
    await request(app).post("/api/auth/register").send(body);
    const response = await request(app).post("/api/auth/register").send(body);
    expect(response.status).toBe(409);
  });

  it("login salah password ditolak 401", async () => {
    await request(app)
      .post("/api/auth/register")
      .send({ name: "Ani", email: "ani@example.com", password: "password123" });
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "ani@example.com", password: "salah-password" });
    expect(response.status).toBe(401);
  });

  it("JSON rusak ditolak 400", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send('{"email":');
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("INVALID_JSON");
  });

  it("user nonaktif tidak bisa login", async () => {
    await request(app)
      .post("/api/auth/register")
      .send({ name: "Ani", email: "ani@example.com", password: "password123" });
    await db.update(users).set({ isActive: false }).where(eq(users.email, "ani@example.com"));

    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "ani@example.com", password: "password123" });
    expect(response.status).toBe(401);
  });

  it("me butuh cookie dan mengembalikan user yang login", async () => {
    const register = await request(app)
      .post("/api/auth/register")
      .send({ name: "Ani", email: "ani@example.com", password: "password123" });

    expect((await request(app).get("/api/auth/me")).status).toBe(401);

    const response = await request(app)
      .get("/api/auth/me")
      .set("Cookie", register.headers["set-cookie"]![0]!);
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ email: "ani@example.com", role: "user" });
  });

  it("ganti password lalu login dengan password baru", async () => {
    const register = await request(app)
      .post("/api/auth/register")
      .send({ name: "Ani", email: "ani@example.com", password: "password123" });
    const cookie = register.headers["set-cookie"]![0]!;

    const changed = await request(app)
      .patch("/api/auth/me/password")
      .set("Cookie", cookie)
      .send({ currentPassword: "password123", newPassword: "password456" });
    expect(changed.status).toBe(204);

    const oldLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "ani@example.com", password: "password123" });
    expect(oldLogin.status).toBe(401);

    const newLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "ani@example.com", password: "password456" });
    expect(newLogin.status).toBe(200);
  });
});
