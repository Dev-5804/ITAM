"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Loader2, AlertCircle, CheckCircle2, LogOut } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

interface Tenant {
    name: string;
    slug: string;
    plan: string;
    created_at: string;
}

export default function SettingsPage() {
    const router = useRouter();
    const [tenant, setTenant] = useState<Tenant | null>(null);
    const [role, setRole] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [leaving, setLeaving] = useState(false);
    const [confirmLeave, setConfirmLeave] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [orgName, setOrgName] = useState("");

    useEffect(() => {
        async function loadSettings() {
            try {
                const res = await fetch('/api/settings');
                if (!res.ok) throw new Error((await res.json()).error);
                const data = await res.json();
                setTenant(data.tenant);
                setRole(data.role);
                setOrgName(data.tenant.name);
            } catch (err: unknown) {
                setError(err instanceof Error ? err.message : 'An error occurred');
            }
            setLoading(false);
        }
        loadSettings();
    }, []);

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        setError(null);
        setSuccess(false);
        try {
            const res = await fetch('/api/settings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: orgName }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setTenant((prev) => prev ? { ...prev, name: orgName } : prev);
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setSaving(false);
        }
    }

    async function handleLeave() {
        setLeaving(true);
        setError(null);
        try {
            const res = await fetch('/api/settings', { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            router.push('/dashboard/welcome');
            router.refresh();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'An error occurred');
            setLeaving(false);
            setConfirmLeave(false);
        }
    }

    if (loading) {
        return (
            <div className="flex h-[80vh] w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-2xl">
            <div className="flex flex-col border-b border-zinc-200 dark:border-zinc-800 pb-6">
                <h1 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">Settings</h1>
                <p className="text-zinc-500 dark:text-zinc-400 mt-1">Manage your organisation settings</p>
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {success && (
                <Alert className="border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertTitle>Saved</AlertTitle>
                    <AlertDescription>Organisation name updated successfully.</AlertDescription>
                </Alert>
            )}

            {role === 'owner' && (
                <Card className="shadow-sm border-zinc-200/60 dark:border-zinc-800/60">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-zinc-400" />
                            <CardTitle>Organisation Details</CardTitle>
                        </div>
                        <CardDescription>Update your organisation&apos;s display name.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="orgName">Organisation Name</Label>
                                <Input
                                    id="orgName"
                                    value={orgName}
                                    onChange={e => setOrgName(e.target.value)}
                                    placeholder="Acme Inc"
                                    required
                                    minLength={2}
                                    disabled={saving}
                                />
                            </div>
                            {tenant && (
                                <div className="text-xs text-zinc-400 space-y-0.5">
                                    <p>Slug: <span className="font-mono">{tenant.slug}</span></p>
                                    <p>Plan: <span className="font-medium capitalize">{tenant.plan}</span></p>
                                    <p>Created: {new Date(tenant.created_at).toLocaleDateString()}</p>
                                </div>
                            )}
                            <Button
                                type="submit"
                                disabled={saving || orgName === tenant?.name || orgName.trim().length < 2}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-md shadow-indigo-600/20"
                            >
                                {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving...</> : 'Save changes'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            )}

            {/* Leave Organisation — available to all roles */}
            <Card className="shadow-sm border-red-200/60 dark:border-red-900/40">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <LogOut className="h-5 w-5 text-red-500" />
                        <CardTitle className="text-red-600 dark:text-red-400">Leave Organisation</CardTitle>
                    </div>
                    <CardDescription>
                        {role === 'owner'
                            ? 'As an owner, you can only leave if there is at least one other owner.'
                            : 'You will lose access to all tools and data in this organisation.'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button
                        variant="destructive"
                        onClick={() => setConfirmLeave(true)}
                        className="bg-red-600 hover:bg-red-700 text-white"
                    >
                        <LogOut className="h-4 w-4 mr-2" />
                        Leave Organisation
                    </Button>
                </CardContent>
            </Card>

            {/* Leave confirmation dialog */}
            <Dialog open={confirmLeave} onOpenChange={(open) => { if (!open) setConfirmLeave(false); }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Leave Organisation</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to leave <span className="font-medium text-zinc-900 dark:text-zinc-100">{tenant?.name}</span>? You will immediately lose access and will need a new invitation to rejoin.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setConfirmLeave(false)} disabled={leaving}>Cancel</Button>
                        <Button variant="destructive" onClick={handleLeave} disabled={leaving} className="bg-red-600 hover:bg-red-700 text-white">
                            {leaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Leave Organisation
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

