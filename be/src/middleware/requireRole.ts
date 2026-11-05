import type { NextFunction, Request, Response } from "express";

import { forbidden } from "../lib/errors.js";

export function requireRole(...roles: Array<"admin" | "user">) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) return next(forbidden());
    next();
  };
}
