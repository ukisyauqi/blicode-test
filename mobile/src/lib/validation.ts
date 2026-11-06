import { z } from "zod";

const email = z.string().trim().email("Email tidak valid");

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Password wajib diisi"),
});

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Nama wajib diisi"),
  email,
  password: z.string().min(8, "Password minimal 8 karakter").max(72),
});

export const reportSchema = z.object({
  title: z.string().trim().min(1, "Judul wajib diisi"),
  description: z.string().trim().min(1, "Deskripsi wajib diisi"),
  latitude: z.number().min(-90, "Latitude tidak valid").max(90, "Latitude tidak valid"),
  longitude: z.number().min(-180, "Longitude tidak valid").max(180, "Longitude tidak valid"),
});

export const passwordSchema = z.object({
  current: z.string().min(1, "Password lama wajib diisi"),
  next: z.string().min(8, "Password baru minimal 8 karakter").max(72),
});
