import { getRuntimeReadiness } from "../src/lib/runtime-readiness.mjs";

const strictWarnings = process.argv.includes("--strict-warnings");
const readiness = getRuntimeReadiness(process.env);

console.log(`Deployment stage: ${readiness.deploymentStage}`);
console.log(`Launch profile: ${readiness.launchProfile}`);
console.log(`Ready for production: ${readiness.readyForProduction ? "yes" : "no"}`);
console.log(`Ready for scale: ${readiness.readyForScale ? "yes" : "no"}`);
console.log(`Database runtime: ${readiness.databaseDriver}`);
console.log(`Attachment backend: ${readiness.attachmentBackend}`);

if (readiness.appBaseUrl) {
  console.log(`App base URL: ${readiness.appBaseUrl}`);
}

if (readiness.postgresDiagnostics) {
  console.log(
    `Postgres pool: max=${readiness.postgresDiagnostics.pool.max}, min=${readiness.postgresDiagnostics.pool.min}, idle=${readiness.postgresDiagnostics.pool.idleTimeoutMillis}ms, connect=${readiness.postgresDiagnostics.pool.connectionTimeoutMillis}ms`
  );
}

if (readiness.criticalIssues.length > 0) {
  console.error("\nCritical issues:");
  for (const issue of readiness.criticalIssues) {
    console.error(`- ${issue}`);
  }
}

if (readiness.warnings.length > 0) {
  console.warn("\nWarnings:");
  for (const warning of readiness.warnings) {
    console.warn(`- ${warning}`);
  }
}

if (!readiness.readyForProduction || (strictWarnings && readiness.warnings.length > 0)) {
  process.exit(1);
}
