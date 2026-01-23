'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<'user' | 'admin'>('user')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: role,
        },
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#e8e8e8' }}>
      <div className="max-w-md w-full space-y-8 p-10 bg-white border border-gray-200">
        <div>
          <h2 className="text-3xl font-light tracking-tight" style={{ color: '#1a1a2e' }}>
            Create Account
          </h2>
          <p className="mt-2 text-sm" style={{ color: '#6b7280' }}>
            Join Advanced Spade Wage Tracker
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSignup}>
          {error && (
            <div className="bg-red-50 text-red-600 p-3 text-sm border border-red-200">
              {error}
            </div>
          )}
          <div className="space-y-5">
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium" style={{ color: '#1a1a2e' }}>
                Full Name
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1 block w-full px-3 py-2.5 border border-gray-300 focus:border-gray-900 focus:ring-0 transition-colors"
                style={{ background: '#fafafa' }}
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium" style={{ color: '#1a1a2e' }}>
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2.5 border border-gray-300 focus:border-gray-900 focus:ring-0 transition-colors"
                style={{ background: '#fafafa' }}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium" style={{ color: '#1a1a2e' }}>
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2.5 border border-gray-300 focus:border-gray-900 focus:ring-0 transition-colors"
                style={{ background: '#fafafa' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-3" style={{ color: '#1a1a2e' }}>
                Account Type
              </label>
              <div className="flex gap-6">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="role"
                    value="user"
                    checked={role === 'user'}
                    onChange={() => setRole('user')}
                    className="mr-2 accent-gray-900"
                  />
                  <span className="text-sm" style={{ color: '#1a1a2e' }}>Employee</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="role"
                    value="admin"
                    checked={role === 'admin'}
                    onChange={() => setRole('admin')}
                    className="mr-2 accent-gray-900"
                  />
                  <span className="text-sm" style={{ color: '#1a1a2e' }}>Admin</span>
                </label>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 text-sm font-medium text-white transition-colors disabled:opacity-50"
            style={{ background: '#1a1a2e' }}
            onMouseOver={(e) => e.currentTarget.style.background = '#2d2d44'}
            onMouseOut={(e) => e.currentTarget.style.background = '#1a1a2e'}
          >
            {loading ? 'Creating account...' : 'Sign up'}
          </button>

          <p className="text-center text-sm" style={{ color: '#6b7280' }}>
            Already have an account?{' '}
            <Link href="/login" className="font-medium hover:underline" style={{ color: '#1a1a2e' }}>
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}

