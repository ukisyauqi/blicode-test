import { Router } from "express";
import rateLimit from "express-rate-limit";

import { env } from "../../config/env.js";
import { authenticate } from "../../middleware/auth.js";
import { validateBody } from "../../middleware/validate.js";
import * as controller from "./controller.js";
import { changePasswordSchema, loginSchema, registerSchema } from "./schema.js";

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => env.NODE_ENV === "test",
});

export const authRouter = Router();

authRouter.post("/register", authLimiter, validateBody(registerSchema), controller.register);
authRouter.post("/login", authLimiter, validateBody(loginSchema), controller.login);
authRouter.post("/logout", authenticate, controller.logout);
authRouter.get("/me", authenticate, controller.me);
authRouter.patch(
  "/me/password",
  authenticate,
  validateBody(changePasswordSchema),
  controller.changePassword,
);
