import { randomUUID } from "node:crypto";

import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";

import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { notFoundHandler, errorHandler } from "./middleware/errorHandler.js";
import { CLASSES, classifierReady } from "./ml/classifier.js";
import { authRouter } from "./modules/auth/routes.js";
import { dashboardRouter } from "./modules/dashboard/routes.js";
import { reportsRouter } from "./modules/reports/routes.js";
import { usersRouter } from "./modules/users/routes.js";

export function createApp() {
  const app = express();
  if (env.NODE_ENV === "production") app.set("trust proxy", 1);

  app.use(
    helmet({
      // Foto laporan diambil frontend dari origin berbeda (Vite di port 5173).
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(cookieParser());
  app.use(express.json({ limit: "100kb" }));
  app.use(
    pinoHttp({
      logger,
      genReqId: () => randomUUID(),
    }),
  );
  app.use("/uploads", express.static(env.UPLOAD_DIR));

  app.get("/api/health", (_req, res) => {
    res.json({
      data: { status: "ok", model: { loaded: classifierReady(), classes: CLASSES } },
    });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/reports", reportsRouter);
  app.use("/api/dashboard", dashboardRouter);
  app.use("/api/users", usersRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
