'use client'

import { signOut } from 'next-auth/react'

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: '/login' })}
      className="text-sm"
      style={{ color: '#6b7280' }}
    >
      Sign Out
    </button>
  )
}

