import { Client } from "pg";
import {
  getPostgresConnectionString,
  getPostgresRuntimeDiagnostics,
  resolvePostgresSslConfig,
} from "../src/lib/postgres-config.mjs";

const connectionString = getPostgresConnectionString();

if (!connectionString) {
  console.error("DATABASE_URL is required to check PostgreSQL connectivity.");
  process.exit(1);
}

const client = new Client({
  connectionString,
  ssl: resolvePostgresSslConfig(),
});

try {
  await client.connect();
  const version = await client.query("SELECT version() AS version");
  const now = await client.query("SELECT NOW() AS now");
  const diagnostics = getPostgresRuntimeDiagnostics();
  console.log("PostgreSQL connection successful.");
  console.log(`- Server time: ${now.rows[0]?.now}`);
  console.log(`- Version: ${version.rows[0]?.version}`);
  console.log(`- SSL mode: ${diagnostics.sslMode}`);
  console.log(
    `- Pool defaults: max=${diagnostics.pool.max}, min=${diagnostics.pool.min}, idle=${diagnostics.pool.idleTimeoutMillis}ms, connect=${diagnostics.pool.connectionTimeoutMillis}ms`
  );
} finally {
  await client.end().catch(() => {});
}
