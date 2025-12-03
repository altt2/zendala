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

  console.log('📁 Configuring static file serving from:', distPath);

  // Create the static middleware once
  const staticMiddleware = express.static(distPath);

  // Serve static assets (JS, CSS, images, etc.)
  app.use("/assets", staticMiddleware);

  // Serve favicon, manifest, etc. from public root
  app.use((req, res, next) => {
    if (req.path === "/" || req.path === "/index.html" || 
        req.path.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|eot)$/i) ||
        req.path.match(/^\/public\//)) {
      return staticMiddleware(req, res, next);
    }
    next();
  });

  // API routes that weren't matched return 404 as JSON
  app.use("/api", (_req, res) => {
    console.log('❌ API route not found:', _req.path);
    res.status(404).json({ message: "Not found" });
  });

  // SPA fallback: serve index.html for any non-API route that doesn't match a static file
  app.use("*", (_req, res) => {
    console.log('📄 Serving SPA fallback (index.html) for route:', _req.path);
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}

(async () => {
  console.log('🚀 Starting production server...');
  console.log('📁 Public directory:', path.resolve(import.meta.dirname, "public"));
  console.log('🌍 NODE_ENV:', process.env.NODE_ENV);
  await runApp(serveStatic);
})();
