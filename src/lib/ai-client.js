import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { getDatabase } from "@/lib/database";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

export { anthropic };

// ── Tool definitions ─────────────────────────────────────────────────────────

export const CHURCH_TOOLS = [
  {
    name: "search_members",
    description:
      "Search the church member directory. Returns names, contact info, member type, and last attendance date.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Name, email, or phone to search for",
        },
        member_type: {
          type: "string",
          description:
            "Filter by member type: member, regular_attendee, new_convert, first_timer, transfer, inactive",
        },
        limit: {
          type: "number",
          description: "Maximum results to return (default 10)",
        },
      },
      required: [],
    },
  },
  {
    name: "get_attendance_summary",
    description:
      "Get attendance statistics for recent services, including total check-ins, averages, and trend data.",
    input_schema: {
      type: "object",
      properties: {
        last_n_services: {
          type: "number",
          description: "Number of most recent services to include (default 10)",
        },
      },
      required: [],
    },
  },
  {
    name: "get_lapsed_members",
    description:
      "Find members who haven't attended services in a given number of days. Useful for pastoral follow-up.",
    input_schema: {
      type: "object",
      properties: {
        days_since: {
          type: "number",
          description: "Number of days of absence to flag (default 30)",
        },
        limit: {
          type: "number",
          description: "Maximum results (default 15)",
        },
      },
      required: [],
    },
  },
  {
    name: "get_finance_summary",
    description:
      "Get a financial summary including income, expenses, net position, and per-fund activity.",
    input_schema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "get_open_care_requests",
    description:
      "List open pastoral care requests with their status, risk level, and days since last activity.",
    input_schema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Maximum results (default 10)",
        },
      },
      required: [],
    },
  },
  {
    name: "get_member_profile",
    description:
      "Get detailed profile for a specific member, including spiritual milestones, attendance history, groups, and pledges.",
    input_schema: {
      type: "object",
      properties: {
        member_id: {
          type: "string",
          description: "The member's UUID",
        },
      },
      required: ["member_id"],
    },
  },
  {
    name: "get_discipleship_report",
    description:
      "Get a discipleship pathway report: stage distribution, members stuck at a stage for too long, milestone completion rates, and members who need pastoral attention.",
    input_schema: {
      type: "object",
      properties: {
        stuck_days_threshold: {
          type: "number",
          description: "Days without progress to flag as stuck (default 90)",
        },
        stage: {
          type: "string",
          description: "Filter to a specific stage: new_believer, foundation, growing, serving, mentoring",
        },
      },
      required: [],
    },
  },
  {
    name: "get_infrastructure_report",
    description:
      "Get a church infrastructure and utility report: recent diesel/generator logs, upcoming events that need resources, and asset checkout status. Useful for predicting resource needs.",
    input_schema: {
      type: "object",
      properties: {
        utility_type: {
          type: "string",
          description: "Filter by utility type: generator, diesel, water, electricity (optional)",
        },
        forecast_days: {
          type: "number",
          description: "Number of days ahead to check for upcoming events (default 30)",
        },
      },
      required: [],
    },
  },
  {
    name: "get_congregational_pulse",
    description:
      "Get anonymous congregational sentiment analysis: top care request themes, trend vs last month, and suggested sermon or pastoral focus areas. No names or personal data returned.",
    input_schema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
];

// ── Tool execution ────────────────────────────────────────────────────────────

