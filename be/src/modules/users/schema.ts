import { z } from "zod";

const email = z
  .string()
  .email()
  .transform((value) => value.toLowerCase());
const role = z.enum(["admin", "user"]);
const password = z.string().min(8).max(72);

const booleanQuery = z.preprocess(
  (value) => (value === "true" ? true : value === "false" ? false : value),
  z.boolean().optional(),
);

export const createUserSchema = z.object({
  name: z.string().trim().min(1),
  email,
  password,
  role: role.default("user"),
});

export const updateUserSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    email: email.optional(),
    role: role.optional(),
  })
  .refine((body) => Object.values(body).some((value) => value !== undefined), {
    message: "Tidak ada perubahan yang dikirim",
  });

export const setActiveSchema = z.object({ isActive: z.boolean() });
export const resetPasswordSchema = z.object({ password });

export const listUsersQuery = z.object({
  search: z.string().trim().optional(),
  role: role.optional(),
  is_active: booleanQuery,
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const idSchema = z.string().uuid();
