import { Router } from "express";
import rateLimit from "express-rate-limit";

import { env } from "../../config/env.js";
import { authenticate } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/requireRole.js";
import { uploadMemory } from "../../middleware/upload.js";
import { validateBody } from "../../middleware/validate.js";
import * as controller from "./controller.js";
import { createReportSchema, statusSchema, updateReportSchema } from "./schema.js";

const classifyLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => env.NODE_ENV === "test",
});

export const reportsRouter = Router();

reportsRouter.use(authenticate);
reportsRouter.post("/classify", classifyLimiter, uploadMemory.single("file"), controller.classify);
reportsRouter.post(
  "/",
  uploadMemory.single("photo"),
  validateBody(createReportSchema),
  controller.create,
);
reportsRouter.get("/", controller.list);
reportsRouter.get("/:id/history", controller.history);
reportsRouter.patch(
  "/:id/status",
  requireRole("admin"),
  validateBody(statusSchema),
  controller.changeStatus,
);
reportsRouter.get("/:id", controller.get);
reportsRouter.put(
  "/:id",
  uploadMemory.single("photo"),
  validateBody(updateReportSchema),
  controller.update,
);
reportsRouter.delete("/:id", controller.remove);
