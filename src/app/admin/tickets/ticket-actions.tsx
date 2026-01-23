'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState, useRef } from 'react'
import type { TicketStatus } from '@/lib/types'

interface TicketActionsProps {
  ticketId: string
  currentStatus: string
  pdfUrl?: string | null
}

export function TicketActions({ ticketId, currentStatus, pdfUrl }: TicketActionsProps) {
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [xmlData, setXmlData] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('ticketId', ticketId)

    const res = await fetch('/api/upload-pdf', {
      method: 'POST',
      body: formData,
    })

    if (res.ok) {
      router.refresh()
    }
    setUploading(false)
  }

  const generateXml = async () => {
    setLoading(true)
    const res = await fetch('/api/generate-xml', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticketId }),
    })

    if (res.ok) {
      const data = await res.json()
      setXmlData(data.xml)
    }
    setLoading(false)
  }

  const downloadXml = () => {
    if (!xmlData) return
    const blob = new Blob([xmlData], { type: 'application/xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dir-submission-${ticketId}.xml`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Workflow: pending → prevailing_wage_entered → awaiting_pay → upload_to_dir → completed
  return (
    <div className="flex gap-2 flex-wrap items-center">
      {currentStatus === 'pending' && (
        <button
          onClick={() => updateStatus('prevailing_wage_entered')}
          disabled={loading}
          className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 rounded hover:bg-blue-100 disabled:opacity-50"
        >
          Mark Wage Entered
        </button>
      )}
      {currentStatus === 'prevailing_wage_entered' && (
        <button
          onClick={() => updateStatus('awaiting_pay')}
          disabled={loading}
          className="px-2 py-1 text-xs font-medium text-purple-700 bg-purple-50 rounded hover:bg-purple-100 disabled:opacity-50"
        >
          Mark Awaiting Pay
        </button>
      )}
      {currentStatus === 'awaiting_pay' && (
        <button
          onClick={() => updateStatus('upload_to_dir')}
          disabled={loading}
          className="px-2 py-1 text-xs font-medium text-orange-700 bg-orange-50 rounded hover:bg-orange-100 disabled:opacity-50"
        >
          Ready for DIR Upload
        </button>
      )}
      {currentStatus === 'upload_to_dir' && (
        <>
          <input
            type="file"
            accept=".pdf"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-2 py-1 text-xs font-medium text-orange-700 bg-orange-50 rounded hover:bg-orange-100 disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : 'Upload PDF'}
          </button>
        </>
      )}
      {currentStatus === 'completed' && (
        <>
          {pdfUrl && (
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 rounded hover:bg-blue-100"
            >
              View PDF
            </a>
          )}
          <button
            onClick={generateXml}
            disabled={loading}
            className="px-2 py-1 text-xs font-medium text-green-700 bg-green-50 rounded hover:bg-green-100 disabled:opacity-50"
          >
            Generate XML
          </button>
          {xmlData && (
            <button
              onClick={downloadXml}
              className="px-2 py-1 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700"
            >
              Download XML
            </button>
          )}
        </>
      )}
      {currentStatus !== 'pending' && currentStatus !== 'completed' && (
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

