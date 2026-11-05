import bcrypt from "bcryptjs";
import { and, asc, eq, ilike, isNull, ne, or, sql } from "drizzle-orm";

import { env } from "../../config/env.js";
import { db } from "../../db/index.js";
import { users } from "../../db/schema.js";
import { conflict, notFound, unprocessable } from "../../lib/errors.js";
import type { AuthUser } from "../../middleware/auth.js";
import type { createUserSchema, listUsersQuery, updateUserSchema } from "./schema.js";
import type { z } from "zod";

type CreateInput = z.infer<typeof createUserSchema>;
type UpdateInput = z.infer<typeof updateUserSchema>;
type ListQuery = z.infer<typeof listUsersQuery>;
type UserRow = typeof users.$inferSelect;

const columns = {
  id: users.id,
  name: users.name,
  email: users.email,
  role: users.role,
  isActive: users.isActive,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
};

export async function list(query: ListQuery) {
  const conditions = [isNull(users.deletedAt)];
  if (query.role) conditions.push(eq(users.role, query.role));
  if (query.is_active !== undefined) conditions.push(eq(users.isActive, query.is_active));
  if (query.search) {
    const term = `%${query.search}%`;
    const search = or(ilike(users.name, term), ilike(users.email, term));
    if (search) conditions.push(search);
  }

  const where = and(...conditions);
  const offset = (query.page - 1) * query.limit;
  const [rows, totalRows] = await Promise.all([
    db
      .select(columns)
      .from(users)
      .where(where)
      .orderBy(asc(users.name))
      .limit(query.limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(where),
  ]);

  const total = totalRows[0]?.count ?? 0;
  return {
    data: rows,
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}

export async function get(id: string) {
  return publicUser(await findUser(id));
}

export async function create(input: CreateInput) {
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1);
  if (existing) throw conflict("Email sudah dipakai");

  const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_ROUNDS);
  try {
    const [user] = await db
      .insert(users)
      .values({ name: input.name, email: input.email, passwordHash, role: input.role })
      .returning(columns);
    return user!;
  } catch (error) {
    if (isUniqueViolation(error)) throw conflict("Email sudah dipakai");
    throw error;
  }
}

export async function update(actor: AuthUser, id: string, input: UpdateInput) {
  const current = await findUser(id);
  if (actor.id === id && input.role && input.role !== "admin") {
    throw unprocessable("Admin tidak bisa menurunkan role dirinya sendiri");
  }

  if (input.email) {
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.email, input.email), ne(users.id, current.id)))
      .limit(1);
    if (existing) throw conflict("Email sudah dipakai");
  }

  try {
    const [user] = await db
      .update(users)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning(columns);
    return user!;
  } catch (error) {
    if (isUniqueViolation(error)) throw conflict("Email sudah dipakai");
    throw error;
  }
}

export async function setActive(actor: AuthUser, id: string, isActive: boolean) {
  await findUser(id);
  if (actor.id === id && !isActive) {
    throw unprocessable("Admin tidak bisa menonaktifkan dirinya sendiri");
  }
  const [user] = await db
    .update(users)
    .set({ isActive, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning(columns);
  return user!;
}

export async function resetPassword(id: string, password: string) {
  await findUser(id);
  const passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);
  await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, id));
}

export async function remove(actor: AuthUser, id: string) {
  await findUser(id);
  if (actor.id === id) throw unprocessable("Admin tidak bisa menghapus dirinya sendiri");
  await db
    .update(users)
    .set({ deletedAt: new Date(), isActive: false, updatedAt: new Date() })
    .where(eq(users.id, id));
}

async function findUser(id: string): Promise<UserRow> {
  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, id), isNull(users.deletedAt)))
    .limit(1);
  if (!user) throw notFound("User tidak ditemukan");
  return user;
}

function publicUser(row: UserRow) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}
