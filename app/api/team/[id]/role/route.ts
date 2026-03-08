import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient, createClient } from '@/lib/supabase/server';

const roleSchema = z.object({
    role: z.enum(['owner', 'admin', 'member']),
});

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> | { id: string } }
) {
    try {
        const resolvedParams = await Promise.resolve(params);
        const targetUserId = resolvedParams.id;

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        if (user.id === targetUserId) {
            return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 });
        }

        const body = await request.json();
        const result = roleSchema.safeParse(body);
        if (!result.success) {
            return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
        }
        const newRole = result.data.role;

        const supabaseAdmin = await createAdminClient();
        const { data: currentUserData, error: userError } = await supabaseAdmin
            .from('users')
            .select('role, tenant_id')
            .eq('id', user.id)
            .single();

        if (userError || !currentUserData || currentUserData.role !== 'owner') {
            return NextResponse.json({ error: 'Forbidden. Only owners can change roles.' }, { status: 403 });
        }

        if (!currentUserData.tenant_id) {
            return NextResponse.json({ error: 'No organization found. Please create or join an organization first.' }, { status: 404 });
        }

        const { data: targetUser } = await supabaseAdmin
            .from('users')
            .select('role')
            .eq('id', targetUserId)
            .eq('tenant_id', currentUserData.tenant_id)
            .single();

        if (!targetUser) return NextResponse.json({ error: 'User not found in tenant' }, { status: 404 });

        // Check if demoting the last owner
        if (targetUser.role === 'owner' && newRole !== 'owner') {
            const { count } = await supabaseAdmin
                .from('users')
                .select('id', { count: 'exact', head: true })
                .eq('tenant_id', currentUserData.tenant_id)
                .eq('role', 'owner');

            if (count && count <= 1) {
                return NextResponse.json({ error: 'Cannot demote the last owner of the tenant.' }, { status: 403 });
            }
        }

        const { error: updateError } = await supabaseAdmin
            .from('users')
            .update({ role: newRole })
            .eq('id', targetUserId)
            .eq('tenant_id', currentUserData.tenant_id);

        if (updateError) throw updateError;

        await supabaseAdmin.from('audit_logs').insert({
            tenant_id: currentUserData.tenant_id,
            actor_id: user.id,
            action: 'user.role_changed',
            entity_type: 'user',
            entity_id: targetUserId,
            metadata: { old_role: targetUser.role, new_role: newRole },
        });

        return NextResponse.json({ success: true, message: 'Role updated' });
    } catch (err: any) {
        return NextResponse.json({ error: 'Internal server error: ' + err.message }, { status: 500 });
    }
}
