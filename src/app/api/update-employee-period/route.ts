import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { parsePayPeriodKey } from '@/lib/types'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  
  // Check auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { periodKey, userId, status } = await request.json()
  
  // Parse period key
  const { year, month, period } = parsePayPeriodKey(periodKey)

  // Upsert employee_period record
  const { data, error } = await supabase
    .from('employee_periods')
    .upsert({
      user_id: userId,
      year,
      month,
      period,
      status,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,year,month,period'
    })
    .select()
    .single()

  if (error) {
    console.error('Error updating employee period:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, data })
}

