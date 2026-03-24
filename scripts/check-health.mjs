const port = process.env.PORT || "3000";
const baseUrl = process.env.HEALTHCHECK_URL || `http://127.0.0.1:${port}/health`;

const response = await fetch(baseUrl, {
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

console.log(`Health check passed for ${baseUrl}`);
