-- Migration: Add check/payroll information columns to employee_periods
-- Run this on Cloud SQL PostgreSQL

ALTER TABLE public.employee_periods
ADD COLUMN IF NOT EXISTS check_number text,
ADD COLUMN IF NOT EXISTS gross_wages numeric(10, 2),
ADD COLUMN IF NOT EXISTS federal_tax numeric(10, 2),
ADD COLUMN IF NOT EXISTS fica numeric(10, 2),
ADD COLUMN IF NOT EXISTS state_tax numeric(10, 2),
ADD COLUMN IF NOT EXISTS sdi numeric(10, 2),
ADD COLUMN IF NOT EXISTS savings numeric(10, 2),
ADD COLUMN IF NOT EXISTS net_pay numeric(10, 2);

-- Add comment for documentation
COMMENT ON COLUMN public.employee_periods.check_number IS 'Check/payroll reference number';
COMMENT ON COLUMN public.employee_periods.gross_wages IS 'Gross wages for this period';
COMMENT ON COLUMN public.employee_periods.federal_tax IS 'Federal tax withholding';
COMMENT ON COLUMN public.employee_periods.fica IS 'FICA/Social Security withholding';
COMMENT ON COLUMN public.employee_periods.state_tax IS 'State tax withholding';
COMMENT ON COLUMN public.employee_periods.sdi IS 'State Disability Insurance';
COMMENT ON COLUMN public.employee_periods.savings IS 'Savings/retirement deduction';
COMMENT ON COLUMN public.employee_periods.net_pay IS 'Net pay (total after deductions)';

