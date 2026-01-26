import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { parsePayPeriodKey, formatPayPeriodLabel, calculateAdjustedPay, calculateHourlyRate, PREVAILING_WAGE_CONSTANTS } from '@/lib/types'

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

  const { periodKey, userId, yearlySalary } = await request.json()

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

  // Calculate totals using the new formula
  const hourlyRate = calculateHourlyRate(yearlySalary) || 0
  const totalHours = tickets?.reduce((sum, t) => sum + Number(t.hours_worked), 0) || 0
  const totalAdjustedPay = tickets?.reduce((sum, t) => {
    const adjustedPay = calculateAdjustedPay(Number(t.hours_worked), yearlySalary)
    return sum + (adjustedPay || 0)
  }, 0) || 0

  // Get unique DIR numbers and projects
  const dirNumbers = [...new Set(tickets?.map(t => t.dir_number) || [])]
  const projects = [...new Set(tickets?.map(t => t.project_title) || [])]

  // Generate XML with new calculation details
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
    <YearlySalary>${yearlySalary.toFixed(2)}</YearlySalary>
    <HourlyRate>${hourlyRate.toFixed(2)}</HourlyRate>
  </Employee>
  <WageCalculation>
    <BaseRate>${PREVAILING_WAGE_CONSTANTS.BASE_RATE.toFixed(2)}</BaseRate>
    <FixedDeduction>${PREVAILING_WAGE_CONSTANTS.FIXED_DEDUCTION.toFixed(2)}</FixedDeduction>
    <AdjustmentFactor>${((PREVAILING_WAGE_CONSTANTS.ADJUSTMENT_HOURS * hourlyRate) / PREVAILING_WAGE_CONSTANTS.HOURS_PER_YEAR).toFixed(2)}</AdjustmentFactor>
    <Formula>AdjustedPay = (BaseRate - (HourlyRate + FixedDeduction + AdjustmentFactor)) × Hours</Formula>
  </WageCalculation>
  <WorkSummary>
    <TotalHours>${totalHours.toFixed(2)}</TotalHours>
    <TotalAdjustedPay>${totalAdjustedPay.toFixed(2)}</TotalAdjustedPay>
  </WorkSummary>
  <Projects>
${projects.map(p => `    <Project>${p}</Project>`).join('\n')}
  </Projects>
  <DIRNumbers>
${dirNumbers.map(d => `    <DIRNumber>${d}</DIRNumber>`).join('\n')}
  </DIRNumbers>
  <TicketDetails>
${tickets?.map(t => {
    const ticketAdjustedPay = calculateAdjustedPay(Number(t.hours_worked), yearlySalary) || 0
    return `    <Ticket>
      <Date>${t.date_worked}</Date>
      <DIRNumber>${t.dir_number}</DIRNumber>
      <Project>${t.project_title}</Project>
      <Hours>${t.hours_worked}</Hours>
      <AdjustedPay>${ticketAdjustedPay.toFixed(2)}</AdjustedPay>
    </Ticket>`
  }).join('\n') || ''}
  </TicketDetails>
  <GeneratedAt>${new Date().toISOString()}</GeneratedAt>
</DIRSubmission>`

  // Update employee_period status to ready_for_dir and save hourly rate
  await supabase
    .from('employee_periods')
    .upsert({
      user_id: userId,
      year,
      month,
      period,
      status: 'ready_for_dir',
      hourly_wage: hourlyRate,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,year,month,period'
    })

  return NextResponse.json({ xml })
}

