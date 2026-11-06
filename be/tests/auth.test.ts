import { eq } from "drizzle-orm";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { db } from "../src/db/index.js";
import { users } from "../src/db/schema.js";
import { app } from "./helpers.js";

async function registerAni() {
  const response = await request(app)
    .post("/api/auth/register")
    .send({ name: "Ani", email: "ani@example.com", password: "password123" });
  return { cookie: response.headers["set-cookie"]![0]! };
}

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

  it("login mengembalikan token dan me bisa diakses via Bearer (mobile)", async () => {
    const body = { name: "Ani", email: "ani@example.com", password: "password123" };
    const register = await request(app).post("/api/auth/register").send(body);
    expect(register.status).toBe(201);
    expect(typeof register.body.token).toBe("string");

    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: body.email, password: body.password });
    expect(login.status).toBe(200);
    expect(typeof login.body.token).toBe("string");

    const me = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${login.body.token}`);
    expect(me.status).toBe(200);
    expect(me.body.data).toMatchObject({ email: "ani@example.com", role: "user" });
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

describe("profil", () => {
  it("PATCH /api/auth/me butuh login", async () => {
    const response = await request(app).patch("/api/auth/me").send({ name: "Nama Baru" });
    expect(response.status).toBe(401);
  });

  it("mengubah nama profil dan mengembalikan data terbaru", async () => {
    const { cookie } = await registerAni();

    const response = await request(app)
      .patch("/api/auth/me")
      .set("Cookie", cookie)
      .send({ name: "Ani Baru" });

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      name: "Ani Baru",
      email: "ani@example.com",
      role: "user",
    });
    expect(response.body.data).not.toHaveProperty("passwordHash");
  });

  it("nama baru terbaca pada GET /api/auth/me", async () => {
    const { cookie } = await registerAni();
    await request(app).patch("/api/auth/me").set("Cookie", cookie).send({ name: "Ani Baru" });

    const me = await request(app).get("/api/auth/me").set("Cookie", cookie);
    expect(me.status).toBe(200);
    expect(me.body.data.name).toBe("Ani Baru");
  });

  it("nama kosong ditolak 422", async () => {
    const { cookie } = await registerAni();
    const response = await request(app)
      .patch("/api/auth/me")
      .set("Cookie", cookie)
      .send({ name: "   " });
    expect(response.status).toBe(422);
  });

  it("tidak bisa menaikkan role lewat payload profil", async () => {
    const { cookie } = await registerAni();
    const response = await request(app)
      .patch("/api/auth/me")
      .set("Cookie", cookie)
      .send({ name: "Ani Baru", role: "admin" });

    expect(response.status).toBe(200);
    expect(response.body.data.role).toBe("user");

    const me = await request(app).get("/api/auth/me").set("Cookie", cookie);
    expect(me.body.data.role).toBe("user");
  });

  it("user yang dinonaktifkan tidak bisa mengubah profil", async () => {
    const { cookie } = await registerAni();
    await db.update(users).set({ isActive: false }).where(eq(users.email, "ani@example.com"));

    const response = await request(app)
      .patch("/api/auth/me")
      .set("Cookie", cookie)
      .send({ name: "Nama Baru" });
    expect(response.status).toBe(401);
  });
});
