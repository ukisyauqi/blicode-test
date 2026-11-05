import { z } from "zod";

const category = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.enum(["organic", "plastic", "paper"]).optional(),
);

const status = z.enum(["pending", "in_progress", "completed", "rejected"]);

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

export const createReportSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  address: z.string().trim().optional(),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  category,
});

export const updateReportSchema = z.object({
  title: z.string().trim().min(1).optional(),
  description: z.string().trim().min(1).optional(),
  address: z.string().trim().nullable().optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  category,
});

export const listReportsQuery = z.object({
  search: z.string().trim().optional(),
  status: status.optional(),
  category: z.enum(["organic", "plastic", "paper"]).optional(),
  from: dateFilter,
  to: dateFilter,
  reporter_id: z.string().uuid().optional(),
  sort: z.enum(["created_at_desc", "created_at_asc", "status"]).default("created_at_desc"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const statusSchema = z
  .object({
    status,
    reason: z.string().trim().min(1).optional(),
  })
  .refine((body) => body.status !== "rejected" || body.reason !== undefined, {
    message: "Alasan wajib diisi saat menolak laporan",
    path: ["reason"],
  });

export const idSchema = z.string().uuid();

export type CreateReportInput = z.infer<typeof createReportSchema>;
export type UpdateReportInput = z.infer<typeof updateReportSchema>;
export type ListReportsQuery = z.infer<typeof listReportsQuery>;
export type StatusInput = z.infer<typeof statusSchema>;
