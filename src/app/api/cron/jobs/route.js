import { NextResponse } from "next/server";
import { safeEqualValue } from "@/lib/auth-crypto";
import { drainQueuedJobs } from "@/lib/job-runtime";

export const runtime = "nodejs";
export const preferredRegion = "home";
export const maxDuration = 300;

function getAuthorizationFailure(request) {
  const cronSecret = String(process.env.CRON_SECRET || "").trim();
  if (!cronSecret) {
    return process.env.NODE_ENV === "production"
      ? NextResponse.json(
          { error: "Service unavailable" },
          {
            status: 503,
            headers: {
              "Cache-Control": "no-store",
            },
          }
        )
      : null;
  }

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : "";

  if (!token || !safeEqualValue(token, cronSecret)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      {
        status: 401,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }

  return null;
}

function parseLimit(request) {
  const { searchParams } = new URL(request.url);
  const parsed = Number(searchParams.get("limit") || 25);

  if (!Number.isFinite(parsed)) {
    return 25;
  }

  return Math.min(100, Math.max(1, Math.trunc(parsed)));
}

async function handle(request) {
  const authorizationFailure = getAuthorizationFailure(request);
  if (authorizationFailure) {
    return authorizationFailure;
  }

  const result = await drainQueuedJobs({
    queue: "delivery",
    limit: parseLimit(request),
    workerName: `cron-${Date.now()}`,
  });

  return NextResponse.json(result, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(request) {
  return handle(request);
}

export async function POST(request) {
  return handle(request);
}
