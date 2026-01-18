import Link from "next/link"
import { Shield, CheckCircle2, ArrowRight, AlertTriangle, FileText, Users } from "lucide-react"

export default function Home() {
  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950">
      {/* Header */}
      <header className="border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="p-1.5 sm:p-2 bg-black dark:bg-white rounded-lg">
                <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-white dark:text-black" />
              </div>
              <span className="text-lg sm:text-xl font-bold text-black dark:text-white">ITAM</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                href="/login"
                className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white"
              >
                Login
              </Link>
              <Link
                href="/login"
                className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold bg-black dark:bg-white text-white dark:text-black rounded-lg hover:opacity-90"
              >
                Sign up
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 sm:py-16 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-black dark:text-white mb-4 sm:mb-6 leading-tight">
              Centralize and audit access to your internal tools
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-neutral-600 dark:text-neutral-400 mb-6 sm:mb-8 leading-relaxed px-2 sm:px-0">
              Manage access requests, approvals, and audits for tools like GitHub, AWS, and Notion — without automating permissions.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-6 py-3 sm:px-8 sm:py-4 bg-black dark:bg-white text-white dark:text-black rounded-lg font-semibold text-base sm:text-lg hover:opacity-90"
            >
              Get Started
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Problem → Solution Section */}
      <section className="py-12 sm:py-16 lg:py-20 bg-neutral-50 dark:bg-neutral-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8 sm:gap-12 lg:gap-16">
            {/* Problem */}
            <div>
              <div className="inline-flex items-center gap-2 mb-4 sm:mb-6 px-3 py-1.5 sm:px-4 sm:py-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-600 dark:text-red-400" />
                <span className="text-xs sm:text-sm font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider">Problem</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-black dark:text-white mb-4 sm:mb-6">
                Access management is broken
              </h2>
              <ul className="space-y-3 sm:space-y-4">
                <li className="flex items-start gap-2.5 sm:gap-3">
                  <div className="w-1.5 h-1.5 bg-neutral-400 rounded-full mt-2.5 flex-shrink-0"></div>
                  <span className="text-sm sm:text-base text-neutral-700 dark:text-neutral-300">Tool access is scattered across multiple systems</span>
                </li>
                <li className="flex items-start gap-2.5 sm:gap-3">
                  <div className="w-1.5 h-1.5 bg-neutral-400 rounded-full mt-2.5 flex-shrink-0"></div>
                  <span className="text-sm sm:text-base text-neutral-700 dark:text-neutral-300">Approvals happen informally in chat or email</span>
                </li>
                <li className="flex items-start gap-2.5 sm:gap-3">
                  <div className="w-1.5 h-1.5 bg-neutral-400 rounded-full mt-2.5 flex-shrink-0"></div>
                  <span className="text-sm sm:text-base text-neutral-700 dark:text-neutral-300">No centralized audit trail for compliance</span>
                </li>
                <li className="flex items-start gap-2.5 sm:gap-3">
                  <div className="w-1.5 h-1.5 bg-neutral-400 rounded-full mt-2.5 flex-shrink-0"></div>
                  <span className="text-sm sm:text-base text-neutral-700 dark:text-neutral-300">Offboarding is inconsistent and error-prone</span>
                </li>
              </ul>
            </div>

            {/* Solution */}
            <div>
              <div className="inline-flex items-center gap-2 mb-4 sm:mb-6 px-3 py-1.5 sm:px-4 sm:py-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs sm:text-sm font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Solution</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-black dark:text-white mb-4 sm:mb-6">
                Centralized governance
              </h2>
              <ul className="space-y-3 sm:space-y-4">
                <li className="flex items-start gap-2.5 sm:gap-3">
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm sm:text-base text-neutral-700 dark:text-neutral-300">One system for all access requests</span>
                </li>
                <li className="flex items-start gap-2.5 sm:gap-3">
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm sm:text-base text-neutral-700 dark:text-neutral-300">Structured approval workflows with clear history</span>
                </li>
                <li className="flex items-start gap-2.5 sm:gap-3">
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm sm:text-base text-neutral-700 dark:text-neutral-300">Immutable central audit logs for compliance</span>
                </li>
                <li className="flex items-start gap-2.5 sm:gap-3">
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm sm:text-base text-neutral-700 dark:text-neutral-300">Manual access with controlled governance</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-12 sm:py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-12 lg:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-black dark:text-white mb-3 sm:mb-4">
              How it works
            </h2>
            <p className="text-base sm:text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto px-4 sm:px-0">
              Simple workflow for managing tool access
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 sm:gap-8 lg:gap-12 mb-8 sm:mb-12">
            {/* Step 1 */}
            <div className="text-center">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-black dark:bg-white rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <span className="text-xl sm:text-2xl font-bold text-white dark:text-black">1</span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-black dark:text-white mb-2 sm:mb-3 px-4 sm:px-0">
                Admin registers tools
              </h3>
              <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400 px-4 sm:px-0">
                Organization admins register internal tools in the system with access level details
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-black dark:bg-white rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <span className="text-xl sm:text-2xl font-bold text-white dark:text-black">2</span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-black dark:text-white mb-2 sm:mb-3 px-4 sm:px-0">
                Members request access
              </h3>
              <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400 px-4 sm:px-0">
                Team members submit formal access requests through the platform
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-black dark:bg-white rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <span className="text-xl sm:text-2xl font-bold text-white dark:text-black">3</span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-black dark:text-white mb-2 sm:mb-3 px-4 sm:px-0">
                Admin approves manually
              </h3>
              <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400 px-4 sm:px-0">
                Admins review and approve requests, then grant access manually in the external tool
              </p>
            </div>
          </div>

          {/* Important Note */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 p-4 sm:p-6 max-w-3xl mx-auto">
            <p className="text-xs sm:text-sm font-medium text-neutral-800 dark:text-neutral-200">
              <strong>Important:</strong> This product records approvals and audits. Actual access is granted manually in external tools.
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 sm:py-16 lg:py-20 bg-neutral-50 dark:bg-neutral-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-12 lg:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-black dark:text-white mb-3 sm:mb-4">
              Features
            </h2>
            <p className="text-base sm:text-lg text-neutral-600 dark:text-neutral-400">
              Everything you need for access governance
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 sm:p-6">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-neutral-100 dark:bg-neutral-700 rounded-lg flex items-center justify-center mb-3 sm:mb-4">
                <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-black dark:text-white" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-black dark:text-white mb-1.5 sm:mb-2">
                Role-based access control
              </h3>
              <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
                Owner, Admin, and Member roles with granular permissions
              </p>
            </div>

            <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 sm:p-6">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-neutral-100 dark:bg-neutral-700 rounded-lg flex items-center justify-center mb-3 sm:mb-4">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-black dark:text-white" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-black dark:text-white mb-1.5 sm:mb-2">
                Multi-organization support
              </h3>
              <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
                Manage multiple organizations with complete data isolation
              </p>
            </div>

            <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 sm:p-6">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-neutral-100 dark:bg-neutral-700 rounded-lg flex items-center justify-center mb-3 sm:mb-4">
                <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-black dark:text-white" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-black dark:text-white mb-1.5 sm:mb-2">
                Approval workflows
              </h3>
              <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
                Structured request and approval process with clear state management
              </p>
            </div>

            <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 sm:p-6">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-neutral-100 dark:bg-neutral-700 rounded-lg flex items-center justify-center mb-3 sm:mb-4">
                <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-black dark:text-white" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-black dark:text-white mb-1.5 sm:mb-2">
                Immutable audit logs
              </h3>
              <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
                Comprehensive tracking of all access changes and administrative actions
              </p>
            </div>

            <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 sm:p-6">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-neutral-100 dark:bg-neutral-700 rounded-lg flex items-center justify-center mb-3 sm:mb-4">
                <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-black dark:text-white" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-black dark:text-white mb-1.5 sm:mb-2">
                Subscription-based limits
              </h3>
              <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
                Flexible limits on tools, members, and access requests per organization
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-200 dark:border-neutral-800 py-8 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-3 sm:gap-4 text-center">
            <div className="flex items-center gap-2">
              <div className="p-1.5 sm:p-2 bg-black dark:bg-white rounded-lg">
                <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-white dark:text-black" />
              </div>
              <span className="text-lg sm:text-xl font-bold text-black dark:text-white">ITAM</span>
            </div>
            <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
              Built as an internal access governance tool
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
