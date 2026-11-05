import { z } from "zod";

const email = z
  .string()
  .email()
  .transform((value) => value.toLowerCase());
const password = z.string().min(8).max(72);

export const registerSchema = z.object({
  name: z.string().trim().min(1),
  email,
  password,
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: password,
});
