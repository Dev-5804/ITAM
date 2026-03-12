"use client";

import { useEffect, useState, useMemo } from "react";
import { Loader2, ShieldAlert, FileText, Download, Search, Filter, X } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ACTION_OPTIONS = [
    { value: "", label: "All actions" },
    { value: "user.joined", label: "user.joined" },
    { value: "user.invited", label: "user.invited" },
    { value: "user.removed", label: "user.removed" },
    { value: "user.left", label: "user.left" },
    { value: "user.role_changed", label: "user.role_changed" },
    { value: "request.submitted", label: "request.submitted" },
    { value: "request.approved", label: "request.approved" },
    { value: "request.rejected", label: "request.rejected" },
    { value: "request.revoked", label: "request.revoked" },
    { value: "request.cancelled", label: "request.cancelled" },
    { value: "request.deleted", label: "request.deleted" },
    { value: "tool.created", label: "tool.created" },
    { value: "tool.updated", label: "tool.updated" },
    { value: "tool.deleted", label: "tool.deleted" },
    { value: "org.updated", label: "org.updated" },
    { value: "plan.changed", label: "plan.changed" },
];

export default function AuditLogsPage() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [role, setRole] = useState("member");

    const [filterAction, setFilterAction] = useState("");
    const [filterActor, setFilterActor] = useState("");
    const [filterDateFrom, setFilterDateFrom] = useState("");
    const [filterDateTo, setFilterDateTo] = useState("");

    useEffect(() => {
        async function loadData() {
            try {
                const res = await fetch('/api/audit-logs?limit=500');
                if (res.status === 403) { setRole('member'); setLoading(false); return; }
                if (!res.ok) throw new Error("Failed to load audit logs");
                const data = await res.json();
                setLogs(data);
                setRole('admin');
            } catch (err: unknown) {
                setError(err instanceof Error ? err.message : 'An error occurred');
            }
            setLoading(false);
        }
        loadData();
    }, []);

    const filtered = useMemo(() => {
        return logs.filter(log => {
            if (filterAction && log.action !== filterAction) return false;
            if (filterActor) {
                const q = filterActor.toLowerCase();
                const name = (log.actor?.name || '').toLowerCase();
                const email = (log.actor?.email || '').toLowerCase();
                if (!name.includes(q) && !email.includes(q)) return false;
            }
            if (filterDateFrom && new Date(log.created_at) < new Date(filterDateFrom)) return false;
            if (filterDateTo) {
                const to = new Date(filterDateTo);
                to.setHours(23, 59, 59, 999);
                if (new Date(log.created_at) > to) return false;
            }
            return true;
        });
    }, [logs, filterAction, filterActor, filterDateFrom, filterDateTo]);

    const hasFilters = filterAction || filterActor || filterDateFrom || filterDateTo;

    function clearFilters() {
        setFilterAction('');
        setFilterActor('');
        setFilterDateFrom('');
        setFilterDateTo('');
    }

    function exportCSV() {
        const headers = ['Timestamp', 'Action', 'Actor Name', 'Actor Email', 'Entity Type', 'Entity ID', 'Metadata'];
        const rows = filtered.map(log => [
            new Date(log.created_at).toISOString(),
            log.action,
            log.actor?.name || '',
            log.actor?.email || '',
            log.entity_type,
            log.entity_id || '',
            log.metadata ? JSON.stringify(log.metadata) : '',
        ]);
        const csv = [headers, ...rows]
            .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
            .join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

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
                <Button
                    onClick={exportCSV}
                    disabled={filtered.length === 0}
                    variant="outline"
                    className="flex items-center gap-2 font-medium"
                >
                    <Download className="h-4 w-4" />
                    Export CSV ({filtered.length})
                </Button>
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* Filters */}
            <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                    <Filter className="h-4 w-4 text-zinc-500" />
                    <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Filters</span>
                    {hasFilters && (
                        <button onClick={clearFilters} className="ml-auto flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors">
                            <X className="h-3 w-3" /> Clear all
                        </button>
                    )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-1.5">
                        <Label className="text-xs text-zinc-500">Action type</Label>
                        <select
                            className="flex h-9 w-full rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm dark:border-zinc-800 dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                            value={filterAction}
                            onChange={e => setFilterAction(e.target.value)}
                        >
                            {ACTION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs text-zinc-500">Actor</Label>
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2 h-4 w-4 text-zinc-400" />
                            <Input
                                placeholder="Name or email"
                                className="pl-8 h-9 text-sm"
                                value={filterActor}
                                onChange={e => setFilterActor(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs text-zinc-500">From date</Label>
                        <Input
                            type="date"
                            className="h-9 text-sm"
                            value={filterDateFrom}
                            onChange={e => setFilterDateFrom(e.target.value)}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs text-zinc-500">To date</Label>
                        <Input
                            type="date"
                            className="h-9 text-sm"
                            value={filterDateTo}
                            onChange={e => setFilterDateTo(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {filtered.length === 0 ? (
                <div className="py-16 text-center border-2 border-dashed rounded-2xl border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                    <FileText className="h-10 w-10 text-zinc-300 dark:text-zinc-700 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                        {hasFilters ? 'No matching events' : 'No events recorded'}
                    </h3>
                    <p className="text-sm text-zinc-500 mt-2">
                        {hasFilters ? 'Try adjusting your filters.' : 'Audit logs will appear here when actions are taken.'}
                    </p>
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
                                {filtered.map(log => (
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
                                                <div className="text-xs font-mono text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900 p-2 rounded-lg border border-zinc-100 dark:border-zinc-800 overflow-hidden max-w-60 whitespace-nowrap overflow-ellipsis">
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
    );
}

