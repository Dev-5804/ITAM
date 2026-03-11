import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient, createClient } from '@/lib/supabase/server';

const uuidSchema = z.string().uuid();
const toolUpdateSchema = z.object({
    name: z.string().min(1, 'Name is required').optional(),
    description: z.string().optional(),
    category: z.string().optional(),
    is_active: z.boolean().optional(),
});

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> | { id: string } }
) {
    try {
        const resolvedParams = await Promise.resolve(params);
        const id = resolvedParams.id;

        if (!uuidSchema.safeParse(id).success) {
            return NextResponse.json({ error: 'Invalid tool ID' }, { status: 400 });
        }

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const result = toolUpdateSchema.safeParse(body);
        if (!result.success) {
            return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
        }

        const supabaseAdmin = await createAdminClient();

        const { data: userData, error: userError } = await supabaseAdmin
            .from('users')
            .select('role, tenant_id')
            .eq('id', user.id)
            .single();

        if (userError || !userData || (userData.role !== 'owner' && userData.role !== 'admin')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        if (!userData.tenant_id) {
            return NextResponse.json({ error: 'No organization found. Please create or join an organization first.' }, { status: 404 });
        }

        let action = 'tool.updated';
        if (result.data.is_active === false) {
            action = 'tool.deactivated';
        } else if (result.data.is_active === true) {
            // PRD doesn't mention tool.activated, just updated vs deactivated
            action = 'tool.updated';
        }

        const { error: rpcError } = await supabaseAdmin.rpc('update_tool_with_audit', {
            p_tool_id: id,
            p_tenant_id: userData.tenant_id,
            p_name: result.data.name || null,
            p_description: result.data.description || null,
            p_category: result.data.category || null,
            p_is_active: typeof result.data.is_active === 'boolean' ? result.data.is_active : null,
            p_actor_id: user.id,
            p_action: action
        });

        if (rpcError) {
            if (rpcError.code === '23505') {
                return NextResponse.json({ error: 'A tool with this name already exists.' }, { status: 409 });
            }
            return NextResponse.json({ error: 'Failed to update tool' }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Tool updated successfully' });
    } catch (err) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
