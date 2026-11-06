import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

import { env } from "../config/env.js";
import * as schema from "./schema.js";

// Neon mewajibkan koneksi SSL. Connection string Neon (atau yang memuat
// sslmode=require) perlu opsi ssl eksplisit agar driver pg mau handshake.
const needsSSL =
  env.DATABASE_URL.includes("neon.tech") || env.DATABASE_URL.includes("sslmode=require");

export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  ...(needsSSL ? { ssl: { rejectUnauthorized: false } } : {}),
});
export const db = drizzle(pool, { schema });
