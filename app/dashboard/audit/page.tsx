"use client";

import { useEffect, useState } from "react";
import { Loader2, Activity, ShieldAlert, FileText, ChevronRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { createClient } from "@/lib/supabase/client";

export default function AuditLogsPage() {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [role, setRole] = useState("member");

    useEffect(() => {
        async function loadData() {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: userData } = await supabase
                .from('users')
                .select('role')
                .eq('id', user.id)
                .single();

            if (userData) {
                setRole(userData.role);
                if (userData.role === 'admin' || userData.role === 'owner') {
                    try {
                        const res = await fetch('/api/audit-logs?limit=100');
                        if (!res.ok) throw new Error("Failed to load audit logs");
                        setLogs(await res.json());
                    } catch (err: any) {
                        setError(err.message);
                    }
                }
            }
            setLoading(false);
        }
        loadData();
    }, []);

    if (loading) {
        return (
            <div className="flex h-[80vh] w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (role !== 'admin' && role !== 'owner') {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-center">
                <ShieldAlert className="h-12 w-12 text-zinc-300 mb-4" />
                <h2 className="text-xl font-bold">Access Denied</h2>
                <p className="text-zinc-500 mt-2">Only administrators can view security audit logs.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-6xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">Audit Logs</h1>
                    <p className="text-zinc-500 dark:text-zinc-400 mt-1">Immutable record of critical security and access events</p>
                </div>
                <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 font-medium bg-zinc-100 dark:bg-zinc-900 px-3 py-1.5 rounded-full">
                    <Activity className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    Displaying last 100 events
                </div>
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {logs.length === 0 ? (
                <div className="py-16 text-center border-2 border-dashed rounded-2xl border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                    <FileText className="h-10 w-10 text-zinc-300 dark:text-zinc-700 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">No events recorded</h3>
                    <p className="text-sm text-zinc-500 mt-2">Audit logs will appear here when actions are taken.</p>
                </div>
            ) : (
                <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400">
                                <tr>
                                    <th className="px-6 py-4 font-semibold w-48">Timestamp</th>
                                    <th className="px-6 py-4 font-semibold">Action</th>
                                    <th className="px-6 py-4 font-semibold">Actor</th>
                                    <th className="px-6 py-4 font-semibold">Entity</th>
                                    <th className="px-6 py-4 font-semibold">Metadata</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                                {logs.map(log => (
                                    <tr key={log.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors">
                                        <td className="px-6 py-4 text-zinc-500 font-mono text-xs whitespace-nowrap">
                                            {new Date(log.created_at).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold tracking-wide border bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200">
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-zinc-900 dark:text-zinc-100 font-medium">
                                                {log.actor.name === 'System User' ? log.actor.email : log.actor.name}
                                            </div>
                                            <div className="text-zinc-500 text-xs">{log.actor.email}</div>
                                        </td>
                                        <td className="px-6 py-4 capitalize text-zinc-600 dark:text-zinc-400">
                                            {log.entity_type.replace('_', ' ')}
                                        </td>
                                        <td className="px-6 py-4">
                                            {log.metadata && Object.keys(log.metadata).length > 0 ? (
                                                <div className="text-xs font-mono text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900 p-2 rounded-lg border border-zinc-100 dark:border-zinc-800 overflow-hidden max-w-[240px] whitespace-nowrap overflow-ellipsis">
                                                    {JSON.stringify(log.metadata).replace(/["{}]/g, '')}
                                                </div>
                                            ) : (
                                                <span className="text-zinc-400 text-xs italic">none</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}
