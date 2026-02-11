import { getAuthUserAndProfile } from '@/lib/auth-db'
import { query } from '@/lib/db'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { STATUS_LABELS } from '@/lib/types'
import type { Ticket } from '@/lib/types'

export default async function TicketsPage() {
  const { user } = await getAuthUserAndProfile()

  if (!user) {
    redirect('/login')
  }

  const { rows: tickets } = await query<Ticket>(
    `SELECT * FROM public.tickets WHERE user_id = $1 ORDER BY created_at DESC`,
    [user.id]
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
              <span className="text-sm" style={{ color: '#6b7280' }}>My Tickets</span>
            </div>
            <div className="flex items-center">
              <Link
                href="/tickets/new"
                className="px-4 py-2 text-sm font-medium text-white transition-colors"
                style={{ background: '#1a1a2e' }}
              >
                New Ticket
              </Link>
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
                    DIR Number
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#6b7280' }}>
                    Project
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#6b7280' }}>
                    Date Worked
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#6b7280' }}>
                    Hours
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#6b7280' }}>
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-gray-50">
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
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium border" style={{ color: '#1a1a2e', borderColor: '#d1d1d1' }}>
                        {STATUS_LABELS[ticket.status as keyof typeof STATUS_LABELS] || ticket.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-16">
              <p className="mb-4" style={{ color: '#6b7280' }}>No tickets yet</p>
              <Link
                href="/tickets/new"
                className="font-medium hover:underline"
                style={{ color: '#1a1a2e' }}
              >
                Create your first ticket
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

