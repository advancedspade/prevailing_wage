import { getAuthUserAndProfile } from '@/lib/auth-db'
import { query } from '@/lib/db'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getPayPeriod, getPayPeriodKey, calculateAdjustedPay } from '@/lib/types'
import type { Profile, Ticket, EmployeePeriodStatus } from '@/lib/types'
import { PeriodsClient } from './periods-client'

interface EmployeeData {
  profile: Profile
  tickets: Ticket[]
  totalHours: number
  totalAdjustedPay: number | null
  periodStatus: EmployeePeriodStatus
  employeePeriodId?: string
  hourlyWage?: number | null
}

interface PeriodData {
  key: string
  label: string
  year: number
  month: number
  period: 1 | 2
  employees: EmployeeData[]
}

interface TicketRow {
  id: string
  user_id: string
  dir_number: string
  project_title: string
  date_worked: string
  hours_worked: number
  status: string
  created_at: string
  updated_at: string
  profile_id: string
  profile_email: string
  profile_full_name: string | null
  profile_role: string
  profile_salary: number | null
  profile_created_at: string
  profile_updated_at: string
}

export default async function PayPeriodsPage() {
  const { user, profile } = await getAuthUserAndProfile()

  if (!user) {
    redirect('/login')
  }

  if (profile?.role !== 'admin') {
    redirect('/dashboard')
  }

  const { rows: ticketRows } = await query<TicketRow>(
    `SELECT t.id, t.user_id, t.dir_number, t.project_title, t.date_worked, t.hours_worked, t.status, t.created_at, t.updated_at,
            p.id as profile_id, p.email as profile_email, p.full_name as profile_full_name, p.role as profile_role,
            p.salary as profile_salary, p.created_at as profile_created_at, p.updated_at as profile_updated_at
     FROM public.tickets t
     JOIN public.profiles p ON p.id = t.user_id
     ORDER BY t.date_worked DESC`
  )
  const ticketsWithProfile = ticketRows.map((t) => ({
    id: t.id,
    user_id: t.user_id,
    dir_number: t.dir_number,
    project_title: t.project_title,
    date_worked: t.date_worked,
    hours_worked: t.hours_worked,
    status: t.status,
    created_at: t.created_at,
    updated_at: t.updated_at,
    profile: {
      id: t.profile_id,
      email: t.profile_email,
      full_name: t.profile_full_name,
      role: t.profile_role,
      salary: t.profile_salary,
      created_at: t.profile_created_at,
      updated_at: t.profile_updated_at,
    },
  }))

  const { rows: employeePeriods } = await query(
    'SELECT * FROM public.employee_periods'
  )

  // Build a lookup for employee period statuses
  const periodStatusMap = new Map<string, { status: EmployeePeriodStatus; id: string; hourlyWage: number | null }>()
  employeePeriods?.forEach(ep => {
    const key = `${ep.user_id}-${ep.year}-${ep.month}-${ep.period}`
    periodStatusMap.set(key, { status: ep.status, id: ep.id, hourlyWage: ep.hourly_wage })
  })

  // Group tickets by pay period, then by employee
  const periodMap = new Map<string, PeriodData>()
  const employeeTickets = new Map<string, { profile: Profile; tickets: Ticket[] }>()

  ticketsWithProfile?.forEach((ticket) => {
    const date = new Date(ticket.date_worked)
    const payPeriod = getPayPeriod(date)
    const periodKey = getPayPeriodKey(payPeriod.year, payPeriod.month, payPeriod.period)
    const empKey = `${periodKey}-${ticket.user_id}`

    if (!periodMap.has(periodKey)) {
      periodMap.set(periodKey, {
        key: periodKey,
        label: payPeriod.label,
        year: payPeriod.year,
        month: payPeriod.month,
        period: payPeriod.period,
        employees: []
      })
    }

    if (!employeeTickets.has(empKey)) {
      employeeTickets.set(empKey, {
        profile: ticket.profile as Profile,
        tickets: []
      })
    }

    employeeTickets.get(empKey)!.tickets.push(ticket)
  })

  // Build employee data for each period
  periodMap.forEach((periodData) => {
    const employees: EmployeeData[] = []

    employeeTickets.forEach((empData, empKey) => {
      if (!empKey.startsWith(periodData.key)) return

      const totalHours = empData.tickets.reduce((sum, t) => sum + Number(t.hours_worked), 0)
      const userId = empData.profile.id
      const statusKey = `${userId}-${periodData.year}-${periodData.month}-${periodData.period}`
      const periodStatusData = periodStatusMap.get(statusKey)

      // Calculate total adjusted pay using the new formula
      // If salary is not set, totalAdjustedPay will be null
      const yearlySalary = empData.profile.salary
      let totalAdjustedPay: number | null = null
      if (yearlySalary) {
        totalAdjustedPay = empData.tickets.reduce((sum, t) => {
          const adjustedPay = calculateAdjustedPay(Number(t.hours_worked), yearlySalary)
          return sum + (adjustedPay || 0)
        }, 0)
      }

      employees.push({
        profile: empData.profile,
        tickets: empData.tickets.sort((a, b) => new Date(a.date_worked).getTime() - new Date(b.date_worked).getTime()),
        totalHours,
        totalAdjustedPay,
        periodStatus: periodStatusData?.status || 'pending',
        employeePeriodId: periodStatusData?.id,
        hourlyWage: periodStatusData?.hourlyWage
      })
    })

    periodData.employees = employees.sort((a, b) =>
      (a.profile.full_name || a.profile.email).localeCompare(b.profile.full_name || b.profile.email)
    )
  })

  // Sort periods by date (newest first)
  const periods = Array.from(periodMap.values()).sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year
    if (a.month !== b.month) return b.month - a.month
    return b.period - a.period
  })

  return (
    <div className="min-h-screen" style={{ background: '#e8e8e8' }}>
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-xl font-light tracking-tight" style={{ color: '#1a1a2e' }}>
                Advanced Spade
              </Link>
              <span style={{ color: '#d1d1d1' }}>/</span>
              <span className="text-sm" style={{ color: '#6b7280' }}>Pay Periods</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-light tracking-tight mb-6" style={{ color: '#1a1a2e' }}>
          Pay Periods
        </h2>

        <PeriodsClient periods={periods} />
      </main>
    </div>
  )
}

