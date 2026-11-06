import { z } from "zod";

export const reportSchema = z.object({
  title: z.string().trim().max(120, "Judul maksimal 120 karakter").optional(),
  description: z
    .string()
    .trim()
    .min(10, "Deskripsi minimal 10 karakter")
    .max(2000, "Deskripsi maksimal 2000 karakter"),
  category: z
    .enum(["organic", "plastic", "paper"], {
      message: "Pilih kategori sampah",
    })
    .optional(),
  address: z.string().trim().max(255, "Alamat maksimal 255 karakter").optional(),
  latitude: z
    .number({ error: "Pilih lokasi pada peta" })
    .min(-90, "Latitude tidak valid")
    .max(90, "Latitude tidak valid"),
  longitude: z
    .number({ error: "Pilih lokasi pada peta" })
    .min(-180, "Longitude tidak valid")
    .max(180, "Longitude tidak valid"),
});

export type ReportFormValues = z.infer<typeof reportSchema>;

/** Judul dibuat otomatis dari awal deskripsi karena tidak lagi diinput manual. */
export function titleFromDescription(description: string): string {
  const normalized = description.trim().replace(/\s+/g, " ");
  return normalized.slice(0, 60);
}
