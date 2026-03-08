import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient, createClient } from '@/lib/supabase/server';

const planSchema = z.object({
    plan: z.enum(['free', 'pro', 'enterprise'])
});

export async function GET(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const supabaseAdmin = await createAdminClient();

        const { data: userData, error: userError } = await supabaseAdmin
            .from('users')
            .select('role, tenant_id, tenants(name, plan, max_members, max_tools)')
            .eq('id', user.id)
            .single();

        if (userError || !userData) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // If user has no tenant, return error
        if (!userData.tenant_id) {
            return NextResponse.json({ error: 'No organization found. Please create or join an organization first.' }, { status: 404 });
        }

        // Check if tenant data was loaded (join might return null if tenant doesn't exist)
        if (!userData.tenants) {
            return NextResponse.json({ error: 'Organization data not found. Please contact support.' }, { status: 404 });
        }

        // Only owners can view plan details
        if (userData.role !== 'owner') {
            return NextResponse.json({ error: 'Forbidden. Only owners can view plan details.' }, { status: 403 });
        }

        const tenantId = userData.tenant_id;
        const tenantInfo = userData.tenants as any;

        const { count: membersCount } = await supabaseAdmin
            .from('users')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', tenantId);

        const { count: toolsCount } = await supabaseAdmin
            .from('tools')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', tenantId);

        const { count: pendingInvites } = await supabaseAdmin
            .from('invitations')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)
            .is('accepted_at', null);

        return NextResponse.json({
            plan: tenantInfo.plan,
            max_members: tenantInfo.max_members,
            max_tools: tenantInfo.max_tools,
            usage: {
                members: (membersCount || 0) + (pendingInvites || 0),
                tools: toolsCount || 0
            }
        });

    } catch (err: any) {
        return NextResponse.json({ error: 'Internal server error: ' + err.message }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const result = planSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json({ error: 'Invalid plan selected.' }, { status: 400 });
        }

        const newPlan = result.data.plan;
        let maxMembers = 5;
        let maxTools = 2;

        if (newPlan === 'pro') {
            maxMembers = 20;
            maxTools = 10;
        } else if (newPlan === 'enterprise') {
            maxMembers = 999999;
            maxTools = 999999;
        }

        const supabaseAdmin = await createAdminClient();

        const { data: userData, error: userError } = await supabaseAdmin
            .from('users')
            .select('role, tenant_id')
            .eq('id', user.id)
            .single();

        if (userError || !userData) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // If user has no tenant, return error
        if (!userData.tenant_id) {
            return NextResponse.json({ error: 'No organization found. Please create or join an organization first.' }, { status: 404 });
        }

        // Only owners can change plans
        if (userData.role !== 'owner') {
            return NextResponse.json({ error: 'Forbidden. Only owners can change plans.' }, { status: 403 });
        }

        const { error: updateError } = await supabaseAdmin
            .from('tenants')
            .update({ plan: newPlan, max_members: maxMembers, max_tools: maxTools })
            .eq('id', userData.tenant_id);

        if (updateError) throw updateError;

        await supabaseAdmin.from('audit_logs').insert({
            tenant_id: userData.tenant_id,
            actor_id: user.id,
            action: 'plan.changed',
            entity_type: 'tenant',
            entity_id: userData.tenant_id,
            metadata: { new_plan: newPlan, max_members: maxMembers, max_tools: maxTools },
        });

        return NextResponse.json({ success: true, message: `Plan upgraded to ${newPlan.toUpperCase()}` });
    } catch (err: any) {
        return NextResponse.json({ error: 'Internal server error: ' + err.message }, { status: 500 });
    }
}
