import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { sendInvitationEmail } from '@/lib/resend';
import crypto from 'crypto';

const RATE_LIMIT_COUNT = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

const inviteSchema = z.object({
    email: z.string().email("Invalid email address"),
    role: z.enum(["admin", "member"]),
});

export async function POST(request: Request) {
    try {
        const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
        if (!checkRateLimit(ip, RATE_LIMIT_COUNT, RATE_LIMIT_WINDOW_MS)) {
            return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
        }

        const { data: { user } } = await (await createClient()).auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const result = inviteSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
        }

        const { email, role } = result.data;

        // We use service role client because we might need to check member counts cross-tenant, 
        // or just let RLS handle it, but PRD says "Check subscription limits server-side ... Your plan allows a maximum of [N] members."
        const supabaseAdmin = await createAdminClient();

        // Verify inviter role and tenant_id from the database
        const { data: inviterData, error: inviterError } = await supabaseAdmin
            .from('users')
            .select('role, full_name, tenant_id, tenants(max_members, name)')
            .eq('id', user.id)
            .single();

        if (inviterError || !inviterData || (inviterData.role !== 'owner' && inviterData.role !== 'admin')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        if (!inviterData.tenant_id) {
            return NextResponse.json({ error: 'No organization found. Please create or join an organization first.' }, { status: 404 });
        }

        const tenantId = inviterData.tenant_id;
        const maxMembers = (inviterData.tenants as any).max_members;

        // Check max_members limit including existing users and pending invitations
        const { count: usersCount } = await supabaseAdmin
            .from('users')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', tenantId);

        const { count: invitesCount } = await supabaseAdmin
            .from('invitations')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)
            .is('accepted_at', null);

        const totalCount = (usersCount || 0) + (invitesCount || 0);

        if (totalCount >= maxMembers) {
            return NextResponse.json(
                { error: `Your plan allows a maximum of ${maxMembers} members. Upgrade your plan to add more.` },
                { status: 403 }
            );
        }

        // Determine unique token
        const token = crypto.randomBytes(32).toString('hex');

        // Create invitation (Using Service Role because RLS prevents non-owners from seeing everything, but Admins can create)
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

        const { data: inviteData, error: insertError } = await supabaseAdmin
            .from('invitations')
            .insert({
                tenant_id: tenantId,
                email,
                role,
                token,
                invited_by: user.id,
                expires_at: expiresAt
            })
            .select()
            .single();

        if (insertError) {
            return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 });
        }

        // Insert Audit log via stored procedure or direct insert (we have full admin client so direct works without RLS bypass issues)
        await supabaseAdmin.from('audit_logs').insert({
            tenant_id: tenantId,
            actor_id: user.id,
            action: 'user.invited',
            entity_type: 'invitation',
            entity_id: inviteData.id,
            metadata: { email, role }
        });

        // Send email
        await sendInvitationEmail({
            email,
            inviterName: inviterData.full_name || 'A team member',
            tenantName: (inviterData.tenants as any).name,
            role,
            token,
        });

        return NextResponse.json({ message: 'Invitation sent' });
    } catch (err) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
