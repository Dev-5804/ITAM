"use client";

import { createClient } from "@/lib/supabase/client";
import { LogOut, Bell, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function Header({ userName, role }: { userName?: string, role: string }) {
    const router = useRouter();

    async function handleSignOut() {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push("/login");
        router.refresh();
    }

    return (
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-zinc-200 bg-white/80 px-4 md:px-6 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80 sticky top-0 z-10 transition-colors">
            <div className="flex flex-1 items-center md:hidden">
                <Button variant="ghost" size="icon" className="shrink-0 -ml-2 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
                    <Menu className="h-5 w-5" />
                </Button>
            </div>
            <div className="hidden md:flex flex-1 items-center">
                {/* Breadcrumb or title placeholder */}
            </div>
            <div className="flex items-center gap-2 md:gap-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                <Button variant="ghost" size="icon" className="relative shrink-0 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300 transition-colors rounded-full">
                    <Bell className="h-5 w-5" />
                    <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-indigo-600 ring-2 ring-white dark:ring-zinc-950" />
                </Button>
                <div className="hidden md:block h-6 w-px bg-zinc-200 dark:bg-zinc-800" />
                <Button
                    variant="ghost"
                    onClick={handleSignOut}
                    className="text-zinc-600 hover:text-red-600 hover:bg-red-50 dark:text-zinc-400 dark:hover:text-red-400 dark:hover:bg-red-950/30 transition-all rounded-full px-3 md:px-4"
                >
                    <LogOut className="h-4 w-4 md:mr-2" />
                    <span className="hidden md:inline">Sign out</span>
                </Button>
            </div>
        </header>
    );
}