export function executeTool(toolName, toolInput, context) {
  const db = getDatabase();
  const orgId = context.organizationId || null;
  const branchId = context.branchId || null;

  try {
    switch (toolName) {
      case "search_members": {
        const query = String(toolInput.query || "").trim();
        const memberType = String(toolInput.member_type || "").trim();
        const limit = Math.min(Number(toolInput.limit || 10), 30);

        let sql = `
          SELECT m.id, m.full_name, m.email, m.phone, m.member_type, m.gender,
                 MAX(s.service_date) as last_seen
          FROM members m
          LEFT JOIN attendance_events a ON a.member_id = m.id
          LEFT JOIN services s ON s.id = a.service_id
          WHERE (? IS NULL OR m.organization_id = ?)
            AND (? IS NULL OR m.branch_id = ?)
        `;
        const params = [orgId, orgId, branchId, branchId];

        if (query) {
          sql += ` AND (m.full_name LIKE ? OR m.email LIKE ? OR m.phone LIKE ?)`;
          const like = `%${query}%`;
          params.push(like, like, like);
        }
        if (memberType) {
          sql += ` AND m.member_type = ?`;
          params.push(memberType);
        }
        sql += ` GROUP BY m.id ORDER BY m.full_name ASC LIMIT ?`;
        params.push(limit);

        const rows = db.prepare(sql).all(...params) || [];
        return {
          count: rows.length,
          members: rows.map((r) => ({
            id: r.id,
            name: r.full_name,
            email: r.email || null,
            phone: r.phone || null,
            type: r.member_type || "member",
            gender: r.gender || null,
            last_seen: r.last_seen || null,
          })),
        };
      }

      case "get_attendance_summary": {
        const n = Math.min(Number(toolInput.last_n_services || 10), 20);

        const services = db.prepare(`
          SELECT s.id, s.name, s.service_date,
                 COUNT(a.id) as total,
                 SUM(CASE WHEN a.mode = 'physical' THEN 1 ELSE 0 END) as physical,
                 SUM(CASE WHEN a.mode = 'online' THEN 1 ELSE 0 END) as online
          FROM services s
          LEFT JOIN attendance_events a ON a.service_id = s.id
          WHERE (? IS NULL OR s.organization_id = ?)
            AND (? IS NULL OR s.branch_id = ?)
          GROUP BY s.id
          ORDER BY s.service_date DESC
          LIMIT ?
        `).all(orgId, orgId, branchId, branchId, n) || [];

        const totals = services.reduce(
          (acc, s) => ({
            total: acc.total + Number(s.total || 0),
            physical: acc.physical + Number(s.physical || 0),
            online: acc.online + Number(s.online || 0),
          }),
          { total: 0, physical: 0, online: 0 }
        );

        return {
          services_counted: services.length,
          avg_per_service: services.length > 0 ? Math.round(totals.total / services.length) : 0,
          total_checkins: totals.total,
          physical_checkins: totals.physical,
          online_checkins: totals.online,
          recent_services: services.map((s) => ({
            date: s.service_date,
            name: s.name,
            total: Number(s.total || 0),
            physical: Number(s.physical || 0),
            online: Number(s.online || 0),
          })),
        };
      }

      case "get_lapsed_members": {
        const daysSince = Number(toolInput.days_since || 30);
        const limit = Math.min(Number(toolInput.limit || 15), 40);
        const cutoff = new Date(Date.now() - daysSince * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10);

        const rows = db.prepare(`
          SELECT m.id, m.full_name, m.email, m.phone, m.member_type,
                 MAX(s.service_date) as last_seen
          FROM members m
          LEFT JOIN attendance_events a ON a.member_id = m.id
          LEFT JOIN services s ON s.id = a.service_id
          WHERE (? IS NULL OR m.organization_id = ?)
            AND (? IS NULL OR m.branch_id = ?)
          GROUP BY m.id
          HAVING last_seen IS NULL OR last_seen < ?
          ORDER BY last_seen ASC
          LIMIT ?
        `).all(orgId, orgId, branchId, branchId, cutoff, limit) || [];

        return {
          count: rows.length,
          threshold_days: daysSince,
          members: rows.map((r) => ({
            id: r.id,
            name: r.full_name,
            email: r.email || null,
            phone: r.phone || null,
            type: r.member_type || "member",
            last_seen: r.last_seen || null,
            days_absent: r.last_seen
              ? Math.floor(
                  (Date.now() - new Date(r.last_seen).getTime()) / (1000 * 60 * 60 * 24)
                )
              : null,
          })),
        };
      }

      case "get_finance_summary": {
        const trialBalance = db.prepare(`
          SELECT a.name, a.type, a.code,
                 COALESCE(SUM(l.debit), 0) AS total_debit,
                 COALESCE(SUM(l.credit), 0) AS total_credit
          FROM ledger_accounts a
          LEFT JOIN ledger_lines l ON l.account_id = a.id
          LEFT JOIN ledger_transactions t ON t.id = l.transaction_id
          WHERE (? IS NULL OR a.organization_id = ?)
          GROUP BY a.id
          ORDER BY a.code
        `).all(orgId, orgId) || [];

        const income = trialBalance
          .filter((a) => a.type === "income")
          .reduce((s, a) => s + Number(a.total_credit || 0), 0);
        const expenses = trialBalance
          .filter((a) => a.type === "expense")
          .reduce((s, a) => s + Number(a.total_debit || 0), 0);

        const fundActivity = db.prepare(`
          SELECT f.name, f.code,
                 COUNT(DISTINCT t.id) AS tx_count,
                 COALESCE(SUM(l.credit), 0) AS total_in,
                 COALESCE(SUM(l.debit), 0) AS total_out
          FROM funds f
          LEFT JOIN ledger_transactions t ON t.fund_id = f.id
          LEFT JOIN ledger_lines l ON l.transaction_id = t.id
          WHERE (? IS NULL OR f.organization_id = ?)
          GROUP BY f.id
          ORDER BY f.name
        `).all(orgId, orgId) || [];

        const activePledges = db.prepare(`
          SELECT COUNT(*) as cnt, COALESCE(SUM(amount), 0) as total
          FROM pledges
          WHERE (? IS NULL OR organization_id = ?) AND status = 'active'
        `).get(orgId, orgId);

        return {
          income,
          expenses,
          net: income - expenses,
          currency: "NGN",
          funds: fundActivity.map((f) => ({
            name: f.name,
            code: f.code,
            transactions: Number(f.tx_count || 0),
            total_in: Number(f.total_in || 0),
            total_out: Number(f.total_out || 0),
          })),
          active_pledges: Number(activePledges?.cnt || 0),
          total_pledged: Number(activePledges?.total || 0),
        };
      }

      case "get_open_care_requests": {
        const limit = Math.min(Number(toolInput.limit || 10), 30);

        const rows = db.prepare(`
          SELECT id, household_name, household_slug, status, tone,
                 created_at, last_activity_at
          FROM requests
          WHERE status NOT IN ('Resolved', 'Archived', 'Closed')
            AND (? IS NULL OR organization_id = ?)
            AND (? IS NULL OR branch_id = ?)
          ORDER BY created_at ASC
          LIMIT ?
        `).all(orgId, orgId, branchId, branchId, limit) || [];

        return {
          count: rows.length,
          requests: rows.map((r) => ({
            id: r.id,
            household: r.household_name,
            slug: r.household_slug,
            status: r.status,
            risk: r.tone,
            created: r.created_at ? r.created_at.slice(0, 10) : null,
            days_open: r.created_at
              ? Math.floor((Date.now() - new Date(r.created_at).getTime()) / (1000 * 60 * 60 * 24))
              : null,
            last_activity: r.last_activity_at ? r.last_activity_at.slice(0, 10) : null,
          })),
        };
      }

      case "get_member_profile": {
        const memberId = String(toolInput.member_id || "").trim();
        if (!memberId) return { error: "member_id is required" };

        const member = db.prepare(`
          SELECT m.id, m.full_name, m.email, m.phone, m.gender, m.birthdate,
                 m.marital_status, m.member_type, m.created_at,
                 p.salvation_date, p.baptism_date, p.small_group, p.last_contact_at
          FROM members m
          LEFT JOIN member_profiles p ON p.member_id = m.id
          WHERE m.id = ? LIMIT 1
        `).get(memberId);

        if (!member) return { error: "Member not found" };

        const attendance = db.prepare(`
          SELECT s.service_date, s.name as service_name, a.mode
          FROM attendance_events a
          JOIN services s ON s.id = a.service_id
          WHERE a.member_id = ?
          ORDER BY s.service_date DESC LIMIT 10
        `).all(memberId) || [];

        const groups = db.prepare(`
          SELECT g.name, g.group_type, gm.role
          FROM group_memberships gm
          JOIN groups g ON g.id = gm.group_id
          WHERE gm.member_id = ?
        `).all(memberId) || [];

        const pledges = db.prepare(`
          SELECT p.amount, p.status, p.start_date, f.name as fund_name
          FROM pledges p
          LEFT JOIN funds f ON f.id = p.fund_id
          WHERE p.member_id = ?
          ORDER BY p.start_date DESC
        `).all(memberId) || [];

        return {
          id: member.id,
          name: member.full_name,
          email: member.email,
          phone: member.phone,
          gender: member.gender,
          birthdate: member.birthdate,
          marital_status: member.marital_status,
          member_type: member.member_type,
          joined: member.created_at ? member.created_at.slice(0, 10) : null,
          spiritual: {
            salvation_date: member.salvation_date,
            baptism_date: member.baptism_date,
            small_group: member.small_group,
            last_contact_at: member.last_contact_at,
          },
          recent_attendance: attendance.map((a) => ({
            date: a.service_date,
            service: a.service_name,
            mode: a.mode,
          })),
          groups: groups.map((g) => ({
            name: g.name,
            type: g.group_type,
            role: g.role,
          })),
          pledges: pledges.map((p) => ({
            fund: p.fund_name,
            amount: Number(p.amount || 0),
            status: p.status,
            since: p.start_date,
          })),
        };
      }

      case "get_discipleship_report": {
        const stuckThreshold = Number(toolInput.stuck_days_threshold || 90);
        const stageFilter = String(toolInput.stage || "").trim();
        const cutoff = new Date(Date.now() - stuckThreshold * 24 * 60 * 60 * 1000).toISOString();

        let sql = `SELECT * FROM discipleship_records WHERE organization_id = ?`;
        const params = [orgId];
        if (branchId) { sql += ` AND branch_id = ?`; params.push(branchId); }
        if (stageFilter) { sql += ` AND stage = ?`; params.push(stageFilter); }
        sql += ` ORDER BY updated_at ASC LIMIT 200`;
        const records = db.prepare(sql).all(...params) || [];

        // Stage counts
        const stageCounts = {};
        for (const r of records) stageCounts[r.stage] = (stageCounts[r.stage] || 0) + 1;

        // Stuck members
        const stuck = records
          .filter((r) => r.updated_at < cutoff && r.stage !== "mentoring")
          .map((r) => ({
            name: r.household_name,
            stage: r.stage,
            days_since_update: Math.floor((Date.now() - new Date(r.updated_at).getTime()) / 86400000),
            leader: r.assigned_leader_name || null,
            next_step: r.next_step || null,
          }));

        // Milestone rates
        const total = records.length;
        const milestoneRates = {
          foundation_class: total > 0 ? Math.round((records.filter(r => r.foundation_class).length / total) * 100) : 0,
          baptized: total > 0 ? Math.round((records.filter(r => r.baptized).length / total) * 100) : 0,
          attending_regularly: total > 0 ? Math.round((records.filter(r => r.attending_regularly).length / total) * 100) : 0,
          small_group_connected: total > 0 ? Math.round((records.filter(r => r.small_group_connected).length / total) * 100) : 0,
          serving: total > 0 ? Math.round((records.filter(r => r.serving).length / total) * 100) : 0,
          mentoring_others: total > 0 ? Math.round((records.filter(r => r.mentoring_others).length / total) * 100) : 0,
        };

        return {
          total_on_pathway: total,
          by_stage: stageCounts,
          stuck_members: stuck.slice(0, 10),
          stuck_count: stuck.length,
          milestone_completion_pct: milestoneRates,
        };
      }

      case "get_infrastructure_report": {
        const utilityType = String(toolInput.utility_type || "").trim();
        const forecastDays = Number(toolInput.forecast_days || 30);
        const cutoffDate = new Date(Date.now() + forecastDays * 24 * 60 * 60 * 1000)
          .toISOString().slice(0, 10);
        const todayStr = new Date().toISOString().slice(0, 10);

        // Recent utility logs
        let ulSql = `SELECT * FROM utility_logs WHERE organization_id = ?`;
        const ulParams = [orgId];
        if (branchId) { ulSql += ` AND branch_id = ?`; ulParams.push(branchId); }
        if (utilityType) { ulSql += ` AND utility_type = ?`; ulParams.push(utilityType); }
        ulSql += ` ORDER BY logged_at DESC LIMIT 20`;
        const logs = db.prepare(ulSql).all(...ulParams) || [];

        // Upcoming events in forecast window
        const events = db.prepare(`
          SELECT title, event_date, event_time, event_type, location
          FROM ministry_events
          WHERE organization_id = ?
            AND event_date >= ? AND event_date <= ?
          ORDER BY event_date ASC LIMIT 10
        `).all(orgId, todayStr, cutoffDate) || [];

        // Asset availability
        const assets = db.prepare(`
          SELECT category, status, COUNT(*) as cnt
          FROM church_assets
          WHERE organization_id = ?
          GROUP BY category, status
        `).all(orgId) || [];

        const checkedOut = db.prepare(`
          SELECT COUNT(*) as cnt FROM asset_checkouts ac
          JOIN church_assets ca ON ca.id = ac.asset_id
          WHERE ca.organization_id = ? AND ac.returned_date IS NULL
        `).get(orgId);

        // Average diesel per event (if logs exist)
        const dieselLogs = logs.filter(l => l.utility_type === "diesel" || l.utility_type === "generator");
        const avgDieselPerLog = dieselLogs.length > 0
          ? Math.round(dieselLogs.reduce((s, l) => s + Number(l.value || 0), 0) / dieselLogs.length)
          : null;

        return {
          recent_utility_logs: logs.slice(0, 10).map(l => ({
            type: l.utility_type,
            value: l.value,
            unit: l.unit,
            cost: l.cost,
            event: l.event_name,
            date: l.logged_at,
          })),
          avg_diesel_per_session_litres: avgDieselPerLog,
          upcoming_events: events.map(e => ({
            title: e.title,
            date: e.event_date,
            type: e.event_type,
          })),
          projected_diesel_needed: avgDieselPerLog && events.length > 0
            ? `~${avgDieselPerLog * events.length}L for ${events.length} upcoming events`
            : null,
          asset_summary: assets.map(a => ({ category: a.category, status: a.status, count: a.cnt })),
          currently_checked_out: Number(checkedOut?.cnt || 0),
        };
      }

      case "get_congregational_pulse": {
        const now = new Date();
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString();

        const requests = db.prepare(`
          SELECT need, summary, created_at FROM requests
          WHERE (? IS NULL OR organization_id = ?)
            AND (? IS NULL OR branch_id = ?)
          ORDER BY created_at DESC LIMIT 500
        `).all(orgId, orgId, branchId, branchId) || [];

        const thisMonthReqs = requests.filter(r => r.created_at >= thisMonth);
        const lastMonthReqs = requests.filter(r => r.created_at >= lastMonth && r.created_at <= lastMonthEnd);

        const THEMES = [
          { key: "financial",  label: "Financial hardship",       pattern: /financ|money|job|employ|rent|debt|income/i },
          { key: "health",     label: "Health & wellness",         pattern: /health|sick|hospital|illness|medical|pain/i },
          { key: "marriage",   label: "Marriage & relationships",  pattern: /marri|divorce|husband|wife|relation|couple/i },
          { key: "grief",      label: "Grief & loss",              pattern: /grief|bereave|death|loss|mourn|widow/i },
          { key: "youth",      label: "Youth & children",          pattern: /youth|child|teen|school|student|kid/i },
          { key: "spiritual",  label: "Spiritual growth",          pattern: /faith|prayer|spirit|doubt|worship|discipleship/i },
          { key: "counseling", label: "Counseling & mentorship",   pattern: /counsel|mentor|guidance|advice|support/i },
          { key: "family",     label: "Family conflict",           pattern: /family|conflict|parent|sibling|domestic/i },
          { key: "employment", label: "Employment",                pattern: /job|work|employ|career|unemploy/i },
          { key: "housing",    label: "Housing & shelter",         pattern: /hous|shelter|homeless|accommodation/i },
        ];

        const themes = THEMES.map(t => {
          const curr = thisMonthReqs.filter(r => t.pattern.test(`${r.need} ${r.summary || ""}`)).length;
          const prev = lastMonthReqs.filter(r => t.pattern.test(`${r.need} ${r.summary || ""}`)).length;
          const trend = prev === 0 ? null : Math.round(((curr - prev) / prev) * 100);
          return { theme: t.label, this_month: curr, last_month: prev, trend_pct: trend };
        }).filter(t => t.this_month > 0).sort((a, b) => b.this_month - a.this_month);

        const topTheme = themes[0];
        const risingThemes = themes.filter(t => t.trend_pct !== null && t.trend_pct > 20);

        return {
          total_requests_this_month: thisMonthReqs.length,
          total_requests_last_month: lastMonthReqs.length,
          top_themes: themes.slice(0, 5),
          rising_concerns: risingThemes.map(t => t.theme),
          pastoral_suggestion: topTheme
            ? `The most pressing congregational need this month is "${topTheme.theme}" (${topTheme.this_month} requests). ${risingThemes.length > 0 ? `Rising concerns: ${risingThemes.map(t => t.theme).join(", ")}.` : ""} Consider a sermon series or counseling initiative around these themes.`
            : "Not enough data yet for analysis.",
        };
      }

      default:
        return { error: `Unknown tool: ${toolName}` };
    }
  } catch (err) {
    console.error(`[ai-client] Tool ${toolName} error:`, err);
    return { error: String(err?.message || "Tool execution failed") };
  }
}

