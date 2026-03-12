import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const verifySchema = z.object({
    razorpay_order_id:   z.string(),
    razorpay_payment_id: z.string(),
    razorpay_signature:  z.string(),
    plan: z.enum(['pro', 'enterprise']),
})

const PLAN_LIMITS: Record<string, { max_members: number; max_tools: number }> = {
    pro:        { max_members: 25,     max_tools: 50     },
    enterprise: { max_members: 999999, max_tools: 999999 },
}

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { data: userData } = await supabase
            .from('users')
            .select('role, tenant_id')
            .eq('id', user.id)
            .single()

        if (!userData)          return NextResponse.json({ error: 'User not found' }, { status: 404 })
        if (userData.role !== 'owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        if (!userData.tenant_id) return NextResponse.json({ error: 'No organization found' }, { status: 404 })

        const body = await request.json()
        const result = verifySchema.safeParse(body)
        if (!result.success) {
            return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 })
        }

        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } = result.data

        // Verify HMAC-SHA256 signature — prevents tampered/forged payment callbacks
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex')

        if (!crypto.timingSafeEqual(
            Buffer.from(expectedSignature, 'hex'),
            Buffer.from(razorpay_signature, 'hex'),
        )) {
            return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 })
        }

        // Atomically update plan + insert audit log
        const limits = PLAN_LIMITS[plan]
        const { error: rpcError } = await supabase.rpc('update_plan_with_audit', {
            p_tenant_id:   userData.tenant_id,
            p_new_plan:    plan,
            p_max_members: limits.max_members,
            p_max_tools:   limits.max_tools,
            p_actor_id:    user.id,
            p_metadata: {
                new_plan:    plan,
                max_members: limits.max_members,
                max_tools:   limits.max_tools,
                payment_id:  razorpay_payment_id,
                order_id:    razorpay_order_id,
            },
        })

        if (rpcError) throw rpcError

        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('[verify-payment] error:', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
