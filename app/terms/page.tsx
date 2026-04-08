import Link from 'next/link'

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 py-12">
      <div className="mx-auto max-w-3xl px-4 md:px-6">
        <Link href="/" className="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">
          Back to home
        </Link>
        <h1 className="mt-6 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Terms of Service</h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Effective date: April 6, 2026</p>

        <section className="mt-10 space-y-6 text-zinc-700 dark:text-zinc-300 leading-7">
          <p>
            These Terms of Service govern your use of ITAM. By using the service, you agree to comply with these terms and all
            applicable laws.
          </p>
          <p>
            You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under
            your account.
          </p>
          <p>
            You may use ITAM only for lawful business purposes. You must not misuse the service, attempt unauthorized access, or
            interfere with platform operations.
          </p>
          <p>
            ITAM may update functionality and pricing over time. Material changes to these terms will be communicated through the
            product or by email.
          </p>
          <p>
            If you have questions about these terms, contact your organization administrator or support team.
          </p>
        </section>
      </div>
    </main>
  )
}
