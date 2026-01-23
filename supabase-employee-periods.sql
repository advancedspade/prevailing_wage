-- Create employee_periods table to track status per employee per pay period
-- Run this in Supabase SQL Editor

CREATE TABLE public.employee_periods (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  year integer NOT NULL,
  month integer NOT NULL,
  period smallint NOT NULL CHECK (period IN (1, 2)),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'awaiting_pay', 'ready_for_dir')),
  hourly_wage numeric(10, 2),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(user_id, year, month, period)
);

-- Enable RLS
ALTER TABLE public.employee_periods ENABLE ROW LEVEL SECURITY;

-- Admin can do everything
CREATE POLICY "Admins can view all employee_periods" ON public.employee_periods
  FOR SELECT USING (is_admin());

CREATE POLICY "Admins can insert employee_periods" ON public.employee_periods
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Admins can update employee_periods" ON public.employee_periods
  FOR UPDATE USING (is_admin());

-- Employees can view their own periods
CREATE POLICY "Users can view own employee_periods" ON public.employee_periods
  FOR SELECT USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_employee_periods_lookup ON public.employee_periods(year, month, period);
CREATE INDEX idx_employee_periods_user ON public.employee_periods(user_id);

-- Update trigger for updated_at
CREATE TRIGGER update_employee_periods_updated_at
  BEFORE UPDATE ON public.employee_periods
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

