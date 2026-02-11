-- Run this on your existing Cloud SQL database to support Google OAuth (NextAuth).
-- Adds columns to link profiles to Google identity. New installs: add these to cloudsql-schema.sql instead.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS auth_provider text,
  ADD COLUMN IF NOT EXISTS auth_id text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_auth ON public.profiles (auth_provider, auth_id)
  WHERE auth_provider IS NOT NULL AND auth_id IS NOT NULL;

COMMENT ON COLUMN public.profiles.auth_provider IS 'e.g. google';
COMMENT ON COLUMN public.profiles.auth_id IS 'Provider user id, e.g. Google sub';