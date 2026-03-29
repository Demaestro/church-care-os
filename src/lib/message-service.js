import "server-only";

import { randomUUID } from "node:crypto";
import { Buffer } from "node:buffer";
import { listUsers } from "@/lib/auth-store";
import { formatDateTime } from "@/lib/care-format";
import { getDatabase, parseJson, serializeJson } from "@/lib/database";
import { renderMessageTemplate } from "@/lib/message-templates";
import { getChurchSettings } from "@/lib/organization-store";

export function normalizePhoneNumber(value) {
  const raw = String(value || "").trim();

  if (!raw) {
    return "";
  }

  let normalized = raw.replace(/[^\d+]/g, "");

  if (normalized.startsWith("00")) {
    normalized = `+${normalized.slice(2)}`;
  }

  if (normalized.includes("+") && !normalized.startsWith("+")) {
    normalized = `+${normalized.replace(/\+/g, "")}`;
  }

  return normalized;
}

export function isValidMessagingPhone(value) {
  return /^\+[1-9]\d{7,14}$/.test(normalizePhoneNumber(value));
}

function getAppBaseUrl() {
  return String(process.env.APP_BASE_URL || "").trim().replace(/\/+$/, "");
}

function getProviderSecretStatus(provider) {
  switch (provider) {
    case "twilio":
      return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);
    default:
      return false;
  }
}

