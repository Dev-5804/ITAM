import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient, createClient } from '@/lib/supabase/server';

const uuidSchema = z.string().uuid();

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> | { id: string } }
) {
    try {
        const resolvedParams = await Promise.resolve(params);
        const targetUserId = resolvedParams.id;

        if (!uuidSchema.safeParse(targetUserId).success) {
            return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
        }

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { data: currentUserData, error: userError } = await supabase
            .from('users')
            .select('role, tenant_id')
            .eq('id', user.id)
            .single();

        if (userError || !currentUserData || currentUserData.role !== 'owner') {
            return NextResponse.json({ error: 'Forbidden. Only owners can remove members.' }, { status: 403 });
        }

        if (!currentUserData.tenant_id) {
            return NextResponse.json({ error: 'No organization found. Please create or join an organization first.' }, { status: 404 });
        }

        const { data: targetUser } = await supabase
            .from('users')
            .select('role')
            .eq('id', targetUserId)
            .eq('tenant_id', currentUserData.tenant_id)
            .single();

        if (!targetUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        if (targetUser.role === 'owner') {
            const { count } = await supabase
                .from('users')
                .select('*', { count: 'exact', head: true })
                .eq('tenant_id', currentUserData.tenant_id)
                .eq('role', 'owner');

            if ((count ?? 0) <= 1) {
                return NextResponse.json({ error: 'You cannot remove the only owner of this tenant.' }, { status: 403 });
            }
        }

        const { error: deleteError } = await supabase
            .from('users')
            .delete()
            .eq('id', targetUserId)
            .eq('tenant_id', currentUserData.tenant_id);

        if (deleteError) throw deleteError;

        // Clear app_metadata so the dashboard recovery logic cannot re-add this user
        const supabaseAdmin = await createAdminClient();
        await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
            app_metadata: { tenant_id: null, role: null },
        });

        await supabaseAdmin.from('audit_logs').insert({
            tenant_id: currentUserData.tenant_id,
            actor_id: user.id,
            action: 'user.removed',
            entity_type: 'user',
            entity_id: targetUserId,
            metadata: {},
        });

        return NextResponse.json({ success: true, message: 'User removed' });
    } catch (err: unknown) {
        console.error('[team/[id]] Internal error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
