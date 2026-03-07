"use client";

import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, XCircle, Clock, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

export default function RequestsPage() {
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [role, setRole] = useState("member");
    const [currentUserId, setCurrentUserId] = useState<string>("");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        setLoading(true);
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        setCurrentUserId(user.id);

        const { data: userData } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single();

        if (userData) setRole(userData.role);

        try {
            const reqsRes = await fetch('/api/requests');
            if (reqsRes.ok) {
                setRequests(await reqsRes.json());
            }
        } catch (e) {
            console.error(e);
        }

        setLoading(false);
    }

    const isAdmin = role === 'admin' || role === 'owner';

    async function updateRequest(id: string, action: string) {
        try {
            const res = await fetch(`/api/requests/${id}/${action}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reviewer_note: "" })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            loadData();
        } catch (err: any) {
            setError(err.message);
        }
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'approved': return <CheckCircle2 className="h-5 w-5 text-green-600" />;
            case 'rejected': return <XCircle className="h-5 w-5 text-red-600" />;
            case 'revoked': return <Ban className="h-5 w-5 text-orange-600" />;
            default: return <Clock className="h-5 w-5 text-amber-500" />;
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">Access Requests</h1>
                    <p className="text-zinc-500 dark:text-zinc-400 mt-1">
                        {isAdmin ? "Manage team access requests" : "Track your pending and approved access points"}
                    </p>
                </div>
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {loading ? (
                    <div className="col-span-full py-12 flex justify-center items-center">
                        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                    </div>
                ) : requests.length === 0 ? (
                    <div className="col-span-full py-16 text-center border-2 border-dashed rounded-2xl border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">No requests yet</h3>
                        <p className="text-sm text-zinc-500 mt-2">When access is requested, it will appear here.</p>
                    </div>
                ) : (
                    requests.map(req => {
                        const toolName = req.tools?.name || "Unknown Tool";
                        const requesterName = req.users?.full_name || "User";
                        const isOwnRequest = req.requester_id === currentUserId;

                        return (
                            <Card key={req.id} className="flex flex-col shadow-sm transition-all hover:shadow-md">
                                <CardHeader className="pb-4">
                                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-zinc-100 dark:bg-zinc-800 p-2 rounded-lg">
                                                {getStatusIcon(req.status)}
                                            </div>
                                            <div>
                                                <CardTitle className="text-lg">{toolName}</CardTitle>
                                                <CardDescription>
                                                    Requested by <span className="font-semibold text-zinc-800 dark:text-zinc-200">{requesterName}</span>
                                                </CardDescription>
                                            </div>
                                        </div>
                                        <div className="inline-flex max-w-min items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize tracking-wider border bg-white dark:bg-zinc-950 shadow-sm border-zinc-200 dark:border-zinc-800">
                                            {req.status}
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="pb-4">
                                    {req.reason ? (
                                        <div className="bg-zinc-50 dark:bg-zinc-900/50 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800 text-sm italic text-zinc-600 dark:text-zinc-400">
                                            "{req.reason}"
                                        </div>
                                    ) : (
                                        <p className="text-sm text-zinc-500">No specific reason provided.</p>
                                    )}
                                </CardContent>
                                <CardFooter className="pt-0 flex gap-2 justify-end bg-zinc-50/50 dark:bg-zinc-950/20 pt-4 rounded-b-xl border-t border-zinc-100 dark:border-zinc-900">
                                    {isAdmin && req.status === 'pending' && (
                                        <>
                                            <Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200" onClick={() => updateRequest(req.id, 'reject')}>Reject</Button>
                                            <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => updateRequest(req.id, 'approve')}>Approve</Button>
                                        </>
                                    )}
                                    {isAdmin && req.status === 'approved' && (
                                        <Button variant="outline" className="text-orange-600 hover:text-orange-700 hover:bg-orange-50" onClick={() => updateRequest(req.id, 'revoke')}>Revoke Access</Button>
                                    )}
                                    {isOwnRequest && req.status === 'pending' && (
                                        <Button variant="ghost" className="text-zinc-500 hover:bg-zinc-100" onClick={() => updateRequest(req.id, 'cancel')}>Cancel Request</Button>
                                    )}
                                    {!isAdmin && !isOwnRequest && (
                                        <span className="text-xs text-zinc-400">No actions available</span>
                                    )}
                                </CardFooter>
                            </Card>
                        )
                    })
                )}
            </div>
        </div>
    )
}
