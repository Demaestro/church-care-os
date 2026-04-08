import { NextResponse } from "next/server";
import { readChurchLogo } from "@/lib/church-branding";
import { getOrganizationBySlug } from "@/lib/organization-store";

export async function GET(_request, { params }) {
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
      "Content-Length": String(payload.contentLength || ""),
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      ETag: payload.etag || organization.logoUpdatedAt || organization.logoPath,
    },
  });
}
