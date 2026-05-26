import {
  getDeploymentHostname,
  getDeploymentStage,
  isProductionDeployment,
  isVercelDeployment,
  resolveAppBaseUrl,
  resolveAttachmentStorageBackend,
  resolveDatabaseDriver,
  shouldUseSecureTransport,
} from "./runtime-config.mjs";
import { getPostgresRuntimeDiagnostics } from "./postgres-config.mjs";

function hasValue(env, key) {
  return Boolean(String(env?.[key] || "").trim());
}

function getEnvValue(env, key) {
  return String(env?.[key] || "").trim();
}

function isExplicitlyDisabled(env, key) {
  return ["0", "false", "no", "off"].includes(getEnvValue(env, key).toLowerCase());
}

function isWeakSecret(value, minimumLength = 32) {
  const secret = String(value || "").trim();
  if (secret.length < minimumLength) {
    return true;
  }

  return /^(change-me|changeme|replace|replace-me|replace-with|secret|password|test|demo|example)/i.test(
    secret
  );
}

function isValidServerActionsKey(value) {
  const key = String(value || "").trim();
  if (!key || isWeakSecret(key, 24)) {
    return false;
  }

  try {
    const decoded = Buffer.from(key, "base64");
    return [16, 24, 32].includes(decoded.length);
  } catch {
    return false;
  }
}

function dedupe(items) {
  return Array.from(new Set(items.filter(Boolean)));
}

