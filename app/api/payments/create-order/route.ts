import { NextResponse } from 'next/server'
import Razorpay from 'razorpay'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const orderSchema = z.object({
    plan: z.enum(['pro', 'enterprise']),
})

// Prices in paise (INR). 1 INR = 100 paise.
const PLAN_PRICES: Record<string, { amount: number; currency: string; label: string }> = {
    pro:        { amount:  99900, currency: 'INR', label: 'Pro Plan — ₹999/mo' },
    enterprise: { amount: 149900, currency: 'INR', label: 'Enterprise Plan — ₹1,499/mo' },
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
        const result = orderSchema.safeParse(body)
        if (!result.success) {
            return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 })
        }

        const { plan } = result.data
        const priceInfo = PLAN_PRICES[plan]

        const order = await razorpay.orders.create({
            amount:   priceInfo.amount,
            currency: priceInfo.currency,
            receipt:  `plan_${plan}_${userData.tenant_id.slice(0, 8)}_${Date.now()}`,
            notes: {
                tenant_id: userData.tenant_id,
                user_id:   user.id,
                plan,
            },
        })

        return NextResponse.json({
            orderId:  order.id,
            amount:   order.amount,
            currency: order.currency,
            label:    priceInfo.label,
            keyId:    process.env.RAZORPAY_KEY_ID,
        })
    } catch (err) {
        console.error('[create-order] error:', err)
        return NextResponse.json({ error: 'Failed to create payment order' }, { status: 500 })
    }
}
