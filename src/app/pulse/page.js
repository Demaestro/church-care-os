import { cookies } from "next/headers";
import { requireCurrentUser } from "@/lib/auth";
import { getDatabase } from "@/lib/database";
import { getWorkspaceContext } from "@/lib/organization-store";
import { WORKSPACE_BRANCH_COOKIE } from "@/lib/workspace-scope";
import { getUserModulePermissions, requireModuleAccess } from "@/lib/permissions";

export const metadata = { title: "Pastoral Pulse" };

// ── Theme extraction from care request text ───────────────────────────────────
const THEME_PATTERNS = [
  { key: "financial",       label: "Financial hardship",     pattern: /financ|money|job|employ|rent|debt|borrow|poverty|income|salary/i },
  { key: "health",          label: "Health & wellness",      pattern: /health|sick|hospital|doctor|illness|medical|pain|cancer|surgery/i },
  { key: "marriage",        label: "Marriage & relationships",pattern: /marri|divorce|husband|wife|spouse|relation|couple|separation/i },
  { key: "grief",           label: "Grief & loss",           pattern: /grief|bereave|death|died|loss|mourn|funeral|pass away|widow/i },
  { key: "youth",           label: "Youth & children",       pattern: /youth|child|teen|school|student|kid|son|daughter|adolescen/i },
  { key: "spiritual",       label: "Spiritual growth",       pattern: /faith|prayer|spirit|doubt|church|bible|god|worship|discipleship/i },
  { key: "counseling",      label: "Counseling & mentorship",pattern: /counsel|mentor|guidance|advice|help|support|session/i },
  { key: "housing",         label: "Housing & shelter",      pattern: /hous|shelter|homeless|accommodation|rent|apartment/i },
  { key: "family",          label: "Family conflict",        pattern: /family|conflict|parent|sibling|relative|domestic|abuse/i },
  { key: "employment",      label: "Employment",             pattern: /job|work|employ|career|business|income|unemploy/i },
];

function getThemeData(orgId, branchId) {
  try {
    const db = getDatabase();
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString();

    // Fetch anonymized request data — only need, summary, created_at (no names)
    const requests = db.prepare(`
      SELECT need, summary, created_at, tone
      FROM requests
      WHERE organization_id = ?
        AND (branch_id = ? OR ? = '')
      ORDER BY created_at DESC
      LIMIT 500
    `).all(orgId, branchId, branchId);

    const thisMonthRequests = requests.filter(r => r.created_at >= thisMonth);
    const lastMonthRequests = requests.filter(r => r.created_at >= lastMonth && r.created_at <= lastMonthEnd);

    // Theme frequency counts
    const themes = THEME_PATTERNS.map(({ key, label, pattern }) => {
      const thisCount = thisMonthRequests.filter(r =>
        pattern.test(r.need + " " + (r.summary || ""))
      ).length;
      const lastCount = lastMonthRequests.filter(r =>
        pattern.test(r.need + " " + (r.summary || ""))
      ).length;
      const trend = lastCount === 0 ? null : ((thisCount - lastCount) / lastCount) * 100;
      return { key, label, thisCount, lastCount, trend };
    }).filter(t => t.thisCount > 0 || t.lastCount > 0)
      .sort((a, b) => b.thisCount - a.thisCount);

    // Tone distribution
    const tones = {};
    for (const r of thisMonthRequests) {
      tones[r.tone || "unknown"] = (tones[r.tone || "unknown"] || 0) + 1;
    }

    // Monthly volume (last 6 months)
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toISOString().slice(0, 7);
      const label = d.toLocaleString("default", { month: "short" });
      const count = requests.filter(r => r.created_at?.startsWith(key)).length;
      months.push({ key, label, count });
    }

    return {
      themes,
      tones,
      monthlyVolume: months,
      totalThisMonth: thisMonthRequests.length,
      totalLastMonth: lastMonthRequests.length,
      totalAll: requests.length,
    };
  } catch { return { themes: [], tones: {}, monthlyVolume: [], totalThisMonth: 0, totalLastMonth: 0, totalAll: 0 }; }
}

function getDiscipleshipPulse(orgId, branchId) {
  try {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT stage, COUNT(*) AS cnt
      FROM discipleship_records
      WHERE organization_id = ? AND (branch_id = ? OR ? = '')
      GROUP BY stage
    `).all(orgId, branchId, branchId);
    return Object.fromEntries(rows.map(r => [r.stage, r.cnt]));
  } catch { return {}; }
}

function getAttendancePulse(orgId, branchId) {
  try {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT s.service_date, COUNT(ae.id) AS headcount
      FROM services s
      LEFT JOIN attendance_events ae ON ae.service_id = s.id
      WHERE s.organization_id = ?
        AND (s.branch_id = ? OR ? = '')
      GROUP BY s.id, s.service_date
      ORDER BY s.service_date DESC
      LIMIT 8
    `).all(orgId, branchId, branchId);
    return rows.reverse();
  } catch { return []; }
}

