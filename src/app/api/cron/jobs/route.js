import { NextResponse } from "next/server";
import { drainQueuedJobs } from "@/lib/job-runtime";

export const runtime = "nodejs";
export const preferredRegion = "home";
export const maxDuration = 300;

function isAuthorized(request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return true;
  }

  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${cronSecret}`;
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
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await drainQueuedJobs({
    queue: "delivery",
    limit: parseLimit(request),
    workerName: `cron-${Date.now()}`,
  });

  return NextResponse.json(result);
}

export async function GET(request) {
  return handle(request);
}

export async function POST(request) {
  return handle(request);
}
