import { Pool, type PoolConfig } from "@neondatabase/serverless";

// Never log the error/client objects: they can contain database credentials.
export function logDatabaseError(error: unknown, source = "database") {
  const candidate = (error as { code?: unknown } | null)?.code;
  const code = typeof candidate === "string" && /^[A-Z0-9_]{2,32}$/.test(candidate)
    ? candidate : "UNKNOWN";
  console.error(`[${source}] Database connection error (${code}).`);
}

export function createDatabasePool(config: PoolConfig) {
  const pool = new Pool({
    max: 10,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    ...config,
  });
  // The pool removes failed idle clients itself. Handling this event keeps the
  // process alive so later requests can acquire fresh connections. Active query
  // failures still reject to their caller; never replay writes automatically.
  pool.on("error", error => logDatabaseError(error));
  return pool;
}
