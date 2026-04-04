import { NextResponse } from "next/server";
import { consumeAuthChallengeEntry } from "@/lib/auth-challenge-store";
import { findUserById, markUserEmailVerifiedEntry } from "@/lib/auth-store";
import { createNotifications } from "@/lib/notifications-store";
import { recordAuditLog } from "@/lib/care-store";
import { createJourneyEntry } from "@/lib/new-member-store";
import { getDatabase } from "@/lib/database";

function buildRedirect(request, notice) {
  const url = new URL("/login", request.url);
  if (notice) {
    url.searchParams.set("notice", notice);
  }
  return NextResponse.redirect(url);
}

function maybeCreateNewMemberJourney(user) {
  if (!user || user.memberType !== "new_member") {
    return;
  }

  const db = getDatabase();
  const existingJourney = db.prepare(`
    SELECT id
    FROM new_member_journeys
    WHERE organization_id = ?
      AND branch_id = ?
      AND member_email = ?
    ORDER BY created_at DESC
    LIMIT 1
  `).get(user.organizationId, user.branchId, user.email);

  if (existingJourney?.id) {
    return;
  }

  const journeyId = createJourneyEntry({
    organizationId: user.organizationId,
    branchId: user.branchId,
    memberName: user.name,
    memberEmail: user.email,
    memberPhone: user.phone || "",
    gender: user.gender || "unspecified",
    birthday: user.birthday || null,
  });

  createNotifications({
    organizationId: user.organizationId,
    branchId: user.branchId,
    roles: ["volunteer", "leader", "pastor"],
    kind: "alert",
    title: "New member joined",
    body: `${user.name} verified a new member account. Please follow up within 48 hours.`,
    href: `/new-members/${journeyId}`,
    metadata: { journeyId, memberName: user.name },
  });
}

export async function GET(request) {
  const token = new URL(request.url).searchParams.get("token")?.trim() || "";

  if (!token) {
    return buildRedirect(request, "This verification link is not valid.");
  }

  try {
    const challenge = consumeAuthChallengeEntry(token, "email-verification");
    markUserEmailVerifiedEntry(challenge.user.id);
    const user = findUserById(challenge.user.id);

    maybeCreateNewMemberJourney(user);

    recordAuditLog({
      actorUserId: user.id,
      actorName: user.name,
      actorRole: user.role,
      organizationId: user.organizationId,
      branchId: user.branchId,
      action: "auth.email_verified",
      targetType: "user",
      targetId: user.id,
      summary: `${user.name} verified their email address.`,
    });

    return buildRedirect(
      request,
      "Email verified. You can sign in now."
    );
  } catch (error) {
    return buildRedirect(
      request,
      error instanceof Error ? error.message : "This verification link could not be used."
    );
  }
}
