import "server-only";

function buildAbsoluteUrl(baseUrl, path = "") {
  if (!baseUrl || !path) {
    return "";
  }

  try {
    return new URL(path, baseUrl).toString();
  } catch {
    return "";
  }
}

function compactText(value, maxLength = 220) {
  const text = String(value || "").replace(/\s+/g, " ").trim();

  if (!text) {
    return "";
  }

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
}

function buildMessage({
  settings,
  body,
  footer = "",
}) {
  const churchName = settings?.churchName || "Church Care OS";
  const parts = [churchName, body, footer].filter(Boolean);

  return compactText(parts.join(" | "), 320);
}

export function renderMessageTemplate(templateKey, context, channel = "sms") {
  const settings = context.settings || {};
  const appBaseUrl = context.appBaseUrl || "";
  const resetUrl = buildAbsoluteUrl(appBaseUrl, context.resetPath || "");
  const requestStatusUrl = buildAbsoluteUrl(
    appBaseUrl,
    context.statusPath || "/requests/status"
  );
  const volunteerUrl = buildAbsoluteUrl(appBaseUrl, context.volunteerPath || "/volunteer");
  const householdUrl = buildAbsoluteUrl(appBaseUrl, context.householdPath || "");
  const signInUrl = buildAbsoluteUrl(appBaseUrl, "/login");

  switch (templateKey) {
    case "request-received":
      return {
        purpose: "member-update",
        body: buildMessage({
          settings,
          body: `We received your ${context.need?.toLowerCase() || "care"} request. Tracking code ${context.trackingCode}. ${
            requestStatusUrl
              ? `Track it here: ${requestStatusUrl}`
              : "Keep this tracking code safe for later updates."
          }`,
          footer: context.allowContact
            ? "A care lead may reach out using the contact details you shared."
            : "A pastor will review this request with added privacy.",
        }),
      };
    case "care-request-alert":
      return {
        purpose: "internal-alert",
        body: buildMessage({
          settings,
          body: `New ${context.need?.toLowerCase() || "care"} request from ${context.householdName}. Tracking code ${context.trackingCode}. ${
            householdUrl ? `Review: ${householdUrl}` : ""
          }`,
        }),
      };
    case "task-assigned":
      return {
        purpose: "internal-task",
        body: buildMessage({
          settings,
          body: `${context.assignedBy} assigned you a ${context.need?.toLowerCase() || "care"} follow-up in ${context.laneOwner}. ${compactText(context.volunteerBrief, 120)}`,
          footer: volunteerUrl ? `Open task: ${volunteerUrl}` : "",
        }),
      };
    case "request-escalated":
      return {
        purpose: "internal-alert",
        body: buildMessage({
          settings,
          body: `${context.escalatedBy} escalated ${context.householdName} for pastoral review. ${compactText(context.reason, 120)}`,
          footer: householdUrl ? `Review: ${householdUrl}` : "",
        }),
      };
    case "password-reset-link":
      return {
        purpose: "account-security",
        body: buildMessage({
          settings,
          body: `Use your one-time link to reset the password for ${context.email}. ${resetUrl || "Open the app to request a new link if needed."}`,
          footer: context.expiresLabel
            ? `This link expires ${context.expiresLabel}.`
            : "This link expires soon and works only once.",
        }),
      };
    case "password-reset":
      return {
        purpose: "account-security",
        body: buildMessage({
          settings,
          body: `Your care account password was reset by ${context.handledBy}. If you did not expect this, contact your church care team immediately.`,
          footer: signInUrl ? `Sign in: ${signInUrl}` : "",
        }),
      };
    case "recovery-request-alert":
      return {
        purpose: "internal-alert",
        body: buildMessage({
          settings,
          body: `${context.requesterName || "A team member"} asked for account recovery help for ${context.email}. ${compactText(context.note, 120)}`,
        }),
      };
    case "account-created":
      return {
        purpose: "account-onboarding",
        body: buildMessage({
          settings,
          body: `${context.createdBy} created your ${context.role} care account. Use the temporary password they shared with you and update it after first sign-in.`,
          footer: signInUrl ? `Sign in: ${signInUrl}` : "",
        }),
      };
    case "test-message":
      return {
        purpose: "system-check",
        body: buildMessage({
          settings,
          body: `This is a ${channel === "whatsapp" ? "WhatsApp" : "text"} delivery test in ${context.deliveryMode} mode using ${context.provider}.`,
          footer: compactText(context.note, 120),
        }),
      };
    default:
      return {
        purpose: "system-update",
        body: buildMessage({
          settings,
          body: compactText(context.note || "A new Church Care OS update is available.", 220),
        }),
      };
  }
}