export function getRuntimeReadiness(env = process.env) {
  const deploymentStage = getDeploymentStage(env);
  const production = isProductionDeployment(env);
  const vercel = isVercelDeployment(env);
  const appBaseUrl = resolveAppBaseUrl(env);
  const deploymentHostname = getDeploymentHostname(env);
  const databaseDriver = resolveDatabaseDriver(env);
  const attachmentBackend = resolveAttachmentStorageBackend(env);
  const secureTransport = shouldUseSecureTransport(env);
  const postgres = databaseDriver === "postgres";
  const localAttachments = attachmentBackend === "local";
  const postgresDiagnostics = postgres ? getPostgresRuntimeDiagnostics(env) : null;

  const checks = {
    authSecret: hasValue(env, "AUTH_SECRET"),
    authSecretStrong: !isWeakSecret(getEnvValue(env, "AUTH_SECRET")),
    serverActionsKey: hasValue(env, "NEXT_SERVER_ACTIONS_ENCRYPTION_KEY"),
    serverActionsKeyValid: isValidServerActionsKey(
      getEnvValue(env, "NEXT_SERVER_ACTIONS_ENCRYPTION_KEY")
    ),
    appBaseUrlExplicit: hasValue(env, "APP_BASE_URL"),
    appBaseUrlResolved: Boolean(appBaseUrl),
    secureTransport,
    cronSecret: hasValue(env, "CRON_SECRET"),
    databaseUrl: hasValue(env, "DATABASE_URL"),
    blobToken: hasValue(env, "BLOB_READ_WRITE_TOKEN"),
    healthcheckToken: hasValue(env, "HEALTHCHECK_TOKEN"),
    bootstrapOwnerEmail: hasValue(env, "BOOTSTRAP_OWNER_EMAIL"),
    bootstrapOwnerPassword: hasValue(env, "BOOTSTRAP_OWNER_PASSWORD"),
    demoUsersEnabled: getEnvValue(env, "CARE_SEED_DEMO_USERS") === "1",
    secureCookiesExplicitlyDisabled: isExplicitlyDisabled(env, "CARE_SECURE_COOKIES"),
    cronSecretStrong: !hasValue(env, "CRON_SECRET") || !isWeakSecret(getEnvValue(env, "CRON_SECRET")),
    healthcheckTokenStrong:
      !hasValue(env, "HEALTHCHECK_TOKEN") ||
      !isWeakSecret(getEnvValue(env, "HEALTHCHECK_TOKEN")),
  };

  const criticalIssues = [];
  const warnings = [];

  if (!checks.authSecret) {
    criticalIssues.push("AUTH_SECRET is required for secure session signing.");
  } else if (production && !checks.authSecretStrong) {
    criticalIssues.push("AUTH_SECRET must be a strong random value in production.");
  }

  if (!checks.serverActionsKey && production) {
    criticalIssues.push(
      "NEXT_SERVER_ACTIONS_ENCRYPTION_KEY is required in production to keep server actions stable across deploys."
    );
  } else if (production && !checks.serverActionsKeyValid) {
    criticalIssues.push(
      "NEXT_SERVER_ACTIONS_ENCRYPTION_KEY must be a base64-encoded AES key with 16, 24, or 32 bytes."
    );
  }

  if (production && !checks.appBaseUrlResolved) {
    criticalIssues.push(
      "A resolvable APP_BASE_URL or production deployment URL is required for password resets, verification links, and member emails."
    );
  }

  if (production && !secureTransport) {
    criticalIssues.push("Production traffic must resolve over HTTPS.");
  }

  if (production && checks.secureCookiesExplicitlyDisabled) {
    criticalIssues.push("CARE_SECURE_COOKIES must not be disabled in production.");
  }

  if (production && checks.demoUsersEnabled) {
    criticalIssues.push("CARE_SEED_DEMO_USERS must be disabled in production.");
  }

  if (postgres && !checks.databaseUrl) {
    criticalIssues.push("DATABASE_URL is required when PostgreSQL runtime is enabled.");
  }

  if (attachmentBackend === "vercel-blob" && !checks.blobToken) {
    criticalIssues.push(
      "BLOB_READ_WRITE_TOKEN is required when private blob attachment storage is enabled."
    );
  }

  if (vercel && production && !checks.cronSecret) {
    criticalIssues.push("CRON_SECRET should be set before enabling Vercel cron routes.");
  } else if (production && checks.cronSecret && !checks.cronSecretStrong) {
    criticalIssues.push("CRON_SECRET must be a strong random value in production.");
  }

  if (production && vercel && !checks.appBaseUrlExplicit) {
    warnings.push(
      "APP_BASE_URL is not explicitly set. Production links may fall back to the current deployment hostname."
    );
  }

  if (production && postgres && postgresDiagnostics?.sslMode !== "require") {
    warnings.push(
      "PGSSLMODE=require is recommended for managed PostgreSQL unless your provider injects TLS through the connection string."
    );
  }

  if (production && databaseDriver === "sqlite") {
    warnings.push(
      "SQLite keeps the app in single-host mode. Move to PostgreSQL before multi-instance or serverless scale."
    );
  }

  if (production && localAttachments) {
    warnings.push(
      "Local attachment storage requires persistent disk and blocks stateless horizontal scaling."
    );
  }

  if (production && (checks.bootstrapOwnerEmail || checks.bootstrapOwnerPassword)) {
    warnings.push(
      "Remove BOOTSTRAP_OWNER_* credentials after the first successful production owner login."
    );
  }

  if (production && checks.blobToken && isWeakSecret(getEnvValue(env, "BLOB_READ_WRITE_TOKEN"), 24)) {
    warnings.push("BLOB_READ_WRITE_TOKEN appears weak or placeholder-like.");
  }

  if (production && checks.healthcheckToken && !checks.healthcheckTokenStrong) {
    warnings.push("HEALTHCHECK_TOKEN should be a strong random value.");
  }

  const launchProfile = postgres && !localAttachments ? "stateless-cloud" : "single-host";
  const readyForProduction = criticalIssues.length === 0;
  const readyForScale =
    readyForProduction && postgres && !localAttachments && secureTransport;

  return {
    deploymentStage,
    production,
    vercel,
    deploymentHostname,
    databaseDriver,
    attachmentBackend,
    appBaseUrl,
    secureTransport,
    launchProfile,
    readyForProduction,
    readyForScale,
    checks,
    postgresDiagnostics,
    criticalIssues: dedupe(criticalIssues),
    warnings: dedupe(warnings),
  };
}
