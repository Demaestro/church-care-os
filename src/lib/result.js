/**
 * Standardized Result type for server actions.
 *
 * Every action that is called programmatically (useActionState) should
 * return one of these shapes instead of throwing or calling redirectWithError.
 *
 *   Success: { success: true,  data: <T> }
 *   Failure: { success: false, error: <ERROR_CODE>, message: <string> }
 *
 * Error codes are SCREAMING_SNAKE constants so the client can switch on them
 * without brittle string matching against human-readable messages.
 */

export function ok(data = null) {
  return { success: true, data };
}

export function err(code, message = "") {
  return { success: false, error: code, message };
}

export function isOk(result) {
  return result != null && result.success === true;
}

export function isErr(result) {
  return result != null && result.success === false;
}

/**
 * Wraps an async function so any thrown error is caught and returned as an
 * err() result instead of propagating. Useful as a last-resort safety net in
 * server actions — prefer explicit validation before reaching this point.
 *
 *   const result = await safeRun(() => expensiveOperation(input));
 */
export async function safeRun(fn) {
  try {
    const value = await fn();
    return isOk(value) || isErr(value) ? value : ok(value);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return err("INTERNAL_ERROR", message);
  }
}

// ── Common error codes ─────────────────────────────────────────────────────────
// Keep these in sync with client-side error handling where needed.

export const E = {
  VALIDATION_ERROR:    "VALIDATION_ERROR",
  NOT_FOUND:           "NOT_FOUND",
  UNAUTHORIZED:        "UNAUTHORIZED",
  FORBIDDEN:           "FORBIDDEN",
  CONFLICT:            "CONFLICT",
  IDEMPOTENT_REPLAY:   "IDEMPOTENT_REPLAY",  // request already processed
  DUPLICATE_SUBMISSION:"DUPLICATE_SUBMISSION", // in-flight duplicate blocked
  INTERNAL_ERROR:      "INTERNAL_ERROR",
  UNBALANCED_LEDGER:   "UNBALANCED_LEDGER",
  INSUFFICIENT_FUNDS:  "INSUFFICIENT_FUNDS",
};
