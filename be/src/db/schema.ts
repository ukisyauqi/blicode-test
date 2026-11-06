import {
  boolean,
  index,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("user_role", ["admin", "user"]);
export const categoryEnum = pgEnum("report_category", ["organic", "plastic", "paper"]);
export const statusEnum = pgEnum("report_status", [
  "pending",
  "in_progress",
  "completed",
  "rejected",
]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: roleEnum("role").notNull().default("user"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("users_email_unique").on(table.email),
    index("users_role_idx").on(table.role),
  ],
);

export const reports = pgTable(
  "reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    description: text("description").notNull(),
    category: categoryEnum("category").notNull(),
    address: text("address"),
    postalCode: text("postal_code"),
    latitude: numeric("latitude", { precision: 9, scale: 6, mode: "number" }).notNull(),
    longitude: numeric("longitude", { precision: 9, scale: 6, mode: "number" }).notNull(),
    photoPath: text("photo_path"),
    predictedCategory: categoryEnum("predicted_category"),
    predictedConfidence: numeric("predicted_confidence", {
      precision: 5,
      scale: 4,
      mode: "number",
    }),
    status: statusEnum("status").notNull().default("pending"),
    rejectReason: text("reject_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("reports_user_id_idx").on(table.userId),
    index("reports_status_idx").on(table.status),
    index("reports_category_idx").on(table.category),
    index("reports_created_at_idx").on(table.createdAt),
  ],
);

export const reportStatusHistory = pgTable(
  "report_status_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    reportId: uuid("report_id")
      .notNull()
      .references(() => reports.id, { onDelete: "cascade" }),
    fromStatus: statusEnum("from_status"),
    toStatus: statusEnum("to_status").notNull(),
    changedBy: uuid("changed_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("report_history_report_id_idx").on(table.reportId)],
);
