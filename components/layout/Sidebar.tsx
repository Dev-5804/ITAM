"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    FileText,
    Wrench,
    Users,
    Activity,
    Settings,
    CreditCard,
    LayoutDashboard
} from "lucide-react";
import { cn } from "@/lib/utils";

type SidebarProps = {
    role: string;
    tenantName: string;
    userName?: string;
    mobileOpen?: boolean;
    onClose?: () => void;
};

export function Sidebar({ role, tenantName, userName, mobileOpen, onClose }: SidebarProps) {
    const pathname = usePathname();

    const links = [
        { name: "Requests", href: "/dashboard/requests", icon: FileText, roles: ["owner", "admin", "member"] },
        { name: "Tools", href: "/dashboard/tools", icon: Wrench, roles: ["owner", "admin", "member"] },
        { name: "Team", href: "/dashboard/team", icon: Users, roles: ["owner", "admin"] },
        { name: "Audit Log", href: "/dashboard/audit", icon: Activity, roles: ["owner", "admin"] },
        { name: "Settings", href: "/dashboard/settings", icon: Settings, roles: ["owner", "admin", "member"] },
        { name: "Plan", href: "/dashboard/plan", icon: CreditCard, roles: ["owner"] },
    ];

    const visibleLinks = links.filter((link) => link.roles.includes(role));

    return (
        <>
            {/* Mobile backdrop */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar — always visible on desktop, slide-over on mobile */}
            <div className={cn(
                "flex w-64 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 z-50 transition-transform duration-200",
                "fixed inset-y-0 left-0 md:relative md:translate-x-0",
                mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
            )}>
            <div className="flex h-16 shrink-0 items-center border-b border-zinc-200 dark:border-zinc-800 px-6">
                <div className="flex items-center gap-2 font-bold tracking-tight text-xl">
                    <div className="bg-indigo-600 p-1.5 rounded-md flex shrink-0">
                        <LayoutDashboard className="w-4 h-4 text-white" />
                    </div>
                    <span className="truncate">{tenantName}</span>
                </div>
            </div>
            <div className="flex flex-1 flex-col overflow-y-auto p-4">
                <nav className="flex-1 space-y-1">
                    {visibleLinks.map((link) => {
                        const Icon = link.icon;
                        const isActive = pathname.startsWith(link.href);
                        return (
                            <Link
                                key={link.name}
                                href={link.href}
                                onClick={onClose}
                                className={cn(
                                    "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200",
                                    isActive
                                        ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400"
                                        : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900/50 dark:hover:text-zinc-50"
                                )}
                            >
                                <Icon
                                    className={cn(
                                        "h-5 w-5 shrink-0 transition-colors duration-200",
                                        isActive ? "text-indigo-700 dark:text-indigo-400" : "text-zinc-400 group-hover:text-zinc-500 dark:group-hover:text-zinc-300"
                                    )}
                                    aria-hidden="true"
                                />
                                {link.name}
                            </Link>
                        );
                    })}
                </nav>
            </div>
            <div className="border-t border-zinc-200 p-4 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50">
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/40">
                        <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
                            {userName?.charAt(0).toUpperCase() || "U"}
                        </span>
                    </div>
                    <div className="flex flex-col overflow-hidden">
                        <span className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                            {userName}
                        </span>
                        <span className="truncate text-xs text-zinc-500 dark:text-zinc-400 capitalize">
                            {role}
                        </span>
                    </div>
                </div>
            </div>
        </div>
        </>
    );
}
