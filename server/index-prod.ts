import fs from "node:fs";
import path from "node:path";
import { type Server } from "node:http";

import express, { type Express } from "express";
import runApp from "./app";

export async function serveStatic(app: Express, _server: Server) {
  const distPath = path.resolve(import.meta.dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Serve static files for SPA, but NOT for /api routes
  // This ensures API routes are handled by Express handlers, not by static file serving
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      // Skip static file serving for API routes - let them be handled by route handlers
      return next();
    }
    // For non-API routes, try to serve static files
    express.static(distPath)(req, res, next);
  });

  // API routes that weren't matched return 404 as JSON
  app.use("/api", (_req, res) => {
    res.status(404).json({ message: "Not found" });
  });

  // SPA fallback: serve index.html for any non-API route that doesn't match a static file
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}

(async () => {
  await runApp(serveStatic);
})();
