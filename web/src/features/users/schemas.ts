import { z } from "zod";

const roleSchema = z.enum(["admin", "user"], { message: "Pilih role pengguna" });
const emailSchema = z.string().trim().min(1, "Email wajib diisi").email("Format email tidak valid");

export const createUserSchema = z.object({
  name: z.string().trim().min(1, "Nama wajib diisi").max(100, "Nama terlalu panjang"),
  email: emailSchema,
  password: z
    .string()
    .min(8, "Password minimal 8 karakter")
    .max(72, "Password maksimal 72 karakter"),
  role: roleSchema,
});

export type CreateUserValues = z.infer<typeof createUserSchema>;

export const editUserSchema = z.object({
  name: z.string().trim().min(1, "Nama wajib diisi").max(100, "Nama terlalu panjang"),
  email: emailSchema,
  role: roleSchema,
});

export type EditUserValues = z.infer<typeof editUserSchema>;

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password minimal 8 karakter")
      .max(72, "Password maksimal 72 karakter"),
    confirmPassword: z.string().min(1, "Konfirmasi password wajib diisi"),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Konfirmasi password tidak sama",
  });

export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
