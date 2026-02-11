-- Cloud SQL PostgreSQL schema for Prevailing Wage Tracker
-- Database name: prevailing_wage
--
-- Create the database first (run once, before this file):
--   psql -U postgres -c "CREATE DATABASE prevailing_wage;"
-- Or use the script: psql -U postgres -f create-db.sql
--
-- Then run this schema inside that database:
--   psql -U postgres -d prevailing_wage -f cloudsql-schema.sql
--
-- Works for: local PostgreSQL, Cloud SQL, or any Postgres instance.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles (id = app user uuid; auth_provider + auth_id link to Google OAuth)
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_provider text,
  auth_id text,
  email text NOT NULL,
  full_name text,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  salary numeric(10, 2) DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_profiles_auth ON public.profiles (auth_provider, auth_id)
  WHERE auth_provider IS NOT NULL AND auth_id IS NOT NULL;

-- Tickets
CREATE TABLE public.tickets (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  dir_number text NOT NULL,
  project_title text NOT NULL,
  date_worked date NOT NULL,
  hours_worked numeric(5, 2) NOT NULL CHECK (hours_worked > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'approved', 'rejected', 'awaiting_pay', 'ready_for_dir')),
  pdf_url text DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Employee periods (per employee per pay period)
CREATE TABLE public.employee_periods (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  year integer NOT NULL,
  month integer NOT NULL,
  period smallint NOT NULL CHECK (period IN (1, 2)),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'awaiting_pay', 'ready_for_dir')),
  hourly_wage numeric(10, 2),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, year, month, period)
);

-- updated_at trigger helper
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at();

CREATE TRIGGER tickets_updated_at
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at();

CREATE TRIGGER employee_periods_updated_at
  BEFORE UPDATE ON public.employee_periods
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at();

-- Indexes
CREATE INDEX idx_tickets_user_id ON public.tickets(user_id);
CREATE INDEX idx_tickets_created_at ON public.tickets(created_at);
CREATE INDEX idx_tickets_date_worked ON public.tickets(date_worked);
CREATE INDEX idx_employee_periods_lookup ON public.employee_periods(year, month, period);
CREATE INDEX idx_employee_periods_user ON public.employee_periods(user_id);
