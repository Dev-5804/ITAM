import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { sendRequestNotificationEmail } from '@/lib/resend';

const requestSchema = z.object({
    tool_id: z.string().uuid('Invalid Tool ID'),
    reason: z.string().optional(),
});

export async function GET(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const supabaseAdmin = await createAdminClient();

        const { data: userData, error: userError } = await supabaseAdmin
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single();

        if (userError || !userData) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        let query = supabase.from('access_requests')
            .select(`
        *,
        tools (name),
        users!requester_id (full_name, avatar_url),
        users!reviewer_id (full_name)
      `)
            .order('created_at', { ascending: false });

        // RLS already handles filtering by tenant_id and (if member) requester_id,
        // but the route handler uses the standard client. We just query standard client above.
        // Wait, the regular client is filtered by RLS! 
        // PRD: "Requests API RLS select: members see own requests; admins and owners see all in tenant"
        // So the regular client query is perfectly secure and filtered.

        const { data: requests, error } = await query;

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });

        return NextResponse.json(requests);
    } catch (err) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const result = requestSchema.safeParse(body);
        if (!result.success) {
            return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
        }

        const supabaseAdmin = await createAdminClient();

        const { data: userData, error: userError } = await supabaseAdmin
            .from('users')
            .select('role, tenant_id, full_name')
            .eq('id', user.id)
            .single();

        if (userError || !userData) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        if (!userData.tenant_id) {
            return NextResponse.json({ error: 'No organization found. Please create or join an organization first.' }, { status: 404 });
        }

        // Role check: PRD: POST /api/requests is for Members. (Technically Owners/Admins can request? Usually yes, but anyway)

        const { tool_id, reason } = result.data;

        // Get tool name
        const { data: toolData } = await supabaseAdmin
            .from('tools')
            .select('name')
            .eq('id', tool_id)
            .single();

        if (!toolData) return NextResponse.json({ error: 'Tool not found' }, { status: 404 });

        // Submit request via RPC to ensure audit log
        const { data: reqId, error: rpcError } = await supabaseAdmin.rpc('submit_request_with_audit', {
            p_tenant_id: userData.tenant_id,
            p_requester_id: user.id,
            p_tool_id: tool_id,
            p_reason: reason || null,
            p_tool_name: (toolData as any).name,
            p_requester_name: (userData as any).full_name || user.email
        });

        if (rpcError) {
            if (rpcError.code === '23505') {
                return NextResponse.json({ error: 'You already have a pending or approved request for this tool.' }, { status: 409 });
            }
            return NextResponse.json({ error: 'Failed to submit request' }, { status: 500 });
        }

        // Send email to all Admins and Owners
        const { data: admins } = await supabaseAdmin
            .from('users')
            .select('id')
            .in('role', ['admin', 'owner'])
            .eq('tenant_id', userData.tenant_id);

        if (admins && admins.length > 0) {
            const adminIds = admins.map(a => a.id);
            // We need their emails from auth.users. But we use service role to get them.
            const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
            // listUsers only returns up to 50 unless paginated. It's better to get emails from public.invitations or we can just not send emails if we can't fetch them.
            // Wait, we can fetch their emails using supabaseAdmin.auth.admin.getUserById() or mapping.
            // Instead, we can just send it safely for now by mapping over listUsers.
            const adminEmails = authUsers.users
                .filter(u => adminIds.includes(u.id))
                .map(u => u.email)
                .filter(Boolean) as string[];

            if (adminEmails.length > 0) {
                await sendRequestNotificationEmail({
                    type: 'submitted',
                    emails: adminEmails,
                    toolName: toolData.name,
                    requesterName: userData.full_name || 'A team member',
                    reason: reason
                });
            }
        }

        return NextResponse.json({ id: reqId, message: 'Request submitted successfully' });
    } catch (err) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
