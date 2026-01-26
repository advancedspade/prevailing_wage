import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { SalaryInput } from './salary-input'

export default async function AdminUsersPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    redirect('/dashboard')
  }

  // Get all users (non-admin)
  const { data: users } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'user')
    .order('created_at', { ascending: false })

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
              <span className="text-sm" style={{ color: '#6b7280' }}>Manage Employees</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white border border-gray-200 overflow-hidden">
          {users && users.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead style={{ background: '#fafafa' }}>
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#6b7280' }}>
                    Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#6b7280' }}>
                    Email
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#6b7280' }}>
                    Joined
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#6b7280' }}>
                    Yearly Salary
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" style={{ color: '#1a1a2e' }}>
                      {u.full_name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: '#6b7280' }}>
                      {u.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: '#6b7280' }}>
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <SalaryInput userId={u.id} currentSalary={u.salary} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-16">
              <p style={{ color: '#6b7280' }}>No employees registered yet</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

