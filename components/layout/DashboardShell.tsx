"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

interface DashboardShellProps {
    role: string;
    tenantName: string;
    userName: string;
    children: React.ReactNode;
}

export function DashboardShell({ role, tenantName, userName, children }: DashboardShellProps) {
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <div className="flex h-screen overflow-hidden bg-zinc-50 dark:bg-zinc-950">
            <Sidebar
                role={role}
                tenantName={tenantName}
                userName={userName}
                mobileOpen={mobileOpen}
                onClose={() => setMobileOpen(false)}
            />
            <div className="flex flex-col flex-1 overflow-hidden transition-all duration-300">
                <Header
                    userName={userName}
                    role={role}
                    onMenuClick={() => setMobileOpen(true)}
                />
                <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
                    <div className="mx-auto max-w-7xl animate-in fade-in slide-in-from-bottom-4 duration-500 ease-in-out">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
