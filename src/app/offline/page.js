export const metadata = { title: "You are offline" };

export default function OfflinePage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6 py-16">
      <div className="w-full max-w-md text-center">
        {/* Icon */}
        <div
          className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl"
          style={{
            background: "linear-gradient(135deg, rgba(212,175,55,0.12) 0%, rgba(212,175,55,0.04) 100%)",
            border: "1px solid rgba(212,175,55,0.22)",
          }}
        >
          <svg className="h-7 w-7 text-[var(--gold-text)]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M10.584 10.587a2 2 0 002.828 2.83M9.363 5.365A9 9 0 0120.49 16.49M6.228 6.228A10.451 10.451 0 003 12c0 4.556 2.917 8.453 7 9.87M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
          </svg>
        </div>

        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--gold-text)] mb-2">
          No Connection
        </p>
        <h1 className="text-xl font-bold text-foreground mb-3">
          You are offline
        </h1>
        <p className="text-sm text-muted leading-relaxed mb-8">
          Church Care OS is not reachable right now. Any data you were entering has been
          saved locally and will sync automatically when your connection returns.
        </p>

        <div className="flex flex-col items-center gap-3">
          <button
            onClick={() => typeof window !== "undefined" && window.location.reload()}
            className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all"
            style={{
              background: "linear-gradient(135deg, var(--gold-pure) 0%, var(--gold-text) 100%)",
              boxShadow: "0 2px 12px rgba(212,175,55,0.30)",
            }}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}
