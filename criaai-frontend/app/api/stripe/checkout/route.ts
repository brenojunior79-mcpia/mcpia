import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase-server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-04-10' })

const PRICE_MAP: Record<string, string> = {
  Starter: process.env.STRIPE_PRICE_STARTER_MONTHLY!,
  Pro:     process.env.STRIPE_PRICE_PRO_MONTHLY!,
  Agency:  process.env.STRIPE_PRICE_AGENCY_MONTHLY!,
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { plan, billing = 'monthly' } = await req.json()
    const priceId = PRICE_MAP[plan]
    if (!priceId) return NextResponse.json({ error: 'Plano inválido' }, { status: 400 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()

    let customerId = profile?.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      })
      customerId = customer.id
      await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id)
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://mcpia.brenojunio.com.br'

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      allow_promotion_codes: true,
      subscription_data: {
        trial_period_days: 7,
        metadata: { supabase_user_id: user.id },
      },
      success_url: `${appUrl}/dashboard?success=true`,
      cancel_url: `${appUrl}/dashboard/planos?canceled=true`,
      metadata: { supabase_user_id: user.id, plan },
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('Stripe checkout error:', err)
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 })
  }
}
