import { unlink } from "node:fs/promises";
import { join } from "node:path";

import { inArray, like, or } from "drizzle-orm";

import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { db, pool } from "./index.js";
import { reports, users } from "./schema.js";

/**
 * Menghapus akun dan laporan uji QA dari database development.
 *
 *   npm run db:cleanup:qa
 *
 * Yang dihapus hanya user dengan pola email uji:
 *   - browser.test.*@example.com
 *   - uji.*@example.com
 *   - qa.*@example.com
 *
 * Laporan milik user tersebut dihapus permanen (riwayat ikut terhapus lewat
 * ON DELETE CASCADE), lalu file fotonya dibersihkan dari folder upload.
 */

const QA_EMAIL_PATTERNS = [
  "browser.test.%@example.com",
  "uji.%@example.com",
  "qa.%@example.com",
];

if (env.NODE_ENV === "production") {
  throw new Error("Cleanup QA tidak boleh dijalankan dengan NODE_ENV=production");
}

try {
  const qaUsers = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(or(...QA_EMAIL_PATTERNS.map((pattern) => like(users.email, pattern))));

  if (qaUsers.length === 0) {
    logger.info("Tidak ada akun uji QA yang perlu dibersihkan.");
  } else {
    const userIds = qaUsers.map((user) => user.id);
    const qaReports = await db
      .select({ id: reports.id, photoPath: reports.photoPath })
      .from(reports)
      .where(inArray(reports.userId, userIds));

    await db.transaction(async (tx) => {
      await tx.delete(reports).where(inArray(reports.userId, userIds));
      await tx.delete(users).where(inArray(users.id, userIds));
    });

    let removedPhotos = 0;
    for (const report of qaReports) {
      if (!report.photoPath) continue;
      try {
        await unlink(join(env.UPLOAD_DIR, report.photoPath));
        removedPhotos += 1;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
    }

    logger.info(
      `Cleanup QA selesai: ${qaUsers.length} akun, ${qaReports.length} laporan, ${removedPhotos} file foto dihapus.`,
    );
    logger.info(`Akun dihapus: ${qaUsers.map((user) => user.email).join(", ")}`);
  }
} finally {
  await pool.end();
}
