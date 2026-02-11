import { getAuthUserAndProfile } from '@/lib/auth-db'
import { query } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { user } = await getAuthUserAndProfile()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { dir_number, project_title, date_worked, hours_worked } = body
  if (!dir_number || !project_title || !date_worked || hours_worked == null) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const hours = parseFloat(String(hours_worked))
  if (isNaN(hours) || hours <= 0) {
    return NextResponse.json({ error: 'Invalid hours_worked' }, { status: 400 })
  }

  await query(
    `INSERT INTO public.tickets (user_id, dir_number, project_title, date_worked, hours_worked, status)
     VALUES ($1, $2, $3, $4, $5, 'pending')`,
    [user.id, dir_number, project_title, date_worked, hours]
  )
  return NextResponse.json({ ok: true })
}
