"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function SignUpPage() {
    const router = useRouter();
    const supabase = createClient();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const formData = new FormData(e.currentTarget);
        const fullName = formData.get("fullName") as string;
        const email = formData.get("email") as string;
        const password = formData.get("password") as string;

        try {
            const response = await fetch("/api/auth/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fullName, email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to sign up");
            }

            // Now sign in with the client-side Supabase client
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: data.email,
                password: data.password,
            });

            if (signInError) {
                throw new Error(signInError.message);
            }

            // Redirect to login page after successful signup
            router.push("/dashboard");
            router.refresh();
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    }

    return (
        <Card className="border-zinc-200/60 dark:border-zinc-800/60 shadow-xl shadow-zinc-900/5 backdrop-blur-sm bg-white/80 dark:bg-zinc-950/80">
            <CardHeader className="space-y-2 text-center">
                <div className="mx-auto bg-indigo-500/10 p-3 rounded-full w-12 h-12 flex items-center justify-center mb-2">
                    <div className="w-6 h-6 bg-indigo-600 rounded-sm rotate-45" />
                </div>
                <CardTitle className="text-2xl font-bold tracking-tight">Create your account</CardTitle>
                <CardDescription className="text-zinc-500 dark:text-zinc-400">
                    Join ITAM to manage internal tool access
                </CardDescription>
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

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="fullName">Full Name</Label>
                            <Input
                                id="fullName"
                                name="fullName"
                                placeholder="Jane Doe"
                                required
                                disabled={loading}
                                className="transition-all focus-visible:ring-indigo-500"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email address</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="jane@example.com"
                                required
                                disabled={loading}
                                className="transition-all focus-visible:ring-indigo-500"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                placeholder="••••••••"
                                required
                                minLength={8}
                                disabled={loading}
                                className="transition-all focus-visible:ring-indigo-500"
                            />
                        </div>
                    </div>
                    <Button
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 transition-all font-medium py-5"
                        type="submit"
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Setting up your account...
                            </>
                        ) : (
                            "Sign Up"
                        )}
                    </Button>
                </form>
            </CardContent>
            <CardFooter className="flex flex-col gap-4 text-center">
                <div className="text-sm text-zinc-500 dark:text-zinc-400">
                    Already have an account?{" "}
                    <Link href="/login" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 font-medium hover:underline transition-colors">
                        Log in here
                    </Link>
                </div>
            </CardFooter>
        </Card>
    );
}
