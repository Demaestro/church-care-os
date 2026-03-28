import "server-only";

import { randomUUID } from "node:crypto";
import { listUsers } from "@/lib/auth-store";
import { formatDateTime } from "@/lib/care-format";
import { getDatabase, parseJson, serializeJson } from "@/lib/database";
import { renderEmailTemplate } from "@/lib/email-templates";
import { getChurchSettings } from "@/lib/organization-store";

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

export function isValidEmailAddress(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));
}

function getAppBaseUrl() {
  return String(process.env.APP_BASE_URL || "").trim().replace(/\/+$/, "");
}

function getProviderSecretStatus(provider) {
  switch (provider) {
    case "resend":
      return Boolean(process.env.RESEND_API_KEY);
    default:
      return false;
  }
}

function buildSenderAddress(settings) {
  const fromAddress =
    settings?.emailFromAddress || settings?.supportEmail || "care@example.com";
  const fromName =
    settings?.emailFromName || settings?.churchName || "Church Care OS";

  return `${fromName} <${fromAddress}>`;
}

function createOutboxEntry(db, input) {
  const id = randomUUID();
  db.prepare(`
    INSERT INTO email_outbox (
      id,
      template_key,
      purpose,
      recipient_email,
      recipient_name,
      subject,
      text_body,
      html_body,
      status,
      provider,
      provider_message_id,
      provider_response_json,
      error_message,
      created_at,
      attempted_at,
      sent_at,
      metadata_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    input.templateKey,
    input.purpose,
    input.recipientEmail,
    input.recipientName || null,
    input.subject,
    input.textBody,
    input.htmlBody,
    input.status,
    input.provider,
    input.providerMessageId || null,
    serializeJson(input.providerResponse || {}),
    input.errorMessage || null,
    input.createdAt,
    input.attemptedAt || null,
    input.sentAt || null,
    serializeJson(input.metadata || {})
  );

  return id;
}

function updateOutboxEntry(db, outboxId, input) {
  db.prepare(`
    UPDATE email_outbox
    SET
      status = ?,
      provider = ?,
      provider_message_id = ?,
      provider_response_json = ?,
      error_message = ?,
      attempted_at = ?,
      sent_at = ?
    WHERE id = ?
  `).run(
    input.status,
    input.provider,
    input.providerMessageId || null,
    serializeJson(input.providerResponse || {}),
    input.errorMessage || null,
    input.attemptedAt || null,
    input.sentAt || null,
    outboxId
  );
}

async function deliverViaResend(message, settings) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: buildSenderAddress(settings),
      to: [message.recipientEmail],
      subject: message.subject,
      html: message.htmlBody,
      text: message.textBody,
      ...(settings?.emailReplyTo ? { reply_to: settings.emailReplyTo } : {}),
    }),
  });

  const rawBody = await response.text();
  const parsedBody = parseJson(rawBody, { rawBody });

  if (!response.ok) {
    const errorMessage =
      parsedBody?.message ||
      parsedBody?.error ||
      `Resend request failed with status ${response.status}.`;
    throw new Error(errorMessage);
  }

  return {
    providerMessageId: parsedBody?.id || "",
    providerResponse: parsedBody,
  };
}

async function queueEmailForRecipient(templateKey, recipient, context, options = {}) {
  const settings = getChurchSettings();
  const recipientEmail = normalizeEmail(recipient?.email);
  const recipientName = recipient?.name || "";
  const baseContext = {
    ...context,
    settings,
    appBaseUrl: getAppBaseUrl(),
    recipientName,
  };
  const rendered = renderEmailTemplate(templateKey, baseContext);
  const mode = settings?.emailDeliveryMode || "log-only";
  const provider = mode === "resend" ? settings?.emailProvider || "resend" : "log-only";
  const now = new Date().toISOString();
  const db = getDatabase();

  if (!recipientEmail || !isValidEmailAddress(recipientEmail)) {
    createOutboxEntry(db, {
      templateKey,
      purpose: rendered.purpose,
      recipientEmail: recipientEmail || "missing-email",
      recipientName,
      subject: rendered.subject,
      textBody: rendered.text,
      htmlBody: rendered.html,
      status: "skipped",
      provider,
      errorMessage: "No valid recipient email was available for this delivery.",
      createdAt: now,
      attemptedAt: now,
      metadata: options.metadata || {},
    });

    return {
      status: "skipped",
    };
  }

  const outboxId = createOutboxEntry(db, {
    templateKey,
    purpose: rendered.purpose,
    recipientEmail,
    recipientName,
    subject: rendered.subject,
    textBody: rendered.text,
    htmlBody: rendered.html,
    status: "queued",
    provider,
    createdAt: now,
    metadata: options.metadata || {},
  });

  if (mode !== "resend") {
    updateOutboxEntry(db, outboxId, {
      status: "logged",
      provider: "log-only",
      providerResponse: {
        mode,
      },
      attemptedAt: now,
      errorMessage: null,
      sentAt: null,
    });

    return {
      status: "logged",
      outboxId,
    };
  }

  try {
    const delivery = await deliverViaResend(
      {
        recipientEmail,
        subject: rendered.subject,
        textBody: rendered.text,
        htmlBody: rendered.html,
      },
      settings
    );
    const sentAt = new Date().toISOString();

    updateOutboxEntry(db, outboxId, {
      status: "sent",
      provider: settings?.emailProvider || "resend",
      providerMessageId: delivery.providerMessageId,
      providerResponse: delivery.providerResponse,
      attemptedAt: sentAt,
      sentAt,
      errorMessage: null,
    });

    return {
      status: "sent",
      outboxId,
    };
  } catch (error) {
    updateOutboxEntry(db, outboxId, {
      status: "failed",
      provider: settings?.emailProvider || "resend",
      providerResponse: {},
      attemptedAt: new Date().toISOString(),
      sentAt: null,
      errorMessage: error instanceof Error ? error.message : "Email delivery failed.",
    });

    return {
      status: "failed",
      outboxId,
    };
  }
}

function dedupeRecipients(recipients) {
  const seen = new Set();

  return recipients.filter((recipient) => {
    const email = normalizeEmail(recipient?.email);
    if (!email || seen.has(email)) {
      return false;
    }

    seen.add(email);
    return true;
  });
}

export async function sendEmailToAddress(email, templateKey, context, options = {}) {
  return queueEmailForRecipient(
    templateKey,
    {
      email,
      name: options.recipientName || "",
    },
    context,
    options
  );
}

export async function sendEmailToRoles(roles, templateKey, context, options = {}) {
  const recipients = dedupeRecipients(
    listUsers()
      .filter((user) => user.active && roles.includes(user.role))
      .map((user) => ({
        email: user.email,
        name: user.name,
      }))
  );

  return Promise.all(
    recipients.map((recipient) =>
      queueEmailForRecipient(templateKey, recipient, context, options)
    )
  );
}

export async function sendEmailToVolunteer(
  volunteerName,
  templateKey,
  context,
  options = {}
) {
  const volunteer = listUsers().find(
    (user) =>
      user.active &&
      user.role === "volunteer" &&
      (user.volunteerName === volunteerName || user.name === volunteerName)
  );

  if (!volunteer) {
    return {
      status: "skipped",
    };
  }

  return queueEmailForRecipient(
    templateKey,
    {
      email: volunteer.email,
      name: volunteer.name,
    },
    context,
    options
  );
}

export function listEmailOutbox(limit = 20) {
  return getDatabase()
    .prepare(`
      SELECT
        id,
        template_key,
        purpose,
        recipient_email,
        recipient_name,
        subject,
        status,
        provider,
        provider_message_id,
        provider_response_json,
        error_message,
        created_at,
        attempted_at,
        sent_at,
        metadata_json
      FROM email_outbox
      ORDER BY created_at DESC
      LIMIT ?
    `)
    .all(limit)
    .map((row) => ({
      id: row.id,
      templateKey: row.template_key,
      purpose: row.purpose,
      recipientEmail: row.recipient_email,
      recipientName: row.recipient_name || "",
      subject: row.subject,
      status: row.status,
      provider: row.provider,
      providerMessageId: row.provider_message_id || "",
      providerResponse: parseJson(row.provider_response_json, {}),
      errorMessage: row.error_message || "",
      createdAt: row.created_at,
      attemptedAt: row.attempted_at || "",
      sentAt: row.sent_at || "",
      createdLabel: formatDateTime(row.created_at),
      attemptedLabel: formatDateTime(row.attempted_at),
      sentLabel: formatDateTime(row.sent_at),
      metadata: parseJson(row.metadata_json, {}),
    }));
}

export function getEmailDeliverySnapshot() {
  const settings = getChurchSettings();
  const db = getDatabase();
  const counts = db.prepare(`
    SELECT status, COUNT(*) AS count
    FROM email_outbox
    GROUP BY status
  `).all();
  const countMap = counts.reduce((result, row) => {
    result[row.status] = row.count;
    return result;
  }, {});
  const latest = db.prepare(`
    SELECT created_at, attempted_at, status
    FROM email_outbox
    ORDER BY COALESCE(attempted_at, created_at) DESC
    LIMIT 1
  `).get();

  return {
    mode: settings?.emailDeliveryMode || "log-only",
    provider: settings?.emailProvider || "resend",
    fromName: settings?.emailFromName || "",
    fromAddress: settings?.emailFromAddress || "",
    replyTo: settings?.emailReplyTo || "",
    subjectPrefix: settings?.emailSubjectPrefix || "",
    apiKeyConfigured: getProviderSecretStatus(settings?.emailProvider || "resend"),
    appBaseUrlConfigured: Boolean(getAppBaseUrl()),
    queuedCount: countMap.queued || 0,
    loggedCount: countMap.logged || 0,
    sentCount: countMap.sent || 0,
    failedCount: countMap.failed || 0,
    skippedCount: countMap.skipped || 0,
    latestStatus: latest?.status || "",
    latestAttemptLabel: formatDateTime(latest?.attempted_at || latest?.created_at),
  };
}
