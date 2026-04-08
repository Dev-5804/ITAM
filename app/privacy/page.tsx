import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 py-12">
      <div className="mx-auto max-w-3xl px-4 md:px-6">
        <Link href="/" className="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">
          Back to home
        </Link>
        <h1 className="mt-6 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Privacy Policy</h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Effective date: April 6, 2026</p>

        <section className="mt-10 space-y-6 text-zinc-700 dark:text-zinc-300 leading-7">
          <p>
            ITAM collects account and organization data needed to authenticate users, process access requests, and maintain audit
            records.
          </p>
          <p>
            We use this data to provide core platform functionality, security monitoring, billing operations, and customer support.
          </p>
          <p>
            Access logs and request history are retained according to your plan limits and organizational settings.
          </p>
          <p>
            We do not sell personal data. Data may be shared with service providers only as required to operate ITAM and fulfill legal
            obligations.
          </p>
          <p>
            To request changes or deletion where applicable, contact your organization administrator or support team.
          </p>
        </section>
      </div>
    </main>
  )
}
