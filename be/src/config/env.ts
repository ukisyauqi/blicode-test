import "dotenv/config";

import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default("7d"),
  CORS_ORIGIN: z.string().url().default("http://localhost:5173"),
  APP_TIMEZONE: z.string().default("Asia/Jakarta"),
  UPLOAD_DIR: z.string().default("./uploads"),
  MAX_UPLOAD_SIZE_MB: z.coerce.number().positive().default(5),
  ML_MODEL_PATH: z.string().default("./models/best.onnx"),
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),
  ADMIN_NAME: z.string().default("Admin"),
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().min(8).optional(),
});

export const env = envSchema.parse(process.env);

if (env.NODE_ENV === "production" && env.JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET minimal 32 karakter");
}
