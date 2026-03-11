import { NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // Check role
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('role, tenant_id')
            .eq('id', user.id)
            .single();

        if (userError || !userData) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        if (!userData.tenant_id) {
            return NextResponse.json({ error: 'No organization found. Please create or join an organization first.' }, { status: 404 });
        }

        if (userData.role !== 'owner' && userData.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Get team members
        const { data: members, error: membersError } = await supabase
            .from('users')
            .select('id, full_name, role, created_at, avatar_url')
            .eq('tenant_id', userData.tenant_id)
            .order('created_at', { ascending: true });

        // Get pending invitations
        const { data: invitations, error: invError } = await supabase
            .from('invitations')
            .select('id, email, role, created_at, token')
            .eq('tenant_id', userData.tenant_id)
            .is('accepted_at', null)
            .order('created_at', { ascending: false });

        if (membersError) return NextResponse.json({ error: membersError.message }, { status: 500 });

        // Merge emails from auth
        const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
        const membersWithEmail = members.map(m => ({
            ...m,
            email: authUsers?.users.find(u => u.id === m.id)?.email || 'Unknown'
        }));

        return NextResponse.json({
            members: membersWithEmail,
            invitations: invitations || [],
            currentUserRole: userData.role
        });
    } catch (err) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
