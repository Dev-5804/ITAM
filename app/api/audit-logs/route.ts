import { NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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

        const { searchParams } = new URL(request.url);
        const rawLimit = parseInt(searchParams.get('limit') || '100', 10);
        const limit = isNaN(rawLimit) || rawLimit < 1 ? 100 : Math.min(rawLimit, 500);

        // Fetch logs and auth user emails in parallel.
        const supabaseAdmin = await createAdminClient();
        const [logsResult, authUsersResult] = await Promise.all([
            supabase
                .from('audit_logs')
                .select(`
        id, created_at, action, entity_type, entity_id, metadata,
        actor_id,
        users!audit_logs_actor_id_fkey (full_name)
      `)
                .eq('tenant_id', userData.tenant_id)
                .order('created_at', { ascending: false })
                .limit(limit),
            supabaseAdmin.auth.admin.listUsers(),
        ]);

        if (logsResult.error) return NextResponse.json({ error: logsResult.error.message }, { status: 500 });

        const logs = logsResult.data || [];
        const authUsers = authUsersResult.data;

        const augmentedLogs = logs.map(log => {
            const actorEmail = authUsers?.users.find(u => u.id === log.actor_id)?.email || 'Unknown';
            return {
                ...log,
                actor: {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    name: (log.users as any)?.full_name || 'System User',
                    email: actorEmail
                }
            };
        });

        return NextResponse.json(augmentedLogs);
    } catch (err: unknown) {
        console.error('[audit-logs] Internal error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
