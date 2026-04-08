import { getAttachmentStorageBackend } from "@/lib/blob-storage";
import { getDatabaseHealth } from "@/lib/database";
import { getRuntimeReadiness } from "@/lib/runtime-readiness.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const store = getDatabaseHealth();
    const readiness = getRuntimeReadiness();

    return Response.json(
      {
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
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    return Response.json(
      {
        status: "error",
        timestamp: new Date().toISOString(),
        message: error instanceof Error ? error.message : "Health check failed.",
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
