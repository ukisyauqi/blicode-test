import { Router } from "express";

import { authenticate } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/requireRole.js";
import { validateBody } from "../../middleware/validate.js";
import * as controller from "./controller.js";
import {
  createUserSchema,
  resetPasswordSchema,
  setActiveSchema,
  updateUserSchema,
} from "./schema.js";

export const usersRouter = Router();

usersRouter.use(authenticate, requireRole("admin"));
usersRouter.get("/", controller.list);
usersRouter.post("/", validateBody(createUserSchema), controller.create);
usersRouter.get("/:id", controller.get);
usersRouter.put("/:id", validateBody(updateUserSchema), controller.update);
usersRouter.patch("/:id/status", validateBody(setActiveSchema), controller.setActive);
usersRouter.patch("/:id/password", validateBody(resetPasswordSchema), controller.resetPassword);
usersRouter.delete("/:id", controller.remove);
