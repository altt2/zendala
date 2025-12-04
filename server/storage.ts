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
  getUserByUsername(username: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserRole(userId: string, role: string): Promise<User>;
  createLocalUser(data: { username: string; firstName: string; lastName: string; password: string; role: string }): Promise<User>;
  resetUserPassword(userId: string, newPassword: string): Promise<User>;
  getAllUsers(): Promise<User[]>;
  createQrCode(qrCode: InsertQrCode): Promise<QrCode>;
  getQrCodesByUser(userId: string): Promise<QrCode[]>;
  getAllQrCodes(): Promise<QrCode[]>;
  getQrCodeByCode(code: string): Promise<QrCode | undefined>;
  getQrCodeByPassword(password: string): Promise<QrCode | undefined>;
  updateQrCodeUsed(id: string): Promise<void>;
  markQrCodeAsExpired(id: string): Promise<void>;
  createAccessLog(log: InsertAccessLog): Promise<AccessLog>;
  getAllAccessLogs(): Promise<any[]>;
  getDashboardStats(): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
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

  async createLocalUser(data: { username: string; firstName: string; lastName: string; password: string; role: string }): Promise<User> {
    // Hash password (in production, use bcrypt)
    const crypto = await import("crypto");
    const passwordHash = crypto.createHash("sha256").update(data.password).digest("hex");

    const [user] = await db
      .insert(users)
      .values({
        username: data.username,
        firstName: data.firstName,
        lastName: data.lastName,
        passwordHash,
        role: data.role,
      })
      .returning();
    return user;
  }

  async resetUserPassword(userId: string, newPassword: string): Promise<User> {
    const crypto = await import("crypto");
    const passwordHash = crypto.createHash("sha256").update(newPassword).digest("hex");

    const [user] = await db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .orderBy(users.createdAt);
  }

  private generateAccessPassword(): string {
    // Generate memorable password: XXXX-1234 (4 letters + 4 numbers)
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const numbers = "0123456789";
    let password = "";
    
    // Add 4 random letters
    for (let i = 0; i < 4; i++) {
      password += letters.charAt(Math.floor(Math.random() * letters.length));
    }
    
    password += "-";
    
    // Add 4 random numbers
    for (let i = 0; i < 4; i++) {
      password += numbers.charAt(Math.floor(Math.random() * numbers.length));
    }
    
    return password;
  }

  async createQrCode(qrCodeData: InsertQrCode): Promise<QrCode> {
    const code = randomUUID();
    const accessPassword = this.generateAccessPassword();
    const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000); // 12 hours from now
    const [qrCode] = await db
      .insert(qrCodes)
      .values({
        visitorName: qrCodeData.visitorName,
        visitorType: qrCodeData.visitorType,
        description: qrCodeData.description,
        expiresAt: qrCodeData.expiresAt,
        code,
        accessPassword,
        createdById: (qrCodeData as any).createdById,
        isUsed: "unused",
      })
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

  async getAllQrCodes(): Promise<QrCode[]> {
    return await db
      .select()
      .from(qrCodes)
      .orderBy(desc(qrCodes.createdAt));
  }

  async getQrCodeByCode(code: string): Promise<QrCode | undefined> {
    const [qrCode] = await db
      .select()
      .from(qrCodes)
      .where(eq(qrCodes.code, code));
    return qrCode;
  }

  async getQrCodeByPassword(password: string): Promise<QrCode | undefined> {
    const [qrCode] = await db
      .select()
      .from(qrCodes)
      .where(eq(qrCodes.accessPassword, password));
    return qrCode;
  }

  async updateQrCodeUsed(id: string): Promise<void> {
    await db
      .update(qrCodes)
      .set({ isUsed: "used", usedAt: new Date() })
      .where(eq(qrCodes.id, id));
  }

  async markQrCodeAsExpired(id: string): Promise<void> {
    await db
      .update(qrCodes)
      .set({ isUsed: "expired" })
      .where(eq(qrCodes.id, id));
  }

  async createAccessLog(logData: InsertAccessLog): Promise<AccessLog> {
    const [log] = await db.insert(accessLogs).values(logData).returning();
    return log;
  }

  async getAllAccessLogs(): Promise<any[]> {
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

    const logs = await db
      .select({
        id: accessLogs.id,
        qrCodeId: accessLogs.qrCodeId,
        accessedAt: accessLogs.accessedAt,
        accessType: accessLogs.accessType,
        vehiclePlates: accessLogs.vehiclePlates,
        notes: accessLogs.notes,
        visitorName: qrCodes.visitorName,
        visitorType: qrCodes.visitorType,
        description: qrCodes.description,
        createdById: qrCodes.createdById,
        guardFirstName: users.firstName,
        guardLastName: users.lastName,
        guardRole: users.role,
      })
      .from(accessLogs)
      .innerJoin(qrCodes, eq(accessLogs.qrCodeId, qrCodes.id))
      .innerJoin(users, eq(accessLogs.guardId, users.id))
      .where(gte(accessLogs.accessedAt, fifteenDaysAgo))
      .orderBy(desc(accessLogs.accessedAt));

    const logsWithCreatedBy = await Promise.all(
      logs.map(async (log) => {
        const [creator] = await db
          .select({
            firstName: users.firstName,
            lastName: users.lastName,
          })
          .from(users)
          .where(eq(users.id, log.createdById));

        return {
          id: log.id,
          accessedAt: log.accessedAt,
          accessType: log.accessType,
          vehiclePlates: log.vehiclePlates,
          notes: log.notes,
          qrCode: {
            visitorName: log.visitorName,
            visitorType: log.visitorType,
            description: log.description,
            createdBy: {
              firstName: creator?.firstName || "Unknown",
              lastName: creator?.lastName || "",
            },
          },
          guard: {
            firstName: log.guardFirstName,
            lastName: log.guardLastName,
            role: log.guardRole,
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
      .where(eq(qrCodes.isUsed, "unused"));

    const [usedThisWeekResult] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(qrCodes)
      .where(
        and(
          eq(qrCodes.isUsed, "used"),
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
