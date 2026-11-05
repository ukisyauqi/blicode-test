import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { ZodError } from "zod";

import { logger } from "../config/logger.js";
import { env } from "../config/env.js";
import { AppError } from "../lib/errors.js";
import { issues } from "./validate.js";

export function notFoundHandler(_req: Request, _res: Response, next: NextFunction) {
  next(new AppError(404, "NOT_FOUND", "Endpoint tidak ditemukan"));
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof ZodError) {
    return res.status(422).json({
      error: { code: "VALIDATION_ERROR", message: "Validasi gagal", details: issues(error) },
    });
  }

  const bodyStatus = bodyParserStatus(error);
  if (bodyStatus) {
    const tooLarge = bodyStatus === 413;
    return res.status(bodyStatus).json({
      error: {
        code: tooLarge ? "PAYLOAD_TOO_LARGE" : "INVALID_JSON",
        message: tooLarge ? "Ukuran body melebihi batas" : "Format JSON tidak valid",
      },
    });
  }

  if (error instanceof multer.MulterError) {
    const status = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    const message =
      error.code === "LIMIT_FILE_SIZE"
        ? `Ukuran file melebihi ${env.MAX_UPLOAD_SIZE_MB} MB`
        : "Upload file gagal";
    return res.status(status).json({ error: { code: error.code, message } });
  }

  if (error instanceof AppError) {
    return res.status(error.status).json({
      error: {
        code: error.code,
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
      },
    });
  }

  logger.error({ err: error }, "unhandled error");
  return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Terjadi kesalahan" } });
}

function bodyParserStatus(error: unknown): 400 | 413 | undefined {
  if (typeof error !== "object" || error === null || !("type" in error)) return undefined;
  if (error.type === "entity.parse.failed") return 400;
  if (error.type === "entity.too.large") return 413;
  return undefined;
}
