import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { parsePayPeriodKey, formatPayPeriodLabel, STATUS_LABELS } from '@/lib/types'
import { GenerateXmlButton } from './generate-xml-button'

export default async function EmployeePeriodDetailPage({
  params,
}: {
  params: Promise<{ periodKey: string; userId: string }>
}) {
  const { periodKey, userId } = await params
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

  // Get employee profile
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
              <Link href={`/admin/periods/${periodKey}`} className="text-sm hover:underline" style={{ color: '#6b7280' }}>
                {periodLabel}
              </Link>
              <span style={{ color: '#d1d1d1' }}>/</span>
              <span className="text-sm" style={{ color: '#6b7280' }}>{employee?.full_name}</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-light tracking-tight" style={{ color: '#1a1a2e' }}>
              {employee?.full_name}
            </h2>
            <p className="text-sm mt-1" style={{ color: '#6b7280' }}>{periodLabel}</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-light" style={{ color: '#1a1a2e' }}>
              {totalAdjustedHours.toFixed(2)}
            </p>
            <p className="text-sm" style={{ color: '#6b7280' }}>total adjusted hours</p>
          </div>
        </div>

        {/* Generate XML Section */}
        <div className="bg-white border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-medium mb-4" style={{ color: '#1a1a2e' }}>Generate DIR XML</h3>
          <GenerateXmlButton
            periodKey={periodKey}
            userId={userId}
            employeeName={employee?.full_name || 'Unknown'}
            totalAdjustedHours={totalAdjustedHours}
          />
        </div>

        {/* Tickets Table */}
        <div className="bg-white border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead style={{ background: '#fafafa' }}>
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#6b7280' }}>
                  Date
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#6b7280' }}>
                  DIR Number
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#6b7280' }}>
                  Project
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#6b7280' }}>
                  Hours
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#6b7280' }}>
                  Adjusted
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#6b7280' }}>
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tickets?.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: '#1a1a2e' }}>
                    {new Date(ticket.date_worked).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" style={{ color: '#1a1a2e' }}>
                    {ticket.dir_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: '#6b7280' }}>
                    {ticket.project_title}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: '#6b7280' }}>
                    {ticket.hours_worked}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" style={{ color: '#1a1a2e' }}>
                    {(Number(ticket.hours_worked) * 1.25).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium border" style={{ color: '#1a1a2e', borderColor: '#d1d1d1' }}>
                      {STATUS_LABELS[ticket.status as keyof typeof STATUS_LABELS] || ticket.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}

