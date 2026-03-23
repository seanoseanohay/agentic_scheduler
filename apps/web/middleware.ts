/**
 * Next.js middleware — enforces authentication on all routes except /login.
 * Uses Auth.js session check so unauthenticated users are redirected to /login.
 */

export { auth as default } from './auth'

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico|login).*)'],
}
