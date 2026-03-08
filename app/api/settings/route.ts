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

        if (userData.role !== 'owner') {
            return NextResponse.json({ error: 'Only the owner can manage settings' }, { status: 403 });
        }

        const { data: tenant, error: tenantError } = await supabaseAdmin
            .from('tenants')
            .select('id, name, slug, plan, max_members, max_tools, created_at')
            .eq('id', userData.tenant_id)
            .single();

        if (tenantError || !tenant) {
            return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
        }

        return NextResponse.json({ tenant });
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
