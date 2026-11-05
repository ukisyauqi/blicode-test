import bcrypt from "bcryptjs";

import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { db, pool } from "./index.js";
import { users } from "./schema.js";

if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) {
  throw new Error("ADMIN_EMAIL dan ADMIN_PASSWORD wajib diisi untuk seed");
}

const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, env.BCRYPT_ROUNDS);
const [admin] = await db
  .insert(users)
  .values({
    name: env.ADMIN_NAME,
    email: env.ADMIN_EMAIL.toLowerCase(),
    passwordHash,
    role: "admin",
  })
  .onConflictDoNothing({ target: users.email })
  .returning({ id: users.id, email: users.email });

if (admin) {
  logger.info(`Admin dibuat: ${admin.email}`);
} else {
  logger.info(`Admin sudah ada: ${env.ADMIN_EMAIL}`);
}

await pool.end();
