import { getAuthUserAndProfile } from '@/lib/auth-db'
import { query, queryOne } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { parsePayPeriodKey, formatPayPeriodLabel, calculateAdjustedPay, calculateHourlyRate, PREVAILING_WAGE_CONSTANTS } from '@/lib/types'
import type { Profile, Ticket } from '@/lib/types'

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
    federalTax,
    fica,
    stateTax,
    sdi,
    savings,
    total,
    grossWages
  } = await request.json()

  const { year, month, period } = parsePayPeriodKey(periodKey)
  const periodLabel = formatPayPeriodLabel(year, month, period)

  const startDay = period === 1 ? 1 : 16
  const endDay = period === 1 ? 15 : new Date(year, month + 1, 0).getDate()
  const startDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`
  const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`

  const employee = await queryOne<Profile>(
    'SELECT * FROM public.profiles WHERE id = $1',
    [userId]
  )

  const { rows: tickets } = await query<Ticket>(
    `SELECT * FROM public.tickets WHERE user_id = $1 AND date_worked >= $2 AND date_worked <= $3 ORDER BY date_worked ASC`,
    [userId, startDate, endDate]
  )

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
  <CheckInformation>
    <CheckNumber>${checkNumber || ''}</CheckNumber>
    <GrossWages>${grossWages.toFixed(2)}</GrossWages>
    <FederalTax>${federalTax.toFixed(2)}</FederalTax>
    <FICA>${fica.toFixed(2)}</FICA>
    <StateTax>${stateTax.toFixed(2)}</StateTax>
    <SDI>${sdi.toFixed(2)}</SDI>
    <Savings>${savings.toFixed(2)}</Savings>
    <Total>${total.toFixed(2)}</Total>
  </CheckInformation>
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

  await query(
    `INSERT INTO public.employee_periods (user_id, year, month, period, status, hourly_wage)
     VALUES ($1, $2, $3, $4, 'ready_for_dir', $5)
     ON CONFLICT (user_id, year, month, period)
     DO UPDATE SET status = 'ready_for_dir', hourly_wage = EXCLUDED.hourly_wage, updated_at = now()`,
    [userId, year, month, period, hourlyRate]
  )

  return NextResponse.json({ xml })
}

