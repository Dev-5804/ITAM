import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="px-4 lg:px-6 h-16 flex items-center border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50 transition-all">
        <Link className="flex items-center justify-center gap-2 transition-transform hover:scale-105" href="#">
          <div className="bg-indigo-600 p-1.5 rounded-md flex shrink-0 shadow-sm shadow-indigo-600/20">
            <div className="w-4 h-4 rounded-sm border-2 border-white" />
          </div>
          <span className="font-bold text-xl tracking-tight">ITAM</span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          <Link className="text-sm font-medium hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors" href="#features">
            Features
          </Link>
          <Link className="text-sm font-medium hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors" href="#pricing">
            Pricing
          </Link>
        </nav>
      </header>
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-linear-to-b from-white to-zinc-50 dark:from-zinc-950 dark:to-zinc-900 border-b border-zinc-200 dark:border-zinc-800 relative overflow-hidden">
          {/* Decorative background blur */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-200 h-200 bg-indigo-500/10 rounded-full blur-[100px] opacity-50 dark:opacity-20 pointer-events-none" />

          <div className="container px-4 md:px-6 mx-auto relative z-10">
            <div className="flex flex-col items-center space-y-8 text-center animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out">
              <div className="space-y-4 max-w-3xl">
                <h1 className="text-4xl font-extrabold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl/none bg-clip-text text-transparent bg-linear-to-r from-zinc-900 to-zinc-500 dark:from-zinc-100 dark:to-zinc-500">
                  Internal Tool Access Manager
                </h1>
                <p className="mx-auto max-w-175 text-zinc-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-zinc-400">
                  Manage which internal tools your team can access. Secure, fast, and fully auditable access requests for your modern organization.
                </p>
              </div>
              <div className="space-x-4">
                <Link href="/signup">
                  <Button className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-6 text-lg rounded-full shadow-lg shadow-indigo-600/30 transition-all hover:scale-105 hover:shadow-indigo-600/40 font-medium">
                    Start for free
                  </Button>
                </Link>
                <Link href="/login">
                  <Button variant="outline" className="px-8 py-6 text-lg rounded-full transition-all hover:scale-105 border-zinc-300 dark:border-zinc-700 font-medium">
                    Sign In
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="w-full py-16 md:py-24 lg:py-32 bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 relative">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="text-center mb-16 space-y-4">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">Simple, transparent pricing</h2>
              <p className="text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto text-lg">Choose the perfect plan for your team's access management needs.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {/* Free Plan */}
              <div className="flex flex-col p-8 bg-white dark:bg-zinc-900/50 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm transition-all hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-700">
                <h3 className="text-2xl font-bold">Free</h3>
                <div className="mt-4 flex items-baseline text-5xl font-extrabold tracking-tight">
                  $0<span className="ml-1 text-xl font-medium text-zinc-500">/mo</span>
                </div>
                <ul className="mt-8 space-y-4 flex-1">
                  <li className="flex items-center gap-3"><div className="rounded-full bg-indigo-100 dark:bg-indigo-900/50 p-1"><span className="text-indigo-600 dark:text-indigo-400 w-4 h-4 flex items-center justify-center font-bold text-xs">✓</span></div> Up to 5 members</li>
                  <li className="flex items-center gap-3"><div className="rounded-full bg-indigo-100 dark:bg-indigo-900/50 p-1"><span className="text-indigo-600 dark:text-indigo-400 w-4 h-4 flex items-center justify-center font-bold text-xs">✓</span></div> Up to 3 tools</li>
                  <li className="flex items-center gap-3"><div className="rounded-full bg-indigo-100 dark:bg-indigo-900/50 p-1"><span className="text-indigo-600 dark:text-indigo-400 w-4 h-4 flex items-center justify-center font-bold text-xs">✓</span></div> Audit log (7 days)</li>
                </ul>
                <Link href="/signup" className="mt-8">
                  <Button className="w-full py-6 rounded-xl font-semibold" variant="outline">Get Started</Button>
                </Link>
              </div>

              {/* Pro Plan */}
              <div className="flex flex-col p-8 rounded-3xl bg-indigo-600 text-white shadow-2xl shadow-indigo-600/20 scale-105 border border-indigo-500 relative">
                <div className="absolute top-0 right-8 transform -translate-y-1/2">
                  <span className="bg-linear-to-r from-pink-500 to-violet-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Most Popular</span>
                </div>
                <h3 className="text-2xl font-bold">Pro</h3>
                <div className="mt-4 flex items-baseline text-5xl font-extrabold tracking-tight">
                  $49<span className="ml-1 text-xl font-medium text-indigo-200">/mo</span>
                </div>
                <ul className="mt-8 space-y-4 flex-1">
                  <li className="flex items-center gap-3"><div className="rounded-full bg-indigo-500 p-1"><span className="text-white w-4 h-4 flex items-center justify-center font-bold text-xs">✓</span></div> Up to 25 members</li>
                  <li className="flex items-center gap-3"><div className="rounded-full bg-indigo-500 p-1"><span className="text-white w-4 h-4 flex items-center justify-center font-bold text-xs">✓</span></div> Up to 50 tools</li>
                  <li className="flex items-center gap-3"><div className="rounded-full bg-indigo-500 p-1"><span className="text-white w-4 h-4 flex items-center justify-center font-bold text-xs">✓</span></div> Audit log (1 year)</li>
                </ul>
                <Link href="/signup" className="mt-8">
                  <Button className="w-full py-6 rounded-xl bg-white text-indigo-600 hover:bg-zinc-50 hover:scale-[1.02] transition-transform font-semibold">Upgrade to Pro</Button>
                </Link>
              </div>

              {/* Enterprise Plan */}
              <div className="flex flex-col p-8 bg-white dark:bg-zinc-900/50 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm transition-all hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-700">
                <h3 className="text-2xl font-bold">Enterprise</h3>
                <div className="mt-4 flex items-baseline text-5xl font-extrabold tracking-tight">
                  Custom
                </div>
                <ul className="mt-8 space-y-4 flex-1">
                  <li className="flex items-center gap-3"><div className="rounded-full bg-indigo-100 dark:bg-indigo-900/50 p-1"><span className="text-indigo-600 dark:text-indigo-400 w-4 h-4 flex items-center justify-center font-bold text-xs">✓</span></div> Unlimited members</li>
                  <li className="flex items-center gap-3"><div className="rounded-full bg-indigo-100 dark:bg-indigo-900/50 p-1"><span className="text-indigo-600 dark:text-indigo-400 w-4 h-4 flex items-center justify-center font-bold text-xs">✓</span></div> Unlimited tools</li>
                  <li className="flex items-center gap-3"><div className="rounded-full bg-indigo-100 dark:bg-indigo-900/50 p-1"><span className="text-indigo-600 dark:text-indigo-400 w-4 h-4 flex items-center justify-center font-bold text-xs">✓</span></div> Audit log (Forever)</li>
                </ul>
                <Link href="/signup" className="mt-8">
                  <Button className="w-full py-6 rounded-xl font-semibold" variant="outline">Contact Sales</Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-8 w-full shrink-0 items-center px-4 md:px-6 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">© 2026 ITAM Inc. All rights reserved.</p>
        <nav className="sm:ml-auto flex gap-6">
          <Link className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50 transition-colors" href="#">
            Terms of Service
          </Link>
          <Link className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50 transition-colors" href="#">
            Privacy
          </Link>
        </nav>
      </footer>
    </div>
  )
}
