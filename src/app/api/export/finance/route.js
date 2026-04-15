/**
 * GET /api/export/finance.csv
 *
 * Downloads a CSV of ledger transactions for the authenticated user's
 * organisation. Accepts optional query params:
 *   ?from=YYYY-MM-DD  (default: 12 months ago)
 *   ?to=YYYY-MM-DD    (default: today)
 *   ?limit=N          (default: 5000, max: 50000)
 *
 * Requires: any authenticated user with finance visibility
 *   (pastor, owner, leader roles)
 */

import { getCurrentUser } from "@/lib/auth";
import { getLedgerTransactionsForPeriod } from "@/lib/finance-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function csvEscape(value) {
  if (value === null || value === undefined) return "";
  const str = String(value);
  // Wrap in quotes if the value contains a comma, quote, or newline
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

  // Only roles with financial access can export
  const allowed = ["owner", "pastor", "leader"];
  if (!allowed.includes(user.role)) {
    return new Response("Forbidden — finance export requires pastor or owner role", {
      status: 403,
    });
  }

  const { searchParams } = new URL(request.url);

  // Default to last 12 months
  const defaultFrom = new Date();
  defaultFrom.setFullYear(defaultFrom.getFullYear() - 1);
  const fromDate = searchParams.get("from") || defaultFrom.toISOString().slice(0, 10);
  const toDate   = searchParams.get("to")   || new Date().toISOString().slice(0, 10);
  const limit    = Math.min(Number(searchParams.get("limit") || 5000), 50000);

  let rows;
  try {
    rows = getLedgerTransactionsForPeriod({
      organizationId: user.organizationId,
      fromDate,
      toDate,
      limit,
    });
  } catch (err) {
    console.error("[export/finance] DB error:", err);
    return new Response("Internal Server Error", { status: 500 });
  }

  // Build CSV
  const header = rowToCsv([
    "Transaction ID",
    "Posted At",
    "Fund",
    "Memo",
    "Total Debit",
    "Total Credit",
    "Net",
  ]);

  const lines = rows.map((row) =>
    rowToCsv([
      row.id,
      row.postedLabel || row.posted_at,
      row.fund_name || "",
      row.memo || "",
      row.total_debit.toFixed(2),
      row.total_credit.toFixed(2),
      (row.total_credit - row.total_debit).toFixed(2),
    ])
  );

  const csv = [header, ...lines].join("\r\n");
  const filename = `finance-${fromDate}-to-${toDate}.csv`;

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
