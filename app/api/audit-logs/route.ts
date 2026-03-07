import { NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const supabaseAdmin = await createAdminClient();

        const { data: userData, error: userError } = await supabaseAdmin
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

        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '100');

        const { data: logs, error } = await supabaseAdmin
            .from('audit_logs')
            .select(`
        id, created_at, action, entity_type, entity_id, metadata,
        actor_id,
        users!audit_logs_actor_id_fkey (full_name)
      `)
            .eq('tenant_id', userData.tenant_id)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });

        // Patch emails from Auth since public.users doesn't have it explicitly
        const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();

        const augmentedLogs = logs.map(log => {
            const actorEmail = authUsers?.users.find(u => u.id === log.actor_id)?.email || 'Unknown';
            return {
                ...log,
                actor: {
                    name: (log.users as any)?.full_name || 'System User',
                    email: actorEmail
                }
            };
        });

        return NextResponse.json(augmentedLogs);
    } catch (err: any) {
        return NextResponse.json({ error: 'Internal server error: ' + err.message }, { status: 500 });
    }
}
