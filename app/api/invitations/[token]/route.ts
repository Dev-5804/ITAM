import { NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ token: string }> | { token: string } }
) {
    try {
        const resolvedParams = await Promise.resolve(params);
        const token = resolvedParams.token;

        if (!token) {
            return NextResponse.json({ error: 'Token is required' }, { status: 400 });
        }

        const supabaseAdmin = await createAdminClient();

        const { data: invite, error } = await supabaseAdmin
            .from('invitations')
            .select('id, email, role, tenant_id, expires_at, accepted_at, tenants(name), users!invited_by(full_name)')
            .eq('token', token)
            .single();

        if (error || !invite) {
            return NextResponse.json({ error: 'Invitation not found or invalid' }, { status: 404 });
        }

        if (invite.accepted_at) {
            return NextResponse.json({ error: 'Invitation already accepted' }, { status: 400 });
        }

        if (new Date(invite.expires_at) < new Date()) {
            return NextResponse.json({ error: 'Invitation has expired' }, { status: 400 });
        }

        // Check if an auth user with this email already exists
        const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
        const userExists = authUsers?.users.some(u => u.email === invite.email) ?? false;

        return NextResponse.json({
            email: invite.email,
            role: invite.role,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            tenantName: (invite.tenants as any).name,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            inviterName: (invite.users as any)?.full_name || 'A team member',
            userExists,
        });
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ token: string }> | { token: string } }
) {
    try {
        const resolvedParams = await Promise.resolve(params);
        // We use the segment [token] but it's actually the invitation ID from the client
        const id = resolvedParams.token;

        if (!id) {
            return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
        }

        const { data: { user } } = await (await createClient()).auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const supabase = await createClient();
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('role, tenant_id')
            .eq('id', user.id)
            .single();

        if (userError || !userData || (userData.role !== 'owner' && userData.role !== 'admin')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        if (!userData.tenant_id) {
            return NextResponse.json({ error: 'No organization found. Please create or join an organization first.' }, { status: 404 });
        }

        const { error: deleteError } = await supabase
            .from('invitations')
            .delete()
            .eq('id', id)
            .eq('tenant_id', userData.tenant_id)
            .is('accepted_at', null);

        if (deleteError) {
            return NextResponse.json({ error: 'Failed to delete invitation' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
