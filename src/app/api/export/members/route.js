/**
 * GET /api/export/members.csv
 *
 * Downloads a CSV of the member directory for the authenticated user's
 * organisation. Accepts optional query params:
 *   ?memberType=full|visitor|new   (default: all)
 *   ?limit=N                       (default: 10000, max: 100000)
 *
 * Requires: pastor, owner, or leader role.
 * Volunteer and below cannot export PII in bulk.
 */

import { getCurrentUser } from "@/lib/auth";
import { listMembers } from "@/lib/member-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function csvEscape(value) {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function rowToCsv(cols) {
  return cols.map(csvEscape).join(",");
}

export async function GET(request) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const allowed = ["owner", "pastor", "leader"];
  if (!allowed.includes(user.role)) {
    return new Response("Forbidden — member export requires pastor or owner role", {
      status: 403,
    });
  }

  const { searchParams } = new URL(request.url);
  const memberType = searchParams.get("memberType") || undefined;
  const limit      = Math.min(Number(searchParams.get("limit") || 10000), 100000);

  let members;
  try {
    members = listMembers({
      organizationId: user.organizationId,
      branchId:       user.branchId || undefined,
      memberType,
      limit,
    });
  } catch (err) {
    console.error("[export/members] DB error:", err);
    return new Response("Internal Server Error", { status: 500 });
  }

  const header = rowToCsv([
    "ID",
    "Full Name",
    "Email",
    "Phone",
    "Gender",
    "Date of Birth",
    "Marital Status",
    "Member Type",
    "Joined At",
  ]);

  const lines = members.map((m) =>
    rowToCsv([
      m.id,
      m.full_name || "",
      m.email     || "",
      m.phone     || "",
      m.gender    || "",
      m.birthdate || "",
      m.marital_status || "",
      m.member_type    || "",
      m.created_at     || "",
    ])
  );

  const csv = [header, ...lines].join("\r\n");
  const date     = new Date().toISOString().slice(0, 10);
  const filename = `members-${date}.csv`;

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
