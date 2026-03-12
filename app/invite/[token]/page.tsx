"use client";

import { useState, useEffect, use } from "react";
import { Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { createClient } from "@/lib/supabase/client";

interface InviteData {
    email: string;
    role: string;
    tenantName: string;
    inviterName: string;
    userExists: boolean;
}

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
    const resolvedParams = use(params);
    const token = resolvedParams.token;

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [invite, setInvite] = useState<InviteData | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function loadInvite() {
            try {
                const res = await fetch(`/api/invitations/${token}`);
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
                setInvite(data);
            } catch (err: unknown) {
                setError(err instanceof Error ? err.message : 'An error occurred');
            } finally {
                setLoading(false);
            }
        }
        loadInvite();
    }, [token]);

    async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setSubmitting(true);
        setError(null);

        const formData = new FormData(e.currentTarget);
        const fullName = formData.get("fullName") as string | null;
        const password = formData.get("password") as string;

        try {
            const body: { password: string; fullName?: string } = { password };
            if (fullName) body.fullName = fullName;

            const response = await fetch(`/api/invitations/${token}/accept`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to join team");
            }

            // Sign in client-side so session cookies are properly set in the browser
            const supabase = createClient();
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: data.email,
                password,
            });

            if (signInError) {
                throw new Error('Account set up successfully! Please sign in at /login to continue.');
            }

            // Hard redirect so server components re-render with the new session
            window.location.href = "/dashboard";
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'An error occurred');
            setSubmitting(false);
        }
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4 py-12 relative overflow-hidden">
            <div className="absolute top-1/4 left-1/4 -z-10 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 -z-10 h-72 w-72 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />

            <div className="z-10 w-full max-w-110 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <Card className="border-zinc-200/60 dark:border-zinc-800/60 shadow-xl backdrop-blur-sm bg-white/80 dark:bg-zinc-950/80">
                    <CardHeader className="text-center pb-2">
                        <div className="mx-auto bg-indigo-500/10 p-3 rounded-full w-12 h-12 flex items-center justify-center mb-4 text-indigo-600">
                            <CheckCircle className="w-6 h-6" />
                        </div>
                        <CardTitle className="text-2xl font-bold">You&apos;ve been invited!</CardTitle>
                        <CardDescription>Join your team on ITAM</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex flex-col items-center py-8 space-y-4">
                                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                                <p className="text-zinc-500 text-sm">Loading invitation details...</p>
                            </div>
                        ) : error ? (
                            <Alert variant="destructive" className="mt-4">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Invalid Invitation</AlertTitle>
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        ) : invite ? (
                            <div className="space-y-6">
                                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-xl text-center shadow-sm">
                                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-2">
                                        <span className="font-medium text-zinc-900 dark:text-zinc-100">{invite.inviterName}</span> invited you to join
                                    </p>
                                    <p className="text-2xl font-bold bg-clip-text text-transparent bg-linear-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400 mb-3">{invite.tenantName}</p>
                                    <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300 uppercase tracking-wide">
                                        {invite.role}
                                    </div>
                                </div>

                                <form onSubmit={onSubmit} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email address</Label>
                                        <Input id="email" value={invite.email} disabled className="bg-zinc-50 dark:bg-zinc-900 text-zinc-500 blur-none opacity-80" />
                                    </div>
                                    {!invite.userExists && (
                                        <div className="space-y-2">
                                            <Label htmlFor="fullName">Your Full Name</Label>
                                            <Input id="fullName" name="fullName" placeholder="Jane Doe" required={!invite.userExists} disabled={submitting} />
                                        </div>
                                    )}
                                    <div className="space-y-2">
                                        <Label htmlFor="password">
                                            {invite.userExists ? 'Your ITAM Password' : 'Set a Password'}
                                        </Label>
                                        {invite.userExists && (
                                            <p className="text-xs text-zinc-500">You already have an ITAM account. Enter your existing password to join this organization.</p>
                                        )}
                                        <Input id="password" name="password" type="password" placeholder="••••••••" required minLength={8} disabled={submitting} />
                                    </div>
                                    <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-6 mt-4 shadow-lg shadow-indigo-600/20 transition-all hover:-translate-y-0.5" type="submit" disabled={submitting}>
                                        {submitting ? (
                                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Accepting invitation...</>
                                        ) : (
                                            "Join Team"
                                        )}
                                    </Button>
                                </form>
                            </div>
                        ) : null}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
