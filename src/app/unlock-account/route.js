import { NextResponse } from "next/server";
import { consumeAuthChallengeEntry } from "@/lib/auth-challenge-store";
import {
  bumpUserSessionVersionEntry,
  findUserById,
  unlockUserEntry,
} from "@/lib/auth-store";
import { recordAuditLog } from "@/lib/care-store";

function buildRedirect(request, notice) {
  const url = new URL("/login", request.url);
  if (notice) {
    url.searchParams.set("notice", notice);
  }
  return NextResponse.redirect(url);
}

export async function GET(request) {
  const token = new URL(request.url).searchParams.get("token")?.trim() || "";

  if (!token) {
    return buildRedirect(request, "This unlock link is not valid.");
  }

  try {
    const challenge = consumeAuthChallengeEntry(token, "account-unlock");
    unlockUserEntry(challenge.user.id);
    bumpUserSessionVersionEntry(challenge.user.id);
    const user = findUserById(challenge.user.id);

    recordAuditLog({
      actorUserId: user.id,
      actorName: user.name,
      actorRole: user.role,
      organizationId: user.organizationId,
      branchId: user.branchId,
      action: "auth.account_unlocked",
      targetType: "user",
      targetId: user.id,
      summary: `${user.name} unlocked their account using an emailed link.`,
    });

    return buildRedirect(
      request,
      "Your account is unlocked. You can sign in now."
    );
  } catch (error) {
    return buildRedirect(
      request,
      error instanceof Error ? error.message : "This unlock link could not be used."
    );
  }
}
