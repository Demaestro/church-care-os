# Deployment Guide

Church Care OS now stores live care data in a SQLite database file. Every production target still needs persistent disk and should run as a single app instance.

## Shared deployment rules

- Run one application instance only.
- Keep `care.db` on persistent storage.
- Keep uploaded attachments on persistent storage too by setting `CARE_UPLOADS_PATH`.
- Set `CARE_DB_PATH` explicitly in production.
- Put a reverse proxy or provider edge in front of the app.
- Use `/health` as the deployment health check.
- Run `npm run db:init` once if you want to bootstrap the SQLite file before first traffic.
- Move to a real database before attempting multi-instance scale.
- Run scheduled backups and occasional restore drills.
- Run a background worker with `npm run jobs:work` if you want queued delivery processing outside the web process.
- If email is not configured yet, leave the app in `log-only` delivery mode and connect the provider later.

Recommended production env vars:

- `AUTH_SECRET`
- `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`
- `CARE_DB_PATH`
- `CARE_UPLOADS_PATH`
- `HOSTNAME=0.0.0.0`
- `PORT=3000`
- `APP_BASE_URL`
- `BACKUP_DIR` if you want backups outside the default data folder
- `BACKUP_MAX_AGE_HOURS=26`
- `CARE_DATABASE_DRIVER=sqlite`
- `DATABASE_URL` only when you are exporting to / importing from PostgreSQL
- `PGSSLMODE=require` when your PostgreSQL host requires TLS
- `RESEND_API_KEY` only when you are ready for live email
- `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` only when you are ready for live messaging

## Render

Files:

- `render.yaml`
- `Dockerfile`

What is already configured:

- Docker web service
- health check at `/health`
- persistent disk mounted at `/app/storage`
- `CARE_DB_PATH=/app/storage/care.db`

What you still need to do in Render:

1. Connect the repository and create the Blueprint from `render.yaml`.
2. Confirm the service name is available in your Render workspace.
3. Keep the disk attached and do not scale this service horizontally.
4. Point your custom domain at the generated Render hostname.

## Railway

Files:

- `railway.json`
- `Dockerfile`

What is already configured:

- Dockerfile build
- health check at `/health`
- restart policy for crash recovery

What you still need to do in Railway:

1. Create a new service from this repository.
2. Add a persistent volume and attach it to the service.
3. Leave the app on a single replica.
4. Add any custom domain inside the Railway dashboard.

If you mount the volume anywhere, Railway exposes that path as `RAILWAY_VOLUME_MOUNT_PATH` and the app will automatically place `care.db` there.

## Fly.io

Files:

- `fly.toml`
- `Dockerfile`

What is already configured:

- Docker deploy
- primary region set to `fra`
- health check at `/health`
- mounted volume at `/data`
- `CARE_DB_PATH=/data/care.db`

What you still need to do in Fly.io:

1. Change `app = "church-care-os"` in `fly.toml` to a globally unique name.
2. Run `fly launch --no-deploy` if you want Fly to link the app locally.
3. Run `fly deploy`.
4. If Fly does not auto-create the volume, create one named `care_data` in the primary region and redeploy.

## VPS

Files:

- `ops/church-care-os.service`
- `ops/nginx.conf`

Suggested layout:

- app code at `/srv/church-care-os`
- persistent data at `/srv/church-care-os/data`
- standalone server launched from `/srv/church-care-os/.next/standalone`
- backups written under the same data mount unless `BACKUP_DIR` is overridden

Suggested VPS flow:

1. Install Node.js 20+ and Nginx.
2. Clone the repo into `/srv/church-care-os`.
3. Run `npm ci` and `npm run build`.
4. Create a `churchcare` system user.
5. Install `ops/church-care-os.service` into `/etc/systemd/system/`.
6. Install `ops/church-care-os-backup.service` and `ops/church-care-os-backup.timer` for nightly backups.
7. Install `ops/church-care-os-healthcheck.service` and `ops/church-care-os-healthcheck.timer` for recurring health probes.
8. Install `ops/nginx.conf` into your Nginx sites config and replace `care.example.com`.
9. Start the app with `systemctl enable --now church-care-os`.
10. Enable the timers and add TLS with LetsEncrypt or your preferred certificate flow.

## Operational validation

After deployment, validate the host with these commands:

```bash
npm run db:backup
npm run db:drill
npm run jobs:drain
npm run ops:backup-freshness
npm run ops:healthcheck
```

To test a restore manually:

```bash
npm run db:restore -- --from /absolute/path/to/backup.sqlite
```

## PostgreSQL migration path

The app runtime still uses SQLite today, but the repo now includes a migration/export path for moving production data forward:

```bash
npm run db:export
DATABASE_URL=postgres://... npm run db:pg:check
DATABASE_URL=postgres://... npm run db:pg:import -- --from /absolute/path/to/export-folder
```

The PostgreSQL schema lives in `scripts/postgres/schema.sql`.

## Provider choice

- Use Render if you want the smoothest Git-based deploy with a managed disk.
- Use Railway if you want a simple container workflow and are comfortable attaching the volume in the dashboard.
- Use Fly.io if you want region control and are okay with a bit more infrastructure setup.
- Use a VPS if you want the most direct control and the least platform abstraction.
