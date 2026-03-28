import "server-only";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

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

function buildEmailDocument({
  settings,
  subject,
  preheader,
  eyebrow,
  heading,
  intro,
  facts = [],
  paragraphs = [],
  cta,
  footerNote,
}) {
  const churchName = settings?.churchName || "Church Care OS";
  const supportLine = [settings?.supportEmail, settings?.supportPhone]
    .filter(Boolean)
    .join(" | ");
  const factHtml = facts.length
    ? `
      <table role="presentation" width="100%" style="border-collapse:collapse;margin:24px 0 0;">
        ${facts
          .map(
            (fact) => `
              <tr>
                <td style="padding:10px 0;border-top:1px solid #eadfcd;width:34%;font-size:12px;line-height:18px;text-transform:uppercase;letter-spacing:0.14em;color:#7a736c;">
                  ${escapeHtml(fact.label)}
                </td>
                <td style="padding:10px 0;border-top:1px solid #eadfcd;font-size:15px;line-height:24px;color:#20160b;">
                  ${escapeHtml(fact.value)}
                </td>
              </tr>
            `
          )
          .join("")}
      </table>
    `
    : "";
  const paragraphHtml = paragraphs
    .filter(Boolean)
    .map(
      (paragraph) => `
        <p style="margin:16px 0 0;font-size:15px;line-height:26px;color:#51483f;">
          ${escapeHtml(paragraph)}
        </p>
      `
    )
    .join("");
  const ctaHtml =
    cta?.href && cta?.label
      ? `
        <div style="margin-top:28px;">
          <a
            href="${escapeHtml(cta.href)}"
            style="display:inline-block;border-radius:16px;background:#20160b;color:#fffaf2;text-decoration:none;padding:14px 22px;font-weight:600;font-size:14px;line-height:20px;"
          >
            ${escapeHtml(cta.label)}
          </a>
        </div>
      `
      : "";
  const footerHtml = [footerNote, supportLine]
    .filter(Boolean)
    .map(
      (line) => `
        <p style="margin:8px 0 0;font-size:12px;line-height:20px;color:#7a736c;">
          ${escapeHtml(line)}
        </p>
      `
    )
    .join("");
  const textParts = [
    heading,
    intro,
    "",
    ...facts.map((fact) => `${fact.label}: ${fact.value}`),
    "",
    ...paragraphs.filter(Boolean),
    "",
    cta?.href ? `${cta.label}: ${cta.href}` : "",
    footerNote || "",
    supportLine || "",
  ].filter(Boolean);

  return {
    subject,
    text: textParts.join("\n"),
    html: `
      <!doctype html>
      <html lang="en">
        <body style="margin:0;padding:0;background:#f6f0e6;font-family:Georgia,'Times New Roman',serif;color:#20160b;">
          <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
            ${escapeHtml(preheader || intro || heading)}
          </div>
          <table role="presentation" width="100%" style="border-collapse:collapse;background:#f6f0e6;padding:32px 0;">
            <tr>
              <td align="center">
                <table role="presentation" width="100%" style="max-width:640px;border-collapse:collapse;">
                  <tr>
                    <td style="padding:0 16px;">
                      <div style="border-radius:28px;background:#fffaf2;border:1px solid #eadfcd;padding:40px 32px;box-shadow:0 28px 70px rgba(32,22,11,0.07);">
                        <p style="margin:0;font-size:11px;line-height:18px;text-transform:uppercase;letter-spacing:0.24em;color:#7a736c;">
                          ${escapeHtml(eyebrow || churchName)}
                        </p>
                        <h1 style="margin:18px 0 0;font-size:34px;line-height:1.08;color:#20160b;">
                          ${escapeHtml(heading)}
                        </h1>
                        <p style="margin:18px 0 0;font-size:16px;line-height:28px;color:#51483f;">
                          ${escapeHtml(intro)}
                        </p>
                        ${factHtml}
                        ${paragraphHtml}
                        ${ctaHtml}
                      </div>
                      <div style="padding:18px 12px 0;">
                        ${footerHtml}
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
  };
}

export function renderEmailTemplate(templateKey, context) {
  const settings = context.settings || {};
  const subjectPrefix = settings.emailSubjectPrefix
    ? `[${settings.emailSubjectPrefix}] `
    : "";
  const baseUrl = context.appBaseUrl || "";
  const signInUrl = buildAbsoluteUrl(baseUrl, "/login");
  const notificationsUrl = buildAbsoluteUrl(baseUrl, "/notifications");
  const volunteerUrl = buildAbsoluteUrl(baseUrl, context.volunteerPath || "/volunteer");
  const householdUrl = buildAbsoluteUrl(baseUrl, context.householdPath || "");
  const requestStatusUrl = buildAbsoluteUrl(
    baseUrl,
    context.statusPath || "/requests/status"
  );
  const adminUsersUrl = buildAbsoluteUrl(baseUrl, "/admin/users");

  switch (templateKey) {
    case "request-received":
      return {
        purpose: "member-update",
        ...buildEmailDocument({
          settings,
          subject: `${subjectPrefix}Care request received`,
          preheader:
            "We received your request and logged your privacy choices safely.",
          eyebrow: "Member care intake",
          heading: "Your care request has been received",
          intro:
            "A pastor or assigned care lead will review your request and decide the next safe follow-up step.",
          facts: [
            {
              label: "Tracking code",
              value: context.trackingCode,
            },
            {
              label: "Support type",
              value: context.need,
            },
            {
              label: "Privacy",
              value:
                context.privacyLabel ||
                "Your privacy choices were saved with this request.",
            },
          ],
          paragraphs: [
            "Keep your tracking code somewhere safe. You can use it anytime to check status without signing in.",
            context.allowContact
              ? "If you asked us to contact you, a care lead may follow up using the contact details you shared."
              : "You did not consent to direct follow-up, so a pastor will handle this request with added care.",
          ],
          cta: requestStatusUrl
            ? {
                label: "Track this request",
                href: requestStatusUrl,
              }
            : null,
          footerNote:
            "If the situation becomes urgent or unsafe, contact your pastor or emergency support directly instead of waiting on email alone.",
        }),
      };
    case "care-request-alert":
      return {
        purpose: "internal-alert",
        ...buildEmailDocument({
          settings,
          subject: `${subjectPrefix}New care request: ${context.need}`,
          preheader: "A new member request needs pastoral triage.",
          eyebrow: "Pastoral alert",
          heading: "A new care request just came in",
          intro:
            "A member-facing intake was submitted and is now waiting for review inside the care workspace.",
          facts: [
            {
              label: "Household",
              value: context.householdName,
            },
            {
              label: "Support type",
              value: context.need,
            },
            {
              label: "Tracking code",
              value: context.trackingCode,
            },
          ],
          paragraphs: [
            context.summary
              ? `Member-safe summary: ${context.summary}`
              : "The request did not include extra detail yet.",
          ],
          cta: householdUrl
            ? {
                label: "Open care timeline",
                href: householdUrl,
              }
            : null,
          footerNote:
            "This alert went only to active pastoral or owner accounts with email addresses on file.",
        }),
      };
    case "task-assigned":
      return {
        purpose: "internal-task",
        ...buildEmailDocument({
          settings,
          subject: `${subjectPrefix}New care task assigned`,
          preheader: "A ministry leader routed a care task to you.",
          eyebrow: "Volunteer handoff",
          heading: "A new care task is waiting for you",
          intro:
            "A ministry leader assigned a bounded follow-up for you inside the care workflow.",
          facts: [
            {
              label: "Household",
              value: context.householdName,
            },
            {
              label: "Support type",
              value: context.need,
            },
            {
              label: "Lane",
              value: context.laneOwner,
            },
          ],
          paragraphs: [
            `Assigned by ${context.assignedBy}.`,
            context.volunteerBrief || "Open the task to review the leader brief.",
          ],
          cta: volunteerUrl
            ? {
                label: "Open volunteer view",
                href: volunteerUrl,
              }
            : notificationsUrl
              ? {
                  label: "Open notifications",
                  href: notificationsUrl,
                }
              : null,
          footerNote:
            "Only the context needed to complete the task safely should be shared with volunteers.",
        }),
      };
    case "request-escalated":
      return {
        purpose: "internal-alert",
        ...buildEmailDocument({
          settings,
          subject: `${subjectPrefix}Pastoral escalation requested`,
          preheader: "A leader escalated a request back to pastoral review.",
          eyebrow: "Pastoral escalation",
          heading: "A request was escalated for renewed pastoral review",
          intro:
            "A ministry leader asked for pastoral attention before any wider handoff continues.",
          facts: [
            {
              label: "Household",
              value: context.householdName,
            },
            {
              label: "Support type",
              value: context.need,
            },
            {
              label: "Escalated by",
              value: context.escalatedBy,
            },
          ],
          paragraphs: [context.reason || "No additional reason was recorded."],
          cta: householdUrl
            ? {
                label: "Review the household timeline",
                href: householdUrl,
              }
            : null,
          footerNote:
            "This message contains operational context only and stays within pastoral or owner visibility.",
        }),
      };
    case "password-reset":
      return {
        purpose: "account-security",
        ...buildEmailDocument({
          settings,
          subject: `${subjectPrefix}Your care account password was reset`,
          preheader: "A care admin issued a new password for your account.",
          eyebrow: "Account access",
          heading: "Your password was reset",
          intro:
            "A pastor or owner reset your care account password after an internal verification step.",
          facts: [
            {
              label: "Handled by",
              value: context.handledBy,
            },
            {
              label: "Account email",
              value: context.email,
            },
          ],
          paragraphs: [
            "Use the new password shared with you directly, then sign in and update it after your next login.",
            "If you did not expect this change, contact your church care team immediately.",
          ],
          cta: signInUrl
            ? {
                label: "Sign in",
                href: signInUrl,
              }
            : null,
          footerNote:
            "For safety, temporary passwords are never included inside notification emails.",
        }),
      };
    case "account-created":
      return {
        purpose: "account-onboarding",
        ...buildEmailDocument({
          settings,
          subject: `${subjectPrefix}Your care account is ready`,
          preheader: "A new internal care account has been created for you.",
          eyebrow: "Account ready",
          heading: "Your care account is ready",
          intro:
            "An owner or pastor created your internal account so you can join the care workflow.",
          facts: [
            {
              label: "Role",
              value: context.role,
            },
            {
              label: "Account email",
              value: context.email,
            },
          ],
          paragraphs: [
            `Created by ${context.createdBy}.`,
            "Use the temporary password shared with you directly, then update it after your first sign-in.",
          ],
          cta: signInUrl
            ? {
                label: "Sign in",
                href: signInUrl,
              }
            : null,
          footerNote:
            "This email confirms the account exists, but it does not contain the password itself.",
        }),
      };
    case "recovery-request-alert":
      return {
        purpose: "internal-alert",
        ...buildEmailDocument({
          settings,
          subject: `${subjectPrefix}Account recovery requested`,
          preheader: "A team member asked for help recovering sign-in access.",
          eyebrow: "Recovery queue",
          heading: "A recovery request needs review",
          intro:
            "A password recovery request was submitted through the protected recovery form.",
          facts: [
            {
              label: "Account email",
              value: context.email,
            },
            {
              label: "Requester",
              value: context.requesterName || "Not provided",
            },
          ],
          paragraphs: [
            context.note || "No extra verification note was included.",
          ],
          cta: adminUsersUrl
            ? {
                label: "Open recovery queue",
                href: adminUsersUrl,
              }
            : null,
          footerNote:
            "Review and verify the request manually before any password is changed.",
        }),
      };
    case "recovery-request-received":
      return {
        purpose: "account-security",
        ...buildEmailDocument({
          settings,
          subject: `${subjectPrefix}We received your recovery request`,
          preheader:
            "Your church care team logged your request for account recovery.",
          eyebrow: "Recovery received",
          heading: "We received your account recovery request",
          intro:
            "A pastor or owner will review this request manually and follow up safely after they verify it.",
          facts: [
            {
              label: "Account email",
              value: context.email,
            },
          ],
          paragraphs: [
            "This confirmation does not reveal whether an account exists for that email address.",
            "If you need immediate help, contact your church care team directly using the support details below.",
          ],
          cta: signInUrl
            ? {
                label: "Back to sign in",
                href: signInUrl,
              }
            : null,
        }),
      };
    case "test-email":
      return {
        purpose: "system-check",
        ...buildEmailDocument({
          settings,
          subject: `${subjectPrefix}Email delivery test`,
          preheader: "This is a test message from Church Care OS.",
          eyebrow: "Delivery test",
          heading: "Email delivery looks wired up",
          intro:
            "This test message confirms that Church Care OS can render and queue email from the current configuration.",
          facts: [
            {
              label: "Mode",
              value: context.deliveryMode,
            },
            {
              label: "Provider",
              value: context.provider,
            },
          ],
          paragraphs: [
            context.note ||
              "If you received this from a live provider, the outbox should show it as sent. If not, log-only mode is still recording the message safely.",
          ],
          cta: notificationsUrl
            ? {
                label: "Open the app",
                href: notificationsUrl,
              }
            : null,
        }),
      };
    default:
      return {
        purpose: "system-update",
        ...buildEmailDocument({
          settings,
          subject: `${subjectPrefix}Church Care OS update`,
          preheader: "A new Church Care OS update is available for review.",
          eyebrow: "System update",
          heading: "Church Care OS update",
          intro: "A new internal update was generated.",
        }),
      };
  }
}
