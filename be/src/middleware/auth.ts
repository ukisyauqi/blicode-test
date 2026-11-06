import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { and, eq, isNull } from "drizzle-orm";

import { env } from "../config/env.js";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { unauthorized } from "../lib/errors.js";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user";
};

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthUser;
  }
}

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  // Mobile tidak bisa baca cookie httpOnly, jadi terima Bearer juga.
  const token =
    req.headers.authorization?.match(/^Bearer (.+)$/i)?.[1] ?? req.cookies?.token;
  if (!token) return next(unauthorized());

  let sub: string;
  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    if (typeof payload === "string" || typeof payload.sub !== "string") throw new Error();
    sub = payload.sub;
  } catch {
    return next(unauthorized("Sesi tidak valid"));
  }

  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
    })
    .from(users)
    .where(and(eq(users.id, sub), eq(users.isActive, true), isNull(users.deletedAt)))
    .limit(1);

  if (!user) return next(unauthorized("Sesi tidak valid"));
  req.user = user;
  next();
}
