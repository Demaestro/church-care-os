# Church Care OS — Master System Specification (Pristine & Premium)

This Technical Requirements Document (TRD) defines the **Pristine & Premium** ecosystem blueprint for Church Care OS. It covers database schema, security protocols, AI agent infrastructure, premium design system, and integration APIs. This document is intended to drive implementation and ensure audit-grade reliability, privacy, and performance.

---

## 0. Core Principles

- **Pristine experience:** minimal, editorial, calm, and confidence‑building.
- **Privacy by design:** least privilege, field‑level encryption for care notes.
- **Audit‑ready:** immutable logs for access and financials.
- **Reliability at scale:** prepared for 100k+ concurrent users.
- **Nigeria‑ready:** fast on 3G networks, resilient under high latency.

---

## 1. Unified Relational Database Schema (PostgreSQL)

### 1.1 Entities and Relationships (High‑Level)

- **Organization** → owns **Campuses**, **Users**, **Members**, **Funds**, **Ledger**, **Events**
- **Campus** → local scope for **Members**, **Care Requests**, **Attendance**
- **Member** → belongs to **Household**, joins **Groups**, leaves **Milestones**, has **Engagement Timeline**
- **Care Request** → assigned to **Volunteer/Leader**, has **Follow‑up Notes**
- **Attendance** → physical + digital
- **Tags** → dynamic grouping for members

### 1.2 SQL Schema Snippets (Core)

```sql
-- Organizations and campuses
CREATE TABLE organizations (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE campuses (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  city TEXT,
  timezone TEXT DEFAULT 'Africa/Lagos',
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Users (staff/volunteers)
CREATE TABLE users (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  campus_id UUID REFERENCES campuses(id),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL, -- owner|pastor|leader|volunteer|member
  password_hash TEXT NOT NULL,
  mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Member core + household
CREATE TABLE households (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  campus_id UUID REFERENCES campuses(id),
  name TEXT NOT NULL,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE members (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  campus_id UUID REFERENCES campuses(id),
  household_id UUID REFERENCES households(id),
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  gender TEXT,
  birthdate DATE,
  marital_status TEXT,
  member_type TEXT DEFAULT 'member', -- member|visitor|new_member
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Dynamic tags and grouping
CREATE TABLE tags (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  kind TEXT NOT NULL -- department|demographic|life_stage|custom
);

CREATE TABLE member_tags (
  member_id UUID NOT NULL REFERENCES members(id),
  tag_id UUID NOT NULL REFERENCES tags(id),
  PRIMARY KEY (member_id, tag_id)
);

-- Engagement timeline
CREATE TABLE member_events (
  id UUID PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES members(id),
  event_type TEXT NOT NULL, -- service_attendance|baptism|care_note|group_join
  event_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Attendance
CREATE TABLE services (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  campus_id UUID REFERENCES campuses(id),
  name TEXT NOT NULL,
  service_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE attendance (
  id UUID PRIMARY KEY,
  service_id UUID NOT NULL REFERENCES services(id),
  member_id UUID NOT NULL REFERENCES members(id),
  mode TEXT NOT NULL, -- physical|online
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Care requests
CREATE TABLE care_requests (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  campus_id UUID REFERENCES campuses(id),
  member_id UUID REFERENCES members(id),
  summary TEXT,
  status TEXT NOT NULL, -- open|in_progress|resolved|archived
  tone TEXT, -- crisis|urgent|routine
  follow_up_due TIMESTAMPTZ,
  assigned_user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Encrypted care notes (field‑level encryption)
CREATE TABLE care_notes (
  id UUID PRIMARY KEY,
  care_request_id UUID NOT NULL REFERENCES care_requests(id),
  encrypted_note BYTEA NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 2. Fund Accounting & Financial Ledger

### 2.1 Accounting Structures

- **Funds** (Tithes, Missions, Welfare)
- **Ledger Accounts** (Assets, Liabilities, Income, Expense)
- **Double Entry Transactions** (Balanced lines)
- **Pledges** (Long‑term commitments)

### 2.2 SQL Snippets

```sql
CREATE TABLE funds (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL
);

