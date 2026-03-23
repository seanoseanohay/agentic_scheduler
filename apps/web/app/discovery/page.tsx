/**
 * Discovery Flight Intake Form — public-facing page.
 *
 * No authentication required. Accepts prospect contact info and preferred date,
 * POSTs to the public /api/v1/prospects endpoint.
 *
 * The operatorId is read from the URL query param so this page can be used
 * across multiple tenant schools via a branded link.
 *
 * e.g. /discovery?operator=demo-operator-alpha
 */

import { DiscoveryForm } from './DiscoveryForm'

interface PageProps {
  searchParams: Promise<{ operator?: string }>
}

export default async function DiscoveryPage({ searchParams }: PageProps) {
  const params = await searchParams
  const operatorId = params.operator ?? ''
  const apiUrl = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white">
      <div className="mx-auto max-w-lg px-4 py-16">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Book a Discovery Flight</h1>
          <p className="mt-3 text-gray-600">
            Experience the freedom of flight. Fill out the form below and we will send you
            available slots that meet FAA daylight requirements.
          </p>
        </div>
        <DiscoveryForm operatorId={operatorId} apiUrl={apiUrl} />
      </div>
    </div>
  )
}
