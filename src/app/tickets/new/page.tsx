'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function NewTicketPage() {
  const [dirNumber, setDirNumber] = useState('')
  const [projectTitle, setProjectTitle] = useState('')
  const [dateWorked, setDateWorked] = useState('')
  const [hoursWorked, setHoursWorked] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      setError('You must be logged in to create a ticket')
      setLoading(false)
      return
    }

    const { error } = await supabase
      .from('tickets')
      .insert({
        user_id: user.id,
        dir_number: dirNumber,
        project_title: projectTitle,
        date_worked: dateWorked,
        hours_worked: parseFloat(hoursWorked),
        status: 'pending',
      })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/tickets')
      router.refresh()
    }
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
              <span className="text-sm" style={{ color: '#6b7280' }}>New Ticket</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white border border-gray-200 p-8">
          <h2 className="text-2xl font-light tracking-tight mb-8" style={{ color: '#1a1a2e' }}>
            Create New Ticket
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 text-sm border border-red-200">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="dirNumber" className="block text-sm font-medium" style={{ color: '#1a1a2e' }}>
                DIR Number
              </label>
              <input
                id="dirNumber"
                type="text"
                required
                value={dirNumber}
                onChange={(e) => setDirNumber(e.target.value)}
                placeholder="e.g., 1234567"
                className="mt-1 block w-full px-3 py-2.5 border border-gray-300 focus:border-gray-900 focus:ring-0 transition-colors"
                style={{ background: '#fafafa' }}
              />
            </div>

            <div>
              <label htmlFor="projectTitle" className="block text-sm font-medium" style={{ color: '#1a1a2e' }}>
                Project Title
              </label>
              <input
                id="projectTitle"
                type="text"
                required
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                placeholder="e.g., Highway 101 Bridge Repair"
                className="mt-1 block w-full px-3 py-2.5 border border-gray-300 focus:border-gray-900 focus:ring-0 transition-colors"
                style={{ background: '#fafafa' }}
              />
            </div>

            <div>
              <label htmlFor="dateWorked" className="block text-sm font-medium" style={{ color: '#1a1a2e' }}>
                Date Worked
              </label>
              <input
                id="dateWorked"
                type="date"
                required
                value={dateWorked}
                onChange={(e) => setDateWorked(e.target.value)}
                className="mt-1 block w-full px-3 py-2.5 border border-gray-300 focus:border-gray-900 focus:ring-0 transition-colors"
                style={{ background: '#fafafa' }}
              />
            </div>

            <div>
              <label htmlFor="hoursWorked" className="block text-sm font-medium" style={{ color: '#1a1a2e' }}>
                Hours Worked
              </label>
              <input
                id="hoursWorked"
                type="number"
                required
                min="0.5"
                max="24"
                step="0.5"
                value={hoursWorked}
                onChange={(e) => setHoursWorked(e.target.value)}
                placeholder="e.g., 8"
                className="mt-1 block w-full px-3 py-2.5 border border-gray-300 focus:border-gray-900 focus:ring-0 transition-colors"
                style={{ background: '#fafafa' }}
              />
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 px-4 text-sm font-medium text-white transition-colors disabled:opacity-50"
                style={{ background: '#1a1a2e' }}
              >
                {loading ? 'Creating...' : 'Create Ticket'}
              </button>
              <Link
                href="/dashboard"
                className="py-3 px-6 border border-gray-300 text-sm font-medium transition-colors hover:border-gray-400"
                style={{ color: '#1a1a2e' }}
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}

