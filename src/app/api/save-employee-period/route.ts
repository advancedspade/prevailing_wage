import { getAuthUserAndProfile } from '@/lib/auth-db'
import { query } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { parsePayPeriodKey, calculateHourlyRate } from '@/lib/types'

export async function POST(request: NextRequest) {
  const { user, profile } = await getAuthUserAndProfile()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const {
    periodKey,
    userId,
    yearlySalary,
    checkNumber,
    grossWages,
    federalTax,
    fica,
    stateTax,
    sdi,
    savings,
    netPay
  } = await request.json()

  const { year, month, period } = parsePayPeriodKey(periodKey)
  const hourlyRate = calculateHourlyRate(yearlySalary) || 0

  // Save employee period data with check info - mark as ready for DIR
  await query(
    `INSERT INTO public.employee_periods (
      user_id, year, month, period, status, hourly_wage,
      check_number, gross_wages, federal_tax, fica, state_tax, sdi, savings, net_pay
    )
    VALUES ($1, $2, $3, $4, 'ready_for_dir', $5, $6, $7, $8, $9, $10, $11, $12, $13)
    ON CONFLICT (user_id, year, month, period)
    DO UPDATE SET
      status = 'ready_for_dir',
      hourly_wage = EXCLUDED.hourly_wage,
      check_number = EXCLUDED.check_number,
      gross_wages = EXCLUDED.gross_wages,
      federal_tax = EXCLUDED.federal_tax,
      fica = EXCLUDED.fica,
      state_tax = EXCLUDED.state_tax,
      sdi = EXCLUDED.sdi,
      savings = EXCLUDED.savings,
      net_pay = EXCLUDED.net_pay,
      updated_at = now()`,
    [userId, year, month, period, hourlyRate, checkNumber || null, grossWages || null, federalTax || null, fica || null, stateTax || null, sdi || null, savings || null, netPay || null]
  )

  return NextResponse.json({ success: true })
}

