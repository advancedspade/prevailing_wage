import { getAuthUserAndProfile } from '@/lib/auth-db'
import { query } from '@/lib/db'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getPayPeriod } from '@/lib/types'
import type { EmployeePeriodStatus, EmployeePeriod } from '@/lib/types'
import { SignOutButton } from '@/components/sign-out-button'
import { TicketsTable } from './tickets-table'

interface TicketRow {
  id: string
  user_id: string
  dir_number: string
  project_title: string
  date_worked: string
  hours_worked: number
  status: string
  created_at: string
  full_name: string | null
  email: string
  salary: number | null
}

export default async function AdminTicketsPage() {
  const { user, profile } = await getAuthUserAndProfile()

  if (!user) {
    redirect('/login')
  }

  if (profile?.role !== 'admin') {
    redirect('/login')
  }

  const { rows: tickets } = await query<TicketRow>(
    `SELECT t.*, p.full_name, p.email, p.salary
     FROM public.tickets t
     JOIN public.profiles p ON p.id = t.user_id
     ORDER BY t.created_at DESC`
  )

  const { rows: employeePeriods } = await query<EmployeePeriod>(
    'SELECT * FROM public.employee_periods'
  )

  // Build lookup map for employee period statuses
  const periodStatusMap = new Map<string, EmployeePeriodStatus>()
  employeePeriods?.forEach(ep => {
    const key = `${ep.user_id}-${ep.year}-${ep.month}-${ep.period}`
    periodStatusMap.set(key, ep.status)
  })

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
            <div className="flex items-center gap-6">
              <Link href="/admin/periods" className="text-xl font-light tracking-tight" style={{ color: '#1a1a2e' }}>
                Koda
              </Link>
              <div className="flex items-center gap-4">
                <Link href="/admin/periods" className="text-sm" style={{ color: '#6b7280' }}>
                  Pay Periods
                </Link>
                <Link href="/admin/users" className="text-sm" style={{ color: '#6b7280' }}>
                  Employees
                </Link>
                <Link href="/admin/tickets" className="text-sm font-medium" style={{ color: '#1a1a2e' }}>
                  Tickets
                </Link>
              </div>
            </div>
            <div className="flex items-center">
              <SignOutButton />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white border border-gray-200 overflow-hidden">
          <TicketsTable
            tickets={tickets?.map(ticket => ({
              ...ticket,
              periodStatus: getTicketPeriodStatus(ticket)
            })) || []}
          />
        </div>
      </main>
    </div>
  )
}

