import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, index, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: varchar("username").unique(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  passwordHash: varchar("password_hash"),
  role: varchar("role", { length: 20 }).notNull().default("vecino"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export const qrCodes = pgTable("qr_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code").notNull().unique(),
  visitorName: varchar("visitor_name").notNull(),
  visitorType: varchar("visitor_type", { length: 50 }).notNull(),
  description: text("description"),
  createdById: varchar("created_by_id").notNull().references(() => users.id),
  isUsed: varchar("is_used").notNull().default("false"),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertQrCodeSchema = createInsertSchema(qrCodes).omit({
  id: true,
  code: true,
  createdById: true,
  isUsed: true,
  usedAt: true,
  createdAt: true,
});

export type InsertQrCode = z.infer<typeof insertQrCodeSchema>;
export type QrCode = typeof qrCodes.$inferSelect;

export const accessLogs = pgTable("access_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  qrCodeId: varchar("qr_code_id").notNull().references(() => qrCodes.id),
  guardId: varchar("guard_id").notNull().references(() => users.id),
  accessType: varchar("access_type", { length: 50 }),
  vehiclePlates: varchar("vehicle_plates"),
  notes: text("notes"),
  accessedAt: timestamp("accessed_at").defaultNow(),
});

export const insertAccessLogSchema = createInsertSchema(accessLogs).omit({
  id: true,
  accessedAt: true,
});

export type InsertAccessLog = z.infer<typeof insertAccessLogSchema>;
export type AccessLog = typeof accessLogs.$inferSelect;
