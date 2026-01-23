import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { parsePayPeriodKey, formatPayPeriodLabel } from '@/lib/types'

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

  const { periodKey, userId, wage } = await request.json()

  // Parse period
  const { year, month, period } = parsePayPeriodKey(periodKey)
  const periodLabel = formatPayPeriodLabel(year, month, period)
  
  // Calculate date range
  const startDay = period === 1 ? 1 : 16
  const endDay = period === 1 ? 15 : new Date(year, month + 1, 0).getDate()
  const startDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`
  const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`

  // Get employee
  const { data: employee } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  // Get tickets for this employee in this period
  const { data: tickets } = await supabase
    .from('tickets')
    .select('*')
    .eq('user_id', userId)
    .gte('date_worked', startDate)
    .lte('date_worked', endDate)
    .order('date_worked', { ascending: true })

  // Calculate totals
  const totalHours = tickets?.reduce((sum, t) => sum + Number(t.hours_worked), 0) || 0
  const totalAdjustedHours = totalHours * 1.25
  const totalPay = totalAdjustedHours * wage

  // Get unique DIR numbers and projects
  const dirNumbers = [...new Set(tickets?.map(t => t.dir_number) || [])]
  const projects = [...new Set(tickets?.map(t => t.project_title) || [])]

  // Generate XML
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<DIRSubmission>
  <PayPeriod>
    <Label>${periodLabel}</Label>
    <StartDate>${startDate}</StartDate>
    <EndDate>${endDate}</EndDate>
  </PayPeriod>
  <Employee>
    <Name>${employee?.full_name || 'Unknown'}</Name>
    <Email>${employee?.email || ''}</Email>
  </Employee>
  <WorkSummary>
    <TotalHours>${totalHours.toFixed(2)}</TotalHours>
    <AdjustedHours>${totalAdjustedHours.toFixed(2)}</AdjustedHours>
    <HourlyWage>${wage.toFixed(2)}</HourlyWage>
    <TotalPay>${totalPay.toFixed(2)}</TotalPay>
  </WorkSummary>
  <Projects>
${projects.map(p => `    <Project>${p}</Project>`).join('\n')}
  </Projects>
  <DIRNumbers>
${dirNumbers.map(d => `    <DIRNumber>${d}</DIRNumber>`).join('\n')}
  </DIRNumbers>
  <TicketDetails>
${tickets?.map(t => `    <Ticket>
      <Date>${t.date_worked}</Date>
      <DIRNumber>${t.dir_number}</DIRNumber>
      <Project>${t.project_title}</Project>
      <Hours>${t.hours_worked}</Hours>
      <AdjustedHours>${(Number(t.hours_worked) * 1.25).toFixed(2)}</AdjustedHours>
    </Ticket>`).join('\n') || ''}
  </TicketDetails>
  <GeneratedAt>${new Date().toISOString()}</GeneratedAt>
</DIRSubmission>`

  // Update employee_period status to ready_for_dir and save wage
  await supabase
    .from('employee_periods')
    .upsert({
      user_id: userId,
      year,
      month,
      period,
      status: 'ready_for_dir',
      hourly_wage: wage,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,year,month,period'
    })

  return NextResponse.json({ xml })
}

