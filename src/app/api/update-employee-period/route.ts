import { getAuthUserAndProfile } from '@/lib/auth-db'
import { query, queryOne } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { parsePayPeriodKey } from '@/lib/types'
import type { EmployeePeriod } from '@/lib/types'

export async function POST(request: NextRequest) {
  const { user, profile } = await getAuthUserAndProfile()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { periodKey, userId, status } = await request.json()
  const { year, month, period } = parsePayPeriodKey(periodKey)

  await query(
    `INSERT INTO public.employee_periods (user_id, year, month, period, status)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id, year, month, period)
     DO UPDATE SET status = EXCLUDED.status, updated_at = now()`,
    [userId, year, month, period, status]
  )

  const data = await queryOne<EmployeePeriod>(
    `SELECT * FROM public.employee_periods WHERE user_id = $1 AND year = $2 AND month = $3 AND period = $4`,
    [userId, year, month, period]
  )
  return NextResponse.json({ success: true, data })
}

