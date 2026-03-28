import { requireCurrentUser } from "@/lib/auth";
import { buildReportExport } from "@/lib/organization-store";

export async function GET(request) {
  await requireCurrentUser(["pastor", "owner"]);

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "cases";
  const report = await buildReportExport(type);

  return new Response(report.content, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${report.filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
