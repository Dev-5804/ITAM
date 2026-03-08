import { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-zinc-50 dark:bg-zinc-950 px-4 py-12">
      {/* Background decoration elements for premium feel */}
      <div className="absolute -top-125 left-[50%] -z-10 h-250 w-250 -translate-x-[50%] rounded-full bg-indigo-50/50 dark:bg-indigo-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-125 left-[20%] -z-10 h-200 w-200 rounded-full bg-purple-50/50 dark:bg-purple-500/10 blur-3xl pointer-events-none" />
      
      <div className="z-10 w-full max-w-105 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
        {children}
      </div>
    </div>
  );
}
