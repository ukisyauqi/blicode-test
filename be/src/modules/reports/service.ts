import { unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { and, asc, desc, eq, gte, ilike, isNull, lt, lte, or, sql } from "drizzle-orm";

import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { db } from "../../db/index.js";
import { reportStatusHistory, reports, users } from "../../db/schema.js";
import { parseDateBound, startOfDayInZone, startOfNextDayInZone } from "../../lib/dateRange.js";
import { AppError, conflict, notFound, unprocessable } from "../../lib/errors.js";
import { assertTransition } from "../../lib/statusTransition.js";
import type { AuthUser } from "../../middleware/auth.js";
import { photoFilename } from "../../middleware/upload.js";
import { classifyImage } from "../../ml/classifier.js";
import { InvalidImageError } from "../../ml/preprocess.js";
import type {
  CreateReportInput,
  ListReportsQuery,
  StatusInput,
  UpdateReportInput,
} from "./schema.js";

type Photo = Express.Multer.File | undefined;
type ReportRow = typeof reports.$inferSelect;
type Reporter = { id: string; name: string; email: string; role: "admin" | "user" } | null;

const reporterColumns = {
  id: users.id,
  name: users.name,
  email: users.email,
  role: users.role,
};

export async function create(user: AuthUser, input: CreateReportInput, photo: Photo) {
  let predictedCategory: "organic" | "plastic" | "paper" | null = null;
  let predictedConfidence: number | null = null;

  if (photo) {
    try {
      const result = await classifyImage(photo.buffer);
      predictedCategory = result.category;
      predictedConfidence = result.confidence;
    } catch (error) {
      if (error instanceof InvalidImageError) {
        throw new AppError(400, "INVALID_IMAGE", "File foto tidak dapat dibaca sebagai gambar");
      }
      if (!input.category) {
        throw unprocessable("Kategori tidak dapat ditentukan dari foto. Pilih kategori manual.");
      }
      logger.warn({ err: error }, "klasifikasi foto gagal, predicted_* dikosongkan");
    }
  }

  const category = input.category ?? predictedCategory;
  if (!category) throw unprocessable("Kategori wajib diisi jika laporan tanpa foto");

  let photoPath: string | null = null;
  if (photo) {
    photoPath = await photoFilename(photo.buffer);
    await writeFile(join(env.UPLOAD_DIR, photoPath), photo.buffer);
  }

  try {
    return await db.transaction(async (tx) => {
      const [report] = await tx
        .insert(reports)
        .values({
          userId: user.id,
          title: input.title,
          description: input.description,
          category,
          address: input.address,
          postalCode: input.postalCode,
          latitude: input.latitude,
          longitude: input.longitude,
          photoPath,
          predictedCategory,
          predictedConfidence,
        })
        .returning();

      await tx.insert(reportStatusHistory).values({
        reportId: report!.id,
        toStatus: "pending",
        changedBy: user.id,
      });

      return toReport(report!, {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      });
    });
  } catch (error) {
    if (photoPath) await unlink(join(env.UPLOAD_DIR, photoPath)).catch(() => undefined);
    throw error;
  }
}

export async function list(user: AuthUser, query: ListReportsQuery) {
  const timeZone = env.APP_TIMEZONE;
  const from = parseDateBound(query.from);
  const to = parseDateBound(query.to);
  const fromDateOnly = from?.kind === "dateOnly" ? from.dateOnly : undefined;
  const toDateOnly = to?.kind === "dateOnly" ? to.dateOnly : undefined;

  if (fromDateOnly && toDateOnly && fromDateOnly > toDateOnly) {
    throw unprocessable("Tanggal awal tidak boleh setelah tanggal akhir");
  }

  const conditions = [isNull(reports.deletedAt)];
  if (user.role !== "admin") {
    conditions.push(eq(reports.userId, user.id));
  } else if (query.reporter_id) {
    conditions.push(eq(reports.userId, query.reporter_id));
  }

  if (query.status) conditions.push(eq(reports.status, query.status));
  if (query.category) conditions.push(eq(reports.category, query.category));
  if (from) {
    conditions.push(
      gte(
        reports.createdAt,
        from.kind === "dateOnly"
          ? startOfDayInZone(from.dateOnly, timeZone)
          : from.instant,
      ),
    );
  }
  if (to) {
    conditions.push(
      to.kind === "dateOnly"
        ? lt(reports.createdAt, startOfNextDayInZone(to.dateOnly, timeZone))
        : lte(reports.createdAt, to.instant),
    );
  }
  if (query.search) {
    const term = `%${query.search}%`;
    const search = or(
      ilike(reports.title, term),
      ilike(reports.description, term),
      ilike(reports.address, term),
      ilike(reports.postalCode, term),
    );
    if (search) conditions.push(search);
  }

  const where = and(...conditions);
  const order =
    query.sort === "created_at_asc"
      ? [asc(reports.createdAt)]
      : query.sort === "status"
        ? [asc(reports.status), desc(reports.createdAt)]
        : [desc(reports.createdAt)];
  const offset = (query.page - 1) * query.limit;

  const [rows, totalRows] = await Promise.all([
    db
      .select({ report: reports, reporter: reporterColumns })
      .from(reports)
      .leftJoin(users, eq(reports.userId, users.id))
      .where(where)
      .orderBy(...order)
      .limit(query.limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(reports)
      .where(where),
  ]);

  const total = totalRows[0]?.count ?? 0;
  return {
    data: rows.map(({ report, reporter }) => toReport(report, reporter)),
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}

export async function get(user: AuthUser, id: string) {
  const { report, reporter } = await findReport(user, id);
  return toReport(report, reporter);
}

export async function update(user: AuthUser, id: string, input: UpdateReportInput, photo: Photo) {
  const { report: current, reporter } = await findReport(user, id);
  if (user.role !== "admin" && current.status !== "pending") {
    throw conflict("Laporan hanya bisa diubah saat status pending");
  }

  let predictedCategory = current.predictedCategory;
  let predictedConfidence = current.predictedConfidence;
  let newPhotoPath: string | null = null;

  if (photo) {
    try {
      const result = await classifyImage(photo.buffer);
      predictedCategory = result.category;
      predictedConfidence = result.confidence;
    } catch (error) {
      if (error instanceof InvalidImageError) {
        throw new AppError(400, "INVALID_IMAGE", "File foto tidak dapat dibaca sebagai gambar");
      }
      if (!input.category) {
        throw unprocessable("Kategori tidak dapat ditentukan dari foto. Pilih kategori manual.");
      }
      predictedCategory = null;
      predictedConfidence = null;
      logger.warn({ err: error }, "klasifikasi foto gagal, predicted_* dikosongkan");
    }
    newPhotoPath = await photoFilename(photo.buffer);
    await writeFile(join(env.UPLOAD_DIR, newPhotoPath), photo.buffer);
  }

  const patch: Partial<typeof reports.$inferInsert> = {};
  if (input.title !== undefined) patch.title = input.title;
  if (input.description !== undefined) patch.description = input.description;
  if (input.address !== undefined) patch.address = input.address;
  if (input.postalCode !== undefined) patch.postalCode = input.postalCode;
  if (input.latitude !== undefined) patch.latitude = input.latitude;
  if (input.longitude !== undefined) patch.longitude = input.longitude;
  if (input.category !== undefined) patch.category = input.category;
  if (newPhotoPath) {
    patch.photoPath = newPhotoPath;
    patch.predictedCategory = predictedCategory;
    patch.predictedConfidence = predictedConfidence;
  }
  if (Object.keys(patch).length === 0) throw unprocessable("Tidak ada perubahan yang dikirim");

  try {
    const [updated] = await db
      .update(reports)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(reports.id, id))
      .returning();
    return toReport(updated!, reporter);
  } catch (error) {
    if (newPhotoPath) await unlink(join(env.UPLOAD_DIR, newPhotoPath)).catch(() => undefined);
    throw error;
  }
}

export async function remove(user: AuthUser, id: string) {
  const { report: current } = await findReport(user, id);
  if (user.role !== "admin" && current.status !== "pending") {
    throw conflict("Laporan hanya bisa dihapus saat status pending");
  }
  await db
    .update(reports)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(reports.id, id));
}

export async function changeStatus(user: AuthUser, id: string, input: StatusInput) {
  const { report: current, reporter } = await findReport(user, id);
  assertTransition(current.status, input.status);

  const updated = await db.transaction(async (tx) => {
    const [row] = await tx
      .update(reports)
      .set({
        status: input.status,
        rejectReason: input.status === "rejected" ? input.reason! : null,
        updatedAt: new Date(),
      })
      .where(eq(reports.id, id))
      .returning();

    await tx.insert(reportStatusHistory).values({
      reportId: id,
      fromStatus: current.status,
      toStatus: input.status,
      changedBy: user.id,
      note: input.status === "rejected" ? input.reason : null,
    });
    return row;
  });

  return toReport(updated!, reporter);
}

export async function history(user: AuthUser, id: string) {
  await findReport(user, id);
  return db
    .select({
      id: reportStatusHistory.id,
      reportId: reportStatusHistory.reportId,
      fromStatus: reportStatusHistory.fromStatus,
      toStatus: reportStatusHistory.toStatus,
      changedBy: reportStatusHistory.changedBy,
      changedByUser: reporterColumns,
      note: reportStatusHistory.note,
      createdAt: reportStatusHistory.createdAt,
    })
    .from(reportStatusHistory)
    .leftJoin(users, eq(reportStatusHistory.changedBy, users.id))
    .where(eq(reportStatusHistory.reportId, id))
    .orderBy(asc(reportStatusHistory.createdAt));
}

async function findReport(
  user: AuthUser,
  id: string,
): Promise<{ report: ReportRow; reporter: Reporter }> {
  const [row] = await db
    .select({ report: reports, reporter: reporterColumns })
    .from(reports)
    .leftJoin(users, eq(reports.userId, users.id))
    .where(and(eq(reports.id, id), isNull(reports.deletedAt)))
    .limit(1);

  if (!row || (user.role !== "admin" && row.report.userId !== user.id)) {
    throw notFound("Laporan tidak ditemukan");
  }
  return { report: row.report, reporter: row.reporter };
}

export function toReport(row: ReportRow, reporter: Reporter = null) {
  return {
    id: row.id,
    userId: row.userId,
    reporter,
    title: row.title,
    description: row.description,
    category: row.category,
    address: row.address,
    postalCode: row.postalCode,
    latitude: row.latitude,
    longitude: row.longitude,
    photoUrl: row.photoPath ? `/uploads/${row.photoPath}` : null,
    predictedCategory: row.predictedCategory,
    predictedConfidence: row.predictedConfidence,
    status: row.status,
    rejectReason: row.rejectReason,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