// ── System prompts ────────────────────────────────────────────────────────────

export function buildSystemPrompt(agentType, context) {
  const today = new Date().toISOString().slice(0, 10);
  const org = context.organizationName || "your church";
  const branch = context.branchName ? ` (${context.branchName})` : "";

  const base = `You are a highly capable AI assistant embedded in Church Care OS, a pastoral management platform for ${org}${branch}. Today is ${today}.

You have access to live church data through your tools. Always use tools to retrieve accurate, up-to-date information before answering data questions. Do not guess at member names, figures, or counts.

Be concise, warm, and professional. Address the user as a ministry leader. Avoid jargon. Use Nigerian Naira (₦) for financial figures.`;

  switch (agentType) {
    case "care":
      return `${base}

Your role is the **Care Agent**. You help pastoral leaders:
- Find members who need follow-up, pastoral visits, or care
- Review open care requests and escalation status
- Identify lapsed or at-risk members
- Answer questions about household care needs

Always approach care topics with pastoral sensitivity. Suggest concrete next steps. Do not share private member data beyond what is needed to answer the question.`;

    case "finance":
      return `${base}

Your role is the **Finance Auditor**. You help church finance officers and pastors:
- Understand the current financial position
- Review fund activity and pledge commitments
- Identify anomalies or trends that need attention
- Summarise stewardship performance

Be accurate. State numbers clearly. Highlight concerns without alarmism. Always recommend verifying unusual figures against physical records.`;

    case "discipleship":
      return `${base}

Your role is the **Discipleship Growth Agent**. You help leaders track and accelerate spiritual transformation:
- Identify members who are "stuck" at a pathway stage for too long (use get_discipleship_report)
- Suggest personalised next steps for individuals based on their milestone gaps
- Surface patterns: which milestones are blocking the most people?
- Recommend outreach to specific members by name when they need a nudge

When you identify a stuck member, suggest a specific action (e.g. "Invite Brother Chidi to the Technical Team briefing" or "Follow up about his cell group").
Be warm, pastor-like, and action-oriented. The goal is transformation, not just data.`;

    case "infrastructure":
      return `${base}

Your role is the **Operations & Infrastructure Agent**. You help the admin and estate department:
- Forecast diesel and utility needs based on upcoming events (use get_infrastructure_report)
- Track which church assets are currently checked out
- Predict resource requirements for conferences, conventions, and special services
- Alert when equipment may be unavailable for a scheduled event

Use Nigerian context: generator diesel is critical, power cuts are common, and large events need advance planning.
Be practical and give specific numbers (e.g. "Based on your average of 45L per service, the 3-day convention will need ~135L").`;

    case "secretary":
    default:
      return `${base}

Your role is the **Church Secretary Agent**. You are a general-purpose assistant for ministry operations:
- Answer questions about membership, attendance, and finances
- Help draft communications and task lists
- Surface insights across all church data
- Assist with planning and scheduling

Be helpful, direct, and brief. Use bullet points for lists. Suggest actions the user can take in Church Care OS.`;
  }
}
