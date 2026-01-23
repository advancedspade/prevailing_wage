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
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'

  return (
    <div className="min-h-screen" style={{ background: '#e8e8e8' }}>
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-light tracking-tight" style={{ color: '#1a1a2e' }}>
                Advanced Spade
              </h1>
            </div>
            <div className="flex items-center gap-6">
              <span className="text-sm" style={{ color: '#6b7280' }}>
                {profile?.full_name || user.email}
                <span className="ml-2 px-2 py-1 text-xs border border-gray-300" style={{ color: '#1a1a2e' }}>
                  {isAdmin ? 'Admin' : 'Employee'}
                </span>
              </span>
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="text-sm hover:underline"
                  style={{ color: '#1a1a2e' }}
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-light tracking-tight mb-8" style={{ color: '#1a1a2e' }}>
          Welcome, {profile?.full_name || 'User'}
        </h2>

        {isAdmin ? (
          // Admin Dashboard
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link
              href="/admin/periods"
              className="block p-8 text-white transition-colors"
              style={{ background: '#1a1a2e' }}
            >
              <h3 className="text-lg font-medium">
                Pay Periods
              </h3>
              <p className="mt-2 text-sm opacity-80">
                View tickets by pay period and generate XML
              </p>
            </Link>
            <Link
              href="/admin/tickets"
              className="block p-8 bg-white border border-gray-200 hover:border-gray-400 transition-colors"
            >
              <h3 className="text-lg font-medium" style={{ color: '#1a1a2e' }}>
                All Tickets
              </h3>
              <p className="mt-2 text-sm" style={{ color: '#6b7280' }}>
                View all submitted wage tickets
              </p>
            </Link>
            <Link
              href="/admin/users"
              className="block p-8 bg-white border border-gray-200 hover:border-gray-400 transition-colors"
            >
              <h3 className="text-lg font-medium" style={{ color: '#1a1a2e' }}>
                Manage Employees
              </h3>
              <p className="mt-2 text-sm" style={{ color: '#6b7280' }}>
                View employees and set salaries
              </p>
            </Link>
          </div>
        ) : (
          // User Dashboard
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link
              href="/tickets/new"
              className="block p-8 text-white transition-colors"
              style={{ background: '#1a1a2e' }}
            >
              <h3 className="text-lg font-medium">
                Create New Ticket
              </h3>
              <p className="mt-2 text-sm opacity-80">
                Submit a new prevailing wage ticket
              </p>
            </Link>
            <Link
              href="/tickets"
              className="block p-8 bg-white border border-gray-200 hover:border-gray-400 transition-colors"
            >
              <h3 className="text-lg font-medium" style={{ color: '#1a1a2e' }}>
                My Tickets
              </h3>
              <p className="mt-2 text-sm" style={{ color: '#6b7280' }}>
                View your submitted tickets and their status
              </p>
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}

