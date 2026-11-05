import { z } from "zod";

const dateFilter = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z
    .string()
    .trim()
    .refine((value) => !Number.isNaN(new Date(value).getTime()), {
      message: "Format tanggal tidak valid",
    })
    .optional(),
);

export const statsQuery = z.object({
  from: dateFilter,
  to: dateFilter,
});

export type StatsQuery = z.infer<typeof statsQuery>;
