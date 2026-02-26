# Koda (ASC Prevailing Wage Tracker) - Architecture & GCP Migration Guide

## Overview

Prevailing wage tracking app for employees to submit work tickets and admins to manage pay periods and generate DIR XML files.

## Tech Stack

| Component | Current |
|-----------|---------|
| App / Hosting | Next.js 16 on Cloud Run |
| Auth | Supabase Auth (login/signup/session) |
| Database | **Cloud SQL (PostgreSQL)** – profiles, tickets, employee_periods |
| Data access | `pg` in `src/lib/db.ts`; auth + profile helper in `src/lib/auth-db.ts` |

Optional future migration: replace Supabase Auth with Firebase Auth / Identity Platform.

## Database Schema

### `profiles`
- `id` (uuid, PK) - matches auth user id
- `email`, `full_name`, `role` ('admin' | 'user'), `salary` (yearly)

### `tickets`
- `id`, `user_id` (FK → profiles), `dir_number`, `project_title`
- `date_worked`, `hours_worked`, `status`

### `employee_periods`
- `user_id`, `year`, `month`, `period` (1 or 2)
- `status` ('pending' | 'awaiting_pay' | 'ready_for_dir')
- Tracks workflow state per employee per pay period

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/supabase/client.ts` | Browser Supabase client (auth only) |
| `src/lib/supabase/server.ts` | Server Supabase client (auth only) |
| `src/lib/db.ts` | Cloud SQL PostgreSQL client (`pg`) |
| `src/lib/auth-db.ts` | Get current user + profile from auth + DB; ensures profile exists |
| `src/middleware.ts` | Auth session refresh (Supabase) |
| `src/app/api/tickets/route.ts` | Create ticket (writes to Cloud SQL) |
| `src/app/api/profiles/[id]/salary/route.ts` | Update profile salary (admin) |
| `cloudsql-schema.sql` | Cloud SQL schema (run once on the instance) |

## Auth Flow

1. User signs up/logs in → Supabase Auth
2. Profile created in `profiles` table with role
3. Middleware refreshes session on each request
4. Server components check `profile.role` for admin access

## Prevailing Wage Formula

```
Adjusted Pay = (76.94 - (hourlyRate + 4.69 + (120 × hourlyRate / 2080))) × hours
```
Where `hourlyRate = yearlySalary / 2080`

## Environment Variables

```
# Auth (Supabase)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Database (Cloud SQL PostgreSQL)
DATABASE_URL=postgresql://user:password@host:5432/dbname
```

For Cloud Run with Cloud SQL socket:  
`DATABASE_URL=postgresql://user:password@/dbname?host=/cloudsql/PROJECT:REGION:INSTANCE`

## Optional: Migrate Auth to Firebase

- [ ] Set up Firebase Auth project
- [ ] Replace `@supabase/ssr` with `firebase-admin` and Firebase client SDK
- [ ] Update `middleware.ts` and login/signup to use Firebase
- [ ] Keep Cloud SQL and `src/lib/db.ts` as-is

## SQL Schema

- **`cloudsql-schema.sql`** – Run once on your Cloud SQL instance. Creates `profiles`, `tickets`, `employee_periods` and triggers (no RLS; auth enforced in the app).
- The legacy `supabase-*.sql` files were for Supabase; use `cloudsql-schema.sql` for Cloud SQL.

