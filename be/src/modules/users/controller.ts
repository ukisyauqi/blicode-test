import type { Request, Response } from "express";

import { idSchema, listUsersQuery } from "./schema.js";
import * as service from "./service.js";

export async function list(req: Request, res: Response) {
  res.json(await service.list(listUsersQuery.parse(req.query)));
}

export async function get(req: Request, res: Response) {
  res.json({ data: await service.get(idSchema.parse(req.params.id)) });
}

export async function create(req: Request, res: Response) {
  res.status(201).json({ data: await service.create(req.body) });
}

export async function update(req: Request, res: Response) {
  res.json({ data: await service.update(req.user!, idSchema.parse(req.params.id), req.body) });
}

export async function setActive(req: Request, res: Response) {
  res.json({
    data: await service.setActive(req.user!, idSchema.parse(req.params.id), req.body.isActive),
  });
}

export async function resetPassword(req: Request, res: Response) {
  await service.resetPassword(idSchema.parse(req.params.id), req.body.password);
  res.status(204).end();
}

export async function remove(req: Request, res: Response) {
  await service.remove(req.user!, idSchema.parse(req.params.id));
  res.status(204).end();
}
