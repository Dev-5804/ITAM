import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { sendRequestNotificationEmail } from '@/lib/resend';

const actionParamsSchema = z.enum(['approve', 'reject', 'revoke', 'cancel']);
const noteSchema = z.object({
    reviewer_note: z.string().optional()
});

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string, action: string }> | { id: string, action: string } }
) {
    try {
        const resolvedParams = await Promise.resolve(params);
        const id = resolvedParams.id;
        const actionParam = resolvedParams.action;

        const parseResult = actionParamsSchema.safeParse(actionParam);
        if (!parseResult.success) {
            return NextResponse.json({ error: 'Invalid action parameter' }, { status: 400 });
        }

        const action = parseResult.data; // approve | reject | revoke | cancel

        let reviewerNote = undefined;
        if (action === 'approve' || action === 'reject' || action === 'revoke') {
            try {
                const body = await request.json();
                const noteResult = noteSchema.safeParse(body);
                if (noteResult.success) reviewerNote = noteResult.data.reviewer_note;
            } catch (e) {
                // Body is optional
            }
        }

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const supabaseAdmin = await createAdminClient();
        const { data: userData, error: userError } = await supabaseAdmin
            .from('users')
            .select('role, tenant_id, full_name')
            .eq('id', user.id)
            .single();

        if (userError || !userData) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        if (!userData.tenant_id) {
            return NextResponse.json({ error: 'No organization found. Please create or join an organization first.' }, { status: 404 });
        }

        const isReviewer = userData.role === 'admin' || userData.role === 'owner';

        // Member authorization check for 'cancel'
        if (action === 'cancel' && isReviewer === false) {
            // Members can cancel. We'll enforce the exact record ownership in the DB function or locally.
        } else if (action !== 'cancel' && !isReviewer) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Fetch request details
        const { data: reqData } = await supabaseAdmin
            .from('access_requests')
            .select('requester_id, status, tools(name)')
            .eq('id', id)
            .single();

        if (!reqData) return NextResponse.json({ error: 'Request not found' }, { status: 404 });
        const toolName = (reqData.tools as any)?.name || 'Unknown Tool';

        // Execute RPC
        let rpcError = null;

        if (action === 'approve' || action === 'reject') {
            const status = action === 'approve' ? 'approved' : 'rejected';
            const auditAction = action === 'approve' ? 'request.approved' : 'request.rejected';
            const { error } = await supabaseAdmin.rpc('review_request_with_audit', {
                p_req_id: id,
                p_tenant_id: userData.tenant_id,
                p_status: status,
                p_reviewer_id: user.id,
                p_reviewer_note: reviewerNote || null,
                p_action: auditAction,
                p_tool_name: toolName,
                p_requester_name: 'Requester'
            });
            rpcError = error;
        } else if (action === 'revoke') {
            const { error: updateErr } = await supabaseAdmin
                .from('access_requests')
                .update({ status: 'revoked' })
                .eq('id', id)
                .eq('tenant_id', userData.tenant_id)
                .eq('status', 'approved');
            rpcError = updateErr;
            if (!updateErr) {
                await supabaseAdmin.from('audit_logs').insert({
                    tenant_id: userData.tenant_id,
                    actor_id: user.id,
                    action: 'request.revoked',
                    entity_type: 'access_request',
                    entity_id: id,
                    metadata: { tool_name: toolName },
                });
            }
        } else if (action === 'cancel') {
            const { error: updateErr } = await supabaseAdmin
                .from('access_requests')
                .update({ status: 'cancelled' })
                .eq('id', id)
                .eq('tenant_id', userData.tenant_id)
                .eq('requester_id', user.id)
                .in('status', ['pending', 'approved']);
            rpcError = updateErr;
            if (!updateErr) {
                await supabaseAdmin.from('audit_logs').insert({
                    tenant_id: userData.tenant_id,
                    actor_id: user.id,
                    action: 'request.cancelled',
                    entity_type: 'access_request',
                    entity_id: id,
                    metadata: { tool_name: toolName },
                });
            }
        }

        if (rpcError) {
            return NextResponse.json({ error: 'Database transaction failed: ' + rpcError.message }, { status: 500 });
        }

        // Send email
        if (action !== 'cancel') {
            const { data: reqAuthUser } = await supabaseAdmin.auth.admin.getUserById(reqData.requester_id);
            if (reqAuthUser && reqAuthUser.user?.email) {
                await sendRequestNotificationEmail({
                    type: action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'revoked',
                    emails: [reqAuthUser.user.email],
                    toolName,
                    reviewerNote
                });
            }
        }

        return NextResponse.json({ success: true, message: `Request ${action}d successfully` });
    } catch (err) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string, action: string }> | { id: string, action: string } }
) {
    try {
        const resolvedParams = await Promise.resolve(params);
        const id = resolvedParams.id;

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const supabaseAdmin = await createAdminClient();
        const { data: userData, error: userError } = await supabaseAdmin
            .from('users')
            .select('role, tenant_id')
            .eq('id', user.id)
            .single();

        if (userError || !userData) return NextResponse.json({ error: 'User not found' }, { status: 404 });
        if (userData.role !== 'admin' && userData.role !== 'owner') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        if (!userData.tenant_id) return NextResponse.json({ error: 'No organization found' }, { status: 404 });

        const { data: reqData } = await supabaseAdmin
            .from('access_requests')
            .select('tools(name)')
            .eq('id', id)
            .eq('tenant_id', userData.tenant_id)
            .single();

        if (!reqData) return NextResponse.json({ error: 'Request not found' }, { status: 404 });

        const { error: deleteError } = await supabaseAdmin
            .from('access_requests')
            .delete()
            .eq('id', id)
            .eq('tenant_id', userData.tenant_id);

        if (deleteError) throw deleteError;

        const toolName = (reqData.tools as any)?.name || 'Unknown Tool';
        await supabaseAdmin.from('audit_logs').insert({
            tenant_id: userData.tenant_id,
            actor_id: user.id,
            action: 'request.deleted',
            entity_type: 'access_request',
            entity_id: id,
            metadata: { tool_name: toolName },
        });

        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
