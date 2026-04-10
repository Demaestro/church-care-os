"use client";

/**
 * Pure SVG/CSS finance charts — no external charting library.
 * Renders server-side compatible (no window/document refs at module level).
 * Optimised for slow networks: no JS bundle cost, instant first paint.
 */

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatNaira(n) {
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `₦${(n / 1_000).toFixed(0)}K`;
  return `₦${n.toLocaleString()}`;
}

function shortMonth(ym) {
  // "2025-03" → "Mar"
  if (!ym || !ym.includes("-")) return ym;
  const [year, month] = ym.split("-");
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleString("en", { month: "short" }) + " " + String(year).slice(2);
}

// Gold palette for donut segments
const FUND_COLORS = [
  "#D4AF37", "#B8962E", "#E8CC6A", "#8C6D1F",
  "#F5E39A", "#6B4F10", "#C9A227", "#A07B20",
];

// ── Fund Health Donut ──────────────────────────────────────────────────────────

export function FundHealthDonut({ funds = [] }) {
  if (!funds.length) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted">
        No fund data yet
      </div>
    );
  }

  const SIZE = 160;
  const STROKE = 24;
  const R = (SIZE - STROKE) / 2;
  const CX = SIZE / 2;
  const CY = SIZE / 2;
  const CIRCUMFERENCE = 2 * Math.PI * R;

  let offset = 0;
  const segments = funds.map((f, i) => {
    const dash = (f.pct / 100) * CIRCUMFERENCE;
    const gap  = CIRCUMFERENCE - dash;
    const seg  = { ...f, dash, gap, offset, color: FUND_COLORS[i % FUND_COLORS.length] };
    offset += dash;
    return seg;
  });

  const total = funds.reduce((s, f) => s + f.balance, 0);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} className="-rotate-90" style={{ transform: "rotate(-90deg)" }}>
          {/* Track */}
          <circle
            cx={CX} cy={CY} r={R}
            fill="none"
            stroke="var(--line)"
            strokeWidth={STROKE}
          />
          {segments.map((seg) => (
            <circle
              key={seg.id}
              cx={CX} cy={CY} r={R}
              fill="none"
              stroke={seg.color}
              strokeWidth={STROKE}
              strokeDasharray={`${seg.dash} ${seg.gap}`}
              strokeDashoffset={-seg.offset}
              strokeLinecap="butt"
            />
          ))}
        </svg>
        {/* Centre label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs text-muted">Total</span>
          <span className="text-sm font-semibold text-foreground">{formatNaira(total)}</span>
        </div>
      </div>

      {/* Legend */}
      <div className="w-full space-y-1.5">
        {funds.map((f, i) => (
          <div key={f.id} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                style={{ background: FUND_COLORS[i % FUND_COLORS.length] }}
              />
              <span className="text-foreground truncate max-w-[120px]">{f.name}</span>
            </div>
            <span className="text-muted font-medium tabular-nums">{f.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Giving Pulse Histogram ─────────────────────────────────────────────────────

export function GivingPulseHistogram({ data = [] }) {
  if (!data.length) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted">
        No giving data yet
      </div>
    );
  }

  const W = 520;
  const H = 140;
  const PAD = { top: 12, right: 8, bottom: 28, left: 48 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const maxVal = Math.max(...data.map(d => Math.max(d.income, d.expense)), 1);
  const barPairW = chartW / data.length;
  const barW = Math.max((barPairW - 6) / 2, 4);

  const yScale = (v) => chartH - (v / maxVal) * chartH;

  // Y-axis gridlines
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(t => ({
    y: yScale(t * maxVal),
    label: formatNaira(t * maxVal),
  }));

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ minWidth: 280, maxHeight: 160 }}
      >
        <g transform={`translate(${PAD.left},${PAD.top})`}>
          {/* Grid lines */}
          {yTicks.map((t, i) => (
            <g key={i}>
              <line x1={0} y1={t.y} x2={chartW} y2={t.y} stroke="var(--line)" strokeWidth={0.5} />
              <text x={-6} y={t.y + 4} textAnchor="end" fontSize={9} fill="var(--muted)">
                {t.label}
              </text>
            </g>
          ))}

          {/* Bars */}
          {data.map((d, i) => {
            const x = i * barPairW + 3;
            const incH = (d.income / maxVal) * chartH;
            const expH = (d.expense / maxVal) * chartH;
            return (
              <g key={d.month}>
                {/* Income bar (gold) */}
                <rect
                  x={x}
                  y={chartH - incH}
                  width={barW}
                  height={incH}
                  fill="#D4AF37"
                  rx={2}
                  opacity={0.9}
                >
                  <title>{shortMonth(d.month)} Income: {formatNaira(d.income)}</title>
                </rect>
                {/* Expense bar (muted red) */}
                <rect
                  x={x + barW + 2}
                  y={chartH - expH}
                  width={barW}
                  height={expH}
                  fill="#dc6358"
                  rx={2}
                  opacity={0.7}
                >
                  <title>{shortMonth(d.month)} Expense: {formatNaira(d.expense)}</title>
                </rect>
                {/* Month label */}
                <text
                  x={x + barW + 1}
                  y={chartH + 12}
                  textAnchor="middle"
                  fontSize={8}
                  fill="var(--muted)"
                >
                  {shortMonth(d.month)}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* Legend */}
      <div className="mt-1 flex items-center gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-4 rounded-sm inline-block" style={{ background: "#D4AF37" }} />
          Income
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-4 rounded-sm inline-block" style={{ background: "#dc6358", opacity: 0.8 }} />
          Expense
        </span>
      </div>
    </div>
  );
}

// ── Pending Approvals Banner ───────────────────────────────────────────────────

export function PendingApprovalsBanner({ approvals = [], currentUserId }) {
  if (!approvals.length) return null;

  return (
    <div className="mb-6 rounded-xl border border-amber-200/40 bg-amber-50/30 dark:border-amber-400/20 dark:bg-amber-950/20 p-4">
      <div className="flex items-start gap-3">
        <span className="text-2xl" aria-hidden>⚠️</span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
            {approvals.length} transaction{approvals.length > 1 ? "s" : ""} awaiting multi-signature approval
          </p>
          <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-400">
            Transactions above ₦100,000 require two lead approvals before posting.
          </p>
          <div className="mt-3 space-y-2">
            {approvals.map(a => {
              const myApproval = a.approvals.some(ap => ap.userId === currentUserId);
              const count = a.approvals.length;
              return (
                <div key={a.id} className="flex items-center justify-between rounded-lg bg-white/60 dark:bg-white/5 px-3 py-2">
                  <div>
                    <p className="text-xs font-medium text-foreground">{a.memo}</p>
                    <p className="text-[11px] text-muted">
                      {formatNaira(a.amount)} · Requested by {a.requestedByName} · {count}/{a.requiredApprovals} approved
                    </p>
                  </div>
                  {!myApproval ? (
                    <form action={`/api/finance/approve`} method="POST">
                      <input type="hidden" name="approvalId" value={a.id} />
                      <button
                        type="submit"
                        className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
                        style={{ background: "linear-gradient(135deg, var(--gold-pure), var(--gold-text))" }}
                      >
                        Approve
                      </button>
                    </form>
                  ) : (
                    <span className="text-xs text-green-600 font-medium">✓ You approved</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
