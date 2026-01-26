import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { STATUS_LABELS, getPayPeriod, calculateAdjustedPay } from '@/lib/types'
import type { EmployeePeriodStatus } from '@/lib/types'

export default async function AdminTicketsPage() {
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

  // Get all tickets with user info (including salary for calculation)
  const { data: tickets } = await supabase
    .from('tickets')
    .select(`
      *,
      profile:profiles(full_name, email, salary)
    `)
    .order('created_at', { ascending: false })

  // Get all employee_periods to look up status
  const { data: employeePeriods } = await supabase
    .from('employee_periods')
    .select('*')

  // Build lookup map for employee period statuses
  const periodStatusMap = new Map<string, EmployeePeriodStatus>()
  employeePeriods?.forEach(ep => {
    const key = `${ep.user_id}-${ep.year}-${ep.month}-${ep.period}`
    periodStatusMap.set(key, ep.status)
  })

  // Helper to get status for a ticket based on its employee's period
  const getTicketPeriodStatus = (ticket: { user_id: string; date_worked: string }): EmployeePeriodStatus => {
    const date = new Date(ticket.date_worked)
    const payPeriod = getPayPeriod(date)
    const key = `${ticket.user_id}-${payPeriod.year}-${payPeriod.month}-${payPeriod.period}`
    return periodStatusMap.get(key) || 'pending'
  }

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
              <span className="text-sm" style={{ color: '#6b7280' }}>Manage Tickets</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white border border-gray-200 overflow-hidden">
          {tickets && tickets.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead style={{ background: '#fafafa' }}>
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#6b7280' }}>
                    Employee
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#6b7280' }}>
                    DIR Number
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#6b7280' }}>
                    Project
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#6b7280' }}>
                    Date
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#6b7280' }}>
                    Hours
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#6b7280' }}>
                    Adjusted Pay
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#6b7280' }}>
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tickets.map((ticket) => {
                  const periodStatus = getTicketPeriodStatus(ticket)
                  const adjustedPay = calculateAdjustedPay(Number(ticket.hours_worked), ticket.profile?.salary || null)
                  return (
                    <tr key={ticket.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: '#1a1a2e' }}>
                        {ticket.profile?.full_name || ticket.profile?.email || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" style={{ color: '#1a1a2e' }}>
                        {ticket.dir_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: '#6b7280' }}>
                        {ticket.project_title}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: '#6b7280' }}>
                        {new Date(ticket.date_worked).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: '#6b7280' }}>
                        {ticket.hours_worked}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" style={{ color: adjustedPay === null ? '#dc2626' : '#1a1a2e' }}>
                        {adjustedPay === null ? 'Pending Salary' : `$${adjustedPay.toFixed(2)}`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-medium border" style={{ color: '#1a1a2e', borderColor: '#d1d1d1' }}>
                          {STATUS_LABELS[periodStatus]}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
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

