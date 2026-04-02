import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { parentPort } from "node:worker_threads";
import { fileURLToPath } from "node:url";
import { Client, Pool } from "pg";

const workerDir = dirname(fileURLToPath(import.meta.url));
const schemaPath = resolve(workerDir, "..", "..", "scripts", "postgres", "schema.sql");
const connectionString = process.env.DATABASE_URL || "";

if (!parentPort) {
  throw new Error("PostgreSQL sync worker requires a parent port.");
}

if (!connectionString) {
  throw new Error("DATABASE_URL is required when CARE_DATABASE_DRIVER=postgres.");
}

const pool = new Pool({
  connectionString,
  ssl:
    process.env.PGSSLMODE === "require"
      ? {
          rejectUnauthorized: false,
        }
      : undefined,
});

const transactionClients = new Map();
let schemaReady = false;
let schemaPromise = null;

function wake(sharedBuffer) {
  const signal = new Int32Array(sharedBuffer);
  Atomics.store(signal, 0, 1);
  Atomics.notify(signal, 0);
}

function normalizeError(error) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack || "",
    };
  }

  return {
    name: "Error",
    message: String(error),
    stack: "",
  };
}

function normalizeParam(value) {
  if (value === undefined) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }

  if (Array.isArray(value)) {
    return JSON.stringify(value);
  }

  if (value && typeof value === "object" && !Buffer.isBuffer(value)) {
    return JSON.stringify(value);
  }

  return value;
}

function normalizeRowValue(value) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }

  if (Array.isArray(value)) {
    return JSON.stringify(value);
  }

  if (value && typeof value === "object" && !Buffer.isBuffer(value)) {
    return JSON.stringify(value);
  }

  return value;
}

function normalizeRows(rows = []) {
  return rows.map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([key, value]) => [key, normalizeRowValue(value)])
    )
  );
}

function replacePlaceholders(sql) {
  let index = 0;
  let output = "";
  let quote = "";

  for (let cursor = 0; cursor < sql.length; cursor += 1) {
    const character = sql[cursor];
    const nextCharacter = sql[cursor + 1] || "";

    if (quote) {
      output += character;

      if (character === quote) {
        if (nextCharacter === quote) {
          output += nextCharacter;
          cursor += 1;
        } else {
          quote = "";
        }
      }

      continue;
    }

    if (character === "'" || character === '"') {
      quote = character;
      output += character;
      continue;
    }

    if (character === "?") {
      index += 1;
      output += `$${index}`;
      continue;
    }

    output += character;
  }

  return output;
}

function translateSql(sql) {
  const trimmed = String(sql || "").trim();
  if (!trimmed) {
    return "";
  }

  if (/^PRAGMA\s+integrity_check/i.test(trimmed)) {
    return "__pragma_integrity_check__";
  }

  const tableInfoMatch = trimmed.match(/^PRAGMA\s+table_info\(([^)]+)\)/i);
  if (tableInfoMatch) {
    return `__pragma_table_info__:${tableInfoMatch[1].replace(/['"]/g, "").trim()}`;
  }

  let translated = replacePlaceholders(trimmed.replace(/\bBEGIN\s+IMMEDIATE\b/gi, "BEGIN"));

  if (/^\s*INSERT\s+OR\s+IGNORE\s+INTO\s+/i.test(translated)) {
    translated = translated.replace(/INSERT\s+OR\s+IGNORE\s+INTO/i, "INSERT INTO");
    translated = translated.replace(/;\s*$/, "");
    translated = `${translated} ON CONFLICT DO NOTHING`;
  }

  return translated;
}

async function ensureSchema() {
  if (schemaReady) {
    return;
  }

  if (!schemaPromise) {
    schemaPromise = (async () => {
      const schema = await readFile(schemaPath, "utf8");
      await pool.query(schema);
      schemaReady = true;
    })();
  }

  await schemaPromise;
}

async function queryTableInfo(tableName, clientLike) {
  const result = await clientLike.query(
    `
      SELECT column_name AS name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
      ORDER BY ordinal_position ASC
    `,
    [tableName]
  );

  return normalizeRows(result.rows);
}

async function getClientLike(transactionId = "") {
  if (!transactionId) {
    return pool;
  }

  const transactionClient = transactionClients.get(transactionId);
  if (!transactionClient) {
    throw new Error("PostgreSQL transaction context was not found.");
  }

  return transactionClient;
}

async function runQuery({ sql, params = [], mode = "all", transactionId = "" }) {
  await ensureSchema();
  const translated = translateSql(sql);
  const normalizedParams = params.map(normalizeParam);
  const clientLike = await getClientLike(transactionId);

  if (translated === "__pragma_integrity_check__") {
    const rows = [{ integrity_check: "ok" }];
    return mode === "get" ? rows[0] : rows;
  }

  if (translated.startsWith("__pragma_table_info__:")) {
    const tableName = translated.split(":")[1];
    const rows = await queryTableInfo(tableName, clientLike);
    return mode === "get" ? rows[0] : rows;
  }

  const result = await clientLike.query(translated, normalizedParams);
  const rows = normalizeRows(result.rows);

  if (mode === "get") {
    return rows[0];
  }

  if (mode === "run" || mode === "exec") {
    return {
      changes: result.rowCount || 0,
      lastInsertRowid: 0,
    };
  }

  return rows;
}

async function beginTransaction(transactionId) {
  await ensureSchema();
  const client = new Client({
    connectionString,
    ssl:
      process.env.PGSSLMODE === "require"
        ? {
            rejectUnauthorized: false,
          }
        : undefined,
  });
  await client.connect();
  await client.query("BEGIN");
  transactionClients.set(transactionId, client);
}

async function commitTransaction(transactionId) {
  const client = transactionClients.get(transactionId);
  if (!client) {
    return;
  }

  try {
    await client.query("COMMIT");
  } finally {
    transactionClients.delete(transactionId);
    await client.end().catch(() => {});
  }
}

async function rollbackTransaction(transactionId) {
  const client = transactionClients.get(transactionId);
  if (!client) {
    return;
  }

  try {
    await client.query("ROLLBACK");
  } finally {
    transactionClients.delete(transactionId);
    await client.end().catch(() => {});
  }
}

async function shutdown() {
  const openClients = Array.from(transactionClients.entries());
  transactionClients.clear();

  for (const [, client] of openClients) {
    await client.query("ROLLBACK").catch(() => {});
    await client.end().catch(() => {});
  }

  await pool.end();
}

parentPort.on("message", async ({ action, payload = {}, sharedBuffer, port }) => {
  try {
    let value;

    switch (action) {
      case "initialize":
        await ensureSchema();
        value = { ready: true };
        break;
      case "query":
        value = await runQuery(payload);
        break;
      case "exec":
        value = await runQuery({ ...payload, mode: "exec" });
        break;
      case "beginTransaction":
        await beginTransaction(payload.transactionId);
        value = { started: true };
        break;
      case "commitTransaction":
        await commitTransaction(payload.transactionId);
        value = { committed: true };
        break;
      case "rollbackTransaction":
        await rollbackTransaction(payload.transactionId);
        value = { rolledBack: true };
        break;
      case "shutdown":
        await shutdown();
        value = { closed: true };
        break;
      default:
        throw new Error(`Unknown PostgreSQL sync worker action: ${action}`);
    }

    port.postMessage({ ok: true, value });
  } catch (error) {
    port.postMessage({ ok: false, error: normalizeError(error) });
  } finally {
    port.close();
    wake(sharedBuffer);
  }
});
