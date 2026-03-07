import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient, createClient } from '@/lib/supabase/server';

const acceptSchema = z.object({
    fullName: z.string().min(2, "Name is required"),
    password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(
    request: Request,
    { params }: { params: Promise<{ token: string }> | { token: string } }
) {
    try {
        const resolvedParams = await Promise.resolve(params);
        const token = resolvedParams.token;

        const body = await request.json();
        const result = acceptSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
        }

        const supabaseAdmin = await createAdminClient();

        // Verify token
        const { data: invite, error: inviteError } = await supabaseAdmin
            .from('invitations')
            .select('id, email, role, tenant_id, expires_at, accepted_at')
            .eq('token', token)
            .single();

        if (inviteError || !invite || invite.accepted_at || new Date(invite.expires_at) < new Date()) {
            return NextResponse.json({ error: 'Invalid or expired invitation' }, { status: 400 });
        }

        // Check if user already exists (maybe they log in from another browser?)
        // For this flow, we create the user via Supabase Auth Admin using the email on the invite
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: invite.email,
            password: result.data.password,
            email_confirm: true,
            user_metadata: { full_name: result.data.fullName }
        });

        if (authError || !authData.user) {
            return NextResponse.json({ error: authError?.message || 'Failed to create user' }, { status: 400 });
        }

        const userId = authData.user.id;

        // Transaction to insert public user, mark invitation as accepted, and log audit
        // Using simple RPC or a sequence of queries inside a single database function.
        // Wait, since we don't have a specific accepted_invite RPC, we can do it directly if we're careful 
        // but PRD says "Create auth user and public.users record. Mark invitation as accepted."

        const { error: insertError } = await supabaseAdmin.from('users').insert({
            id: userId,
            tenant_id: invite.tenant_id,
            role: invite.role,
            full_name: result.data.fullName
        });

        if (insertError) {
            await supabaseAdmin.auth.admin.deleteUser(userId);
            return NextResponse.json({ error: 'Failed to join tenant' }, { status: 500 });
        }

        await supabaseAdmin.from('invitations').update({
            accepted_at: new Date().toISOString()
        }).eq('id', invite.id);

        await supabaseAdmin.from('audit_logs').insert({
            tenant_id: invite.tenant_id,
            actor_id: userId,
            action: 'user.joined',
            entity_type: 'user',
            entity_id: userId,
            metadata: { role: invite.role, from_invitation: invite.id }
        });

        // Log the user in to establish a session cookie
        const supabase = await createClient();
        await supabase.auth.signInWithPassword({
            email: invite.email,
            password: result.data.password
        });

        return NextResponse.json({ success: true, redirect: '/dashboard' });
    } catch (err) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
