'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { TicketStatus } from '@/lib/types'

interface TicketActionsProps {
  ticketId: string
  currentStatus: string
}

export function TicketActions({ ticketId, currentStatus }: TicketActionsProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const updateStatus = async (newStatus: TicketStatus) => {
    setLoading(true)

    await supabase
      .from('tickets')
      .update({ status: newStatus })
      .eq('id', ticketId)

    router.refresh()
    setLoading(false)
  }

  // Simplified workflow: pending → awaiting_pay → ready_for_dir
  return (
    <div className="flex gap-2 flex-wrap items-center">
      {currentStatus === 'pending' && (
        <button
          onClick={() => updateStatus('awaiting_pay')}
          disabled={loading}
          className="px-3 py-1.5 text-xs font-medium border border-gray-300 hover:border-gray-500 transition-colors disabled:opacity-50"
          style={{ color: '#1a1a2e' }}
        >
          Mark Awaiting Pay
        </button>
      )}
      {currentStatus === 'awaiting_pay' && (
        <button
          onClick={() => updateStatus('ready_for_dir')}
          disabled={loading}
          className="px-3 py-1.5 text-xs font-medium border border-gray-300 hover:border-gray-500 transition-colors disabled:opacity-50"
          style={{ color: '#1a1a2e' }}
        >
          Ready for DIR
        </button>
      )}
      {currentStatus === 'ready_for_dir' && (
        <span className="px-3 py-1.5 text-xs font-medium" style={{ color: '#6b7280' }}>
          ✓ Completed
        </span>
      )}
      {currentStatus !== 'pending' && currentStatus !== 'ready_for_dir' && (
        <button
          onClick={() => updateStatus('pending')}
          disabled={loading}
          className="px-3 py-1.5 text-xs font-medium border border-gray-200 hover:border-gray-400 transition-colors disabled:opacity-50"
          style={{ color: '#6b7280' }}
        >
          Reset
        </button>
      )}
    </div>
  )
}

