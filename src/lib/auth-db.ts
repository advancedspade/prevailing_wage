import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { queryOne } from '@/lib/db'
import type { Profile } from '@/lib/types'

/**
 * Get current user and profile from NextAuth session + Cloud SQL.
 * Returns null if not signed in or profile not found.
 */
export async function getAuthUserAndProfile(): Promise<{
  user: { id: string; email?: string } | null
  profile: Profile | null
}> {
  const session = await getServerSession(authOptions)
  const profileId = (session?.user as { id?: string } | undefined)?.id
  if (!session?.user || !profileId) {
    return { user: null, profile: null }
  }

  const profile = await queryOne<Profile>(
    'SELECT id, email, full_name, role, salary, created_at, updated_at FROM public.profiles WHERE id = $1',
    [profileId]
  )

  return {
    user: { id: profileId, email: session.user.email ?? undefined },
    profile: profile ?? null,
  }
}
