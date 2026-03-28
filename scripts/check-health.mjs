const port = process.env.PORT || "3000";
const rawBaseUrl =
  process.env.HEALTHCHECK_URL ||
  (process.env.APP_BASE_URL
    ? `${process.env.APP_BASE_URL.replace(/\/$/, "")}/health`
    : `http://127.0.0.1:${port}/health`);

try {
  const response = await fetch(rawBaseUrl, {
    headers: {
      "cache-control": "no-store",
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
} catch (error) {
  if (error?.cause?.code === "ECONNREFUSED") {
    console.error(
      `Health check could not connect to ${rawBaseUrl}. Start the app first or set HEALTHCHECK_URL.`
    );
    process.exit(1);
  }

  throw error;
}
