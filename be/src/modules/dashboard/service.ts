import { and, asc, desc, eq, gte, isNull, lte, sql } from "drizzle-orm";

import { db } from "../../db/index.js";
import { reports } from "../../db/schema.js";
import { unprocessable } from "../../lib/errors.js";
import type { AuthUser } from "../../middleware/auth.js";
import type { StatsQuery } from "./schema.js";

const counts = sql<number>`count(*)::int`;

export async function stats(user: AuthUser, query: StatsQuery) {
  const to = query.to ?? new Date();
  const from = query.from ?? new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
  if (from > to) throw unprocessable("Tanggal awal tidak boleh setelah tanggal akhir");

  const conditions = [
    isNull(reports.deletedAt),
    gte(reports.createdAt, from),
    lte(reports.createdAt, to),
  ];
  if (user.role !== "admin") conditions.push(eq(reports.userId, user.id));
  const where = and(...conditions);

  const day = sql<string>`to_char(date_trunc('day', ${reports.createdAt}), 'YYYY-MM-DD')`;
  const latitude = sql<number>`round(${reports.latitude}, 3)`;
  const longitude = sql<number>`round(${reports.longitude}, 3)`;

  const [byStatus, byCategory, trend, topLocations] = await Promise.all([
    db
      .select({ status: reports.status, count: counts })
      .from(reports)
      .where(where)
      .groupBy(reports.status),
    db
      .select({ category: reports.category, count: counts })
      .from(reports)
      .where(where)
      .groupBy(reports.category),
    db
      .select({ date: day, count: counts })
      .from(reports)
      .where(where)
      .groupBy(day)
      .orderBy(asc(day)),
    db
      .select({ latitude, longitude, count: counts })
      .from(reports)
      .where(where)
      .groupBy(latitude, longitude)
      .orderBy(desc(counts))
      .limit(5),
  ]);

  const perStatus = Object.fromEntries(byStatus.map((row) => [row.status, row.count]));
  const total = byStatus.reduce((sum, row) => sum + row.count, 0);

  return {
    summary: {
      total,
      pending: perStatus.pending ?? 0,
      in_progress: perStatus.in_progress ?? 0,
      completed: perStatus.completed ?? 0,
      rejected: perStatus.rejected ?? 0,
    },
    byStatus,
    byCategory,
    trend,
    topLocations: topLocations.map((row) => ({
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      count: row.count,
    })),
  };
}
