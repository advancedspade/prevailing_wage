-- Migration: Update schema for new workflow
-- Run this in Supabase SQL Editor

-- 1. Add salary field to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS salary numeric(10,2) DEFAULT NULL;

-- 2. Add pdf_url field to tickets
ALTER TABLE public.tickets
ADD COLUMN IF NOT EXISTS pdf_url text DEFAULT NULL;

-- 3. Drop old status constraint and add new one with updated statuses
ALTER TABLE public.tickets
DROP CONSTRAINT IF EXISTS tickets_status_check;

ALTER TABLE public.tickets
ADD CONSTRAINT tickets_status_check
CHECK (status IN ('pending', 'prevailing_wage_entered', 'awaiting_pay', 'upload_to_dir', 'completed'));

-- 4. Fix RLS policies - drop and recreate with better permissions

-- Drop existing ticket policies
DROP POLICY IF EXISTS "Users can view own tickets" ON public.tickets;
DROP POLICY IF EXISTS "Users can create own tickets" ON public.tickets;
DROP POLICY IF EXISTS "Users can update own pending tickets" ON public.tickets;
DROP POLICY IF EXISTS "Admins can view all tickets" ON public.tickets;
DROP POLICY IF EXISTS "Admins can update all tickets" ON public.tickets;

-- Recreate ticket policies with fixes
CREATE POLICY "Users can view own tickets" ON public.tickets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create tickets" ON public.tickets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pending tickets" ON public.tickets
  FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Admins can view all tickets" ON public.tickets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update all tickets" ON public.tickets
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 5. Add policy for admins to update profiles (for setting salary)
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 6. Create storage bucket for PDFs (run this separately if it fails)
-- Note: You may need to create this bucket manually in Supabase Dashboard > Storage
INSERT INTO storage.buckets (id, name, public)
VALUES ('pdfs', 'pdfs', true)
ON CONFLICT (id) DO NOTHING;

-- 7. Storage policies for PDF bucket
CREATE POLICY "Admins can upload PDFs" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'pdfs' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Anyone can view PDFs" ON storage.objects
  FOR SELECT USING (bucket_id = 'pdfs');

