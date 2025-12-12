'use client'

export default function TestEnvPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Environment Test</h1>
      <div className="space-y-2">
        <div>
          <span className="font-semibold">GOOGLE_CLIENT_ID:</span>{' '}
          <span className="bg-gray-100 px-2 py-1 rounded">
            {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? '✅ Set' : '❌ Not set'}
          </span>
        </div>
        <div>
          <span className="font-semibold">Length:</span>{' '}
          <span className="bg-gray-100 px-2 py-1 rounded">
            {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.length || 0} chars
          </span>
        </div>
      </div>
    </div>
  )
}