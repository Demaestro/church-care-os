# System Alignment Report (Current vs Pristine)

## Current Core Tables

- organizations, branches, regions
- users (includes member accounts)
- households, requests
- audit_logs, notifications
- new_member_journeys, journey_contacts
- service_schedules
- jobs, outbox queues

## Pristine Additions Needed

- members and member_profiles
- member_events timeline
- tags and member_tags
- groups and group_memberships
- services and attendance_events
- funds, ledger_accounts, ledger_transactions, ledger_lines
- pledges

## Alignment Strategy

- Keep users for staff accounts
- Add members table for member directory
- Mirror member data during onboarding
- Gradually migrate reporting to new tables

