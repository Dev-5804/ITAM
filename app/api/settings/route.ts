import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient, createClient } from '@/lib/supabase/server';

const settingsSchema = z.object({
    name: z.string().min(2, 'Organization name must be at least 2 characters').max(100),
});

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

        if (userError || !userData?.tenant_id) {
            return NextResponse.json({ error: 'No organization found' }, { status: 404 });
        }

        const { data: tenant, error: tenantError } = await supabaseAdmin
            .from('tenants')
            .select('id, name, slug, plan, max_members, max_tools, created_at')
            .eq('id', userData.tenant_id)
            .single();

        if (tenantError || !tenant) {
            return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
        }

        return NextResponse.json({ tenant, role: userData.role });
    } catch (err) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const result = settingsSchema.safeParse(body);
        if (!result.success) {
            return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
        }

        const supabaseAdmin = await createAdminClient();

        const { data: userData, error: userError } = await supabaseAdmin
            .from('users')
            .select('role, tenant_id')
            .eq('id', user.id)
            .single();

        if (userError || !userData?.tenant_id) {
            return NextResponse.json({ error: 'No organization found' }, { status: 404 });
        }

        if (userData.role !== 'owner') {
            return NextResponse.json({ error: 'Only the owner can manage settings' }, { status: 403 });
        }

        const { error: updateError } = await supabaseAdmin
            .from('tenants')
            .update({ name: result.data.name })
            .eq('id', userData.tenant_id);

        if (updateError) {
            return NextResponse.json({ error: updateError.message }, { status: 500 });
        }

        await supabaseAdmin.from('audit_logs').insert({
            tenant_id: userData.tenant_id,
            actor_id: user.id,
            action: 'org.updated',
            entity_type: 'tenant',
            entity_id: userData.tenant_id,
            metadata: { field: 'name', new_value: result.data.name },
        });

        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
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

        if (userError || !userData?.tenant_id) {
            return NextResponse.json({ error: 'No organization found' }, { status: 404 });
        }

        // Owners must transfer ownership or be removed by another owner first
        if (userData.role === 'owner') {
            const { count } = await supabaseAdmin
                .from('users')
                .select('id', { count: 'exact', head: true })
                .eq('tenant_id', userData.tenant_id)
                .eq('role', 'owner');
            if (!count || count <= 1) {
                return NextResponse.json(
                    { error: 'You are the only owner. Transfer ownership to someone else before leaving.' },
                    { status: 403 }
                );
            }
        }

        const tenantId = userData.tenant_id;

        await supabaseAdmin.from('audit_logs').insert({
            tenant_id: tenantId,
            actor_id: user.id,
            action: 'user.left',
            entity_type: 'user',
            entity_id: user.id,
            metadata: {},
        });

        await supabaseAdmin.from('users').delete().eq('id', user.id).eq('tenant_id', tenantId);

        // Clear app_metadata so recovery logic doesn't re-add them
        await supabaseAdmin.auth.admin.updateUserById(user.id, {
            app_metadata: { tenant_id: null, role: null },
        });

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('[settings] Internal error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
