import { Buffer } from "node:buffer";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { parseFlag, resolveDatabasePath } from "./lib/runtime-paths.mjs";

const once = process.argv.includes("--once");
const queue = parseFlag("queue") || "delivery";
const pollMs = Number(parseFlag("poll-ms") || 5000);
const limit = Number(parseFlag("limit") || 250);
const workerName = parseFlag("worker") || `care-worker-${process.pid}`;

const databasePath = resolveDatabasePath();
mkdirSync(path.dirname(databasePath), { recursive: true });
const db = new DatabaseSync(databasePath);

db.exec("PRAGMA foreign_keys = ON;");
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA busy_timeout = 5000;");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseJson(value, fallback) {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizePhoneNumber(value) {
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

function buildSenderAddress(settings) {
  const fromAddress =
    settings.emailFromAddress || settings.supportEmail || "care@example.com";
  const fromName = settings.emailFromName || settings.churchName || "Church Care OS";

  return `${fromName} <${fromAddress}>`;
}

function getChurchSettings(organizationId) {
  return db
    .prepare(`
      SELECT *
      FROM church_settings
      WHERE organization_id = ?
      LIMIT 1
    `)
    .get(organizationId);
}

function getBranchSettings(branchId) {
  if (!branchId) {
    return null;
  }

  return (
    db
      .prepare(`
        SELECT *
        FROM branch_settings
        WHERE branch_id = ?
        LIMIT 1
      `)
      .get(branchId) || null
  );
}

function getEffectiveChurchSettings(organizationId, branchId) {
  const org = getChurchSettings(organizationId) || {};
  const branch = getBranchSettings(branchId) || {};

  return {
    churchName: org.church_name || "",
    supportEmail: branch.support_email || org.support_email || "",
    supportPhone: branch.support_phone || org.support_phone || "",
    emailFromName: branch.email_from_name || org.email_from_name || "",
    emailFromAddress: branch.email_from_address || org.email_from_address || "",
    emailReplyTo: branch.email_reply_to || org.email_reply_to || "",
    emailProvider: org.email_provider || "resend",
    messageProvider: org.message_provider || "twilio",
    smsFromNumber: branch.sms_from_number || org.sms_from_number || "",
    whatsappFromNumber:
      branch.whatsapp_from_number || org.whatsapp_from_number || "",
  };
}

function claimNextJob() {
  db.exec("BEGIN IMMEDIATE");

  try {
    const now = new Date().toISOString();
    const row = db
      .prepare(`
        SELECT id
        FROM jobs
        WHERE status = 'queued'
          AND run_after <= ?
          AND queue = ?
        ORDER BY run_after ASC, created_at ASC
        LIMIT 1
      `)
      .get(now, queue);

    if (!row) {
      db.exec("COMMIT");
      return null;
    }

    db.prepare(`
      UPDATE jobs
      SET
        status = 'processing',
        locked_at = ?,
        locked_by = ?
      WHERE id = ?
    `).run(now, workerName, row.id);

    const claimed = db
      .prepare(`
        SELECT *
        FROM jobs
        WHERE id = ?
        LIMIT 1
      `)
      .get(row.id);

    db.exec("COMMIT");
    return claimed;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function completeJob(jobId) {
  db.prepare(`
    UPDATE jobs
    SET
      status = 'completed',
      completed_at = ?,
      locked_at = NULL,
      locked_by = NULL,
      last_error = NULL
    WHERE id = ?
  `).run(new Date().toISOString(), jobId);
}

function failJob(jobId, errorMessage) {
  const row = db
    .prepare(`
      SELECT attempts, max_attempts
      FROM jobs
      WHERE id = ?
      LIMIT 1
    `)
    .get(jobId);

  if (!row) {
    return;
  }

  const attempts = Number(row.attempts || 0) + 1;
  const maxAttempts = Number(row.max_attempts || 3);
  const shouldRetry = attempts < maxAttempts;
  const retryAt = new Date(Date.now() + attempts * 60 * 1000).toISOString();

  db.prepare(`
    UPDATE jobs
    SET
      status = ?,
      attempts = ?,
      run_after = ?,
      locked_at = NULL,
      locked_by = NULL,
      last_error = ?
    WHERE id = ?
  `).run(
    shouldRetry ? "queued" : "failed",
    attempts,
    shouldRetry ? retryAt : new Date().toISOString(),
    String(errorMessage || "Unknown worker failure"),
    jobId
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
      ...(settings.emailReplyTo ? { reply_to: settings.emailReplyTo } : {}),
    }),
  });
  const rawBody = await response.text();
  const parsedBody = parseJson(rawBody, { rawBody });

  if (!response.ok) {
    throw new Error(
      parsedBody?.message ||
        parsedBody?.error ||
        `Resend request failed with status ${response.status}.`
    );
  }

  return {
    providerMessageId: parsedBody?.id || "",
    providerResponse: parsedBody,
  };
}

