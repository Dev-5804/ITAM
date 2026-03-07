import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient, createClient } from '@/lib/supabase/server';

const toolSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    description: z.string().optional(),
    category: z.string().optional(),
    is_active: z.boolean().default(true),
});

export async function GET(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { data: tools, error } = await supabase
            .from('tools')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });

        return NextResponse.json(tools);
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
        const result = toolSchema.safeParse(body);
        if (!result.success) {
            return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
        }

        const supabaseAdmin = await createAdminClient();

        // Verify user role and tenant_id
        const { data: userData, error: userError } = await supabaseAdmin
            .from('users')
            .select('role, tenant_id, tenants(max_tools)')
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

        const tenantId = userData.tenant_id;
        const maxTools = (userData.tenants as any).max_tools;

        // Check max tools limit
        const { count: toolsCount } = await supabaseAdmin
            .from('tools')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', tenantId);

        if ((toolsCount || 0) >= maxTools) {
            return NextResponse.json(
                { error: `Your plan allows a maximum of ${maxTools} tools. Upgrade your plan to add more.` },
                { status: 403 }
            );
        }

        const { name, description, category, is_active } = result.data;

        // Insert tool and audit log via RPC
        const { data: toolId, error: rpcError } = await supabaseAdmin.rpc('create_tool_with_audit', {
            p_tenant_id: tenantId,
            p_name: name,
            p_description: description || null,
            p_category: category || null,
            p_is_active: is_active,
            p_created_by: user.id,
            p_actor_id: user.id
        });

        if (rpcError) {
            if (rpcError.code === '23505') { // Unique constraint violation
                return NextResponse.json({ error: 'A tool with this name already exists.' }, { status: 409 });
            }
            return NextResponse.json({ error: 'Failed to create tool' }, { status: 500 });
        }

        return NextResponse.json({ id: toolId, message: 'Tool created successfully' });
    } catch (err) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
