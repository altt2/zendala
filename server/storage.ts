import {
  users,
  qrCodes,
  accessLogs,
  type User,
  type UpsertUser,
  type QrCode,
  type InsertQrCode,
  type AccessLog,
  type InsertAccessLog,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, desc, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserRole(userId: string, role: string): Promise<User>;
  createQrCode(qrCode: InsertQrCode): Promise<QrCode>;
  getQrCodesByUser(userId: string): Promise<QrCode[]>;
  getQrCodeByCode(code: string): Promise<QrCode | undefined>;
  updateQrCodeUsed(id: string): Promise<void>;
  createAccessLog(log: InsertAccessLog): Promise<AccessLog>;
  getAllAccessLogs(): Promise<any[]>;
  getDashboardStats(): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserRole(userId: string, role: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async createQrCode(qrCodeData: InsertQrCode): Promise<QrCode> {
    const code = randomUUID();
    const [qrCode] = await db
      .insert(qrCodes)
      .values({ ...qrCodeData, code })
      .returning();
    return qrCode;
  }

  async getQrCodesByUser(userId: string): Promise<QrCode[]> {
    return await db
      .select()
      .from(qrCodes)
      .where(eq(qrCodes.createdById, userId))
      .orderBy(desc(qrCodes.createdAt));
  }

  async getQrCodeByCode(code: string): Promise<QrCode | undefined> {
    const [qrCode] = await db
      .select()
      .from(qrCodes)
      .where(eq(qrCodes.code, code));
    return qrCode;
  }

  async updateQrCodeUsed(id: string): Promise<void> {
    await db
      .update(qrCodes)
      .set({ isUsed: "true", usedAt: new Date() })
      .where(eq(qrCodes.id, id));
  }

  async createAccessLog(logData: InsertAccessLog): Promise<AccessLog> {
    const [log] = await db.insert(accessLogs).values(logData).returning();
    return log;
  }

  async getAllAccessLogs(): Promise<any[]> {
    const logs = await db
      .select({
        id: accessLogs.id,
        accessedAt: accessLogs.accessedAt,
        accessType: accessLogs.accessType,
        vehiclePlates: accessLogs.vehiclePlates,
        notes: accessLogs.notes,
        qrCode: {
          visitorName: qrCodes.visitorName,
          visitorType: qrCodes.visitorType,
          description: qrCodes.description,
        },
        guard: {
          firstName: users.firstName,
          lastName: users.lastName,
        },
      })
      .from(accessLogs)
      .innerJoin(qrCodes, eq(accessLogs.qrCodeId, qrCodes.id))
      .innerJoin(users, eq(accessLogs.guardId, users.id))
      .orderBy(desc(accessLogs.accessedAt));

    const logsWithCreatedBy = await Promise.all(
      logs.map(async (log) => {
        const [qrCode] = await db
          .select()
          .from(qrCodes)
          .innerJoin(accessLogs, eq(qrCodes.id, accessLogs.qrCodeId))
          .where(eq(accessLogs.id, log.id));

        const [creator] = await db
          .select()
          .from(users)
          .where(eq(users.id, qrCode.qr_codes.createdById));

        return {
          ...log,
          qrCode: {
            ...log.qrCode,
            createdBy: {
              firstName: creator.firstName,
              lastName: creator.lastName,
            },
          },
        };
      })
    );

    return logsWithCreatedBy;
  }

  async getDashboardStats(): Promise<any> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [accessesTodayResult] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(accessLogs)
      .where(gte(accessLogs.accessedAt, today));

    const [activeCodesResult] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(qrCodes)
      .where(eq(qrCodes.isUsed, "false"));

    const [usedThisWeekResult] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(qrCodes)
      .where(
        and(
          eq(qrCodes.isUsed, "true"),
          gte(qrCodes.usedAt, weekAgo)
        )
      );

    const [totalAccessesResult] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(accessLogs);

    return {
      accessesToday: accessesTodayResult?.count || 0,
      activeCodes: activeCodesResult?.count || 0,
      codesUsedThisWeek: usedThisWeekResult?.count || 0,
      totalAccesses: totalAccessesResult?.count || 0,
    };
  }
}

export const storage = new DatabaseStorage();
