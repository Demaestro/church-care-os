import { safeEqualValue } from "@/lib/auth-crypto";
import { getAttachmentStorageBackend } from "@/lib/blob-storage";
import { getDatabaseHealth } from "@/lib/database";
import { getRuntimeReadiness } from "@/lib/runtime-readiness.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function canReadDetailedHealth(request) {
  if (process.env.NODE_ENV !== "production") {
    return true;
  }

  const healthcheckToken = String(process.env.HEALTHCHECK_TOKEN || "").trim();
  if (!healthcheckToken) {
    return false;
  }

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : "";

  return Boolean(token) && safeEqualValue(token, healthcheckToken);
}

export async function GET(request) {
  try {
    const store = getDatabaseHealth();
    const detailedAccess = canReadDetailedHealth(request);
    const readiness = detailedAccess ? getRuntimeReadiness() : null;

    return Response.json(
      detailedAccess
        ? {
            status: "ok",
            timestamp: new Date().toISOString(),
            deploymentStage: readiness.deploymentStage,
            vercel: readiness.vercel,
            deploymentHostname: readiness.deploymentHostname,
            appBaseUrl: readiness.appBaseUrl,
            secureTransport: readiness.secureTransport,
            attachmentBackend: getAttachmentStorageBackend(),
            launchProfile: readiness.launchProfile,
            readyForProduction: readiness.readyForProduction,
            readyForScale: readiness.readyForScale,
            checks: readiness.checks,
            warnings: readiness.warnings,
            criticalIssues: readiness.criticalIssues,
            postgresDiagnostics: readiness.postgresDiagnostics,
            ...store,
          }
        : {
            status: "ok",
            timestamp: new Date().toISOString(),
          },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch {
    return Response.json(
      {
        status: "error",
        timestamp: new Date().toISOString(),
        message: "Health check failed.",
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}
