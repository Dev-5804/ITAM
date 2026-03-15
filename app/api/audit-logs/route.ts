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

        let logs = logsResult.data || [];
        const authUsers = authUsersResult.data;

        // Backfill legacy placeholder requester names in metadata (e.g. "Requester")
        // by looking up the current requester full name from access_requests -> users.
        const accessRequestIdsNeedingBackfill = logs
            .filter((log) => {
                const metadata = (log.metadata ?? {}) as Record<string, unknown>;
                const requesterName = typeof metadata.requester_name === 'string'
                    ? metadata.requester_name.toLowerCase().trim()
                    : '';
                const isPlaceholder =
                    requesterName === '' ||
                    requesterName === 'requester' ||
                    requesterName === "requester's name" ||
                    requesterName === "requesters' name";
                return log.entity_type === 'access_request' && isPlaceholder;
            })
            .map((log) => log.entity_id)
            .filter((id): id is string => typeof id === 'string');

        if (accessRequestIdsNeedingBackfill.length > 0) {
            const { data: requestsForBackfill } = await supabase
                .from('access_requests')
                .select('id, requester:users!requester_id(full_name)')
                .in('id', accessRequestIdsNeedingBackfill);

            const nameByRequestId = new Map<string, string>();
            for (const req of requestsForBackfill || []) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const fullName = (req.requester as any)?.full_name;
                if (typeof fullName === 'string' && fullName.trim().length > 0) {
                    nameByRequestId.set(req.id, fullName);
                }
            }

            logs = logs.map((log) => {
                if (log.entity_type !== 'access_request' || typeof log.entity_id !== 'string') return log;
                const resolvedName = nameByRequestId.get(log.entity_id);
                if (!resolvedName) return log;
                const metadata = (log.metadata ?? {}) as Record<string, unknown>;
                return {
                    ...log,
                    metadata: {
                        ...metadata,
                        requester_name: resolvedName,
                    },
                };
            });
        }

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
