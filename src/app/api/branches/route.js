import { NextResponse } from "next/server";
import { listBranches } from "@/lib/organization-store";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const orgId = String(searchParams.get("orgId") || "").trim();
  if (!orgId) {
    return NextResponse.json(
      { branches: [] },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }

  if (orgId.length > 80) {
    return NextResponse.json(
      { branches: [] },
      {
        status: 400,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
  const branches = listBranches(orgId) || [];
  return NextResponse.json(
    {
      branches: branches.map(b => ({
        id: b.id,
        name: b.name,
        locationLabel: b.locationLabel || b.location || b.code || "",
      })),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
