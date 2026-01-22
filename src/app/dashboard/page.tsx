import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // Get user profile to check role
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">
                Prevailing Wage Tracker
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                {profile?.full_name || user.email}
                <span className="ml-2 px-2 py-1 text-xs rounded-full bg-gray-100">
                  {isAdmin ? 'Admin' : 'User'}
                </span>
              </span>
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Welcome, {profile?.full_name || 'User'}!
          </h2>

          {isAdmin ? (
            // Admin Dashboard
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Link
                href="/admin/tickets"
                className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
              >
                <h3 className="text-lg font-semibold text-gray-900">
                  Manage Tickets
                </h3>
                <p className="mt-2 text-gray-600">
                  View and manage all submitted wage tickets
                </p>
              </Link>
              <Link
                href="/admin/users"
                className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
              >
                <h3 className="text-lg font-semibold text-gray-900">
                  Manage Users
                </h3>
                <p className="mt-2 text-gray-600">
                  View and manage user accounts
                </p>
              </Link>
            </div>
          ) : (
            // User Dashboard
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Link
                href="/tickets/new"
                className="block p-6 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition-colors"
              >
                <h3 className="text-lg font-semibold">
                  Create New Ticket
                </h3>
                <p className="mt-2 opacity-90">
                  Submit a new prevailing wage ticket
                </p>
              </Link>
              <Link
                href="/tickets"
                className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
              >
                <h3 className="text-lg font-semibold text-gray-900">
                  My Tickets
                </h3>
                <p className="mt-2 text-gray-600">
                  View your submitted tickets and their status
                </p>
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

