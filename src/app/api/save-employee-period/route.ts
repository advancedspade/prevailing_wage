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
    yearlySalary
  } = await request.json()

  const { year, month, period } = parsePayPeriodKey(periodKey)
  const hourlyRate = calculateHourlyRate(yearlySalary) || 0

  // Save employee period data - mark as ready for DIR
  await query(
    `INSERT INTO public.employee_periods (user_id, year, month, period, status, hourly_wage)
     VALUES ($1, $2, $3, $4, 'ready_for_dir', $5)
     ON CONFLICT (user_id, year, month, period)
     DO UPDATE SET
       status = 'ready_for_dir',
       hourly_wage = EXCLUDED.hourly_wage,
       updated_at = now()`,
    [userId, year, month, period, hourlyRate]
  )

  return NextResponse.json({ success: true })
}

