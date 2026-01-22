'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface TicketActionsProps {
  ticketId: string
  currentStatus: string
}

export function TicketActions({ ticketId, currentStatus }: TicketActionsProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const updateStatus = async (newStatus: string) => {
    setLoading(true)
    
    await supabase
      .from('tickets')
      .update({ status: newStatus })
      .eq('id', ticketId)

    router.refresh()
    setLoading(false)
  }

  return (
    <div className="flex gap-2">
      {currentStatus === 'pending' && (
        <>
          <button
            onClick={() => updateStatus('in_review')}
            disabled={loading}
            className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 rounded hover:bg-blue-100 disabled:opacity-50"
          >
            Review
          </button>
        </>
      )}
      {currentStatus === 'in_review' && (
        <>
          <button
            onClick={() => updateStatus('approved')}
            disabled={loading}
            className="px-2 py-1 text-xs font-medium text-green-700 bg-green-50 rounded hover:bg-green-100 disabled:opacity-50"
          >
            Approve
          </button>
          <button
            onClick={() => updateStatus('rejected')}
            disabled={loading}
            className="px-2 py-1 text-xs font-medium text-red-700 bg-red-50 rounded hover:bg-red-100 disabled:opacity-50"
          >
            Reject
          </button>
        </>
      )}
      {(currentStatus === 'approved' || currentStatus === 'rejected') && (
        <button
          onClick={() => updateStatus('pending')}
          disabled={loading}
          className="px-2 py-1 text-xs font-medium text-gray-700 bg-gray-50 rounded hover:bg-gray-100 disabled:opacity-50"
        >
          Reset
        </button>
      )}
    </div>
  )
}

