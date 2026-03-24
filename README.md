# Church Care OS

Church Care OS is a Next.js 16 care coordination app for pastors, ministry leaders, and volunteers. The app now runs on a local SQLite database at `data/care.db`, with automatic backup scripts, auth-protected internal routes, and a public member intake flow.

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
npm run db:drill
npm run ops:retention
npm run ops:healthcheck
npm run ops:backup-freshness
```

If `care.db` does not exist yet, run `npm run db:init` once to create the schema and seed the starter data from `data/care-store.json`.

To create a production owner account:

```bash
npm run auth:create-user -- --name "Church Owner" --email owner@example.com --password "StrongPass!2026" --role owner
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
```
