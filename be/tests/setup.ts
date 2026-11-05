import "dotenv/config";

import { rm } from "node:fs/promises";

import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { afterAll, beforeAll, beforeEach } from "vitest";

process.env.NODE_ENV = "test";
if (!process.env.TEST_DATABASE_URL) {
  throw new Error("TEST_DATABASE_URL wajib diisi di .env untuk menjalankan tes");
}
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.UPLOAD_DIR = "./uploads-test";

const { db, pool } = await import("../src/db/index.js");

beforeAll(async () => {
  await migrate(db, { migrationsFolder: "./drizzle" });
});

beforeEach(async () => {
  await db.execute(
    sql`truncate table report_status_history, reports, users restart identity cascade`,
  );
});

afterAll(async () => {
  await pool.end();
  await rm("./uploads-test", { recursive: true, force: true });
});