function getTwilioSender(channel, settings) {
  return channel === "whatsapp"
    ? normalizePhoneNumber(settings.whatsappFromNumber)
    : normalizePhoneNumber(settings.smsFromNumber);
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

  const sender = getTwilioSender(channel, settings);
  if (!sender) {
    throw new Error(`No sender number is configured for ${channel}.`);
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
    throw new Error(
      parsedBody?.message ||
        parsedBody?.error ||
        `Twilio request failed with status ${response.status}.`
    );
  }

  return {
    providerMessageId: parsedBody?.sid || "",
    providerResponse: parsedBody,
  };
}

function updateEmailOutbox(outboxId, patch) {
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
    patch.status,
    patch.provider,
    patch.providerMessageId || null,
    JSON.stringify(patch.providerResponse || {}),
    patch.errorMessage || null,
    patch.attemptedAt || null,
    patch.sentAt || null,
    outboxId
  );
}

function updateMessageOutbox(outboxId, patch) {
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
    patch.status,
    patch.provider,
    patch.providerMessageId || null,
    JSON.stringify(patch.providerResponse || {}),
    patch.errorMessage || null,
    patch.attemptedAt || null,
    patch.sentAt || null,
    outboxId
  );
}

async function processEmailJob(payload) {
  const row = db
    .prepare(`
      SELECT *
      FROM email_outbox
      WHERE id = ?
      LIMIT 1
    `)
    .get(payload.outboxId);

  if (!row) {
    throw new Error("Email outbox entry not found.");
  }

  const settings = getEffectiveChurchSettings(row.organization_id, row.branch_id || "");

  try {
    const delivery = await deliverViaResend(
      {
        recipientEmail: row.recipient_email,
        subject: row.subject,
        textBody: row.text_body,
        htmlBody: row.html_body,
      },
      settings
    );
    const sentAt = new Date().toISOString();

    updateEmailOutbox(row.id, {
      status: "sent",
      provider: settings.emailProvider || "resend",
      providerMessageId: delivery.providerMessageId,
      providerResponse: delivery.providerResponse,
      attemptedAt: sentAt,
      sentAt,
      errorMessage: null,
    });
  } catch (error) {
    updateEmailOutbox(row.id, {
      status: "failed",
      provider: row.provider || "resend",
      providerResponse: {},
      attemptedAt: new Date().toISOString(),
      sentAt: null,
      errorMessage: error instanceof Error ? error.message : "Email delivery failed.",
    });
    throw error;
  }
}

async function processMessageJob(payload, channel) {
  const row = db
    .prepare(`
      SELECT *
      FROM message_outbox
      WHERE id = ?
      LIMIT 1
    `)
    .get(payload.outboxId);

  if (!row) {
    throw new Error("Message outbox entry not found.");
  }

  const settings = getEffectiveChurchSettings(row.organization_id, row.branch_id || "");

  try {
    const delivery = await deliverViaTwilio(
      channel || row.channel,
      {
        recipientPhone: row.recipient_phone,
        body: row.body,
      },
      settings
    );
    const sentAt = new Date().toISOString();

    updateMessageOutbox(row.id, {
      status: "sent",
      provider: settings.messageProvider || "twilio",
      providerMessageId: delivery.providerMessageId,
      providerResponse: delivery.providerResponse,
      attemptedAt: sentAt,
      sentAt,
      errorMessage: null,
    });
  } catch (error) {
    updateMessageOutbox(row.id, {
      status: "failed",
      provider: row.provider || "twilio",
      providerResponse: {},
      attemptedAt: new Date().toISOString(),
      sentAt: null,
      errorMessage: error instanceof Error ? error.message : "Message delivery failed.",
    });
    throw error;
  }
}

async function processJob(job) {
  const payload = parseJson(job.payload_json, {});

  switch (job.type) {
    case "email.send":
      await processEmailJob(payload);
      return;
    case "message.send.sms":
      await processMessageJob(payload, "sms");
      return;
    case "message.send.whatsapp":
      await processMessageJob(payload, "whatsapp");
      return;
    default:
      throw new Error(`Unsupported job type: ${job.type}`);
  }
}

let processed = 0;

try {
  while (processed < limit) {
    const job = claimNextJob();

    if (!job) {
      if (once) {
        break;
      }

      await sleep(pollMs);
      continue;
    }

    try {
      await processJob(job);
      completeJob(job.id);
      processed += 1;
      console.log(`Processed ${job.type} (${job.id})`);
    } catch (error) {
      failJob(job.id, error instanceof Error ? error.message : String(error));
      console.error(`Job failed ${job.type} (${job.id}): ${error?.message || error}`);
      processed += 1;
    }
  }

  console.log(
    once
      ? `Job drain finished after ${processed} processed job(s).`
      : `Worker ${workerName} stopped after ${processed} processed job(s).`
  );
} finally {
  db.close();
}
