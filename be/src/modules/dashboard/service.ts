import { and, desc, eq, gte, isNull, lt, lte, sql } from "drizzle-orm";

import { env } from "../../config/env.js";
import { db } from "../../db/index.js";
import { reports } from "../../db/schema.js";
import {
  addDaysToDateOnly,
  formatDateInZone,
  parseDateBound,
  startOfDayInZone,
  startOfNextDayInZone,
} from "../../lib/dateRange.js";
import { unprocessable } from "../../lib/errors.js";
import type { AuthUser } from "../../middleware/auth.js";
import type { StatsQuery } from "./schema.js";

const counts = sql<number>`count(*)::int`;
const DEFAULT_RANGE_DAYS = 30;

export async function stats(user: AuthUser, query: StatsQuery) {
  const timeZone = env.APP_TIMEZONE;
  const fromBound = parseDateBound(query.from);
  const toBound = parseDateBound(query.to);
  const fromDateOnly = fromBound?.kind === "dateOnly" ? fromBound.dateOnly : undefined;
  const toDateOnly = toBound?.kind === "dateOnly" ? toBound.dateOnly : undefined;

  if (fromDateOnly && toDateOnly && fromDateOnly > toDateOnly) {
    throw unprocessable("Tanggal awal tidak boleh setelah tanggal akhir");
  }

  const to = toBound
    ? toBound.kind === "dateOnly"
      ? startOfNextDayInZone(toBound.dateOnly, timeZone)
      : toBound.instant
    : new Date();

  const from = fromBound
    ? fromBound.kind === "dateOnly"
      ? startOfDayInZone(fromBound.dateOnly, timeZone)
      : fromBound.instant
    : startOfDayInZone(
        addDaysToDateOnly(
          toDateOnly ?? formatDateInZone(to, timeZone),
          -(DEFAULT_RANGE_DAYS - 1),
        ),
        timeZone,
      );

  if (from > to) throw unprocessable("Tanggal awal tidak boleh setelah tanggal akhir");

  const conditions = [
    isNull(reports.deletedAt),
    gte(reports.createdAt, from),
    toBound?.kind === "dateOnly" ? lt(reports.createdAt, to) : lte(reports.createdAt, to),
  ];
  if (user.role !== "admin") conditions.push(eq(reports.userId, user.id));
  const where = and(...conditions);

  const day = sql<string>`to_char(date_trunc('day', ${reports.createdAt} AT TIME ZONE ${timeZone}), 'YYYY-MM-DD')`;
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
      .groupBy(sql`1`)
      .orderBy(sql`1`),
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
