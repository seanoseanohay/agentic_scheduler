/**
 * Auth.js (NextAuth v5) configuration.
 *
 * Phase 0: Azure AD provider wired in with placeholder credentials.
 * The session carries operatorId from the tenant claim in the Azure AD token.
 *
 * Phase 1: Replace placeholder credentials with Key Vault references.
 *          Implement FSP-session bridging if SSO reuse is confirmed.
 */

import NextAuth, { type NextAuthConfig } from 'next-auth'
import MicrosoftEntraID from 'next-auth/providers/microsoft-entra-id'
import Credentials from 'next-auth/providers/credentials'

// Demo credentials for pilot — replace with Azure AD in production
const DEMO_USER = process.env['DEMO_USER'] ?? 'admin'
const DEMO_PASSWORD = process.env['DEMO_PASSWORD'] ?? 'oneshot-demo-2026'
const DEMO_OPERATOR_ID = process.env['DEMO_OPERATOR_ID'] ?? 'demo-operator-alpha'

const azureClientId = process.env['AZURE_AD_CLIENT_ID'] ?? ''

const providers: NextAuthConfig['providers'] = []

// Only wire Azure AD when real credentials are configured
if (azureClientId && azureClientId !== 'placeholder') {
  providers.push(
    MicrosoftEntraID({
      clientId: azureClientId,
      clientSecret: process.env['AZURE_AD_CLIENT_SECRET'] ?? '',
      issuer: `https://login.microsoftonline.com/${process.env['AZURE_AD_TENANT_ID'] ?? 'common'}/v2.0`,
    }),
  )
}

// Credentials provider: simple demo login for pilot phase
providers.push(
  Credentials({
    credentials: {
      username: { label: 'Username', type: 'text' },
      password: { label: 'Password', type: 'password' },
    },
    authorize(credentials) {
      if (credentials?.username === DEMO_USER && credentials?.password === DEMO_PASSWORD) {
        return { id: DEMO_OPERATOR_ID, name: DEMO_USER, operatorId: DEMO_OPERATOR_ID }
      }
      return null
    },
  }),
)

const config: NextAuthConfig = {
  providers,
  callbacks: {
    jwt({ token, user, profile }) {
      // From Credentials provider — user object carries operatorId
      const u = user as (typeof user & { operatorId?: string }) | undefined
      if (u?.operatorId) {
        token['operatorId'] = u.operatorId
      }
      // From Azure AD token extension attribute
      // Phase 1: configure this claim in app registration manifest
      const p = profile as Record<string, unknown> | undefined
      if (p?.['extension_operatorId']) {
        token['operatorId'] = p['extension_operatorId']
      }
      return token
    },
    session({ session, token }) {
      // Surface operatorId on the session object for Server Components
      const s = session as typeof session & { operatorId?: string }
      if (typeof token['operatorId'] === 'string') {
        s.operatorId = token['operatorId']
      }
      return s
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: { strategy: 'jwt' },
  trustHost: true,
}

const { handlers, auth, signIn, signOut } = NextAuth(config)
export { handlers, auth, signIn, signOut }
