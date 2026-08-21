import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import path from "path";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import createMemoryStore from "memorystore";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";


const app = express();

// Serve product/hero images referenced by plain string paths (e.g. from
// storage.ts) — the @assets Vite alias only resolves JS import statements,
// not runtime URLs the browser requests directly.
app.use(
  "/attached_assets",
  express.static(path.resolve(import.meta.dirname, "..", "attached_assets")),
);

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

// Sessions: backed by Postgres (so logins survive a server restart) when
// DATABASE_URL is set, otherwise an in-memory store — fine for quick local
// testing, but sessions won't survive a restart in that case.
const PgSession = connectPgSimple(session);
const MemoryStore = createMemoryStore(session);

if (!process.env.SESSION_SECRET) {
  console.warn(
    "[session] SESSION_SECRET not set — using an insecure default. " +
      "Set SESSION_SECRET in your .env before deploying.",
  );
}

app.use(
  session({
    store: process.env.DATABASE_URL
      ? new PgSession({
          conString: process.env.DATABASE_URL,
          createTableIfMissing: true,
        })
      : new MemoryStore({ checkPeriod: 1000 * 60 * 60 * 24 }),
    secret: process.env.SESSION_SECRET || "dev-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
    },
  }),
);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
