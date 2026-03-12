"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, Building2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { createClient } from "@/lib/supabase/client";

export default function CreateOrganizationPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const formData = new FormData(e.currentTarget);
        const organizationName = formData.get("organizationName") as string;

        try {
            const response = await fetch("/api/organizations/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ organizationName }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to create organization");
            }

            // Refresh the Supabase session to get updated JWT with tenant_id
            const supabase = createClient();
            await supabase.auth.refreshSession();

            // Redirect to dashboard after creating organization
            router.push("/dashboard");
            router.refresh();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'An error occurred');
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-zinc-50 via-white to-zinc-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 p-4">
            <Card className="w-full max-w-md border-zinc-200/60 dark:border-zinc-800/60 shadow-xl shadow-zinc-900/5 backdrop-blur-sm bg-white/80 dark:bg-zinc-950/80">
                <CardHeader className="space-y-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push('/dashboard/welcome')}
                        className="w-fit -ml-2 mb-2"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                    </Button>
                    <div className="text-center">
                        <div className="mx-auto bg-indigo-500/10 p-3 rounded-full w-12 h-12 flex items-center justify-center mb-2">
                            <Building2 className="w-6 h-6 text-indigo-600" />
                        </div>
                        <CardTitle className="text-2xl font-bold tracking-tight">Create Your Organization</CardTitle>
                        <CardDescription className="text-zinc-500 dark:text-zinc-400">
                            Set up your organization to start managing internal tool access
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    <form onSubmit={onSubmit} className="space-y-4">
                        {error && (
                            <Alert variant="destructive" className="animate-in fade-in zoom-in-95 duration-200">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Error</AlertTitle>
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="organizationName">Organization Name</Label>
                            <Input
                                id="organizationName"
                                name="organizationName"
                                placeholder="Acme Inc"
                                required
                                disabled={loading}
                                className="transition-all focus-visible:ring-indigo-500"
                                autoFocus
                            />
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                You&apos;ll become the owner of this organization
                            </p>
                        </div>

                        <Button
                            type="submit"
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                "Create Organization"
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
