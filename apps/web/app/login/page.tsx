import { signIn } from '@/auth'

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-2xl font-semibold text-gray-900">OneShot</h1>
        <p className="mb-8 text-sm text-gray-500">Agentic scheduler for Flight Schedule Pro</p>

        <form
          action={async () => {
            'use server'
            await signIn('microsoft-entra-id', { redirectTo: '/queue' })
          }}
        >
          <button
            type="submit"
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Sign in with Microsoft
          </button>
        </form>
      </div>
    </div>
  )
}
