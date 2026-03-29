import path from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

describe("message service", () => {
  let tempDir = "";

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "church-care-os-message-test-"));
    process.env.CARE_DB_PATH = path.join(tempDir, "care.db");
    process.env.NODE_ENV = "test";
    process.env.APP_BASE_URL = "http://localhost:3000";
    vi.resetModules();
  });

  afterEach(async () => {
    const database = await import("@/lib/database");
    database.closeDatabase();
    delete process.env.CARE_DB_PATH;
    delete process.env.NODE_ENV;
    delete process.env.APP_BASE_URL;
    await rm(tempDir, { recursive: true, force: true });
  });

  test("logs outbound messages in log-only mode", async () => {
    const { sendMessageToPhone, listMessageOutbox, getMessageDeliverySnapshot } =
      await import("@/lib/message-service");

    const result = await sendMessageToPhone(
      "+2348012345678",
      "sms",
      "test-message",
      {
        deliveryMode: "log-only",
        provider: "twilio",
        note: "Testing message outbox",
      },
      {
        recipientName: "Maestro",
        metadata: {
          test: true,
        },
      }
    );

    expect(result.status).toBe("logged");

    const outbox = listMessageOutbox(5);
    expect(outbox).toHaveLength(1);
    expect(outbox[0].recipientPhone).toBe("+2348012345678");
    expect(outbox[0].status).toBe("logged");
    expect(outbox[0].channel).toBe("sms");

    const snapshot = getMessageDeliverySnapshot();
    expect(snapshot.loggedCount).toBe(1);
    expect(snapshot.sentCount).toBe(0);
  });

  test("skips delivery when the phone number is invalid", async () => {
    const { sendMessageToPhone, listMessageOutbox } = await import("@/lib/message-service");

    const result = await sendMessageToPhone(
      "08012345678",
      "whatsapp",
      "test-message",
      {
        deliveryMode: "log-only",
        provider: "twilio",
      }
    );

    expect(result.status).toBe("skipped");
    expect(listMessageOutbox(5)[0]?.status).toBe("skipped");
  });
});
