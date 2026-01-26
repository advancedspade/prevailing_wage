import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getPayPeriod, getPayPeriodKey, calculateAdjustedPay } from '@/lib/types'
import type { Profile, Ticket, EmployeePeriodStatus } from '@/lib/types'
import { PeriodsClient } from './periods-client'

interface EmployeeData {
  profile: Profile
  tickets: Ticket[]
  totalHours: number
  totalAdjustedPay: number | null  // null means salary not set
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

export default async function PayPeriodsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    redirect('/dashboard')
  }

  // Get all tickets with profiles
  const { data: tickets } = await supabase
    .from('tickets')
    .select('*, profile:profiles(*)')
    .order('date_worked', { ascending: false })

  // Get all employee_periods
  const { data: employeePeriods } = await supabase
    .from('employee_periods')
    .select('*')

  // Build a lookup for employee period statuses
  const periodStatusMap = new Map<string, { status: EmployeePeriodStatus; id: string; hourlyWage: number | null }>()
  employeePeriods?.forEach(ep => {
    const key = `${ep.user_id}-${ep.year}-${ep.month}-${ep.period}`
    periodStatusMap.set(key, { status: ep.status, id: ep.id, hourlyWage: ep.hourly_wage })
  })

  // Group tickets by pay period, then by employee
  const periodMap = new Map<string, PeriodData>()
  const employeeTickets = new Map<string, { profile: Profile; tickets: Ticket[] }>()

  tickets?.forEach((ticket) => {
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

