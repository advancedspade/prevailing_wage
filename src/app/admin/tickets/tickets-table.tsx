'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { STATUS_LABELS, calculateAdjustedPay } from '@/lib/types'
import type { EmployeePeriodStatus } from '@/lib/types'

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
  periodStatus: EmployeePeriodStatus
}

interface TicketsTableProps {
  tickets: TicketRow[]
}

export function TicketsTable({ tickets: initialTickets }: TicketsTableProps) {
  const [tickets, setTickets] = useState(initialTickets)
  const [deleting, setDeleting] = useState<string | null>(null)
  const router = useRouter()

  const handleDelete = async (ticketId: string) => {
    if (!confirm('Are you sure you want to delete this ticket?')) return

    setDeleting(ticketId)
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, { method: 'DELETE' })
      if (res.ok) {
        setTickets(tickets.filter(t => t.id !== ticketId))
        router.refresh()
      } else {
        const data = await res.json()
        alert(`Error: ${data.error || 'Failed to delete ticket'}`)
      }
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
    setDeleting(null)
  }

  if (tickets.length === 0) {
    return (
      <div className="text-center py-16">
        <p style={{ color: '#6b7280' }}>No tickets submitted yet</p>
      </div>
    )
  }

  return (
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
          <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#6b7280' }}>
            Actions
          </th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {tickets.map((ticket) => {
          const adjustedPay = calculateAdjustedPay(Number(ticket.hours_worked), ticket.salary ?? null)
          return (
            <tr key={ticket.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: '#1a1a2e' }}>
                {ticket.full_name || ticket.email || 'Unknown'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" style={{ color: ticket.dir_number ? '#1a1a2e' : '#dc2626' }}>
                {ticket.dir_number || '⚠️ Missing'}
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
                  {STATUS_LABELS[ticket.periodStatus]}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <button
                  onClick={() => handleDelete(ticket.id)}
                  disabled={deleting === ticket.id}
                  className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
                >
                  {deleting === ticket.id ? 'Deleting...' : 'Delete'}
                </button>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