function createOutboxEntry(db, input) {
  const id = randomUUID();
  db.prepare(`
    INSERT INTO message_outbox (
      id,
      channel,
      template_key,
      purpose,
      recipient_phone,
      recipient_name,
      body,
      status,
      provider,
      provider_message_id,
      provider_response_json,
      error_message,
      created_at,
      attempted_at,
      sent_at,
      metadata_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    input.channel,
    input.templateKey,
    input.purpose,
    input.recipientPhone,
    input.recipientName || null,
    input.body,
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
    UPDATE message_outbox
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

function getSenderForChannel(channel, settings) {
  switch (channel) {
    case "whatsapp":
      return normalizePhoneNumber(settings?.whatsappFromNumber);
    case "sms":
    default:
      return normalizePhoneNumber(settings?.smsFromNumber);
  }
}

function formatTwilioAddress(channel, phone) {
  const normalized = normalizePhoneNumber(phone);
  return channel === "whatsapp" ? `whatsapp:${normalized}` : normalized;
}

async function deliverViaTwilio(channel, message, settings) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    throw new Error("Twilio credentials are not configured.");
  }

  const sender = getSenderForChannel(channel, settings);
  if (!isValidMessagingPhone(sender)) {
    throw new Error(`No valid ${channel} sender number is configured.`);
  }

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: formatTwilioAddress(channel, message.recipientPhone),
        From: formatTwilioAddress(channel, sender),
        Body: message.body,
      }).toString(),
    }
  );

  const rawBody = await response.text();
  const parsedBody = parseJson(rawBody, { rawBody });

  if (!response.ok) {
    const errorMessage =
      parsedBody?.message ||
      parsedBody?.error ||
      `Twilio request failed with status ${response.status}.`;
    throw new Error(errorMessage);
  }

  return {
    providerMessageId: parsedBody?.sid || "",
    providerResponse: parsedBody,
  };
}

async function queueMessageForRecipient(
  templateKey,
  channel,
  recipient,
  context,
  options = {}
) {
  const settings = getChurchSettings();
  const recipientPhone = normalizePhoneNumber(recipient?.phone);
  const recipientName = recipient?.name || "";
  const baseContext = {
    ...context,
    settings,
    appBaseUrl: getAppBaseUrl(),
    recipientName,
  };
  const rendered = renderMessageTemplate(templateKey, baseContext, channel);
  const mode = settings?.messageDeliveryMode || "log-only";
  const provider = mode === "twilio" ? settings?.messageProvider || "twilio" : "log-only";
  const now = new Date().toISOString();
  const db = getDatabase();

  if (!recipientPhone || !isValidMessagingPhone(recipientPhone)) {
    createOutboxEntry(db, {
      channel,
      templateKey,
      purpose: rendered.purpose,
      recipientPhone: recipientPhone || "missing-phone",
      recipientName,
      body: rendered.body,
      status: "skipped",
      provider,
      errorMessage: "No valid phone number was available for this delivery.",
      createdAt: now,
      attemptedAt: now,
      metadata: options.metadata || {},
    });

    return {
      status: "skipped",
    };
  }

  const outboxId = createOutboxEntry(db, {
    channel,
    templateKey,
    purpose: rendered.purpose,
    recipientPhone,
    recipientName,
    body: rendered.body,
    status: "queued",
    provider,
    createdAt: now,
    metadata: options.metadata || {},
  });

  if (mode !== "twilio") {
    updateOutboxEntry(db, outboxId, {
      status: "logged",
      provider: "log-only",
      providerResponse: { mode },
      attemptedAt: now,
      sentAt: null,
      errorMessage: null,
    });

    return {
      status: "logged",
      outboxId,
    };
  }

  try {
    const delivery = await deliverViaTwilio(
      channel,
      {
        recipientPhone,
        body: rendered.body,
      },
      settings
    );
    const sentAt = new Date().toISOString();

    updateOutboxEntry(db, outboxId, {
      status: "sent",
      provider: settings?.messageProvider || "twilio",
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
      provider: settings?.messageProvider || "twilio",
      providerResponse: {},
      attemptedAt: new Date().toISOString(),
      sentAt: null,
      errorMessage: error instanceof Error ? error.message : "Message delivery failed.",
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
    const phone = normalizePhoneNumber(recipient?.phone);
    if (!phone || seen.has(phone)) {
      return false;
    }

    seen.add(phone);
    return true;
  });
}

export async function sendMessageToPhone(
  phone,
  channel,
  templateKey,
  context,
  options = {}
) {
  return queueMessageForRecipient(
    templateKey,
    channel,
    {
      phone,
      name: options.recipientName || "",
    },
    context,
    options
  );
}

export async function sendMessageToRoles(
  roles,
  channel,
  templateKey,
  context,
  options = {}
) {
  const recipients = dedupeRecipients(
    listUsers()
      .filter((user) => user.active && roles.includes(user.role))
      .map((user) => ({
        phone: user.phone,
        name: user.name,
      }))
  );

  return Promise.all(
    recipients.map((recipient) =>
      queueMessageForRecipient(templateKey, channel, recipient, context, options)
    )
  );
}

export async function sendMessageToVolunteer(
  volunteerName,
  channel,
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

  return queueMessageForRecipient(
    templateKey,
    channel,
    {
      phone: volunteer.phone,
      name: volunteer.name,
    },
    context,
    options
  );
}

export function listMessageOutbox(limit = 20) {
  return getDatabase()
    .prepare(`
      SELECT
        id,
        channel,
        template_key,
        purpose,
        recipient_phone,
        recipient_name,
        body,
        status,
        provider,
        provider_message_id,
        provider_response_json,
        error_message,
        created_at,
        attempted_at,
        sent_at,
        metadata_json
      FROM message_outbox
      ORDER BY created_at DESC
      LIMIT ?
    `)
    .all(limit)
    .map((row) => ({
      id: row.id,
      channel: row.channel,
      templateKey: row.template_key,
      purpose: row.purpose,
      recipientPhone: row.recipient_phone,
      recipientName: row.recipient_name || "",
      body: row.body,
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

export function getMessageDeliverySnapshot() {
  const settings = getChurchSettings();
  const db = getDatabase();
  const counts = db
    .prepare(`
      SELECT status, COUNT(*) AS count
      FROM message_outbox
      GROUP BY status
    `)
    .all();
  const countMap = counts.reduce((result, row) => {
    result[row.status] = row.count;
    return result;
  }, {});
  const latest = db
    .prepare(`
      SELECT created_at, attempted_at, status
      FROM message_outbox
      ORDER BY COALESCE(attempted_at, created_at) DESC
      LIMIT 1
    `)
    .get();

  return {
    mode: settings?.messageDeliveryMode || "log-only",
    provider: settings?.messageProvider || "twilio",
    smsFromNumber: settings?.smsFromNumber || "",
    whatsappFromNumber: settings?.whatsappFromNumber || "",
    providerConfigured: getProviderSecretStatus(settings?.messageProvider || "twilio"),
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
