import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { extname } from "node:path";

import multer from "multer";
import sharp from "sharp";

import { env } from "../config/env.js";
import { AppError } from "../lib/errors.js";

mkdirSync(env.UPLOAD_DIR, { recursive: true });

const extensions = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
} as const;

const allowedExtensions = new Set([".jpg", ".jpeg", ".png", ".webp"]);

const limits = {
  fileSize: env.MAX_UPLOAD_SIZE_MB * 1024 * 1024,
  fields: 20,
  parts: 25,
  fieldSize: 100 * 1024,
};

const imageFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  const extension = extname(file.originalname).toLowerCase();
  if (!Object.hasOwn(extensions, file.mimetype) || !allowedExtensions.has(extension)) {
    return cb(new AppError(400, "INVALID_FILE_TYPE", "Tipe file harus JPEG, PNG, atau WebP"));
  }
  cb(null, true);
};

export const uploadMemory = multer({
  storage: multer.memoryStorage(),
  limits,
  fileFilter: imageFilter,
});

export async function photoFilename(input: Buffer): Promise<string> {
  const { format } = await sharp(input).metadata();
  const extension =
    format === "jpeg" ? ".jpg" : format === "png" ? ".png" : format === "webp" ? ".webp" : null;
  if (!extension) throw new AppError(400, "INVALID_FILE_TYPE", "Tipe file tidak didukung");
  return `${randomUUID()}${extension}`;
}
