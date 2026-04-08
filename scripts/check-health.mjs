const port = process.env.PORT || "3000";
const rawBaseUrl =
  process.env.HEALTHCHECK_URL ||
  (process.env.APP_BASE_URL
    ? `${process.env.APP_BASE_URL.replace(/\/$/, "")}/health`
    : `http://127.0.0.1:${port}/health`);

try {
  const healthcheckToken = String(process.env.HEALTHCHECK_TOKEN || "").trim();
  const response = await fetch(rawBaseUrl, {
    headers: {
      "cache-control": "no-store",
      ...(healthcheckToken
        ? {
            authorization: `Bearer ${healthcheckToken}`,
          }
        : {}),
    },
  });

  if (!response.ok) {
    console.error(`Health check failed with status ${response.status}`);
    process.exit(1);
  }

  const payload = await response.json();

  if (payload.status !== "ok") {
    console.error("Health check returned a non-ok payload.");
    process.exit(1);
  }

  console.log(`Health check passed for ${rawBaseUrl}`);

  if (payload.launchProfile) {
    console.log(`- Launch profile: ${payload.launchProfile}`);
  }

  if (payload.storeMode) {
    console.log(`- Database runtime: ${payload.storeMode}`);
  }

  if (Array.isArray(payload.warnings) && payload.warnings.length > 0) {
    console.warn("- Warnings:");
    for (const warning of payload.warnings) {
      console.warn(`  - ${warning}`);
    }
  }

  if (Array.isArray(payload.criticalIssues) && payload.criticalIssues.length > 0) {
    console.warn("- Critical issues still present:");
    for (const issue of payload.criticalIssues) {
      console.warn(`  - ${issue}`);
    }
  }
} catch (error) {
  if (error?.cause?.code === "ECONNREFUSED") {
    console.error(
      `Health check could not connect to ${rawBaseUrl}. Start the app first or set HEALTHCHECK_URL.`
    );
    process.exit(1);
  }

  throw error;
}
