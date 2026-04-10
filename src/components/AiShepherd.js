"use client";

import { useState, useRef, useEffect } from "react";

const AGENT_TABS = [
  { key: "secretary", label: "Secretary", hint: "Ministry summaries, attendance insights" },
  { key: "care",      label: "Care",      hint: "Member care, lapsed follow-ups" },
  { key: "finance",   label: "Finance",   hint: "Ledger queries, pledge status" },
];

const QUICK_PROMPTS = {
  secretary: [
    "Summarise last Sunday",
    "Who hasn't been seen in 2 weeks?",
    "Give me a ministry snapshot",
  ],
  care: [
    "Who needs follow-up today?",
    "List lapsed members",
    "Any open care requests?",
  ],
  finance: [
    "What's our net position?",
    "Show fund activity this month",
    "Active pledges summary",
  ],
};

export default function AiShepherd({ stats }) {
  const [activeTab, setActiveTab] = useState("secretary");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const abortRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamText]);

  async function send(text) {
    const query = text || input.trim();
    if (!query || streaming) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: query }]);
    setStreaming(true);
    setStreamText("");

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: query, agentType: activeTab }),
        signal: ctrl.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: err.error || "Service unavailable." },
        ]);
        return;
      }

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop();
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const raw = line.slice(6);
            if (raw === "[DONE]") continue;
            try {
              const { text } = JSON.parse(raw);
              if (text) setStreamText((p) => p + text);
            } catch {}
          }
        }
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: streamText || "Done." },
      ]);
    } catch (e) {
      if (e.name !== "AbortError") {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Could not reach AI service." },
        ]);
      }
    } finally {
      setStreaming(false);
      setStreamText("");
    }
  }

  function stop() {
    abortRef.current?.abort();
    setStreaming(false);
    if (streamText) {
      setMessages((prev) => [...prev, { role: "assistant", content: streamText }]);
      setStreamText("");
    }
  }

  const tabHint = AGENT_TABS.find((t) => t.key === activeTab)?.hint;

  return (
    <aside className="ai-sidebar glass-sidebar-right flex flex-col border-l border-[var(--line-strong)]">
      {/* Header */}
      <div className="px-4 pt-5 pb-3 border-b border-[var(--line-strong)]">
        <div className="flex items-center gap-2 mb-3">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[10px] font-bold text-white shrink-0"
            style={{
              background: "linear-gradient(135deg, var(--gold-pure) 0%, #c9a227 100%)",
              boxShadow: "0 2px 8px rgba(212,175,55,0.3)",
            }}
          >
            AI
          </span>
          <div>
            <p className="text-[12px] font-semibold text-foreground leading-none">AI Shepherd</p>
            <p className="text-[10px] text-muted mt-0.5">Ministry intelligence</p>
          </div>
        </div>

        {/* Agent tabs */}
        <div className="flex gap-1 rounded-[0.7rem] bg-[var(--subsurface)] p-1">
          {AGENT_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setMessages([]); setStreamText(""); }}
              className={`flex-1 rounded-[0.55rem] py-1 text-[10px] font-semibold transition-all ${
                activeTab === tab.key
                  ? "bg-white text-foreground shadow-[0_1px_3px_rgba(18,18,18,0.10)]"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {tabHint && (
          <p className="mt-2 text-[9px] text-muted leading-tight">{tabHint}</p>
        )}
      </div>

      {/* Quick stats */}
      {stats && (
        <div className="px-4 py-3 border-b border-[var(--line-strong)] grid grid-cols-2 gap-2">
          {stats.members !== undefined && (
            <StatChip label="Members" value={stats.members} />
          )}
          {stats.services !== undefined && (
            <StatChip label="Services" value={stats.services} />
          )}
          {stats.openCare !== undefined && (
            <StatChip label="Open care" value={stats.openCare} />
          )}
          {stats.activePledges !== undefined && (
            <StatChip label="Pledges" value={stats.activePledges} />
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && !streaming && (
          <div>
            <p className="text-[11px] text-muted mb-3">Quick prompts:</p>
            <div className="space-y-1.5">
              {QUICK_PROMPTS[activeTab].map((p) => (
                <button
                  key={p}
                  onClick={() => send(p)}
                  className="w-full rounded-[0.7rem] border border-line bg-canvas px-3 py-2 text-left text-[11px] text-muted transition hover:border-[var(--gold-text)] hover:text-foreground hover:bg-[rgba(212,175,55,0.04)]"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-[0.9rem] px-3 py-2 text-[11px] leading-relaxed ${
                m.role === "user"
                  ? "bg-[var(--charcoal)] text-white"
                  : "border border-line bg-canvas text-foreground"
              }`}
            >
              <MarkdownText text={m.content} />
            </div>
          </div>
        ))}

        {streaming && streamText && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-[0.9rem] border border-[rgba(212,175,55,0.25)] bg-[rgba(212,175,55,0.04)] px-3 py-2 text-[11px] leading-relaxed text-foreground">
              <MarkdownText text={streamText} />
              <span className="ml-0.5 inline-block h-3 w-0.5 animate-pulse bg-[var(--gold-text)] align-middle" />
            </div>
          </div>
        )}

        {streaming && !streamText && (
          <div className="flex justify-start">
            <div className="rounded-[0.9rem] border border-line bg-canvas px-3 py-2">
              <span className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-1.5 w-1.5 rounded-full bg-muted animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-[var(--line-strong)] px-3 py-3">
        <form
          onSubmit={(e) => { e.preventDefault(); send(); }}
          className="flex items-end gap-2"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Ask the Shepherd…"
            rows={2}
            disabled={streaming}
            className="flex-1 resize-none rounded-[0.8rem] border border-line bg-canvas px-3 py-2 text-[11px] text-foreground placeholder:text-muted focus:border-[var(--gold-text)] focus:outline-none focus:ring-1 focus:ring-[rgba(212,175,55,0.3)] disabled:opacity-50 transition"
          />
          {streaming ? (
            <button
              type="button"
              onClick={stop}
              className="shrink-0 flex h-8 w-8 items-center justify-center rounded-[0.7rem] border border-[rgba(220,38,38,0.3)] bg-[rgba(220,38,38,0.06)] text-[var(--error)] transition hover:bg-[rgba(220,38,38,0.12)]"
            >
              <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" rx="1" />
              </svg>
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="shrink-0 flex h-8 w-8 items-center justify-center rounded-[0.7rem] bg-[var(--charcoal)] text-white transition hover:bg-[var(--gold-text)] disabled:opacity-30"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </button>
          )}
        </form>
      </div>
    </aside>
  );
}

function StatChip({ label, value }) {
  return (
    <div className="rounded-[0.6rem] border border-line bg-canvas px-2.5 py-2">
      <p className="text-[9px] uppercase tracking-[0.14em] text-muted leading-none">{label}</p>
      <p className="mt-1 text-[15px] font-semibold text-foreground [font-family:var(--font-display)] leading-none">
        {value}
      </p>
    </div>
  );
}

function MarkdownText({ text }) {
  const lines = String(text || "").split("\n");
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (line.startsWith("### ")) return <p key={i} className="font-semibold">{line.slice(4)}</p>;
        if (line.startsWith("## "))  return <p key={i} className="font-semibold">{line.slice(3)}</p>;
        if (line.startsWith("# "))   return <p key={i} className="font-semibold">{line.slice(2)}</p>;
        if (line.startsWith("- ") || line.startsWith("* ")) {
          return <p key={i} className="flex gap-1.5"><span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-current opacity-50" /><span>{line.slice(2)}</span></p>;
        }
        if (!line.trim()) return <div key={i} className="h-1" />;
        return <p key={i}>{line}</p>;
      })}
    </div>
  );
}
