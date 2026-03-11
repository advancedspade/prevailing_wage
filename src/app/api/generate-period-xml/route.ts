import { getAuthUserAndProfile } from '@/lib/auth-db'
import { query } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { parsePayPeriodKey, formatPayPeriodLabel, calculateAdjustedPay, calculateHourlyRate, PREVAILING_WAGE_CONSTANTS } from '@/lib/types'
import type { Profile, Ticket } from '@/lib/types'

interface EmployeePeriodRow {
  user_id: string
  hourly_wage: number | null
  check_number: string | null
  gross_wages: number | null
  federal_tax: number | null
  fica: number | null
  state_tax: number | null
  sdi: number | null
  savings: number | null
  net_pay: number | null
}

export async function POST(request: NextRequest) {
  const { user, profile } = await getAuthUserAndProfile()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { periodKey } = await request.json()
    const { year, month, period } = parsePayPeriodKey(periodKey)
  const periodLabel = formatPayPeriodLabel(year, month, period)

  const startDay = period === 1 ? 1 : 16
  const endDay = period === 1 ? 15 : new Date(year, month + 1, 0).getDate()
  const startDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`
  const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`

  // Get all employees who are ready for DIR in this period (with check info)
  const { rows: employeePeriods } = await query<EmployeePeriodRow>(
    `SELECT user_id, hourly_wage, check_number, gross_wages, federal_tax, fica, state_tax, sdi, savings, net_pay
     FROM public.employee_periods
     WHERE year = $1 AND month = $2 AND period = $3 AND status = 'ready_for_dir'`,
    [year, month, period]
  )

  if (employeePeriods.length === 0) {
    return NextResponse.json({ error: 'No employees ready for DIR in this period' }, { status: 400 })
  }

  // Get all employee profiles
  const userIds = employeePeriods.map(ep => ep.user_id)
  const { rows: employees } = await query<Profile>(
    `SELECT * FROM public.profiles WHERE id = ANY($1)`,
    [userIds]
  )

  // Get all tickets for these employees in this period
  const { rows: allTickets } = await query<Ticket & { user_id: string }>(
    `SELECT * FROM public.tickets
     WHERE user_id = ANY($1) AND date_worked >= $2 AND date_worked <= $3
     ORDER BY user_id, date_worked ASC`,
    [userIds, startDate, endDate]
  )

  // Build employee sections
  const employeeSections = employees.map(emp => {
    const empPeriod = employeePeriods.find(ep => ep.user_id === emp.id)
    // Convert salary from string (pg returns numeric as string)
    const yearlySalary = Number(emp.salary) || 0
    const hourlyRate = calculateHourlyRate(yearlySalary) || 0
    const empTickets = allTickets.filter(t => t.user_id === emp.id)

    const totalHours = empTickets.reduce((sum, t) => sum + Number(t.hours_worked), 0)
    const totalAdjustedPay = empTickets.reduce((sum, t) => {
      const adjustedPay = calculateAdjustedPay(Number(t.hours_worked), yearlySalary)
      return sum + (adjustedPay || 0)
    }, 0)

    const ticketDetails = empTickets.map(t => {
      const ticketAdjustedPay = calculateAdjustedPay(Number(t.hours_worked), yearlySalary) || 0
      return `      <Ticket>
        <Date>${t.date_worked}</Date>
        <DIRNumber>${t.dir_number}</DIRNumber>
        <Project>${t.project_title}</Project>
        <Hours>${Number(t.hours_worked).toFixed(2)}</Hours>
        <AdjustedPay>${ticketAdjustedPay.toFixed(2)}</AdjustedPay>
      </Ticket>`
    }).join('\n')

    // Build check information section (convert strings to numbers - pg returns numeric as string)
    const checkInfo = empPeriod ? `      <CheckInformation>
        <CheckNumber>${empPeriod.check_number || ''}</CheckNumber>
        <GrossWages>${Number(empPeriod.gross_wages || 0).toFixed(2)}</GrossWages>
        <FederalTax>${Number(empPeriod.federal_tax || 0).toFixed(2)}</FederalTax>
        <FICA>${Number(empPeriod.fica || 0).toFixed(2)}</FICA>
        <StateTax>${Number(empPeriod.state_tax || 0).toFixed(2)}</StateTax>
        <SDI>${Number(empPeriod.sdi || 0).toFixed(2)}</SDI>
        <Savings>${Number(empPeriod.savings || 0).toFixed(2)}</Savings>
        <NetPay>${Number(empPeriod.net_pay || 0).toFixed(2)}</NetPay>
      </CheckInformation>` : ''

    return `    <Employee>
      <Name>${emp.full_name || 'Unknown'}</Name>
      <Email>${emp.email || ''}</Email>
      <YearlySalary>${yearlySalary.toFixed(2)}</YearlySalary>
      <HourlyRate>${hourlyRate.toFixed(2)}</HourlyRate>
      <TotalHours>${totalHours.toFixed(2)}</TotalHours>
      <TotalAdjustedPay>${totalAdjustedPay.toFixed(2)}</TotalAdjustedPay>
${checkInfo}
      <Tickets>
${ticketDetails}
      </Tickets>
    </Employee>`
  }).join('\n')

  // Calculate period totals
  const periodTotalHours = allTickets.reduce((sum, t) => sum + Number(t.hours_worked), 0)
  const periodTotalAdjustedPay = employees.reduce((sum, emp) => {
    const empTickets = allTickets.filter(t => t.user_id === emp.id)
    return sum + empTickets.reduce((s, t) => {
      const adjustedPay = calculateAdjustedPay(Number(t.hours_worked), Number(emp.salary) || 0)
      return s + (adjustedPay || 0)
    }, 0)
  }, 0)

  // Get unique DIR numbers and projects across all employees
  const dirNumbers = [...new Set(allTickets.map(t => t.dir_number))]
  const projects = [...new Set(allTickets.map(t => t.project_title))]

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<DIRSubmission>
  <PayPeriod>
    <Label>${periodLabel}</Label>
    <StartDate>${startDate}</StartDate>
    <EndDate>${endDate}</EndDate>
  </PayPeriod>
  <EmployeeCount>${employees.length}</EmployeeCount>
  <Employees>
${employeeSections}
  </Employees>
  <WageCalculation>
    <BaseRate>${PREVAILING_WAGE_CONSTANTS.BASE_RATE.toFixed(2)}</BaseRate>
    <FixedDeduction>${PREVAILING_WAGE_CONSTANTS.FIXED_DEDUCTION.toFixed(2)}</FixedDeduction>
    <Formula>AdjustedPay = (BaseRate - (HourlyRate + FixedDeduction + AdjustmentFactor)) × Hours</Formula>
  </WageCalculation>
  <PeriodSummary>
    <TotalHours>${periodTotalHours.toFixed(2)}</TotalHours>
    <TotalAdjustedPay>${periodTotalAdjustedPay.toFixed(2)}</TotalAdjustedPay>
  </PeriodSummary>
  <Projects>
${projects.map(p => `    <Project>${p}</Project>`).join('\n')}
  </Projects>
  <DIRNumbers>
${dirNumbers.map(d => `    <DIRNumber>${d}</DIRNumber>`).join('\n')}
  </DIRNumbers>
  <GeneratedAt>${new Date().toISOString()}</GeneratedAt>
</DIRSubmission>`

  return NextResponse.json({ xml })
  } catch (error) {
    console.error('Generate XML error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to generate XML' }, { status: 500 })
  }
}

