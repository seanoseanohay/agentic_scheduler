'use client'

import { useState } from 'react'

interface DiscoveryFormProps {
  operatorId: string
  apiUrl: string
}

interface FormState {
  firstName: string
  lastName: string
  email: string
  phone: string
  requestedDate: string
}

type SubmitStatus = 'idle' | 'submitting' | 'success' | 'error'

export function DiscoveryForm({ operatorId, apiUrl }: DiscoveryFormProps) {
  const [form, setForm] = useState<FormState>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    requestedDate: '',
  })
  const [status, setStatus] = useState<SubmitStatus>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const set = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!operatorId) {
      setErrorMsg('Invalid booking link. Please contact the flight school directly.')
      setStatus('error')
      return
    }

    setStatus('submitting')
    setErrorMsg('')

    try {
      const res = await fetch(`${apiUrl}/api/v1/prospects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          operatorId,
          requestedDate: form.requestedDate || undefined,
          phone: form.phone || undefined,
        }),
      })

      if (res.ok) {
        setStatus('success')
      } else {
        const data = (await res.json()) as { message?: string }
        setErrorMsg(data.message ?? 'Something went wrong. Please try again.')
        setStatus('error')
      }
    } catch {
      setErrorMsg('Network error. Please check your connection and try again.')
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-100 text-center">
        <div className="mb-4 text-4xl">✈️</div>
        <h2 className="mb-2 text-xl font-semibold text-gray-900">Request received!</h2>
        <p className="text-gray-600">
          Thank you, {form.firstName}. We will email you within 24 hours with available
          discovery flight slots.
        </p>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-100 space-y-5"
    >
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">First name *</label>
          <input
            type="text"
            required
            value={form.firstName}
            onChange={set('firstName')}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Last name *</label>
          <input
            type="text"
            required
            value={form.lastName}
            onChange={set('lastName')}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Email *</label>
        <input
          type="email"
          required
          value={form.email}
          onChange={set('email')}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Phone <span className="text-gray-400">(optional)</span>
        </label>
        <input
          type="tel"
          value={form.phone}
          onChange={set('phone')}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Preferred date <span className="text-gray-400">(optional)</span>
        </label>
        <input
          type="date"
          value={form.requestedDate}
          onChange={set('requestedDate')}
          min={new Date().toISOString().substring(0, 10)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
        <p className="mt-1 text-xs text-gray-400">
          All flights are scheduled within FAA civil twilight hours.
        </p>
      </div>

      {status === 'error' && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{errorMsg}</p>
      )}

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="w-full rounded-lg bg-sky-600 px-4 py-3 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-50 transition-colors"
      >
        {status === 'submitting' ? 'Sending...' : 'Request Discovery Flight'}
      </button>

      <p className="text-center text-xs text-gray-400">
        Payment is collected only after you confirm your slot.
      </p>
    </form>
  )
}
