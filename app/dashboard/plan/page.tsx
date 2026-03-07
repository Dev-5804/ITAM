"use client";

import { useEffect, useState } from "react";
import { Loader2, CheckCircle, Zap, Shield, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

interface PlanDetails {
    plan: string;
    max_members: number;
    max_tools: number;
    usage: {
        members: number;
        tools: number;
    }
}

export default function PlanPage() {
    const [details, setDetails] = useState<PlanDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [upgrading, setUpgrading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [role, setRole] = useState("member");

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

        if (userData?.role === 'owner') {
            try {
                const res = await fetch('/api/plan');
                if (res.ok) {
                    setDetails(await res.json());
                } else if (res.status === 404) {
                    const data = await res.json();
                    if (data.error?.includes('organization')) {
                        // No organization found, redirect to welcome
                        window.location.href = '/dashboard/welcome';
                        return;
                    }
                }
            } catch (err: any) {
                setError("Failed to load plan details");
            }
        }
        setLoading(false);
    }

    async function updatePlan(newPlan: string) {
        if (!confirm(`Are you sure you want to change to the ${newPlan.toUpperCase()} plan?`)) return;
        setUpgrading(true);
        setError(null);
        setSuccess(null);
        try {
            const res = await fetch('/api/plan', {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ plan: newPlan })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setSuccess(data.message);
            await loadData();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setUpgrading(false);
        }
    }

    if (loading) {
        return <div className="flex h-[80vh] w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>;
    }

    if (role !== 'owner') {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-center">
                <Shield className="h-12 w-12 text-zinc-300 mb-4" />
                <h2 className="text-xl font-bold">Access Denied</h2>
                <p className="text-zinc-500 mt-2">Only the organisation owner can manage billing and plans.</p>
            </div>
        );
    }

    if (!details) return null;

    const currentPlan = details.plan;

    const plans = [
        {
            id: 'free',
            name: 'Free',
            icon: <CheckCircle className="h-5 w-5 text-zinc-500" />,
            limits: '5 members, 2 tools',
            price: '$0/mo',
            color: 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border-zinc-200'
        },
        {
            id: 'pro',
            name: 'Pro',
            icon: <Zap className="h-5 w-5 text-indigo-500" />,
            limits: '20 members, 10 tools',
            price: '$49/mo',
            color: 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600'
        },
        {
            id: 'enterprise',
            name: 'Enterprise',
            icon: <Crown className="h-5 w-5 text-purple-500" />,
            limits: 'Unlimited members & tools',
            price: 'Custom',
            color: 'bg-purple-600 hover:bg-purple-700 text-white border-purple-600'
        }
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">Plan & Billing</h1>
                    <p className="text-zinc-500 dark:text-zinc-400 mt-1">Manage your organisation's subscription and limits</p>
                </div>
                <div className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-semibold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                    Current: {currentPlan}
                </div>
            </div>

            {error && <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
            {success && <Alert className="bg-green-50 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800"><AlertTitle>Success</AlertTitle><AlertDescription>{success}</AlertDescription></Alert>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                <Card className="shadow-sm border-zinc-200/60 dark:border-zinc-800/60 transition-shadow hover:shadow-md">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">Team Members</CardTitle>
                        <CardDescription>Seats used across your organization</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex justify-between items-end mb-2">
                            <span className="text-3xl font-bold">{details.usage.members}</span>
                            <span className="text-sm font-medium text-zinc-500">of {details.max_members > 1000 ? 'Unlimited' : details.max_members}</span>
                        </div>
                        <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-2.5 overflow-hidden">
                            <div
                                className={`h-2.5 rounded-full ${details.usage.members >= details.max_members ? 'bg-red-500' : 'bg-indigo-600'}`}
                                style={{ width: `${Math.min(100, (details.usage.members / details.max_members) * 100)}%` }}
                            ></div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-zinc-200/60 dark:border-zinc-800/60 transition-shadow hover:shadow-md">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">Internal Tools</CardTitle>
                        <CardDescription>Managed access points in your directory</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex justify-between items-end mb-2">
                            <span className="text-3xl font-bold">{details.usage.tools}</span>
                            <span className="text-sm font-medium text-zinc-500">of {details.max_tools > 1000 ? 'Unlimited' : details.max_tools}</span>
                        </div>
                        <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-2.5 overflow-hidden">
                            <div
                                className={`h-2.5 rounded-full ${details.usage.tools >= details.max_tools ? 'bg-red-500' : 'bg-indigo-600'}`}
                                style={{ width: `${Math.min(100, (details.usage.tools / details.max_tools) * 100)}%` }}
                            ></div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <h2 className="text-2xl font-bold tracking-tight mb-6">Available Plans</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {plans.map((p) => (
                    <Card key={p.id} className={`flex flex-col relative overflow-hidden transition-all duration-300 hover:shadow-lg ${currentPlan === p.id ? 'border-indigo-600 shadow-md ring-1 ring-indigo-600 dark:ring-indigo-500' : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'}`}>
                        {currentPlan === p.id && (
                            <div className="absolute top-0 inset-x-0 h-1 bg-indigo-600"></div>
                        )}
                        <CardHeader className="text-center pb-8 pt-8 relative z-10">
                            <div className="mx-auto bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 w-12 h-12 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
                                {p.icon}
                            </div>
                            <CardTitle className="text-xl">{p.name}</CardTitle>
                            <div className="text-2xl font-bold mt-2">{p.price}</div>
                        </CardHeader>
                        <CardContent className="flex-1 text-center pb-8 relative z-10">
                            <p className="text-sm text-zinc-600 dark:text-zinc-400 font-medium px-4 inline-block bg-zinc-50 dark:bg-zinc-900/50 py-2 rounded-lg">
                                Includes {p.limits}
                            </p>
                        </CardContent>
                        <CardFooter className="pt-0 relative z-10">
                            <Button
                                onClick={() => updatePlan(p.id)}
                                disabled={upgrading || currentPlan === p.id}
                                className={`w-full ${currentPlan === p.id ? 'bg-zinc-100 text-zinc-500 hover:bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-500' : p.color}`}
                                variant={currentPlan === p.id ? 'secondary' : 'default'}
                            >
                                {upgrading && currentPlan !== p.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {currentPlan === p.id ? "Current Plan" : "Upgrade"}
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
    )
}
