import { getToken } from 'next-auth/jwt'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET
  const token = await getToken({
    req: request,
    secret,
  })

  // Debug: remove after fixing staging redirect (log only on protected/auth routes)
  const path = request.nextUrl.pathname
  if (path.startsWith('/dashboard') || path.startsWith('/login')) {
    console.log('[Auth] middleware', { path, hasToken: !!token, hasProfileId: !!token?.profileId, hasSecret: !!secret })
  }

  const protectedRoutes = ['/dashboard', '/admin', '/tickets']
  const isProtectedRoute = protectedRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  )

  if (isProtectedRoute && !token?.profileId) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  const authRoutes = ['/login', '/signup']
  const isAuthRoute = authRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  )

  if (isAuthRoute && token?.profileId) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

