import { Client } from "pg";

const connectionString = process.env.DATABASE_URL || "";

if (!connectionString) {
  console.error("DATABASE_URL is required to check PostgreSQL connectivity.");
  process.exit(1);
}

const client = new Client({
  connectionString,
  ssl:
    process.env.PGSSLMODE === "require"
      ? {
          rejectUnauthorized: false,
        }
      : undefined,
});

try {
  await client.connect();
  const version = await client.query("SELECT version() AS version");
  const now = await client.query("SELECT NOW() AS now");
  console.log("PostgreSQL connection successful.");
  console.log(`- Server time: ${now.rows[0]?.now}`);
  console.log(`- Version: ${version.rows[0]?.version}`);
} finally {
  await client.end().catch(() => {});
}
