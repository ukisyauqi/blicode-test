import type { Request, Response } from "express";

import { env } from "../../config/env.js";
import * as service from "./service.js";

const cookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  // FE (Vercel) dan BE (Render) beda domain saat production, jadi cookie
  // harus SameSite=None + Secure agar terkirim cross-site.
  sameSite: env.NODE_ENV === "production" ? ("none" as const) : ("lax" as const),
  path: "/",
};

export async function register(req: Request, res: Response) {
  const user = await service.register(req.body);
  const token = service.issueToken(user);
  res.cookie("token", token, cookieOptions).status(201).json({ data: user, token });
}

export async function login(req: Request, res: Response) {
  const user = await service.login(req.body);
  const token = service.issueToken(user);
  res.cookie("token", token, cookieOptions).json({ data: user, token });
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
