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
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? request.headers.get('x-real-ip') ?? 'unknown';
        if (!checkRateLimit(ip, RATE_LIMIT_COUNT, RATE_LIMIT_WINDOW_MS)) {
            return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
        }

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const result = inviteSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
        }

        const { email, role } = result.data;

        // Verify inviter role and tenant_id from the database
        const { data: inviterData, error: inviterError } = await supabase
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const maxMembers = (inviterData.tenants as any).max_members;

        // Check max_members limit including existing users and pending invitations
        const { count: usersCount } = await supabase
            .from('users')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', tenantId);

        const { count: invitesCount } = await supabase
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
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

        // Create invitation
        const { data: inviteData, error: insertError } = await supabase
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

        const supabaseAdmin = await createAdminClient();
        // Audit log (via admin client to guarantee write)
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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            tenantName: (inviterData.tenants as any).name,
            role,
            token,
        });

        return NextResponse.json({ message: 'Invitation sent' });
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
