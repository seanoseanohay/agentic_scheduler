'use server'

import { signOut } from '@/auth'

/** Signs the current user out and redirects to /login. */
export async function signOutAction() {
  await signOut({ redirectTo: '/login' })
}
