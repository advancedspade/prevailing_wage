import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { parsePayPeriodKey, formatPayPeriodLabel } from '@/lib/types'

interface EmployeeSummary {
  userId: string
  fullName: string
  email: string
  ticketCount: number
  totalHours: number
  totalAdjustedHours: number
}

export default async function PeriodDetailPage({
  params,
}: {
  params: Promise<{ periodKey: string }>
}) {
  const { periodKey } = await params
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

  // Parse period key
  const { year, month, period } = parsePayPeriodKey(periodKey)
  const periodLabel = formatPayPeriodLabel(year, month, period)
  
  // Calculate date range
  const startDay = period === 1 ? 1 : 16
  const endDay = period === 1 ? 15 : new Date(year, month + 1, 0).getDate()
  const startDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`
  const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`

  // Get tickets for this period
  const { data: tickets } = await supabase
    .from('tickets')
    .select('*, profile:profiles(*)')
    .gte('date_worked', startDate)
    .lte('date_worked', endDate)
    .order('date_worked', { ascending: false })

  // Group by employee
  const employeeMap = new Map<string, EmployeeSummary>()

  tickets?.forEach((ticket) => {
    const userId = ticket.user_id
    
    if (!employeeMap.has(userId)) {
      employeeMap.set(userId, {
        userId,
        fullName: ticket.profile?.full_name || 'Unknown',
        email: ticket.profile?.email || '',
        ticketCount: 0,
        totalHours: 0,
        totalAdjustedHours: 0
      })
    }

    const summary = employeeMap.get(userId)!
    summary.ticketCount++
    summary.totalHours += Number(ticket.hours_worked)
    summary.totalAdjustedHours += Number(ticket.hours_worked) * 1.25
  })

  const employees = Array.from(employeeMap.values()).sort((a, b) => 
    a.fullName.localeCompare(b.fullName)
  )

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
              <Link href="/admin/periods" className="text-sm hover:underline" style={{ color: '#6b7280' }}>
                Pay Periods
              </Link>
              <span style={{ color: '#d1d1d1' }}>/</span>
              <span className="text-sm" style={{ color: '#6b7280' }}>{periodLabel}</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-light tracking-tight mb-6" style={{ color: '#1a1a2e' }}>
          {periodLabel}
        </h2>
        
        <div className="bg-white border border-gray-200 overflow-hidden">
          {employees.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead style={{ background: '#fafafa' }}>
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#6b7280' }}>
                    Employee
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#6b7280' }}>
                    Tickets
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#6b7280' }}>
                    Hours
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#6b7280' }}>
                    Adjusted Hours
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#6b7280' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {employees.map((emp) => (
                  <tr key={emp.userId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium" style={{ color: '#1a1a2e' }}>{emp.fullName}</div>
                      <div className="text-sm" style={{ color: '#6b7280' }}>{emp.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: '#6b7280' }}>
                      {emp.ticketCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: '#6b7280' }}>
                      {emp.totalHours.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" style={{ color: '#1a1a2e' }}>
                      {emp.totalAdjustedHours.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Link
                        href={`/admin/periods/${periodKey}/${emp.userId}`}
                        className="px-3 py-1.5 text-xs font-medium border border-gray-300 hover:border-gray-500 transition-colors"
                        style={{ color: '#1a1a2e' }}
                      >
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-16">
              <p style={{ color: '#6b7280' }}>No tickets for this period</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

