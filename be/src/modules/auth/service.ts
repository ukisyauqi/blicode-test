import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";

import { env } from "../../config/env.js";
import { db } from "../../db/index.js";
import { users } from "../../db/schema.js";
import { AppError, conflict, unauthorized } from "../../lib/errors.js";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user";
};

const publicUser = {
  id: users.id,
  name: users.name,
  email: users.email,
  role: users.role,
};

export async function register(input: { name: string; email: string; password: string }) {
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
      .values({ name: input.name, email: input.email, passwordHash })
      .returning(publicUser);
    return user!;
  } catch (error) {
    if (isUniqueViolation(error)) throw conflict("Email sudah dipakai");
    throw error;
  }
}

export async function login(input: { email: string; password: string }): Promise<UserRow> {
  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      passwordHash: users.passwordHash,
      isActive: users.isActive,
      deletedAt: users.deletedAt,
    })
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1);

  if (!user || !user.isActive || user.deletedAt) {
    throw unauthorized("Email atau password salah");
  }
  if (!(await bcrypt.compare(input.password, user.passwordHash))) {
    throw unauthorized("Email atau password salah");
  }
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

export async function changePassword(userId: string, current: string, next: string) {
  const [user] = await db
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user || !(await bcrypt.compare(current, user.passwordHash))) {
    throw new AppError(422, "INVALID_PASSWORD", "Password saat ini salah");
  }
  const passwordHash = await bcrypt.hash(next, env.BCRYPT_ROUNDS);
  await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, userId));
}

export function issueToken(user: UserRow): string {
  return jwt.sign({ role: user.role }, env.JWT_SECRET, {
    subject: user.id,
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}
