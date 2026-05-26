import { NextResponse } from "next/server";
import { readChurchLogo } from "@/lib/church-branding";
import { getOrganizationBySlug } from "@/lib/organization-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request, context) {
  const params = await context.params;
  const organization = getOrganizationBySlug(params?.slug || "");

  if (!organization?.logoPath) {
    return new NextResponse("Not found", { status: 404 });
  }

  const payload = await readChurchLogo(organization);
  if (!payload?.body) {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(payload.body, {
    status: 200,
    headers: {
      "Content-Type": payload.contentType,
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      "Cross-Origin-Resource-Policy": "same-origin",
      "X-Content-Type-Options": "nosniff",
      ETag: payload.etag || organization.logoUpdatedAt || organization.logoPath,
      ...(payload.contentLength ? { "Content-Length": String(payload.contentLength) } : {}),
    },
  });
}
