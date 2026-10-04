import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// drizzle-kit runs outside Next, so it doesn't load .env.local on its own.
config({ path: ".env.local" });

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema.js", // your code lives in src/
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL },
});
