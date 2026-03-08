import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

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
          cookiesToSet.forEach(({ name, value, options }) =>
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
  const { data: { user } } = await supabase.auth.getUser()

  // Protect dashboard routes by redirecting unauthenticated users to login
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {

    const url = request.nextUrl.clone()
    url.pathname = '/login'

    return NextResponse.redirect(url)
  }

  // Allow the request to continue if authentication is valid
  return response
}