import { signIn } from '@/auth'

export default function LoginPage() {
  const azureClientId = process.env['AZURE_AD_CLIENT_ID'] ?? ''
  const showAzure = azureClientId && azureClientId !== 'placeholder'

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-2xl font-semibold text-gray-900">OneShot</h1>
        <p className="mb-8 text-sm text-gray-500">Agentic scheduler for Flight Schedule Pro</p>

        {/* Credentials login — always shown in pilot */}
        <form
          action={async (formData: FormData) => {
            'use server'
            await signIn('credentials', {
              username: formData.get('username'),
              password: formData.get('password'),
              redirectTo: '/queue',
            })
          }}
          className="space-y-4"
        >
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Sign in
          </button>
        </form>

        {showAzure && (
          <>
            <div className="my-4 flex items-center">
              <div className="flex-1 border-t border-gray-200" />
              <span className="mx-3 text-xs text-gray-400">or</span>
              <div className="flex-1 border-t border-gray-200" />
            </div>
            <form
              action={async () => {
                'use server'
                await signIn('microsoft-entra-id', { redirectTo: '/queue' })
              }}
            >
              <button
                type="submit"
                className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Sign in with Microsoft
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
