import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// HTTP driver: one stateless request per query, so serverless functions never
// hold (or exhaust) a pool of connections. Trade-off: no interactive
// transactions. If you ever need one, switch to the `neon-serverless`
// (WebSocket) driver for just that code path.
const client = neon(process.env.DATABASE_URL);

export const db = drizzle(client, { schema });
