function getEnvValue(env, key) {
  return String(env?.[key] || "").trim();
}

export function normalizeUrl(value) {
  const input = String(value || "").trim();
  if (!input) {
    return "";
  }

  const withProtocol = /^https?:\/\//i.test(input) ? input : `https://${input}`;

  try {
    return new URL(withProtocol).toString().replace(/\/+$/, "");
  } catch {
    return "";
  }
}

export function isVercelDeployment(env = process.env) {
  return Boolean(
    env.VERCEL || env.VERCEL_ENV || env.VERCEL_URL || env.VERCEL_BRANCH_URL
  );
}

export function getDeploymentStage(env = process.env) {
  return getEnvValue(env, "VERCEL_ENV") || getEnvValue(env, "NODE_ENV") || "development";
}

export function isProductionDeployment(env = process.env) {
  return getDeploymentStage(env) === "production";
}

export function getDeploymentHostname(env = process.env) {
  return (
    getEnvValue(env, "VERCEL_PROJECT_PRODUCTION_URL") ||
    getEnvValue(env, "VERCEL_BRANCH_URL") ||
    getEnvValue(env, "VERCEL_URL")
  );
}

export function resolveAppBaseUrl(env = process.env) {
  const explicitBaseUrl = normalizeUrl(getEnvValue(env, "APP_BASE_URL"));
  const deploymentBaseUrl = normalizeUrl(getDeploymentHostname(env));

  if (isVercelDeployment(env)) {
    if (isProductionDeployment(env)) {
      return explicitBaseUrl || deploymentBaseUrl;
    }

    return deploymentBaseUrl || explicitBaseUrl;
  }

  return explicitBaseUrl;
}

export function shouldUseSecureTransport(env = process.env) {
  const resolvedBaseUrl = resolveAppBaseUrl(env);
  if (resolvedBaseUrl) {
    try {
      return new URL(resolvedBaseUrl).protocol === "https:";
    } catch {
      return isProductionDeployment(env);
    }
  }

  if (isVercelDeployment(env)) {
    return true;
  }

  return getDeploymentStage(env) === "production";
}

export function resolveDatabaseDriver(env = process.env) {
  const configuredDriver = getEnvValue(env, "CARE_DATABASE_DRIVER").toLowerCase();

  if (configuredDriver === "postgres") {
    return "postgres";
  }

  if (configuredDriver === "sqlite") {
    return "sqlite";
  }

  return getEnvValue(env, "DATABASE_URL") ? "postgres" : "sqlite";
}

export function normalizeAttachmentBackend(value) {
  const backend = String(value || "").trim().toLowerCase();

  if (backend === "vercel-blob" || backend === "blob") {
    return "vercel-blob";
  }

  return "local";
}

export function resolveAttachmentStorageBackend(env = process.env) {
  const configuredBackend = normalizeAttachmentBackend(getEnvValue(env, "CARE_ATTACHMENT_BACKEND"));

  if (configuredBackend !== "local") {
    return configuredBackend;
  }

  if (getEnvValue(env, "BLOB_READ_WRITE_TOKEN")) {
    return "vercel-blob";
  }

  return "local";
}

