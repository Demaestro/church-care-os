# Security & Privacy (Pristine Standard)

This security brief enforces ISO‑27001‑aligned controls and a strict privacy model for spiritual and financial data.

## RBAC Model (Baseline)

- Member: own profile, own care requests, own attendance
- Volunteer: assigned care tasks only
- Leader: care workflows for assigned branch, no finance
- Pastor: care workflows + limited member directory
- Owner: full admin for church workspace

## Field‑Level Encryption

Encrypt at rest:

- Care notes
- Counseling summaries
- Sensitive attachments metadata (where required)

## Access Logging

Every access to:

- member profiles
- care notes
- finance records

must generate immutable audit logs.

## Authentication Standards

- Short‑lived access tokens with server‑side session tracking
- MFA required for staff roles
- Account lockout with secure unlock flow
- Rate limits on login/register

## Transport and Storage

- TLS 1.3 only in production
- Database encryption at rest
- Secure object storage for attachments

