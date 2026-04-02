import path from "node:path";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { readAttachmentBuffer } from "@/lib/attachment-store";
import { WORKSPACE_BRANCH_COOKIE } from "@/lib/workspace-scope";

export async function GET(_request, context) {
  const user = await getCurrentUser();

  if (!user) {
    return new Response("You must be signed in to open attachments.", {
      status: 401,
    });
  }

  const { id } = await context.params;
  const preferredBranchId = (await cookies()).get(WORKSPACE_BRANCH_COOKIE)?.value || "";

  try {
    const result = readAttachmentBuffer(id, user, preferredBranchId);
    if (!result) {
      return new Response("Attachment not found.", { status: 404 });
    }

    const extension = path.extname(result.attachment.originalName || "");
    const safeName = `${path.basename(
      result.attachment.originalName,
      extension
    )}${extension}`.replace(/["\r\n]+/g, "");

    return new Response(result.buffer, {
      status: 200,
      headers: {
        "Content-Type": result.attachment.mimeType || "application/octet-stream",
        "Content-Length": String(result.buffer.byteLength),
        "Content-Disposition": `attachment; filename="${safeName}"`,
        "Cache-Control": "private, max-age=0, must-revalidate",
      },
    });
  } catch (error) {
    return new Response(
      error instanceof Error
        ? error.message
        : "You do not have access to that attachment.",
      {
        status: 403,
      }
    );
  }
}
