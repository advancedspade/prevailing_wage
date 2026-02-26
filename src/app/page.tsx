import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'

export default async function Home() {
  const session = await getServerSession(authOptions)
  const profileId = (session?.user as { id?: string } | undefined)?.id

  if (profileId) {
    redirect('/admin/periods')
  } else {
    redirect('/login')
  }
}
