import { NextResponse } from "next/server";
import { listBranches } from "@/lib/organization-store";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("orgId");
  if (!orgId) {
    return NextResponse.json({ branches: [] });
  }
  const branches = listBranches(orgId) || [];
  return NextResponse.json({
    branches: branches.map(b => ({
      id: b.id,
      name: b.name,
      locationLabel: b.locationLabel || b.location || b.code || "",
    })),
  });
}
