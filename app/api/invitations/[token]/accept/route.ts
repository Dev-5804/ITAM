import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';

const acceptSchema = z.object({
    fullName: z.string().min(2, "Name is required").optional(),
    password: z.string().min(8, "Password must be at least 8 characters"),
    isExistingUser: z.boolean().default(false),
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

        // Check if user already exists in auth — search ALL pages, not just first 50
        let existingAuthUser = null;
        let page = 1;
        while (true) {
            const { data: pageData } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
            if (!pageData || pageData.users.length === 0) break;
            const found = pageData.users.find(u => u.email === invite.email);
            if (found) { existingAuthUser = found; break; }
            if (pageData.users.length < 1000) break;
            page++;
        }

        let userId: string;

        if (existingAuthUser) {
            userId = existingAuthUser.id;

            // Upsert public.users — handles both "row exists" and "row missing" cases
            const { error: upsertError } = await supabaseAdmin
                .from('users')
                .upsert({
                    id: userId,
                    tenant_id: invite.tenant_id,
                    role: invite.role,
                    full_name: existingAuthUser.user_metadata?.full_name || null,
                }, { onConflict: 'id' });

            if (upsertError) {
                return NextResponse.json({ error: `Failed to join organization: ${upsertError.message}` }, { status: 500 });
            }
        } else {
            // New user
            if (!result.data.fullName) {
                return NextResponse.json({ error: 'Full name is required for new accounts' }, { status: 400 });
            }

            const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
                email: invite.email,
                password: result.data.password,
                email_confirm: true,
                user_metadata: { full_name: result.data.fullName }
            });

            if (authError || !authData.user) {
                return NextResponse.json({ error: authError?.message || 'Failed to create user' }, { status: 400 });
            }

            userId = authData.user.id;

            const { error: insertError } = await supabaseAdmin.from('users').upsert({
                id: userId,
                tenant_id: invite.tenant_id,
                role: invite.role,
                full_name: result.data.fullName,
            }, { onConflict: 'id' });

            if (insertError) {
                await supabaseAdmin.auth.admin.deleteUser(userId);
                return NextResponse.json({ error: `Failed to create user profile: ${insertError.message}` }, { status: 500 });
            }
        }

        // Update app_metadata with tenant_id so JWT is correct after sign-in
        const { error: metaError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
            app_metadata: { tenant_id: invite.tenant_id }
        });
        if (metaError) {
            console.error('Failed to update app_metadata:', metaError.message);
        }

        // Mark invitation as accepted
        const { error: acceptError } = await supabaseAdmin
            .from('invitations')
            .update({ accepted_at: new Date().toISOString() })
            .eq('id', invite.id);

        if (acceptError) {
            console.error('Failed to mark invitation accepted:', acceptError.message);
            return NextResponse.json({ error: 'Failed to finalize invitation' }, { status: 500 });
        }

        await supabaseAdmin.from('audit_logs').insert({
            tenant_id: invite.tenant_id,
            actor_id: userId,
            action: 'user.joined',
            entity_type: 'user',
            entity_id: userId,
            metadata: { role: invite.role, from_invitation: invite.id }
        });

        // Return success — client will handle sign-in so cookies are set properly
        return NextResponse.json({ success: true, email: invite.email });
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
