import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";
import LocalStrategy from "passport-local";
import { createHash } from "crypto";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler, Request, Response, NextFunction } from "express";
import memoize from "memoizee";
import { storage } from "./storage";

const getOidcConfig = memoize(
  async () => {
    const replId = process.env.REPL_ID;
    if (!replId) {
      throw new Error(
        'REPL_ID environment variable is not set. This is required for Replit authentication. ' +
        'Make sure you are running this on Replit with the proper environment variables configured.'
      );
    }
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      replId
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000;
  
  // Validate DATABASE_URL
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  
  console.log('📊 Initializing session with MemoryStore');
  
  const sessionSecret = process.env.SESSION_SECRET || 'development-secret-key-change-in-production';
  
  return session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: sessionTtl,
      sameSite: 'lax',
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  let config: any;
  try {
    config = await getOidcConfig();
  } catch (error) {
    console.warn('⚠️ Warning: Replit OIDC not configured. OAuth login will not work.');
    console.warn('This is normal for local development. Use local login instead.');
    config = null;
  }

  // Local strategy for username/password authentication
  passport.use(
    new LocalStrategy.Strategy(
      {
        usernameField: "username",
        passwordField: "password",
      },
      async (username: string, password: string, done: (err: any, user?: any, info?: any) => void) => {
        try {
          console.log('🔐 Local auth attempt:', username);
          const user = await storage.getUserByUsername(username);
          if (!user) {
            console.log('❌ User not found:', username);
            return done(null, false, { message: "Usuario no encontrado" });
          }

          if (!user.passwordHash) {
            console.log('❌ User has no password hash:', username);
            return done(null, false, { message: "Usuario no válido" });
          }

          // Hash the provided password and compare
          const passwordHash = createHash("sha256").update(password).digest("hex");
          if (passwordHash !== user.passwordHash) {
            console.log('❌ Wrong password for user:', username);
            return done(null, false, { message: "Contraseña incorrecta" });
          }

          console.log('✅ User authenticated:', username);
          return done(null, { id: user.id, username: user.username, role: user.role });
        } catch (error) {
          console.error('🔥 Authentication error:', error);
          return done(error);
        }
      }
    )
  );

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  const registeredStrategies = new Set<string>();

  const ensureStrategy = (domain: string) => {
    const strategyName = `replitauth:${domain}`;
    if (!registeredStrategies.has(strategyName)) {
      const strategy = new Strategy(
        {
          name: strategyName,
          config,
          scope: "openid email profile offline_access",
          callbackURL: `https://${domain}/api/callback`,
        },
        verify,
      );
      passport.use(strategy);
      registeredStrategies.add(strategyName);
    }
  };

  passport.serializeUser((user: any, cb: (err: any, id?: any) => void) => {
    cb(null, user);
  });
  passport.deserializeUser((user: any, cb: (err: any, user?: any) => void) => {
    cb(null, user);
  });

  // Local login endpoint
  app.post("/api/login-local", (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        console.error('🔥 Login error:', err);
        return res.status(500).json({ message: "Error during authentication", error: process.env.NODE_ENV === 'development' ? err.message : undefined });
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || "Authentication failed" });
      }

      req.logIn(user, (err: any) => {
        if (err) {
          console.error('🔥 Login session error:', err);
          return res.status(500).json({ message: "Error logging in", error: process.env.NODE_ENV === 'development' ? err.message : undefined });
        }
        res.json({
          id: user.id,
          username: user.username,
          role: user.role,
        });
      });
    })(req, res, next);
  });

  app.get("/api/login", (req: Request, res: Response, next: NextFunction) => {
    if (!config) {
      return res.status(503).json({ message: "Replit OAuth not configured. Use local login instead." });
    }
    ensureStrategy(req.hostname);
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req: Request, res: Response, next: NextFunction) => {
    if (!config) {
      return res.status(503).json({ message: "Replit OAuth not configured." });
    }
    ensureStrategy(req.hostname);
    passport.authenticate(`replitauth:${req.hostname}`, {
      successRedirect: "/role-selection",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.get("/api/logout", (req: Request, res: Response) => {
    req.logout(() => {
      if (!config || !process.env.REPL_ID) {
        return res.redirect("/");
      }
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || (!user?.expires_at && !user?.id)) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Local auth users (have id but no expires_at) - skip token refresh
  if (!user?.expires_at && user?.id) {
    return next();
  }

  // OIDC auth users (have expires_at) - check token expiry
  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};
