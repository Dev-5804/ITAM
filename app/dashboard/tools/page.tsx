"use client";

import { useEffect, useState } from "react";
import { Plus, Wrench, Edit, Power, PowerOff, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ToolsPage() {
    const [tools, setTools] = useState<any[]>([]);
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [role, setRole] = useState("member");
    const [error, setError] = useState<string | null>(null);
    const [showDialog, setShowDialog] = useState(false);
    const [creating, setCreating] = useState(false);
    const [formData, setFormData] = useState({ name: "", description: "", category: "" });
    const [editTool, setEditTool] = useState<any | null>(null);
    const [editData, setEditData] = useState({ name: "", description: "", category: "" });
    const [saving, setSaving] = useState(false);

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

    async function createTool(e: React.FormEvent) {
        e.preventDefault();
        setCreating(true);
        setError(null);
        
        try {
            const res = await fetch("/api/tools", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            
            setShowDialog(false);
            setFormData({ name: "", description: "", category: "" });
            loadData();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setCreating(false);
        }
    }

    function openEdit(tool: any) {
        setEditTool(tool);
        setEditData({ name: tool.name, description: tool.description || "", category: tool.category || "" });
    }

    async function saveTool(e: React.FormEvent) {
        e.preventDefault();
        if (!editTool) return;
        setSaving(true);
        setError(null);

        try {
            const res = await fetch(`/api/tools/${editTool.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(editData)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setEditTool(null);
            loadData();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
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
                    <Button 
                        className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20"
                        onClick={() => setShowDialog(true)}
                    >
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
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(tool)}><Edit className="h-4 w-4" /></Button>
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
                                    <CardDescription className="line-clamp-2 min-h-10 text-zinc-500">
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

            {/* Create Tool Dialog */}
            {showDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-md mx-4 border border-zinc-200 dark:border-zinc-800">
                        <div className="flex justify-between items-center p-6 border-b border-zinc-200 dark:border-zinc-800">
                            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Create New Tool</h2>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => setShowDialog(false)}
                                className="h-8 w-8"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                        <form onSubmit={createTool} className="p-6 space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Tool Name *</Label>
                                <Input
                                    id="name"
                                    placeholder="e.g., Slack, GitHub, AWS Console"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Input
                                    id="description"
                                    placeholder="Brief description of the tool"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="category">Category *</Label>
                                <Input
                                    id="category"
                                    placeholder="e.g., Communication, Development, Cloud"
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => setShowDialog(false)}
                                    disabled={creating}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                                    disabled={creating}
                                >
                                    {creating ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Creating...
                                        </>
                                    ) : (
                                        "Create Tool"
                                    )}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Edit Tool Dialog */}
            {editTool && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-md mx-4 border border-zinc-200 dark:border-zinc-800">
                        <div className="flex justify-between items-center p-6 border-b border-zinc-200 dark:border-zinc-800">
                            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Edit Tool</h2>
                            <Button variant="ghost" size="icon" onClick={() => setEditTool(null)} className="h-8 w-8">
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                        <form onSubmit={saveTool} className="p-6 space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-name">Tool Name *</Label>
                                <Input
                                    id="edit-name"
                                    value={editData.name}
                                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-description">Description</Label>
                                <Input
                                    id="edit-description"
                                    value={editData.description}
                                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-category">Category *</Label>
                                <Input
                                    id="edit-category"
                                    value={editData.category}
                                    onChange={(e) => setEditData({ ...editData, category: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <Button type="button" variant="outline" className="flex-1" onClick={() => setEditTool(null)} disabled={saving}>
                                    Cancel
                                </Button>
                                <Button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700" disabled={saving}>
                                    {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : "Save Changes"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
