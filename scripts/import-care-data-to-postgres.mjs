import path from "node:path";
import { cp, readFile } from "node:fs/promises";
import { Client } from "pg";
import { parseFlag, resolveUploadsPath } from "./lib/runtime-paths.mjs";
import { migrationTables } from "./lib/migration-schema.mjs";

const exportRoot = parseFlag("from");
const schemaPath =
  parseFlag("schema") || path.join(process.cwd(), "scripts", "postgres", "schema.sql");
const skipSchema = process.argv.includes("--skip-schema");
const keepExisting = process.argv.includes("--keep-existing");
const copyUploads = !process.argv.includes("--skip-uploads");
const connectionString = process.env.DATABASE_URL || "";

if (!exportRoot) {
  console.error("Use --from <export-directory> with a folder created by npm run db:export.");
  process.exit(1);
}

if (!connectionString) {
  console.error("DATABASE_URL is required to import care data into PostgreSQL.");
  process.exit(1);
}

const manifest = JSON.parse(
  await readFile(path.join(exportRoot, "manifest.json"), "utf8")
);

const client = new Client({
  connectionString,
  ssl:
    process.env.PGSSLMODE === "require"
      ? {
          rejectUnauthorized: false,
        }
      : undefined,
});

function normalizeValue(tableConfig, columnName, value) {
  if (value === undefined) {
    return null;
  }

  if (tableConfig?.jsonColumns?.includes(columnName)) {
    return value === null ? null : JSON.stringify(value);
  }

  if (tableConfig?.booleanColumns?.includes(columnName)) {
    return Boolean(value);
  }

  return value;
}

function buildInsertStatement(tableName, columns, tableConfig) {
  const quotedColumns = columns.map((column) => `"${column}"`).join(", ");
  const placeholders = columns.map((column, index) => {
    const position = `$${index + 1}`;
    if (tableConfig?.jsonColumns?.includes(column)) {
      return `${position}::jsonb`;
    }
    return position;
  });

  return `INSERT INTO ${tableName} (${quotedColumns}) VALUES (${placeholders.join(", ")})`;
}

try {
  await client.connect();

  if (!skipSchema) {
    const schema = await readFile(schemaPath, "utf8");
    await client.query(schema);
  }

  await client.query("BEGIN");

  if (!keepExisting) {
    const reverseTables = [...migrationTables].reverse();
    for (const table of reverseTables) {
      await client.query(`TRUNCATE TABLE ${table.name} RESTART IDENTITY CASCADE`);
    }
  }

  for (const table of migrationTables) {
    const sourcePath = path.join(exportRoot, "tables", `${table.name}.json`);
    const rows = JSON.parse(await readFile(sourcePath, "utf8"));

    if (!rows.length) {
      continue;
    }

    const columns = Object.keys(rows[0]);
    const sql = buildInsertStatement(table.name, columns, table);

    for (const row of rows) {
      const values = columns.map((column) => normalizeValue(table, column, row[column]));
      await client.query(sql, values);
    }
  }

  await client.query("COMMIT");

  if (copyUploads && manifest.uploadsCopied) {
    await cp(path.join(exportRoot, "uploads"), resolveUploadsPath(), {
      recursive: true,
      force: true,
    });
  }

  console.log(`Imported ${manifest.tables.length} table file(s) into PostgreSQL.`);
  console.log(`- Source export: ${exportRoot}`);
  console.log(`- Schema applied: ${skipSchema ? "no" : schemaPath}`);
  console.log(`- Existing data kept: ${keepExisting ? "yes" : "no"}`);
  console.log(
    `- Upload files copied: ${copyUploads && manifest.uploadsCopied ? "yes" : "no"}`
  );
} catch (error) {
  await client.query("ROLLBACK").catch(() => {});
  throw error;
} finally {
  await client.end().catch(() => {});
}
