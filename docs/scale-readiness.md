# Church Care OS Scale Readiness

This app is now structured around one church workspace per signup. A pastor creates the workspace, a primary campus is created behind the scenes, and members see that church's branding on public pages and sign-in surfaces.

## What "ready for 100,000 concurrent users" means here

Code alone cannot guarantee 100,000 concurrent users. That target depends on infrastructure, database capacity, object storage throughput, caching, observability, and load testing. What the codebase can do is avoid architecture choices that block that scale.

The production shape for this app should be:

- stateless Next.js application instances
- PostgreSQL as the runtime database
- object storage for logos and attachments
- server-side session cookies instead of browser-stored tokens
- scheduled and queued background work handled outside long-lived app memory
- aggressive CDN caching for static assets and church branding

## Required production settings

Use these settings in real production:

- `CARE_DATABASE_DRIVER=postgres`
- `DATABASE_URL=<managed postgres connection string>`
- `CARE_ATTACHMENT_BACKEND=vercel-blob` or another object-storage backend
- `BLOB_READ_WRITE_TOKEN=<private token>` when using Vercel Blob
- `AUTH_SECRET=<strong secret>`
- `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=<strong key>`
- `CRON_SECRET=<strong secret>`

Do not rely on local SQLite or local file uploads for high-scale production.

## Why the current structure helps

### Church-per-tenant workspace model

Each church signs up directly. That keeps the tenant boundary simple:

- one church workspace
- one pastor/admin owner
- members and staff scoped to that church

This reduces query complexity and cuts down on accidental overexposure across organizations.

### Database indexes already in place

The schema now includes additional indexes for the busiest workflow paths:

- requests by organization/branch and due state
- households by organization/branch and touchpoint state
- active users by organization and role
- active organizations and visible branches

These indexes improve follow-up boards, people views, and care lookups under load.

### Stateless branding delivery

Church logos are served through a dedicated route instead of being embedded in server memory. That makes it easier to cache and scale independently from page rendering.

### Server-side session model

Sessions live in secure cookies and are revocable server-side. That avoids localStorage token leakage and lets the app invalidate sessions centrally.

## What still needs to happen before true high-scale launch

1. Run production on PostgreSQL only.
2. Enable connection pooling for PostgreSQL.
3. Store every upload and branding asset in object storage.
4. Keep scheduled jobs on cron/queue infrastructure, not in a forever local worker.
5. Add observability, database monitoring, and alerting.
6. Load test the heaviest flows:
   - member sign-in
   - member portal lookup
   - request creation
   - follow-up board
   - notifications and reminder delivery

## Practical recommendation

For early launch:

- Vercel Pro or equivalent stateless hosting
- managed PostgreSQL
- managed object storage
- cron-backed reminders

For very large usage:

- pooled Postgres
- read replicas if reporting becomes heavy
- background queues for delivery fan-out
- synthetic monitoring and staged rollout by church
