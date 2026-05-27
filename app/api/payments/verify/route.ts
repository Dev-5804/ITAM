import { NextResponse } from 'next/server'
import crypto from 'crypto'
import Razorpay from 'razorpay'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { sendPaymentReceiptEmail } from '@/lib/resend'

const verifySchema = z.object({
    razorpay_order_id:   z.string(),
    razorpay_payment_id: z.string(),
    razorpay_signature:  z.string(),
    plan: z.enum(['pro', 'enterprise']).optional(),
})

const PLAN_LIMITS: Record<string, { max_members: number; max_tools: number }> = {
    pro:        { max_members: 25,     max_tools: 50     },
    enterprise: { max_members: 999999, max_tools: 999999 },
}

const PLAN_PRICES: Record<string, { amount: number; currency: string }> = {
    pro:        { amount:  99900, currency: 'INR' },
    enterprise: { amount: 149900, currency: 'INR' },
}

const razorpay = new Razorpay({
    key_id:     process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
})

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

        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = result.data

        let order: { id: string; amount: number; currency: string; notes?: Record<string, unknown> }
        try {
            order = await razorpay.orders.fetch(razorpay_order_id)
        } catch {
            return NextResponse.json({ error: 'Unable to fetch order details' }, { status: 400 })
        }

        if (!order || order.id !== razorpay_order_id) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 })
        }

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

        let payment: { order_id: string; amount: number; currency: string; status: string }
        try {
            payment = await razorpay.payments.fetch(razorpay_payment_id)
        } catch {
            return NextResponse.json({ error: 'Unable to fetch payment details' }, { status: 400 })
        }

        if (!payment || payment.order_id !== razorpay_order_id) {
            return NextResponse.json({ error: 'Payment does not match order' }, { status: 400 })
        }

        if (payment.amount !== order.amount || payment.currency !== order.currency) {
            return NextResponse.json({ error: 'Payment amount does not match order' }, { status: 400 })
        }

        if (payment.status !== 'captured' && payment.status !== 'authorized') {
            return NextResponse.json({ error: 'Payment not captured' }, { status: 400 })
        }

        const planFromNotes = typeof order.notes?.plan === 'string' ? order.notes.plan : null
        const safePlanFromNotes = planFromNotes === 'pro' || planFromNotes === 'enterprise'
            ? planFromNotes
            : null

        if (!safePlanFromNotes) {
            return NextResponse.json({ error: 'Order metadata missing plan' }, { status: 400 })
        }

        const resolvedPlan = safePlanFromNotes

        const expectedPrice = PLAN_PRICES[resolvedPlan]
        if (!expectedPrice || order.amount !== expectedPrice.amount || order.currency !== expectedPrice.currency) {
            return NextResponse.json({ error: 'Order amount does not match selected plan' }, { status: 400 })
        }

        const orderTenantId = typeof order.notes?.tenant_id === 'string' ? order.notes.tenant_id : null
        const orderUserId = typeof order.notes?.user_id === 'string' ? order.notes.user_id : null
        if (orderTenantId && orderTenantId !== userData.tenant_id) {
            return NextResponse.json({ error: 'Order tenant mismatch' }, { status: 403 })
        }
        if (orderUserId && orderUserId !== user.id) {
            return NextResponse.json({ error: 'Order user mismatch' }, { status: 403 })
        }

        // Atomically update plan + insert audit log
        const limits = PLAN_LIMITS[resolvedPlan]
        const { error: rpcError } = await supabase.rpc('update_plan_with_audit', {
            p_tenant_id:   userData.tenant_id,
            p_new_plan:    resolvedPlan,
            p_max_members: limits.max_members,
            p_max_tools:   limits.max_tools,
            p_actor_id:    user.id,
            p_metadata: {
                new_plan:    resolvedPlan,
                max_members: limits.max_members,
                max_tools:   limits.max_tools,
                payment_id:  razorpay_payment_id,
                order_id:    razorpay_order_id,
            },
        })

        if (rpcError) throw rpcError

        if (user.email) {
            try {
                let tenantName = 'Your organization'
                const { data: tenantData } = await supabase
                    .from('tenants')
                    .select('name')
                    .eq('id', userData.tenant_id)
                    .single()
                if (tenantData?.name) tenantName = tenantData.name

                await sendPaymentReceiptEmail({
                    email: user.email,
                    plan: resolvedPlan,
                    amount: payment.amount,
                    currency: payment.currency,
                    orderId: razorpay_order_id,
                    paymentId: razorpay_payment_id,
                    tenantName,
                })
            } catch (emailError) {
                console.error('[verify-payment] receipt email failed:', emailError)
            }
        }

        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('[verify-payment] error:', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
