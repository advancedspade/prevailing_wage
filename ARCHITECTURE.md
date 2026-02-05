# Advanced Spade - Architecture & GCP Migration Guide

## Overview

Prevailing wage tracking app for employees to submit work tickets and admins to manage pay periods and generate DIR XML files.

## Tech Stack

| Current | GCP Equivalent |
|---------|----------------|
| Next.js 16 | Keep (deploy to Cloud Run) |
| Supabase Auth | Firebase Auth / Identity Platform |
| Supabase PostgreSQL | Cloud SQL (PostgreSQL) |
| Supabase RLS | Cloud SQL + app-level auth checks |
| Vercel | Cloud Run or App Engine |

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

| File | Purpose | Supabase Dependency |
|------|---------|---------------------|
| `src/lib/supabase/client.ts` | Browser Supabase client | Replace |
| `src/lib/supabase/server.ts` | Server Supabase client | Replace |
| `src/middleware.ts` | Auth session refresh | Replace |
| `src/lib/types.ts` | Types & calculations | Keep |
| `src/app/api/*` | API routes | Update DB calls |

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

## GCP Migration Steps

### 1. Database (Cloud SQL)
- [ ] Create Cloud SQL PostgreSQL instance
- [ ] Run schema migrations (see `supabase-*.sql` files)
- [ ] Update connection in `src/lib/supabase/server.ts` → use `pg` or Prisma

### 2. Auth (Firebase)
- [ ] Set up Firebase Auth project
- [ ] Replace `@supabase/ssr` with `firebase-admin`
- [ ] Update `middleware.ts` to verify Firebase tokens
- [ ] Update login/signup pages to use Firebase client SDK

### 3. Deploy (Cloud Run)
- [ ] Create Dockerfile for Next.js
- [ ] Set environment variables in Cloud Run
- [ ] Deploy with `gcloud run deploy`

### 4. Environment Variables
```
# Current (Supabase)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# GCP (replace with)
DATABASE_URL=postgresql://...
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```

## SQL Migration Files

- `supabase-schema.sql` - Initial tables (profiles, tickets)
- `supabase-fix-rls.sql` - RLS policies & security definer function
- `supabase-employee-periods.sql` - Employee periods table

These can be run directly on Cloud SQL PostgreSQL (remove RLS policies if not using Supabase).

