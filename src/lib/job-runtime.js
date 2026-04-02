import "server-only";

import { deliverViaResend } from "@/lib/email-service";
import { getDatabase, parseJson, serializeJson } from "@/lib/database";
import {
  claimNextJob,
  completeJob,
  failJob,
} from "@/lib/job-store";
import { deliverViaTwilio } from "@/lib/message-service";
import { getEffectiveChurchSettings } from "@/lib/organization-store";

function updateEmailOutbox(outboxId, patch) {
  getDatabase()
    .prepare(`
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
    `)
    .run(
      patch.status,
      patch.provider,
      patch.providerMessageId || null,
      serializeJson(patch.providerResponse || {}),
      patch.errorMessage || null,
      patch.attemptedAt || null,
      patch.sentAt || null,
      outboxId
    );
}

function updateMessageOutbox(outboxId, patch) {
  getDatabase()
    .prepare(`
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
    `)
    .run(
      patch.status,
      patch.provider,
      patch.providerMessageId || null,
      serializeJson(patch.providerResponse || {}),
      patch.errorMessage || null,
      patch.attemptedAt || null,
      patch.sentAt || null,
      outboxId
    );
}

async function processEmailJob(payload) {
  const row = getDatabase()
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
  const row = getDatabase()
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

async function processQueuedJob(job) {
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

export async function drainQueuedJobs({
  queue = "delivery",
  limit = 25,
  workerName = `serverless-${Date.now()}`,
} = {}) {
  const jobs = [];
  let processedCount = 0;
  let successCount = 0;
  let failedCount = 0;

  while (processedCount < limit) {
    const job = claimNextJob(queue, workerName);
    if (!job) {
      break;
    }

    try {
      await processQueuedJob(job);
      completeJob(job.id);
      successCount += 1;
      jobs.push({
        id: job.id,
        type: job.type,
        status: "completed",
      });
    } catch (error) {
      failJob(job.id, error instanceof Error ? error.message : String(error));
      failedCount += 1;
      jobs.push({
        id: job.id,
        type: job.type,
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
      });
    }

    processedCount += 1;
  }

  return {
    queue,
    workerName,
    processedCount,
    successCount,
    failedCount,
    jobs,
  };
}
