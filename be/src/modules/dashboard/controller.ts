import type { Request, Response } from "express";

import { statsQuery } from "./schema.js";
import * as service from "./service.js";

export async function stats(req: Request, res: Response) {
  const query = statsQuery.parse(req.query);
  res.json({ data: await service.stats(req.user!, query) });
}
