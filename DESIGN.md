# Advanced Spade - Design Document

## What This App Does

Employees submit work tickets (hours worked on prevailing wage projects). Admins review tickets, track pay periods, and generate XML files for DIR submission.

## User Roles

- **Employee**: Submit tickets, view their own tickets
- **Admin**: View all tickets, manage employees, process pay periods, generate XML

---

## File Structure

```
src/
├── app/                    # Next.js App Router (pages & API)
│   ├── layout.tsx          # Root layout (applies to all pages)
│   ├── page.tsx            # Home page (redirects based on role)
│   ├── globals.css         # Global styles (Tailwind)
│   │
│   ├── login/page.tsx      # Login form
│   ├── signup/page.tsx     # Signup form with role selection
│   ├── dashboard/page.tsx  # Employee dashboard (their tickets)
│   ├── tickets/
│   │   ├── page.tsx        # Employee ticket list
│   │   └── new/page.tsx    # New ticket form
│   │
│   ├── admin/              # Admin-only pages
│   │   ├── periods/
│   │   │   ├── page.tsx           # Server component (fetches data)
│   │   │   └── periods-client.tsx # Client component (UI & interactions)
│   │   ├── tickets/page.tsx       # Read-only ticket view
│   │   └── users/
│   │       ├── page.tsx           # Employee list
│   │       └── salary-input.tsx   # Salary edit component
│   │
│   ├── api/                # API routes (server-side)
│   │   ├── generate-period-xml/route.ts  # Creates DIR XML
│   │   └── update-employee-period/route.ts # Updates period status
│   │
│   └── auth/
│       └── signout/route.ts  # Logout handler
│
├── lib/
│   ├── types.ts            # TypeScript types & calculation functions
│   └── supabase/
│       ├── client.ts       # Browser-side Supabase client
│       └── server.ts       # Server-side Supabase client
│
└── middleware.ts           # Auth session refresh on every request
```

---

## How Pages Work

### Server vs Client Components

- **Server Components** (default): Run on server, can fetch data directly
- **Client Components** (`'use client'`): Run in browser, handle user interactions

Example pattern in `/admin/periods/`:
1. `page.tsx` (server) - Fetches all data from database
2. `periods-client.tsx` (client) - Renders UI, handles clicks/modals

### Page Flow

```
User visits /admin/periods
    ↓
middleware.ts checks auth session
    ↓
page.tsx (server) fetches tickets & employee_periods
    ↓
Passes data to PeriodsClient component
    ↓
User clicks "Mark Awaiting Pay"
    ↓
Client calls /api/update-employee-period
    ↓
Page reloads with updated data
```

---

## Key Files Explained

### `src/lib/types.ts`
All shared TypeScript types and business logic:
- `Profile`, `Ticket`, `EmployeePeriod` - Database types
- `calculateAdjustedPay()` - Prevailing wage formula
- `calculateCACCost()` - CAC cost calculation
- `getPayPeriod()` - Determines which pay period a date falls in

### `src/middleware.ts`
Runs before every request. Refreshes the auth session cookie so users stay logged in.

### `src/lib/supabase/server.ts`
Creates a Supabase client for server components. Uses cookies for auth.

### `src/lib/supabase/client.ts`
Creates a Supabase client for browser components.

---

## Database Tables

### `profiles`
One row per user. Created when user signs up.
- Links to Supabase Auth via `id`
- `role` determines admin vs employee access
- `salary` used for wage calculations

### `tickets`
Work entries submitted by employees.
- `user_id` links to profiles
- `date_worked` determines which pay period it belongs to

### `employee_periods`
Tracks workflow status per employee per pay period.
- Composite key: `user_id` + `year` + `month` + `period`
- `status`: pending → awaiting_pay → ready_for_dir

---

## Pay Period Logic

Each month has 2 pay periods:
- **Period 1**: 1st - 15th
- **Period 2**: 16th - end of month

Tickets are grouped by their `date_worked` into these periods.

---

## Workflow

1. **Employee** submits ticket (goes to `pending`)
2. **Admin** clicks "Mark Awaiting Pay" on employee's period
3. **Admin** enters check info and clicks "Ready for DIR"
4. XML file downloads, employee marked as `ready_for_dir`

