import { z } from "zod";

export const statsQuery = z
  .object({
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  })
  .refine((query) => !query.from || !query.to || query.from <= query.to, {
    message: "Tanggal awal tidak boleh setelah tanggal akhir",
    path: ["from"],
  });

export type StatsQuery = z.infer<typeof statsQuery>;
