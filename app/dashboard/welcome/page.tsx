"use client";

import { useRouter } from "next/navigation";
import { Building2, UserPlus, Mail, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

export default function WelcomePage() {
    const router = useRouter();
    const supabase = createClient();
    const [loading, setLoading] = useState(false);

    async function handleLogout() {
        setLoading(true);
        await supabase.auth.signOut();
        router.push('/login');
        router.refresh();
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-zinc-50 via-white to-zinc-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 p-4">
            <div className="w-full max-w-4xl space-y-6">
                {/* Logout Button */}
                <div className="flex justify-end">
                    <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={handleLogout}
                        disabled={loading}
                        className="text-zinc-600 dark:text-zinc-400"
                    >
                        <LogOut className="mr-2 h-4 w-4" />
                        Logout
                    </Button>
                </div>

                <div className="text-center space-y-3">
                    <h1 className="text-4xl font-bold tracking-tight">Welcome to ITAM</h1>
                    <p className="text-lg text-zinc-600 dark:text-zinc-400">
                        Get started by creating or joining an organization
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    {/* Create Organization Card */}
                    <Card className="border-zinc-200/60 dark:border-zinc-800/60 shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
                          onClick={() => router.push('/dashboard/create-organization')}>
                        <CardHeader className="space-y-4">
                            <div className="mx-auto bg-indigo-500/10 p-4 rounded-full w-16 h-16 flex items-center justify-center">
                                <Building2 className="w-8 h-8 text-indigo-600" />
                            </div>
                            <CardTitle className="text-2xl text-center">Create Organization</CardTitle>
                            <CardDescription className="text-center">
                                Start your own organization and invite team members to manage internal tools together
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button 
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    router.push('/dashboard/create-organization');
                                }}
                            >
                                <Building2 className="mr-2 h-4 w-4" />
                                Create Organization
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Join Organization Card */}
                    <Card className="border-zinc-200/60 dark:border-zinc-800/60 shadow-lg">
                        <CardHeader className="space-y-4">
                            <div className="mx-auto bg-green-500/10 p-4 rounded-full w-16 h-16 flex items-center justify-center">
                                <UserPlus className="w-8 h-8 text-green-600" />
                            </div>
                            <CardTitle className="text-2xl text-center">Join Organization</CardTitle>
                            <CardDescription className="text-center">
                                Have an invitation? Check your email for an invite link or ask your admin to send one
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex items-center justify-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 p-4 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                                <Mail className="h-4 w-4" />
                                <span>Invitations will appear in your email</span>
                            </div>
                            <p className="text-xs text-center text-zinc-500 dark:text-zinc-400">
                                You can also ask an admin from your organization to invite you
                            </p>
                        </CardContent>
                    </Card>
                </div>

                <div className="text-center pt-4">
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        You can change organizations later from your profile settings
                    </p>
                </div>
            </div>
        </div>
    );
}