function trendColor(trend) {
  if (trend === null) return "text-muted";
  if (trend > 20) return "text-red-600";
  if (trend > 0) return "text-amber-600";
  return "text-green-600";
}

function trendArrow(trend) {
  if (trend === null) return "—";
  return trend > 0 ? `↑ ${Math.abs(trend).toFixed(0)}%` : `↓ ${Math.abs(trend).toFixed(0)}%`;
}

export default async function PulsePage() {
  const user = await requireCurrentUser(["pastor", "owner"]);
  const permissions = getUserModulePermissions(user);
  requireModuleAccess(permissions, "care", "lead");

  const cookieStore = await cookies();
  const workspace = getWorkspaceContext(user, cookieStore.get(WORKSPACE_BRANCH_COOKIE)?.value || "");
  const branchId = workspace.activeBranch?.id || user.branchId || "";
  const orgId = user.organizationId;

  const themeData = getThemeData(orgId, branchId);
  const discipleshipData = getDiscipleshipPulse(orgId, branchId);
  const attendance = getAttendancePulse(orgId, branchId);

  const topTheme = themeData.themes[0];
  const volumeChange = themeData.totalLastMonth === 0
    ? null
    : ((themeData.totalThisMonth - themeData.totalLastMonth) / themeData.totalLastMonth) * 100;

  const maxAttendance = Math.max(...attendance.map(a => a.headcount), 1);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 space-y-10">

      {/* Header */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--gold-text)]">
          Pastoral Intelligence
        </p>
        <h1 className="mt-1 text-2xl font-bold text-foreground">Congregational Pulse</h1>
        <p className="mt-1 text-sm text-muted">
          Anonymous theme analysis from ministry support requests — no names, no identifiers.
        </p>
      </div>

      {/* Privacy notice */}
      <div
        className="flex items-start gap-3 rounded-xl p-4 text-sm"
        style={{
          background: "rgba(212,175,55,0.06)",
          border: "1px solid rgba(212,175,55,0.15)",
        }}
      >
        <svg className="h-4 w-4 shrink-0 mt-0.5 text-[var(--gold-text)]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
        <div>
          <strong className="text-foreground">Privacy protected.</strong>{" "}
          This dashboard shows anonymized themes and counts only. No individual names, prayer requests, or
          personal details are displayed. Data is used exclusively to help you understand congregational needs
          and tailor your pastoral response.
        </div>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[var(--line)] bg-paper p-5 shadow-[var(--shadow-sm)]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted mb-1">This month</p>
          <p className="text-3xl font-bold text-foreground">{themeData.totalThisMonth}</p>
          <p className="text-xs text-muted mt-1">support requests</p>
          {volumeChange !== null && (
            <p className={`mt-2 text-xs font-medium ${trendColor(volumeChange)}`}>
              {trendArrow(volumeChange)} vs last month
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-[var(--line)] bg-paper p-5 shadow-[var(--shadow-sm)]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted mb-1">Top concern</p>
          {topTheme ? (
            <>
              <p className="text-lg font-bold text-foreground leading-tight">{topTheme.label}</p>
              <p className="text-xs text-muted mt-1">{topTheme.thisCount} requests this month</p>
              {topTheme.trend !== null && (
                <p className={`mt-2 text-xs font-medium ${trendColor(topTheme.trend)}`}>
                  {trendArrow(topTheme.trend)} vs last month
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted">No data yet</p>
          )}
        </div>

        <div className="rounded-2xl border border-[var(--line)] bg-paper p-5 shadow-[var(--shadow-sm)]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted mb-1">Sermon insight</p>
          {topTheme ? (
            <p className="text-sm text-foreground leading-relaxed">
              Your congregation is currently most concerned about{" "}
              <strong>{topTheme.label.toLowerCase()}</strong>.
              {topTheme.trend !== null && topTheme.trend > 15
                ? " This is rising — consider addressing it soon."
                : " Consider weaving this into upcoming messages."}
            </p>
          ) : (
            <p className="text-sm text-muted">Log care requests to see insights here.</p>
          )}
        </div>
      </div>

      {/* Theme breakdown */}
      {themeData.themes.length > 0 && (
        <section>
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-muted">Theme breakdown — this month</h2>
          <div className="rounded-2xl border border-[var(--line)] bg-paper shadow-[var(--shadow-sm)] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--line)] bg-[rgba(18,18,18,0.02)]">
                  <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">Theme</th>
                  <th className="px-5 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">This month</th>
                  <th className="px-5 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.18em] text-muted hidden sm:table-cell">Last month</th>
                  <th className="px-5 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">Trend</th>
                  <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-muted hidden md:table-cell">Volume bar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {themeData.themes.map(theme => {
                  const maxCount = Math.max(...themeData.themes.map(t => t.thisCount), 1);
                  const pct = (theme.thisCount / maxCount) * 100;
                  return (
                    <tr key={theme.key} className="hover:bg-[rgba(18,18,18,0.02)] transition-colors">
                      <td className="px-5 py-3 font-medium text-foreground">{theme.label}</td>
                      <td className="px-5 py-3 text-right font-bold text-foreground">{theme.thisCount}</td>
                      <td className="px-5 py-3 text-right text-muted hidden sm:table-cell">{theme.lastCount}</td>
                      <td className={`px-5 py-3 text-right text-xs font-medium ${trendColor(theme.trend)}`}>
                        {trendArrow(theme.trend)}
                      </td>
                      <td className="px-5 py-3 hidden md:table-cell">
                        <div className="h-2 w-full rounded-full bg-[rgba(18,18,18,0.06)]">
                          <div
                            className="h-2 rounded-full transition-all"
                            style={{
                              width: `${pct}%`,
                              background: "linear-gradient(90deg, var(--gold-pure), var(--gold-text))",
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Attendance trend */}
      {attendance.length > 0 && (
        <section>
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-muted">Attendance trend (last 8 services)</h2>
          <div className="rounded-2xl border border-[var(--line)] bg-paper p-6 shadow-[var(--shadow-sm)]">
            <div className="flex items-end gap-2 h-28">
              {attendance.map((a, i) => {
                const pct = Math.max((a.headcount / maxAttendance) * 100, 4);
                return (
                  <div key={i} className="flex flex-col items-center gap-1 flex-1">
                    <span className="text-[9px] text-muted">{a.headcount}</span>
                    <div
                      className="w-full rounded-t-lg transition-all"
                      style={{
                        height: `${pct}%`,
                        background: i === attendance.length - 1
                          ? "linear-gradient(180deg, var(--gold-pure), var(--gold-text))"
                          : "rgba(212,175,55,0.25)",
                      }}
                    />
                    <span className="text-[9px] text-muted truncate w-full text-center">
                      {a.service_date?.slice(5, 10) || ""}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Discipleship pipeline */}
      {Object.keys(discipleshipData).length > 0 && (
        <section>
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-muted">Discipleship pipeline</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            {[
              { key: "new_believer", label: "New Believer",    color: "bg-blue-100 text-blue-800" },
              { key: "foundation",   label: "Foundation",      color: "bg-amber-100 text-amber-800" },
              { key: "growing",      label: "Growing",         color: "bg-purple-100 text-purple-800" },
              { key: "serving",      label: "Serving",         color: "bg-green-100 text-green-800" },
              { key: "mentoring",    label: "Mentoring",       color: "bg-[rgba(212,175,55,0.15)] text-[var(--gold-text)]" },
            ].map(stage => (
              <div key={stage.key} className={`rounded-xl p-4 ${stage.color}`}>
                <p className="text-2xl font-bold">{discipleshipData[stage.key] || 0}</p>
                <p className="mt-0.5 text-[11px] font-medium">{stage.label}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* AI Shepherd prompt */}
      <div
        className="rounded-2xl p-5 text-sm"
        style={{
          background: "linear-gradient(135deg, rgba(212,175,55,0.07) 0%, rgba(212,175,55,0.02) 100%)",
          border: "1px solid rgba(212,175,55,0.15)",
        }}
      >
        <div className="flex items-start gap-3">
          <svg className="h-4 w-4 shrink-0 mt-0.5 text-[var(--gold-text)]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
          <div>
            <p className="font-semibold text-foreground mb-1">Ask AI Shepherd for deeper analysis</p>
            <p className="text-muted text-[13px]">
              Open the AI Shepherd panel and ask: <em>"Summarize the top congregational needs this month and suggest three sermon themes."</em>
              The Shepherd can cross-reference request themes, discipleship stages, and attendance to give you a holistic pastoral picture.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
