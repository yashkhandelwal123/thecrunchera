import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  // Load Vite dynamically only when needed (development mode)
  // This avoids module resolution issues with tsx
  const { createServer: createViteServer, createLogger } = await import("vite");
  const viteLogger = createLogger();

  const serverOptions = {
    middlewareMode: true,
    appType: "spa",
    server: {
      middlewareMode: true,
    },
  };

  const vite = await createViteServer({
    ...viteConfig,
    server: serverOptions,
  });

  app.use(vite.middlewares);

  app.get("*", async (req, res) => {
    if (req.method !== "GET") {
      res.statusCode = 405;
      res.end("Method not allowed");
      return;
    }

    try {
      const url = req.originalUrl;

      let template = fs.readFileSync(path.resolve("index.html"), "utf-8");
      template = await vite.transformIndexHtml(url, template);

      res.statusCode = 200;
      res.setHeader("Content-Type", "text/html");
      res.end(template);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      log(`Error: ${(e as Error).message}`, "vite");
      res.statusCode = 500;
      res.end((e as Error).message);
    }
  });

  return server;
}

export async function serveStatic(app: Express) {
  const distPath = path.resolve("dist/client");

  if (!fs.existsSync(distPath)) {
    log(
      "dist/client not found. Run: npm run build",
      "express"
    );
    return;
  }

  app.use(express.static(distPath));

  app.get("*", (req, res) => {
    const indexPath = path.resolve(distPath, "index.html");
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.statusCode = 404;
      res.end("index.html not found in dist/client");
    }
  });
}
