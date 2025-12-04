import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertQrCodeSchema, insertAccessLogSchema } from "@shared/schema";
import type { RequestHandler } from "express";

const isAdmin: RequestHandler = async (req: any, res, next) => {
  const userId = req.user?.claims?.sub || req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  const user = await storage.getUser(userId);
  if (user?.role !== "administrador") {
    return res.status(403).json({ message: "Forbidden: Admin access required" });
  }
  
  next();
};

const isVecinoOrAdmin: RequestHandler = async (req: any, res, next) => {
  const userId = req.user?.claims?.sub || req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  const user = await storage.getUser(userId);
  if (user?.role !== "vecino" && user?.role !== "administrador") {
    return res.status(403).json({ message: "Forbidden: Resident or Admin access required" });
  }
  
  next();
};

const isGuardOrAdmin: RequestHandler = async (req: any, res, next) => {
  const userId = req.user?.claims?.sub || req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  const user = await storage.getUser(userId);
  if (user?.role !== "guardia" && user?.role !== "administrador") {
    return res.status(403).json({ message: "Forbidden: Guard or Admin access required" });
  }
  
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  await setupAuth(app);

  // Health check endpoint - no auth required
  app.get('/api/health', (req, res) => {
    console.log('🏥 Health check from', req.get('origin'));
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV 
    });
  });

  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      // Support both OIDC (claims.sub) and local auth (id)
      const userId = req.user.claims?.sub || req.user.id;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post('/api/auth/set-role', isAuthenticated, async (req: any, res) => {
    try {
      // Support both OIDC (claims.sub) and local auth (id)
      const userId = req.user.claims?.sub || req.user.id;
      const { role } = req.body;

      if (!role || !["vecino", "guardia", "administrador"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      const user = await storage.updateUserRole(userId, role);
      res.json(user);
    } catch (error) {
      console.error("Error setting user role:", error);
      res.status(500).json({ message: "Failed to set user role" });
    }
  });

  app.post("/api/qr-codes", isAuthenticated, isVecinoOrAdmin, async (req: any, res) => {
    try {
      // Support both OIDC (claims.sub) and local auth (id)
      const userId = req.user.claims?.sub || req.user.id;
      const validatedData = insertQrCodeSchema.parse(req.body);
      // build final object separately so TypeScript doesn't complain about
      // server-set fields that are omitted from the client-facing schema
      const dataToInsert = {
        ...validatedData,
        // createdById is set by the server and not part of the request schema
        createdById: userId,
      } as any;

      const qrCode = await storage.createQrCode(dataToInsert);

      console.log(`[QR Code Create] Generated code: ${qrCode.code}, ID: ${qrCode.id}`);
      console.log(`[QR Code Create] Full response:`, JSON.stringify(qrCode));
      res.json(qrCode);
    } catch (error: any) {
      console.error("Error creating QR code:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create QR code" });
    }
  });

  app.get("/api/qr-codes", isAuthenticated, isVecinoOrAdmin, async (req: any, res) => {
    try {
      // Support both OIDC (claims.sub) and local auth (id)
      const userId = req.user.claims?.sub || req.user.id;
      const qrCodes = await storage.getQrCodesByUser(userId);
      res.json(qrCodes);
    } catch (error) {
      console.error("Error fetching QR codes:", error);
      res.status(500).json({ message: "Failed to fetch QR codes" });
    }
  });

  app.post("/api/qr-codes/validate", isAuthenticated, isGuardOrAdmin, async (req: any, res) => {
    try {
      let { code, password } = req.body;
      let qrCode;
      
      // Try to validate by password first (preferred), then by code (fallback)
      if (password) {
        const passwordStr = String(password).trim();
        const passwordUpperCase = passwordStr.toUpperCase();
        
        console.log(`[QR Validation] Received input: "${passwordStr}"`);
        console.log(`[QR Validation] Searching by password (uppercase): "${passwordUpperCase}"`);
        qrCode = await storage.getQrCodeByPassword(passwordUpperCase);
        
        // If not found by password, try searching by code as-is (UUIDs are case-sensitive)
        if (!qrCode) {
          console.log(`[QR Validation] Password not found, trying as code (original case): "${passwordStr}"`);
          qrCode = await storage.getQrCodeByCode(passwordStr);
        }
      } else if (code) {
        code = String(code).trim();
        console.log(`[QR Validation] Searching by code: "${code}"`);
        qrCode = await storage.getQrCodeByCode(code);
      } else {
        return res.status(400).json({ message: "Password or code is required" });
      }

      if (!qrCode) {
        console.log(`[QR Validation] QR not found`);
        return res.json({
          valid: false,
          message: "Contraseña o código no encontrado",
        });
      }

      console.log(`[QR Validation] QR found: ${qrCode.id}, isUsed: ${qrCode.isUsed}, expiresAt: ${qrCode.expiresAt}`);

      // Check if code is expired
      if (qrCode.expiresAt) {
        const expiresAtTime = new Date(qrCode.expiresAt).getTime();
        const nowTime = new Date().getTime();
        console.log(`[QR Validation] Expiration check - expires: ${expiresAtTime}, now: ${nowTime}, diff: ${expiresAtTime - nowTime}ms`);
        
        if (nowTime > expiresAtTime) {
          console.log(`[QR Validation] QR expired: ${qrCode.id}`);
          if (qrCode.isUsed === "unused") {
            await storage.markQrCodeAsExpired(qrCode.id);
          }
          return res.json({
            valid: false,
            message: "Este código ha expirado (pasaron más de 12 horas)",
          });
        }
      }

      if (qrCode.isUsed !== "unused") {
        return res.json({
          valid: false,
          message: qrCode.isUsed === "used" ? "Este acceso ya ha sido utilizado" : "Este código ha expirado",
        });
      }

      const creator = await storage.getUser(qrCode.createdById);

      res.json({
        valid: true,
        qrCode: {
          id: qrCode.id,
          visitorName: qrCode.visitorName,
          visitorType: qrCode.visitorType,
          description: qrCode.description,
          createdAt: qrCode.createdAt,
          expiresAt: qrCode.expiresAt,
          createdBy: {
            firstName: creator?.firstName,
            lastName: creator?.lastName,
          },
        },
      });
    } catch (error) {
      console.error("Error validating QR code:", error);
      res.status(500).json({ message: "Failed to validate QR code" });
    }
  });

  app.post("/api/access-logs", isAuthenticated, isGuardOrAdmin, async (req: any, res) => {
    try {
      // Support both OIDC (claims.sub) and local auth (id)
      const guardId = req.user.claims?.sub || req.user.id;
      const { qrCodeId, accessType, vehiclePlates, notes } = req.body;

      if (!qrCodeId) {
        return res.status(400).json({ message: "QR code ID is required" });
      }

      // Debug: Log the user role authorizing the access
      const authUser = await storage.getUser(guardId);
      console.log(`[Access Log Create] User ${guardId} (${authUser?.firstName} ${authUser?.lastName}) with role ${authUser?.role} is authorizing access`);

      await storage.updateQrCodeUsed(qrCodeId);

      const accessLog = await storage.createAccessLog({
        qrCodeId,
        guardId,
        accessType: accessType || null,
        vehiclePlates: vehiclePlates || null,
        notes: notes || null,
      });

      res.json(accessLog);
    } catch (error) {
      console.error("Error creating access log:", error);
      res.status(500).json({ message: "Failed to create access log" });
    }
  });

  app.get("/api/access-logs", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const logs = await storage.getAllAccessLogs();
      res.json(logs);
    } catch (error) {
      console.error("Error fetching access logs:", error);
      res.status(500).json({ message: "Failed to fetch access logs" });
    }
  });

  app.get("/api/admin/stats", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // User management endpoints (public for creation, admin for listing)
  app.post("/api/users/create", async (req: any, res) => {
    try {
      const { username, firstName, lastName, password, adminPassword, role } = req.body;

      if (!adminPassword || adminPassword !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ message: "Invalid admin password" });
      }

      if (!username || !firstName || !lastName || !password || !role) {
        return res.status(400).json({ message: "All fields are required" });
      }

      if (!["vecino", "guardia", "administrador"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      // Check if username already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const user = await storage.createLocalUser({
        username,
        firstName,
        lastName,
        password,
        role,
      });

      res.json({
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      });
    } catch (error: any) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.get("/api/users", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(
        users.map((u) => ({
          id: u.id,
          username: u.username,
          firstName: u.firstName,
          lastName: u.lastName,
          role: u.role,
          createdAt: u.createdAt,
        }))
      );
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post("/api/users/:userId/reset-password", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { newPassword } = req.body;

      if (!newPassword) {
        return res.status(400).json({ message: "New password is required" });
      }

      const user = await storage.resetUserPassword(userId, newPassword);
      
      res.json({
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        message: "Password reset successfully",
      });
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
