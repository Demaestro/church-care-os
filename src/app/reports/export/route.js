import { cookies } from "next/headers";
import { requireCurrentUser } from "@/lib/auth";
import { buildReportExport } from "@/lib/organization-store";
import { WORKSPACE_BRANCH_COOKIE } from "@/lib/workspace-scope";

export async function GET(request) {
  const user = await requireCurrentUser(["pastor", "overseer", "owner"]);
  const preferredBranchId = (await cookies()).get(WORKSPACE_BRANCH_COOKIE)?.value || "";

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "cases";
  const report = await buildReportExport(type, user, preferredBranchId);

  return new Response(report.content, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${report.filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
