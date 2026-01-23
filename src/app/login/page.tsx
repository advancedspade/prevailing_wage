'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
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
            Advanced Spade
          </h2>
          <p className="mt-2 text-sm" style={{ color: '#6b7280' }}>
            Prevailing Wage Tracker
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          {error && (
            <div className="bg-red-50 text-red-600 p-3 text-sm border border-red-200">
              {error}
            </div>
          )}
          <div className="space-y-5">
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2.5 border border-gray-300 focus:border-gray-900 focus:ring-0 transition-colors"
                style={{ background: '#fafafa' }}
              />
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
            {loading ? 'Signing in...' : 'Sign in'}
          </button>

          <p className="text-center text-sm" style={{ color: '#6b7280' }}>
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="font-medium hover:underline" style={{ color: '#1a1a2e' }}>
              Sign up
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}

