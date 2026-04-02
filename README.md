# Church Care OS

Church Care OS is a Next.js 16 care coordination app for pastors, ministry leaders, volunteers, and headquarters oversight teams. The app currently runs on a local SQLite database at `data/care.db`, with automatic backup scripts, branch-scoped internal routes, MFA-capable sign-in, a public member intake flow, and migration tooling for PostgreSQL.

Core product surfaces already included:

- Pastor dashboard
- Leader routing and volunteer assignment
- Volunteer task workflow
- Household timelines
- Public care request intake
- Request status lookup
- Account recovery
- Admin users, teams, reports, settings, audit trail, and notifications
- Regions, branches, transfers, security, attachments, and HQ analytics

## Runtime requirements

- Node.js `20.9.0` or newer
- npm `10` or newer

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

In local development, demo accounts are seeded automatically on first run:

- `pastor@grace.demo` / `PastorDemo!2026`
- `leader@grace.demo` / `LeaderDemo!2026`
- `volunteer@grace.demo` / `VolunteerDemo!2026`
- `owner@grace.demo` / `OwnerDemo!2026`

## Production on a Node host

This is the simplest path if you have a VM, VPS, or platform that runs long-lived Node processes with persistent storage.

```bash
npm ci
npm run build
set HOSTNAME=0.0.0.0
set PORT=3000
set CARE_DB_PATH=%cd%\\data\\care.db
npm run start
```

On PowerShell, use:

```powershell
$env:HOSTNAME = "0.0.0.0"
$env:PORT = "3000"
$env:CARE_DB_PATH = "$PWD/data/care.db"
npm run start
```

Before you start the app in production, set `AUTH_SECRET` to a long random value and keep it stable across restarts. If you ever move beyond one instance, also set a stable `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` at build time.

## Standalone production bundle

`npm run build` now produces a runnable standalone bundle in `.next/standalone` and copies the required runtime assets into it:

- `public/`
- `.next/static/`
- `data/`

To run the bundle directly:

```bash
npm run build
npm run start:standalone
```

## Docker deployment

The repo includes a production `Dockerfile` and `compose.yaml`.

Build and run with Docker:

```bash
docker build -t church-care-os .
docker run -d --name church-care-os -p 3000:3000 -v church-care-data:/app/data church-care-os
```

Or use Docker Compose:

```bash
docker compose up -d --build
```

The named volume keeps `care.db` and local backups across restarts.

## Operations

Useful commands:

```bash
npm run db:init
npm run db:backup
npm run db:restore -- --from /absolute/path/to/backup.sqlite
npm run db:export
npm run db:pg:check
npm run db:pg:import -- --from /absolute/path/to/export-folder
npm run db:drill
npm run jobs:drain
npm run jobs:work
npm run ops:retention
npm run ops:healthcheck
npm run ops:backup-freshness
npm run test:e2e
```

If `care.db` does not exist yet, run `npm run db:init` once to prepare the file. The full schema and demo/bootstrap data are then created automatically the first time the app boots and touches the database.

`npm run db:export` creates a portable export bundle under `exports/` with:

- one JSON file per table
- a `manifest.json`
- copied uploads from `CARE_UPLOADS_PATH` when present

Use `npm run db:pg:import -- --from <export-folder>` with `DATABASE_URL` set to load that bundle into PostgreSQL using `scripts/postgres/schema.sql`.

To create a production owner account:

```bash
npm run auth:create-user -- --name "Church Owner" --email owner@example.com --password "StrongPass!2026" --role owner
```

## Email delivery status

The app already includes the in-app email system, templates, and outbox logging. By default it is safe to run in `log-only` mode until you connect a provider.

- `log-only`: records outbound emails in the outbox but does not send them
- `resend`: sends live email once `RESEND_API_KEY` and a verified sender domain are configured

If you are not ready to connect live email yet, the app still works fully in `log-only` mode.

## SMS and WhatsApp delivery status

The app now also includes provider-ready SMS and WhatsApp messaging with a separate outbox log and owner settings.

- `log-only`: records outbound messages in the message outbox but does not send them
- `twilio`: sends live SMS or WhatsApp once `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and sender numbers are configured

If you are not ready to connect live messaging yet, the app still works fully in `log-only` mode and records every attempted message for review.

## Background jobs

Outbound email, SMS, and WhatsApp can now be processed by a dedicated worker instead of only inside the request lifecycle.

- `npm run jobs:drain` processes queued jobs once and exits
- `npm run jobs:work` polls the queue continuously

This worker reads from the SQLite `jobs` table and updates the delivery outboxes after calling the configured provider APIs.

## Browser coverage

The repo now includes Playwright browser coverage for:

- public request intake
- request status lookup
- member portal access
- HQ oversight pages
- volunteer workspace access

Run it with:

```bash
npm run test:e2e
```

## Provider configs

This repo now includes deployment-ready config for:

- Render: `render.yaml`
- Railway: `railway.json`
- Fly.io: `fly.toml`
- VPS: `ops/church-care-os.service` and `ops/nginx.conf`

Provider-specific setup notes live in `DEPLOY.md`.

## Hosting guidance

This app is not a good fit for serverless hosting yet because it writes to a local SQLite file at runtime. In production, set `CARE_DB_PATH` explicitly and point it at persistent storage. Until the data layer moves to a managed database, prefer:

- A VPS or VM running `npm run start`
- Docker on a single host
- A container platform with a persistent disk or volume

Avoid Vercel or other ephemeral serverless targets for now.

## Operations notes

- Put a reverse proxy such as Nginx or Caddy in front of the Next.js server for TLS, rate limiting, and request buffering.
- Run only one app instance with the current SQLite file. Multiple replicas will drift unless the data layer is replaced.
- Internal routes now require login; only `/requests/new`, `/permissions`, `/login`, and `/health` should stay public.
- If you later scale beyond one instance, set a stable `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` during build and move app data into a shared database.

## Verification

```bash
npm run lint
npm run build
npm run db:init
npm run db:backup
npm run db:drill
npm run ops:backup-freshness
```
