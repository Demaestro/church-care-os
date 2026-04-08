# Load Testing Church Care OS

Use load testing to validate infrastructure, not just the app code. The goal is to prove that your hosting, database, storage, and cron-backed jobs keep working under pressure.

## Start with safe smoke checks

This repo includes a read-only k6 smoke script:

```bash
k6 run load/k6-smoke.js
```

Set `BASE_URL` when you want to point at a deployed environment:

```bash
BASE_URL=https://care.example.com k6 run load/k6-smoke.js
```

The script intentionally hits only public read routes:

- `/health`
- `/login`
- `/register/church`
- `/requests/new`
- `/member`

It does not create data or send messages.

## What to test next

Before a real launch, build separate staged tests for:

1. Church signup
2. Member sign-in
3. Public care request submission
4. Follow-up board reads
5. Notification and reminder queue draining

Keep write-heavy tests in a staging environment with production-like infrastructure.

## What "100,000 concurrent users" really means

That target is an infrastructure challenge, not a single code toggle. To move toward it, you need:

- stateless application instances
- managed PostgreSQL with connection pooling
- object storage for logos and attachments
- CDN caching for public assets
- scheduled queue draining outside in-memory workers
- observability and alerting
- staged rollout by tenant

## Practical rollout sequence

1. Pass the smoke script on staging.
2. Ramp up read-only traffic first.
3. Add write tests for request creation.
4. Watch database connections, p95 latency, and error rate.
5. Only then increase concurrency in larger steps.

## Suggested baseline alerts

- p95 request time above 800ms
- error rate above 1%
- Postgres connection exhaustion
- blob storage failures
- cron/job drain failures
- login or request form spikes in 4xx/5xx responses

