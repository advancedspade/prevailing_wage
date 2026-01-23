import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getPayPeriod, getPayPeriodKey, formatPayPeriodLabel } from '@/lib/types'

interface PeriodSummary {
  key: string
  label: string
  year: number
  month: number
  period: 1 | 2
  ticketCount: number
  employeeCount: number
  totalAdjustedHours: number
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

  // Get all tickets
  const { data: tickets } = await supabase
    .from('tickets')
    .select('*, profile:profiles(*)')
    .order('date_worked', { ascending: false })

  // Group tickets by pay period
  const periodMap = new Map<string, PeriodSummary>()
  const employeesPerPeriod = new Map<string, Set<string>>()

  tickets?.forEach((ticket) => {
    const date = new Date(ticket.date_worked)
    const payPeriod = getPayPeriod(date)
    const key = getPayPeriodKey(payPeriod.year, payPeriod.month, payPeriod.period)
    
    if (!periodMap.has(key)) {
      periodMap.set(key, {
        key,
        label: payPeriod.label,
        year: payPeriod.year,
        month: payPeriod.month,
        period: payPeriod.period,
        ticketCount: 0,
        employeeCount: 0,
        totalAdjustedHours: 0
      })
      employeesPerPeriod.set(key, new Set())
    }

    const summary = periodMap.get(key)!
    summary.ticketCount++
    summary.totalAdjustedHours += Number(ticket.hours_worked) * 1.25
    employeesPerPeriod.get(key)!.add(ticket.user_id)
  })

  // Update employee counts
  periodMap.forEach((summary, key) => {
    summary.employeeCount = employeesPerPeriod.get(key)?.size || 0
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
        
        <div className="bg-white border border-gray-200 overflow-hidden">
          {periods.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {periods.map((period) => (
                <Link
                  key={period.key}
                  href={`/admin/periods/${period.key}`}
                  className="block p-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-medium" style={{ color: '#1a1a2e' }}>
                        {period.label}
                      </h3>
                      <p className="text-sm mt-1" style={{ color: '#6b7280' }}>
                        {period.employeeCount} employee{period.employeeCount !== 1 ? 's' : ''} · {period.ticketCount} ticket{period.ticketCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-medium" style={{ color: '#1a1a2e' }}>
                        {period.totalAdjustedHours.toFixed(2)}
                      </p>
                      <p className="text-sm" style={{ color: '#6b7280' }}>
                        adjusted hours
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p style={{ color: '#6b7280' }}>No tickets submitted yet</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

