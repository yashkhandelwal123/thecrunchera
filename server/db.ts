import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Create a Neon Postgres database at " +
      "https://neon.tech, copy the connection string, and set it as the " +
      "DATABASE_URL environment variable (in a local .env file for dev, " +
      "and in your Render service's environment settings for production).",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });
