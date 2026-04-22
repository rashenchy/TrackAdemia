import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import {
  getProfileAccessState,
  isElevatedFacultyRole,
  isFacultyRole,
} from '@/lib/users/access'

function mapLegacyAdminPath(pathname: string) {
  if (!pathname.startsWith('/admin')) {
    return pathname
  }

  if (pathname === '/admin' || pathname === '/admin/') {
    return '/dashboard/settings'
  }

  if (pathname.startsWith('/admin/student-verification')) {
    return pathname.replace('/admin/student-verification', '/dashboard/student-verification')
  }

  return pathname.replace('/admin', '/dashboard/settings')
}

function isMissingRefreshTokenError(error: unknown) {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: string }).code === 'refresh_token_not_found'
  )
}

function clearSupabaseAuthCookies(request: NextRequest, response: NextResponse) {
  const authCookies = request.cookies
    .getAll()
    .filter(({ name }) => name.startsWith('sb-'))

  authCookies.forEach(({ name }) => {
    request.cookies.delete(name)
    response.cookies.delete(name)
  })
}

// Middleware helper that refreshes Supabase sessions and protects dashboard routes
export async function updateSession(request: NextRequest) {

  // Default response object that allows the request to continue
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Create a Supabase server client using request cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {

        // Read cookies from the incoming request
        getAll() {
          return request.cookies.getAll()
        },

        // Update cookies when Supabase refreshes the session
        setAll(cookiesToSet) {

          // Update cookies on the request object
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )

          // Create a new response object with updated headers
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })

          // Attach refreshed cookies to the outgoing response
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Retrieve the currently authenticated user
  let user = null

  try {
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser()

    user = currentUser
  } catch (error) {
    if (!isMissingRefreshTokenError(error)) {
      throw error
    }

    clearSupabaseAuthCookies(request, response)
  }

  // Protect dashboard routes by redirecting unauthenticated users to login
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {

    const url = request.nextUrl.clone()
    url.pathname = '/login'

    return NextResponse.redirect(url)
  }

  if (user) {
    const profile = await getProfileAccessState(supabase, user.id)

    if (!profile?.is_active) {
      clearSupabaseAuthCookies(request, response)

      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set(
        'error',
        'This account has been deactivated. Please contact an administrator.'
      )

      if (!request.nextUrl.pathname.startsWith('/login')) {
        return NextResponse.redirect(url)
      }
    }
  }

  // Legacy admin routes now live inside the shared faculty dashboard experience.
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    const profile = await getProfileAccessState(supabase, user.id)

    if (!profile || !isFacultyRole(profile.role)) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }

    if (
      request.nextUrl.pathname !== '/admin/student-verification' &&
      !isElevatedFacultyRole(profile.role)
    ) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }

    const url = request.nextUrl.clone()
    url.pathname = mapLegacyAdminPath(request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  // Allow the request to continue if authentication is valid
  return response
}
