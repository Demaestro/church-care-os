"use client";

import { useEffect, useRef, useState } from "react";

const AGENT_LABELS = {
  care: "Care Agent",
  finance: "Finance Auditor",
  secretary: "Church Secretary",
};

const AGENT_HINTS = {
  care: [
    "Who hasn't attended in 30 days?",
    "List open care requests",
    "Find members who need a pastoral visit",
  ],
  finance: [
    "What's our current financial position?",
    "Show me fund activity",
    "Are there any anomalies in our ledger?",
  ],
  secretary: [
    "How many members do we have?",
    "What's our average attendance?",
    "Summarise this week's priorities",
  ],
};

export default function AiChatPanel({ agentType = "secretary", initialOpen = false }) {
  const [open, setOpen] = useState(initialOpen);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const abortRef = useRef(null);

  const label = AGENT_LABELS[agentType] || "AI Assistant";
  const hints = AGENT_HINTS[agentType] || AGENT_HINTS.secretary;

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  function handleHint(hint) {
    setInput(hint);
    inputRef.current?.focus();
  }

  async function sendMessage(e) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || streaming) return;

    setInput("");
    setError(null);

    const newMessages = [...messages, { role: "user", content: text }];
    setMessages(newMessages);

    // Optimistically add assistant placeholder
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, agentType }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;

          let event;
          try {
            event = JSON.parse(raw);
          } catch {
            continue;
          }

          if (event.type === "delta") {
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last?.role === "assistant") {
                updated[updated.length - 1] = {
                  ...last,
                  content: last.content + event.text,
                };
              }
              return updated;
            });
          } else if (event.type === "error") {
            setError(event.message);
            setMessages((prev) => prev.slice(0, -1)); // remove empty assistant bubble
          } else if (event.type === "done") {
            // Streaming complete
          }
        }
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        setError("Connection error. Please try again.");
        setMessages((prev) => {
          // Remove empty assistant bubble if present
          const last = prev[prev.length - 1];
          if (last?.role === "assistant" && !last.content) return prev.slice(0, -1);
          return prev;
        });
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  function handleStop() {
    abortRef.current?.abort();
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function clearChat() {
    setMessages([]);
    setError(null);
  }

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={`Open ${label}`}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full border border-[var(--soft-accent-border)] bg-foreground text-paper shadow-lg transition hover:bg-[#2b251f] focus:outline-none"
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        )}
      </button>

      {/* Panel */}
      {open ? (
        <div className="fixed bottom-24 right-6 z-40 flex w-[min(420px,calc(100vw-3rem))] flex-col overflow-hidden rounded-[1.5rem] border border-line bg-paper shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-line bg-canvas px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--soft-accent-border)] bg-[var(--soft-fill)] text-moss">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
                </svg>
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">{label}</p>
                <p className="text-[10px] text-muted">AI · Live church data</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {messages.length > 0 ? (
                <button
                  onClick={clearChat}
                  className="rounded-md px-2 py-1 text-xs text-muted transition hover:bg-paper hover:text-foreground"
                >
                  Clear
                </button>
              ) : null}
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="rounded-md p-1 text-muted transition hover:text-foreground"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex max-h-[420px] min-h-[200px] flex-col gap-3 overflow-y-auto px-4 py-4">
            {messages.length === 0 ? (
              <div className="flex flex-col gap-3">
                <p className="text-center text-xs text-muted">
                  Ask me anything about your church data.
                </p>
                <div className="flex flex-col gap-2">
                  {hints.map((hint) => (
                    <button
                      key={hint}
                      onClick={() => handleHint(hint)}
                      className="rounded-[1rem] border border-line bg-canvas px-4 py-2.5 text-left text-xs text-muted transition hover:bg-paper hover:text-foreground"
                    >
                      {hint}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, i) => (
                <MessageBubble key={i} message={msg} />
              ))
            )}
            {error ? (
              <div className="rounded-[0.9rem] border border-[rgba(220,38,38,0.25)] bg-[rgba(220,38,38,0.06)] px-4 py-3 text-xs text-clay">
                {error}
              </div>
            ) : null}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form onSubmit={sendMessage} className="border-t border-line bg-canvas p-3">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Ask ${label}…`}
                rows={1}
                disabled={streaming}
                className="flex-1 resize-none rounded-[1rem] border border-line bg-paper px-4 py-3 text-sm text-foreground outline-none focus:border-moss disabled:opacity-50"
                style={{ minHeight: "44px", maxHeight: "120px" }}
                onInput={(e) => {
                  e.target.style.height = "auto";
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                }}
              />
              {streaming ? (
                <button
                  type="button"
                  onClick={handleStop}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line bg-paper text-muted transition hover:bg-paper hover:text-foreground"
                  aria-label="Stop"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="4" y="4" width="16" height="16" rx="2"/>
                  </svg>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-foreground text-paper transition hover:bg-[#2b251f] disabled:opacity-40"
                  aria-label="Send"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="19" x2="12" y2="5"/>
                    <polyline points="5 12 12 5 19 12"/>
                  </svg>
                </button>
              )}
            </div>
            <p className="mt-2 px-1 text-[10px] text-muted">
              Enter to send · Shift+Enter for new line · Powered by Claude
            </p>
          </form>
        </div>
      ) : null}
    </>
  );
}

function MessageBubble({ message }) {
  const isUser = message.role === "user";
  const isEmpty = !message.content;

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-[1.1rem] px-4 py-3 text-sm ${
          isUser
            ? "bg-foreground text-paper"
            : "border border-line bg-canvas text-foreground"
        }`}
      >
        {isEmpty ? (
          <TypingIndicator />
        ) : (
          <MessageContent content={message.content} isUser={isUser} />
        )}
      </div>
    </div>
  );
}

function MessageContent({ content, isUser }) {
  // Simple markdown-like rendering for assistant messages
  if (isUser) {
    return <p className="whitespace-pre-wrap">{content}</p>;
  }

  // Split on double newlines for paragraphs, handle bold, bullets
  const lines = content.split("\n");
  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        if (line.startsWith("### ")) {
          return (
            <p key={i} className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
              {line.slice(4)}
            </p>
          );
        }
        if (line.startsWith("## ")) {
          return <p key={i} className="font-semibold">{line.slice(3)}</p>;
        }
        if (line.startsWith("**") && line.endsWith("**")) {
          return <p key={i} className="font-semibold">{line.slice(2, -2)}</p>;
        }
        if (line.startsWith("- ") || line.startsWith("• ")) {
          return (
            <p key={i} className="flex gap-2">
              <span className="mt-[0.35em] h-1.5 w-1.5 shrink-0 rounded-full bg-muted" />
              <span>{renderInlineBold(line.slice(2))}</span>
            </p>
          );
        }
        if (line.trim() === "") return <div key={i} className="h-1" />;
        return <p key={i} className="whitespace-pre-wrap">{renderInlineBold(line)}</p>;
      })}
    </div>
  );
}

function renderInlineBold(text) {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  if (parts.length === 1) return text;
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i}>{part}</strong> : part
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-1 py-0.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-muted"
          style={{
            animation: "pulse 1.2s ease-in-out infinite",
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}
    </div>
  );
}
