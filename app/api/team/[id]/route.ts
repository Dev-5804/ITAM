import { NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> | { id: string } }
) {
    try {
        const resolvedParams = await Promise.resolve(params);
        const targetUserId = resolvedParams.id;

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const supabaseAdmin = await createAdminClient();
        const { data: currentUserData, error: userError } = await supabaseAdmin
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

        if (user.id === targetUserId) {
            const { count } = await supabaseAdmin
                .from('users')
                .select('id', { count: 'exact', head: true })
                .eq('tenant_id', currentUserData.tenant_id)
                .eq('role', 'owner');

            if (count && count <= 1) {
                return NextResponse.json({ error: 'You cannot remove the only owner of this tenant.' }, { status: 403 });
            }
        }

        const { error: deleteError } = await supabaseAdmin
            .from('users')
            .delete()
            .eq('id', targetUserId)
            .eq('tenant_id', currentUserData.tenant_id);

        if (deleteError) throw deleteError;

        await supabaseAdmin.from('audit_logs').insert({
            tenant_id: currentUserData.tenant_id,
            actor_id: user.id,
            action: 'user.removed',
            entity_type: 'user',
            entity_id: targetUserId,
            metadata: {},
        });

        return NextResponse.json({ success: true, message: 'User removed' });
    } catch (err: any) {
        return NextResponse.json({ error: 'Internal server error: ' + err.message }, { status: 500 });
    }
}