CREATE TABLE ledger_accounts (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- asset|liability|income|expense|equity
  code TEXT UNIQUE NOT NULL
);

CREATE TABLE ledger_transactions (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  fund_id UUID REFERENCES funds(id),
  memo TEXT,
  posted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE ledger_lines (
  id UUID PRIMARY KEY,
  transaction_id UUID NOT NULL REFERENCES ledger_transactions(id),
  account_id UUID NOT NULL REFERENCES ledger_accounts(id),
  debit NUMERIC(12,2) NOT NULL DEFAULT 0,
  credit NUMERIC(12,2) NOT NULL DEFAULT 0
);

CREATE TABLE pledges (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  member_id UUID REFERENCES members(id),
  fund_id UUID REFERENCES funds(id),
  amount NUMERIC(12,2) NOT NULL,
  start_date DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'active'
);
```

---

## 3. AI Agent Infrastructure (“Digital Deacon” Layer)

### 3.1 Architecture

- **Vector Store** for embeddings of care notes, meeting minutes, policies
- **Tool calling** with strict allowlist (read‑only summaries unless authorized)
- **Agent isolation** per tenant

### 3.2 Agents

1. **Proactive Care Agent**
   - Detects lapsed attendance or follow‑up gaps.
   - Suggests outreach to pastor or leader.

2. **Financial Auditor Agent**
   - Matches bank feeds to ledger entries.
   - Flags anomalies or unbalanced transactions.

3. **Secretary Agent**
   - Summarizes meetings and drafts communications in church voice.

### 3.3 Data Controls

- Only summarized data exposed.
- No raw pastoral notes without elevated permission.
- All AI access logged.

---

## 4. High‑End Cybersecurity & Privacy

### 4.1 RBAC Examples

- **Member:** can view only their own profile and requests.
- **Volunteer:** sees assigned care tasks, no financial data.
- **Leader:** sees care + limited member directory.
- **Pastor/Owner:** sees care + operations; financials only if explicitly granted.

### 4.2 Mandatory Security Controls

- Field‑level encryption for **care_notes**.
- Immutable audit logs (append‑only).
- Rate limits on auth + public endpoints.
- MFA enforced for staff roles.
- Session invalidation on logout and role change.

### 4.3 Audit Logging

```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  actor_user_id UUID NOT NULL REFERENCES users(id),
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 5. Premium UI/UX Design System

### 5.1 Visual Language

- Editorial, minimalist, premium.
- High‑contrast typography with generous whitespace.
- Calm neutral palette + deep accents for trust.

### 5.2 Performance Goals

- 3G‑friendly (edge caching + optimistic UI).
- Preload core data; use cached summaries for boards.

---

## 6. Ecosystem Connectivity (API Structure)

### 6.1 API Endpoints (Sample)

```
POST /api/auth/login
POST /api/auth/logout
POST /api/members/register
GET  /api/members/:id
GET  /api/care/board
POST /api/care/request
POST /api/finance/transaction
GET  /api/finance/ledger
POST /api/integrations/sms/send
POST /api/integrations/payments/charge
```

### 6.2 External Integrations

- **Payments:** Paystack/Flutterwave/Stripe
- **SMS:** Termii/Twilio
- **Streaming:** YouTube Live, Mixlr, Church Online

---

## 7. Security Checklist (Release‑Blocking)

- [ ] Passwords hashed with bcrypt/argon2
- [ ] MFA for staff roles
- [ ] RBAC enforced on all endpoints
- [ ] Field‑level encryption enabled for care notes
- [ ] Audit logs immutable
- [ ] No secrets in client or repo
- [ ] Backups tested + restore verified

---

## 8. Roadmap for Implementation (High‑Priority)

1. **Schema migration + data model stabilization**
2. **RBAC enforcement at middleware level**
3. **Fund accounting ledger module**
4. **AI agent layer with governance rules**
5. **Final UI/UX polish**

---

## 9. Outcome

This specification defines a church ERP that is premium, scalable, secure, and ready for large‑scale adoption. It ensures privacy for pastoral care, accountability in finance, and a frictionless member experience.

