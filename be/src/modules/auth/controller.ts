import type { Request, Response } from "express";

import { env } from "../../config/env.js";
import * as service from "./service.js";

const cookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export async function register(req: Request, res: Response) {
  const user = await service.register(req.body);
  res.cookie("token", service.issueToken(user), cookieOptions).status(201).json({ data: user });
}

export async function login(req: Request, res: Response) {
  const user = await service.login(req.body);
  res.cookie("token", service.issueToken(user), cookieOptions).json({ data: user });
}

export function logout(_req: Request, res: Response) {
  res.clearCookie("token", cookieOptions).status(204).end();
}

export function me(req: Request, res: Response) {
  res.json({ data: req.user });
}

export async function updateProfile(req: Request, res: Response) {
  const user = await service.updateProfile(req.user!.id, req.body);
  res.json({ data: user });
}

export async function changePassword(req: Request, res: Response) {
  await service.changePassword(req.user!.id, req.body.currentPassword, req.body.newPassword);
  res.status(204).end();
}
