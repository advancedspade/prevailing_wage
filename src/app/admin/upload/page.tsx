'use client'

import { useState } from 'react'
import Link from 'next/link'

interface ParsedRow {
  ticketNumber: string
  projectTitle: string
  dirNumber: string
  dateWorked: string
  totalHours: number
  people: string[]
}

export default function UploadPage() {
  const [parsedData, setParsedData] = useState<ParsedRow[]>([])
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const parseCSV = (text: string): ParsedRow[] => {
    const lines = text.trim().split('\n')
    const headers = lines[0].split(',')
    
    // Find column indices
    const ticketIdx = headers.findIndex(h => h.includes('Ticket #'))
    const nameIdx = headers.findIndex(h => h.includes('Ticket Name'))
    const dirIdx = headers.findIndex(h => h.includes('DIR #'))
    const dateIdx = headers.findIndex(h => h.includes('Deliverable Due Date'))
    const hoursIdx = headers.findIndex(h => h.includes('Total Man Hours'))
    const peopleIdx = headers.findIndex(h => h.includes('People'))

    const rows: ParsedRow[] = []
    
    for (let i = 1; i < lines.length; i++) {
      // Handle CSV with quoted fields containing commas
      const row = parseCSVLine(lines[i])
      if (row.length < peopleIdx + 1) continue

      const people = row[peopleIdx]
        .replace(/^"|"$/g, '')
        .split(',')
        .map(p => p.trim())
        .filter(p => p.length > 0)

      if (people.length === 0) continue

      // Parse date from M/D/YY format to YYYY-MM-DD
      const dateParts = row[dateIdx].split('/')
      let year = parseInt(dateParts[2])
      if (year < 100) year += 2000
      const month = dateParts[0].padStart(2, '0')
      const day = dateParts[1].padStart(2, '0')
      const dateWorked = `${year}-${month}-${day}`

      rows.push({
        ticketNumber: row[ticketIdx],
        projectTitle: row[nameIdx].trim(),
        dirNumber: row[dirIdx],
        dateWorked,
        totalHours: parseFloat(row[hoursIdx]) || 0,
        people
      })
    }

    return rows
  }

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        result.push(current)
        current = ''
      } else {
        current += char
      }
    }
    result.push(current)
    return result
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      const parsed = parseCSV(text)
      setParsedData(parsed)
      setResult(null)
    }
    reader.readAsText(file)
  }

  const handleImport = async () => {
    setImporting(true)
    setResult(null)

    const res = await fetch('/api/import-csv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows: parsedData })
    })

    const data = await res.json()
    setImporting(false)
    setResult({
      success: res.ok,
      message: res.ok ? `Imported ${data.ticketsCreated} tickets for ${data.employeesCreated} new employees` : data.error
    })

    if (res.ok) {
      setParsedData([])
    }
  }

  // Count total tickets (one per person per row)
  const totalTickets = parsedData.reduce((sum, row) => sum + row.people.length, 0)
  const uniquePeople = [...new Set(parsedData.flatMap(r => r.people))]

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
                <Link href="/admin/tickets" className="text-sm" style={{ color: '#6b7280' }}>
                  Tickets
                </Link>
              </div>
            </div>
            <div className="flex items-center">
              <form action="/auth/signout" method="post">
                <button type="submit" className="text-sm" style={{ color: '#6b7280' }}>
                  Sign Out
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-light tracking-tight mb-6" style={{ color: '#1a1a2e' }}>Import Tickets</h1>

        {/* File Upload */}
        <div className="bg-white p-6 border border-gray-200 mb-6">
          <label className="block text-sm font-medium mb-2" style={{ color: '#1a1a2e' }}>
            Upload CSV File
          </label>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:border-0 file:text-sm file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
          />
        </div>

        {/* Result Message */}
        {result && (
          <div className={`p-4 mb-6 border ${result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <p className={result.success ? 'text-green-800' : 'text-red-800'}>{result.message}</p>
          </div>
        )}

        {/* Preview */}
        {parsedData.length > 0 && (
          <>
            <div className="bg-white p-6 border border-gray-200 mb-6">
              <h2 className="text-lg font-medium mb-4" style={{ color: '#1a1a2e' }}>
                Preview ({parsedData.length} rows → {totalTickets} tickets for {uniquePeople.length} people)
              </h2>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-3" style={{ color: '#6b7280' }}>Date</th>
                      <th className="text-left py-2 px-3" style={{ color: '#6b7280' }}>Project</th>
                      <th className="text-left py-2 px-3" style={{ color: '#6b7280' }}>DIR #</th>
                      <th className="text-left py-2 px-3" style={{ color: '#6b7280' }}>Hours</th>
                      <th className="text-left py-2 px-3" style={{ color: '#6b7280' }}>People</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.slice(0, 10).map((row, i) => (
                      <tr key={i} className="border-b border-gray-100">
                        <td className="py-2 px-3">{row.dateWorked}</td>
                        <td className="py-2 px-3">{row.projectTitle}</td>
                        <td className="py-2 px-3">{row.dirNumber}</td>
                        <td className="py-2 px-3">{row.totalHours}</td>
                        <td className="py-2 px-3">{row.people.join(', ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsedData.length > 10 && (
                  <p className="text-sm mt-2" style={{ color: '#6b7280' }}>
                    ...and {parsedData.length - 10} more rows
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={handleImport}
              disabled={importing}
              className="py-2 px-6 text-sm font-medium text-white disabled:opacity-50"
              style={{ background: '#1a1a2e' }}
            >
              {importing ? 'Importing...' : `Import ${totalTickets} Tickets`}
            </button>
          </>
        )}
      </main>
    </div>
  )
}

