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
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-xl font-bold text-gray-900">
                Prevailing Wage Tracker
              </Link>
              <span className="text-gray-400">/</span>
              <span className="text-gray-600">New Ticket</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            Create New Ticket
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="dirNumber" className="block text-sm font-medium text-gray-700">
                DIR Number
              </label>
              <input
                id="dirNumber"
                type="text"
                required
                value={dirNumber}
                onChange={(e) => setDirNumber(e.target.value)}
                placeholder="e.g., 1234567"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="projectTitle" className="block text-sm font-medium text-gray-700">
                Project Title
              </label>
              <input
                id="projectTitle"
                type="text"
                required
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                placeholder="e.g., Highway 101 Bridge Repair"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="dateWorked" className="block text-sm font-medium text-gray-700">
                Date Worked
              </label>
              <input
                id="dateWorked"
                type="date"
                required
                value={dateWorked}
                onChange={(e) => setDateWorked(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="hoursWorked" className="block text-sm font-medium text-gray-700">
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
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Ticket'}
              </button>
              <Link
                href="/dashboard"
                className="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
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

