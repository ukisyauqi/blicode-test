import { Router } from "express";

import { authenticate } from "../../middleware/auth.js";
import * as controller from "./controller.js";

export const dashboardRouter = Router();

dashboardRouter.use(authenticate);
dashboardRouter.get("/stats", controller.stats);
