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

const config: NextAuthConfig = {
  providers: [
    MicrosoftEntraID({
      clientId: process.env['AZURE_AD_CLIENT_ID'] ?? '',
      clientSecret: process.env['AZURE_AD_CLIENT_SECRET'] ?? '',
      issuer: `https://login.microsoftonline.com/${process.env['AZURE_AD_TENANT_ID'] ?? 'common'}/v2.0`,
    }),
  ],
  callbacks: {
    jwt({ token, profile }) {
      // Extract operatorId from Azure AD token extension attribute
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
}

// NextAuth v5 (beta) inferred types reference internal library paths.
// This is a known upstream limitation — tracked at https://github.com/nextauthjs/next-auth/issues/9645
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const { handlers, auth, signIn, signOut } = NextAuth(config)
export { handlers, auth, signIn, signOut }
