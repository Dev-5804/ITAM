"use client";

import { useEffect, useState } from "react";
import { Settings, Building2, Loader2, AlertCircle, CheckCircle2, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function SettingsPage() {
    const [tenant, setTenant] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [orgName, setOrgName] = useState("");
    const [forbidden, setForbidden] = useState(false);

    useEffect(() => {
        async function loadSettings() {
            try {
                const res = await fetch('/api/settings');
                if (res.status === 403) { setForbidden(true); setLoading(false); return; }
                if (!res.ok) throw new Error((await res.json()).error);
                const data = await res.json();
                setTenant(data.tenant);
                setOrgName(data.tenant.name);
            } catch (err: any) {
                setError(err.message);
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
            setTenant((prev: any) => ({ ...prev, name: orgName }));
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <div className="flex h-[80vh] w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (forbidden) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-center">
                <ShieldAlert className="h-12 w-12 text-zinc-300 mb-4" />
                <h2 className="text-xl font-bold">Access Denied</h2>
                <p className="text-zinc-500 mt-2">Only the organization owner can manage settings.</p>
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

            <Card className="shadow-sm border-zinc-200/60 dark:border-zinc-800/60">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-zinc-400" />
                        <CardTitle>Organisation Details</CardTitle>
                    </div>
                    <CardDescription>Update your organisation's display name.</CardDescription>
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
        </div>
    );
}

