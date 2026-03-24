import { getDatabaseHealth } from "@/lib/database";

export async function GET() {
  try {
    const store = getDatabaseHealth();

    return Response.json(
      {
        status: "ok",
        timestamp: new Date().toISOString(),
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
