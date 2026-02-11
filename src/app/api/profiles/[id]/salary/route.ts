import { getAuthUserAndProfile } from '@/lib/auth-db'
import { query } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, profile } = await getAuthUserAndProfile()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id: userId } = await params
  if (!userId) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }
  const body = await _request.json()
  const salary = body.salary != null ? parseFloat(String(body.salary)) : null
  if (salary !== null && (isNaN(salary) || salary < 0)) {
    return NextResponse.json({ error: 'Invalid salary' }, { status: 400 })
  }

  await query(
    'UPDATE public.profiles SET salary = $1 WHERE id = $2',
    [salary, userId]
  )
  return NextResponse.json({ ok: true })
}
