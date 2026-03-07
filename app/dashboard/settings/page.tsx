"use client";

import { Settings } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl">
            <div className="flex flex-col border-b border-zinc-200 dark:border-zinc-800 pb-6">
                <h1 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">Settings</h1>
                <p className="text-zinc-500 dark:text-zinc-400 mt-1">Manage your organisation settings</p>
            </div>

            <Card className="shadow-sm border-zinc-200/60 dark:border-zinc-800/60">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Settings className="h-5 w-5 text-zinc-400" />
                        <CardTitle>Organisation Settings</CardTitle>
                    </div>
                    <CardDescription>Settings and configuration options coming soon.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        This section is under construction. More options will be available here soon.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
