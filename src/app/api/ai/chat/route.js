/**
 * POST /api/ai/chat
 *
 * Streaming agentic chat endpoint. Supports three agent personas:
 *   - care      → pastoral care queries
 *   - finance   → finance & stewardship queries
 *   - secretary → general ministry ops (default)
 *
 * Body (JSON):
 *   {
 *     messages: [{ role: "user"|"assistant", content: string }],
 *     agentType: "care" | "finance" | "secretary",
 *   }
 *
 * Returns: text/event-stream (SSE)
 *   data: { type: "delta", text: "..." }
 *   data: { type: "done" }
 *   data: { type: "error", message: "..." }
 */

import { getCurrentUser } from "@/lib/auth";
import {
  anthropic,
  CHURCH_TOOLS,
  buildSystemPrompt,
  executeTool,
} from "@/lib/ai-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_TOKENS = 1024;
const MAX_ITERATIONS = 6; // prevent runaway agentic loops

function sse(data) {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function POST(request) {
  // ── auth ────────────────────────────────────────────────────────────────────
  const user = await getCurrentUser();
  if (!user) {
    return new Response(sse({ type: "error", message: "Unauthorized" }), {
      status: 401,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-store",
      },
    });
  }

  // ── gate behind env flag ────────────────────────────────────────────────────
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(
      sse({
        type: "error",
        message:
          "AI features are not configured yet. Ask your administrator to set the ANTHROPIC_API_KEY environment variable.",
      }),
      {
        status: 503,
        headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-store" },
      }
    );
  }

  // ── parse body ──────────────────────────────────────────────────────────────
  let messages, agentType;
  try {
    const body = await request.json();
    messages = Array.isArray(body.messages) ? body.messages : [];
    agentType = ["care", "finance", "secretary", "discipleship", "infrastructure"].includes(body.agentType)
      ? body.agentType
      : "secretary";
  } catch {
    return new Response(sse({ type: "error", message: "Invalid request body" }), {
      status: 400,
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-store" },
    });
  }

  // Sanitise messages — allow only user/assistant, string content
  const cleanMessages = messages
    .filter(
      (m) =>
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim()
    )
    .slice(-20) // keep last 20 exchanges
    .map((m) => ({ role: m.role, content: m.content.trim() }));

  if (cleanMessages.length === 0 || cleanMessages[cleanMessages.length - 1].role !== "user") {
    return new Response(sse({ type: "error", message: "No user message provided" }), {
      status: 400,
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-store" },
    });
  }

  // ── build context for tools ─────────────────────────────────────────────────
  const toolContext = {
    organizationId: user.organizationId || null,
    branchId: user.branchId || null,
    organizationName: user.organizationName || "",
    branchName: user.branchName || "",
  };

  const systemPrompt = buildSystemPrompt(agentType, toolContext);

  // ── stream ──────────────────────────────────────────────────────────────────
  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();

      function write(data) {
        controller.enqueue(enc.encode(sse(data)));
      }

      function close() {
        controller.close();
      }

      try {
        let loopMessages = [...cleanMessages];
        let iteration = 0;

        while (iteration < MAX_ITERATIONS) {
          iteration++;

          // Call Claude
          const response = await anthropic.messages.create({
            model: "claude-haiku-4-5-20251001",
            max_tokens: MAX_TOKENS,
            system: systemPrompt,
            tools: CHURCH_TOOLS,
            messages: loopMessages,
          });

          // Stream text blocks
          for (const block of response.content) {
            if (block.type === "text" && block.text) {
              // Stream word by word for a natural feel
              const words = block.text.split(/(?<=\s)/);
              for (const chunk of words) {
                write({ type: "delta", text: chunk });
              }
            }
          }

          // Handle tool use
          if (response.stop_reason === "tool_use") {
            const toolUseBlocks = response.content.filter((b) => b.type === "tool_use");

            // Add assistant message with tool_use blocks
            loopMessages = [
              ...loopMessages,
              { role: "assistant", content: response.content },
            ];

            // Execute all tool calls and collect results
            const toolResults = toolUseBlocks.map((toolUse) => {
              const result = executeTool(toolUse.name, toolUse.input, toolContext);
              return {
                type: "tool_result",
                tool_use_id: toolUse.id,
                content: JSON.stringify(result),
              };
            });

            // Add tool results as user message
            loopMessages = [
              ...loopMessages,
              { role: "user", content: toolResults },
            ];

            // Continue loop to get Claude's response to tool results
            continue;
          }

          // Natural stop — we're done
          break;
        }

        write({ type: "done" });
        close();
      } catch (err) {
        console.error("[ai/chat] Error:", err);
        write({
          type: "error",
          message:
            err?.status === 401
              ? "Invalid API key. Check your ANTHROPIC_API_KEY setting."
              : err?.status === 529
              ? "Claude is overloaded right now. Try again in a moment."
              : String(err?.message || "An error occurred"),
        });
        close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-store",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
