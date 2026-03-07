"use client";

import { useEffect, useState } from "react";
import { Plus, Wrench, Edit, Power, PowerOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

export default function ToolsPage() {
    const [tools, setTools] = useState<any[]>([]);
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [role, setRole] = useState("member");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        setLoading(true);
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: userData } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single();

        if (userData) setRole(userData.role);

        try {
            const [toolsRes, reqsRes] = await Promise.all([
                fetch('/api/tools'),
                fetch('/api/requests')
            ]);

            if (toolsRes.ok) setTools(await toolsRes.json());
            if (reqsRes.ok) setRequests(await reqsRes.json());
        } catch (e) {
            console.error(e);
        }

        setLoading(false);
    }

    const isAdmin = role === 'admin' || role === 'owner';

    async function requestAccess(toolId: string) {
        try {
            const res = await fetch("/api/requests", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tool_id: toolId, reason: "Self requested" })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            loadData();
        } catch (err: any) {
            setError(err.message);
        }
    }

    async function toggleStatus(id: string, currentStatus: boolean) {
        try {
            const res = await fetch(`/api/tools/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ is_active: !currentStatus })
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error);
            }
            loadData();
        } catch (err: any) {
            setError(err.message);
        }
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">Tools Directory</h1>
                    <p className="text-zinc-500 dark:text-zinc-400 mt-1">Manage and request access to internal systems</p>
                </div>
                {isAdmin && (
                    <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20">
                        <Plus className="mr-2 h-4 w-4" /> Add Tool
                    </Button>
                )}
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full py-12 flex justify-center items-center">
                        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                    </div>
                ) : tools.length === 0 ? (
                    <div className="col-span-full py-16 text-center border-2 border-dashed rounded-2xl border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">No tools found</h3>
                        <p className="text-sm text-zinc-500 mt-2">Get started by adding a new internal tool.</p>
                    </div>
                ) : (
                    tools.map(tool => {
                        const req = requests.find(r => r.tool_id === tool.id && r.status !== 'cancelled' && r.status !== 'rejected' && r.status !== 'revoked');
                        const hasRequested = !!req;

                        return (
                            <Card key={tool.id} className={`flex flex-col shadow-sm transition-all hover:shadow-md ${!tool.is_active ? 'opacity-60 grayscale' : ''}`}>
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <div className="bg-indigo-50 dark:bg-indigo-900/30 p-2.5 rounded-xl border border-indigo-100 dark:border-indigo-800/50">
                                            <Wrench className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                                        </div>
                                        {isAdmin && (
                                            <div className="flex gap-1">
                                                <Button variant="ghost" size="icon" className="h-8 w-8"><Edit className="h-4 w-4" /></Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-zinc-500"
                                                    onClick={() => toggleStatus(tool.id, tool.is_active)}
                                                >
                                                    {tool.is_active ? <PowerOff className="h-4 w-4 text-red-500" /> : <Power className="h-4 w-4 text-green-500" />}
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                    <CardTitle className="mt-4 text-xl">{tool.name}</CardTitle>
                                    <CardDescription className="line-clamp-2 min-h-[40px] text-zinc-500">
                                        {tool.description || 'No description provided for this tool.'}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="flex-1">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 tracking-wide border border-zinc-200 dark:border-zinc-700">
                                        {tool.category || 'General Workspace'}
                                    </span>
                                </CardContent>
                                <CardFooter>
                                    {!isAdmin ? (
                                        <Button
                                            className="w-full font-medium"
                                            variant={hasRequested ? "secondary" : "default"}
                                            disabled={hasRequested || !tool.is_active}
                                            onClick={() => !hasRequested && requestAccess(tool.id)}
                                        >
                                            {hasRequested ? `Status: ${req.status.charAt(0).toUpperCase() + req.status.slice(1)}` : 'Request Access'}
                                        </Button>
                                    ) : null}
                                </CardFooter>
                            </Card>
                        )
                    })
                )}
            </div>
        </div>
    )
}
