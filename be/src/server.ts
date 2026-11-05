import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { pool } from "./db/index.js";
import { loadClassifier } from "./ml/classifier.js";

try {
  await loadClassifier();
} catch (error) {
  logger.error({ err: error }, "gagal memuat model ONNX");
  process.exit(1);
}

const server = createApp().listen(env.PORT, () => {
  logger.info(`API berjalan di http://localhost:${env.PORT}`);
});

async function shutdown(signal: string) {
  logger.info(`${signal} diterima, menutup server`);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
