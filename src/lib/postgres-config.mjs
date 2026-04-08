function parseIntegerEnv(env, key, fallback, minimum, maximum) {
  const raw = String(env?.[key] || "").trim();
  if (!raw) {
    return fallback;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  const normalized = Math.trunc(parsed);
  return Math.min(maximum, Math.max(minimum, normalized));
}

export function getPostgresConnectionString(env = process.env) {
  return String(env?.DATABASE_URL || "").trim();
}

export function shouldRequirePostgresSsl(env = process.env) {
  return String(env?.PGSSLMODE || "").trim().toLowerCase() === "require";
}

export function resolvePostgresSslConfig(env = process.env) {
  return shouldRequirePostgresSsl(env)
    ? {
        rejectUnauthorized: false,
      }
    : undefined;
}

export function resolvePostgresPoolSettings(env = process.env) {
  const max = parseIntegerEnv(env, "PGPOOL_MAX", 20, 1, 200);
  const min = parseIntegerEnv(env, "PGPOOL_MIN", 2, 0, max);

  return {
    max,
    min,
    idleTimeoutMillis: parseIntegerEnv(env, "PGPOOL_IDLE_TIMEOUT_MS", 30_000, 1_000, 300_000),
    connectionTimeoutMillis: parseIntegerEnv(
      env,
      "PGPOOL_CONNECTION_TIMEOUT_MS",
      5_000,
      500,
      120_000
    ),
  };
}

export function getPostgresRuntimeDiagnostics(env = process.env) {
  return {
    sslMode: String(env?.PGSSLMODE || "").trim() || "disable",
    pool: resolvePostgresPoolSettings(env),
  };
}

