import type { Request, Response } from "express";

import { AppError } from "../../lib/errors.js";
import { classifyImage } from "../../ml/classifier.js";
import { InvalidImageError } from "../../ml/preprocess.js";
import { idSchema, listReportsQuery } from "./schema.js";
import * as service from "./service.js";

export async function create(req: Request, res: Response) {
  const report = await service.create(req.user!, req.body, req.file);
  res.status(201).json({ data: report });
}

export async function list(req: Request, res: Response) {
  const query = listReportsQuery.parse(req.query);
  res.json(await service.list(req.user!, query));
}

export async function get(req: Request, res: Response) {
  res.json({ data: await service.get(req.user!, idSchema.parse(req.params.id)) });
}

export async function update(req: Request, res: Response) {
  const report = await service.update(req.user!, idSchema.parse(req.params.id), req.body, req.file);
  res.json({ data: report });
}

export async function remove(req: Request, res: Response) {
  await service.remove(req.user!, idSchema.parse(req.params.id));
  res.status(204).end();
}

export async function changeStatus(req: Request, res: Response) {
  const report = await service.changeStatus(req.user!, idSchema.parse(req.params.id), req.body);
  res.json({ data: report });
}

export async function history(req: Request, res: Response) {
  res.json({ data: await service.history(req.user!, idSchema.parse(req.params.id)) });
}

export async function classify(req: Request, res: Response) {
  if (!req.file) throw new AppError(422, "FILE_REQUIRED", "File foto wajib dikirim");
  try {
    const result = await classifyImage(req.file.buffer);
    res.json({ data: result });
  } catch (error) {
    if (error instanceof InvalidImageError) {
      throw new AppError(400, "INVALID_IMAGE", "File bukan gambar yang valid");
    }
    throw error;
  }
}
