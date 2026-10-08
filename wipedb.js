//   npx tsx --env-file=.env.local scripts/wipeDb.js --yes
//   npx tsx --env-file=.env.local scripts/wipeDb.js --yes --users   # also wipes accounts
import { sql } from "drizzle-orm";
import { db } from "./src/lib/db"; // <- adjust to wherever your db client lives

const TABLES = [
  "lessons", "puzzles", "shaders", "circuits", "builds", "courses",
  "chips", "creator_projects", "ratings", "progress", "media",
];

async function main() {
  if (!process.argv.includes("--yes")) {
    const host = new URL(process.env.DATABASE_URL).host;
    console.error(`Dry run. This would wipe: ${TABLES.join(", ")}\nTarget DB host: ${host}\nRe-run with --yes to proceed.`);
    process.exit(1);
  }

  const list = TABLES.map((t) => `"${t}"`).join(", ");
  await db.execute(sql.raw(`TRUNCATE TABLE ${list} CASCADE`));

  if (process.argv.includes("--users")) {
    // session/account/verification etc. follow via their FKs to "user".
    // Check the table name against auth-schema.ts.
    await db.execute(sql.raw(`TRUNCATE TABLE "user" CASCADE`));
  }

  console.log("done");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });