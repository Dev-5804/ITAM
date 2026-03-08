"use client";

import { useEffect, useState } from "react";
import { Loader2, Mail, Shield, User, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

export default function TeamPage() {
    const [members, setMembers] = useState<any[]>([]);
    const [invitations, setInvitations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [role, setRole] = useState("member");
    const [error, setError] = useState<string | null>(null);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState("member");
    const [inviting, setInviting] = useState(false);
    const [confirmRemove, setConfirmRemove] = useState<{ id: string; name: string } | null>(null);
    const [removing, setRemoving] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        setLoading(true);
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        setCurrentUserId(user.id);

        try {
            const res = await fetch('/api/team');
            if (res.ok) {
                const data = await res.json();
                setRole(data.currentUserRole || 'member');
                setMembers(data.members || []);
                setInvitations(data.invitations || []);
            } else if (res.status === 403) {
                // Member role — no access to team management
                setRole('member');
            }
        } catch (e) {
            console.error(e);
        }

        setLoading(false);
    }

    const isOwner = role === 'owner';
    const isAdminOrOwner = role === 'admin' || role === 'owner';

    async function handleInvite(e: React.FormEvent) {
        e.preventDefault();
        setInviting(true);
        setError(null);
        try {
            const res = await fetch('/api/invitations', {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: inviteEmail, role: inviteRole })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setInviteEmail("");
            loadData();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setInviting(false);
        }
    }

    async function changeRole(id: string, newRole: string) {
        try {
            const res = await fetch(`/api/team/${id}/role`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ role: newRole })
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

    async function doRemoveMember() {
        if (!confirmRemove) return;
        setRemoving(true);
        try {
            const res = await fetch(`/api/team/${confirmRemove.id}`, { method: "DELETE" });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error);
            }
            setConfirmRemove(null);
            loadData();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setRemoving(false);
        }
    }

    async function cancelInvite(id: string) {
        try {
            const res = await fetch(`/api/invitations/${id}`, { method: "DELETE" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to delete invitation");
            loadData();
        } catch (err: any) {
            setError(err.message);
        }
    }

    if (!isAdminOrOwner && !loading) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-center">
                <Shield className="h-12 w-12 text-zinc-300 mb-4" />
                <h2 className="text-xl font-bold">Access Denied</h2>
                <p className="text-zinc-500 mt-2">You don't have permission to view the team directory.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">Team Management</h1>
                    <p className="text-zinc-500 dark:text-zinc-400 mt-1">Manage team members and invitations</p>
                </div>
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* Invite Form */}
            <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
                <h2 className="text-lg font-semibold mb-4">Invite Member</h2>
                <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-4 items-end">
                    <div className="flex-1 w-full space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                            id="email"
                            type="email"
                            required
                            placeholder="colleague@example.com"
                            value={inviteEmail}
                            onChange={e => setInviteEmail(e.target.value)}
                            disabled={inviting}
                        />
                    </div>
                    <div className="w-full sm:w-48 space-y-2">
                        <Label htmlFor="role">Role</Label>
                        <select
                            id="role"
                            className="flex h-10 w-full items-center justify-between rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:ring-offset-zinc-950 dark:focus:ring-indigo-500"
                            value={inviteRole}
                            onChange={e => setInviteRole(e.target.value)}
                            disabled={inviting}
                        >
                            <option value="member">Member</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>
                    <Button type="submit" disabled={inviting} className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-md shadow-indigo-600/20">
                        {inviting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
                        Send Invite
                    </Button>
                </form>
            </div>

            {/* Members List */}
            <div className="space-y-4">
                <h2 className="text-xl font-bold tracking-tight">Active Members</h2>
                <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
                    {loading ? (
                        <div className="py-12 flex justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400">
                                    <tr>
                                        <th className="px-6 py-4 font-semibold">User</th>
                                        <th className="px-6 py-4 font-semibold">Role</th>
                                        <th className="px-6 py-4 font-semibold">Joined Date</th>
                                        {isOwner && <th className="px-6 py-4 font-semibold text-right">Actions</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                                    {members.map(member => (
                                        <tr key={member.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-9 w-9 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex shrink-0 items-center justify-center text-indigo-700 dark:text-indigo-300 font-semibold text-xs border border-indigo-200 dark:border-indigo-800/50">
                                                        {member.full_name?.charAt(0).toUpperCase() || "U"}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-zinc-900 dark:text-zinc-100">{member.full_name || "Unknown"}</div>
                                                        <div className="text-zinc-500 text-xs">{member.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-zinc-700 dark:text-zinc-300">
                                                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold capitalize border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
                                                    {member.role === 'owner' && <Shield className="w-3 h-3 mr-1 text-indigo-600 dark:text-indigo-400" />}
                                                    {member.role === 'admin' && <User className="w-3 h-3 mr-1 text-blue-600 dark:text-blue-400" />}
                                                    {member.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-zinc-500">
                                                {new Date(member.created_at).toLocaleDateString()}
                                            </td>
                                            {isOwner && (
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <select
                                                            className="text-xs bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 rounded p-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                                                            value={member.role}
                                                            onChange={(e) => changeRole(member.id, e.target.value)}
                                                        >
                                                            <option value="owner">Owner</option>
                                                            <option value="admin">Admin</option>
                                                            <option value="member">Member</option>
                                                        </select>
                                                        <span className={member.id === currentUserId ? 'cursor-not-allowed' : ''}>
                                                            <Button variant="ghost" size="icon" className={`h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 ${member.id === currentUserId ? 'opacity-40 pointer-events-none' : ''}`} onClick={() => setConfirmRemove({ id: member.id, name: member.name || member.email })} disabled={member.id === currentUserId}>
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </span>
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Pending Invitations */}
            {invitations.length > 0 && (
                <div className="space-y-4 pt-4 animate-in fade-in duration-500">
                    <h2 className="text-xl font-bold tracking-tight">Pending Invitations</h2>
                    <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400">
                                    <tr>
                                        <th className="px-6 py-4 font-semibold">Email</th>
                                        <th className="px-6 py-4 font-semibold">Role</th>
                                        <th className="px-6 py-4 font-semibold">Sent Date</th>
                                        <th className="px-6 py-4 font-semibold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                                    {invitations.map(invite => (
                                        <tr key={invite.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100">{invite.email}</td>
                                            <td className="px-6 py-4 text-zinc-700 dark:text-zinc-300 capitalize">{invite.role}</td>
                                            <td className="px-6 py-4 text-zinc-500">{new Date(invite.created_at).toLocaleDateString()}</td>
                                            <td className="px-6 py-4 text-right">
                                                <Button variant="ghost" size="sm" className="text-zinc-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" onClick={() => cancelInvite(invite.id)}>
                                                    <X className="h-4 w-4 mr-1.5" /> Cancel
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Remove Member Confirmation Dialog */}
            <Dialog open={!!confirmRemove} onOpenChange={(open) => { if (!open) setConfirmRemove(null); }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Remove Member</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to remove <span className="font-medium text-zinc-900 dark:text-zinc-100">{confirmRemove?.name}</span> from the organization? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setConfirmRemove(null)} disabled={removing}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={doRemoveMember} disabled={removing} className="bg-red-600 hover:bg-red-700 text-white">
                            {removing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Remove Member
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
