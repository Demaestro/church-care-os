import "server-only";

function normalizeUrl(value) {
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

export function isVercelDeployment() {
  return Boolean(
    process.env.VERCEL ||
      process.env.VERCEL_ENV ||
      process.env.VERCEL_URL ||
      process.env.VERCEL_BRANCH_URL
  );
}

export function getDeploymentStage() {
  if (process.env.VERCEL_ENV) {
    return process.env.VERCEL_ENV;
  }

  return process.env.NODE_ENV || "development";
}

export function isProductionDeployment() {
  return getDeploymentStage() === "production";
}

export function getDeploymentHostname() {
  return (
    String(process.env.VERCEL_BRANCH_URL || "").trim() ||
    String(process.env.VERCEL_URL || "").trim() ||
    String(process.env.VERCEL_PROJECT_PRODUCTION_URL || "").trim()
  );
}

export function resolveAppBaseUrl() {
  const explicitBaseUrl = normalizeUrl(process.env.APP_BASE_URL);
  const deploymentBaseUrl = normalizeUrl(getDeploymentHostname());

  if (isVercelDeployment()) {
    if (isProductionDeployment()) {
      return explicitBaseUrl || deploymentBaseUrl;
    }

    return deploymentBaseUrl || explicitBaseUrl;
  }

  return explicitBaseUrl;
}

export function shouldUseSecureTransport() {
  const resolvedBaseUrl = resolveAppBaseUrl();
  if (resolvedBaseUrl) {
    try {
      return new URL(resolvedBaseUrl).protocol === "https:";
    } catch {
      return isProductionDeployment();
    }
  }

  if (isVercelDeployment()) {
    return true;
  }

  return process.env.NODE_ENV === "production";
}
