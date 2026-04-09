# Pristine Cutover Plan

This plan aligns the current Church Care OS schema with the Pristine blueprint using safe, additive migrations.

## Phase 1: Additive Tables

- Add members, member_profiles, member_events
- Add tags and member_tags
- Add groups and group_memberships
- Add services and attendance_events
- Add funds and ledger tables
- Add pledges

## Phase 2: Dual Write

- New member intake writes to users and members
- Attendance records write to member_events and attendance_events
- Care workflows remain intact

## Phase 3: Backfill

- Backfill members from users where role = member
- Backfill member_events from existing care activity

## Phase 4: Read Switch

- Read member directory from members table
- Keep legacy tables as fallback until stability confirmed

