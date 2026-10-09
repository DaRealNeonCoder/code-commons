import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local" });

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema.js", 
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL },
});
