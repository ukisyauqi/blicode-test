import request from "supertest";
import { describe, expect, it } from "vitest";

import { app, registerAdmin, registerUser } from "./helpers.js";

describe("users (admin only)", () => {
  it("user biasa ditolak 403", async () => {
    const user = await registerUser();
    expect((await request(app).get("/api/users").set("Cookie", user.cookie)).status).toBe(403);
  });

  it("admin bisa membuat, mencari, dan memfilter user", async () => {
    const admin = await registerAdmin();
    const created = await request(app)
      .post("/api/users")
      .set("Cookie", admin.cookie)
      .send({ name: "Budi", email: "Budi@Example.com", password: "password123", role: "admin" });
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({ email: "budi@example.com", role: "admin" });

    const duplicate = await request(app)
      .post("/api/users")
      .set("Cookie", admin.cookie)
      .send({ name: "Budi", email: "budi@example.com", password: "password123" });
    expect(duplicate.status).toBe(409);

    const list = await request(app)
      .get("/api/users")
      .query({ search: "budi", role: "admin" })
      .set("Cookie", admin.cookie);
    expect(list.body.meta.total).toBe(1);
    expect(list.body.data.map((user: { email: string }) => user.email)).toContain(
      "budi@example.com",
    );
  });

  it("admin tidak bisa menurunkan role atau menonaktifkan diri sendiri", async () => {
    const admin = await registerAdmin();
    const demote = await request(app)
      .put(`/api/users/${admin.user.id}`)
      .set("Cookie", admin.cookie)
      .send({ role: "user" });
    expect(demote.status).toBe(422);

    const deactivate = await request(app)
      .patch(`/api/users/${admin.user.id}/status`)
      .set("Cookie", admin.cookie)
      .send({ isActive: false });
    expect(deactivate.status).toBe(422);

    const remove = await request(app)
      .delete(`/api/users/${admin.user.id}`)
      .set("Cookie", admin.cookie);
    expect(remove.status).toBe(422);
  });

  it("nonaktif, reset password, dan soft delete berlaku", async () => {
    const admin = await registerAdmin();
    const target = await registerUser("target@example.com");

    const deactivate = await request(app)
      .patch(`/api/users/${target.user.id}/status`)
      .set("Cookie", admin.cookie)
      .send({ isActive: false });
    expect(deactivate.status).toBe(200);
    expect(deactivate.body.data.isActive).toBe(false);
    expect(
      (
        await request(app)
          .post("/api/auth/login")
          .send({ email: "target@example.com", password: "password123" })
      ).status,
    ).toBe(401);

    const reset = await request(app)
      .patch(`/api/users/${target.user.id}/password`)
      .set("Cookie", admin.cookie)
      .send({ password: "password456" });
    expect(reset.status).toBe(204);

    await request(app)
      .patch(`/api/users/${target.user.id}/status`)
      .set("Cookie", admin.cookie)
      .send({ isActive: true });
    expect(
      (
        await request(app)
          .post("/api/auth/login")
          .send({ email: "target@example.com", password: "password456" })
      ).status,
    ).toBe(200);

    expect(
      (await request(app).delete(`/api/users/${target.user.id}`).set("Cookie", admin.cookie))
        .status,
    ).toBe(204);
    expect(
      (await request(app).get(`/api/users/${target.user.id}`).set("Cookie", admin.cookie)).status,
    ).toBe(404);
    expect(
      (
        await request(app)
          .post("/api/auth/login")
          .send({ email: "target@example.com", password: "password456" })
      ).status,
    ).toBe(401);
  });
});
