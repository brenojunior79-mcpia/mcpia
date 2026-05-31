// app/api/stripe/checkout/route.ts — criar sessão de checkout

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-04-10' })

const PRICE_MAP: Record<string, Record<string, string>> = {
  Starter: {
    monthly: process.env.STRIPE_PRICE_STARTER_MONTHLY!,
    yearly:  process.env.STRIPE_PRICE_STARTER_YEARLY!,
  },
  Pro: {
    monthly: process.env.STRIPE_PRICE_PRO_MONTHLY!,
    yearly:  process.env.STRIPE_PRICE_PRO_YEARLY!,
  },
  Agency: {
    monthly: process.env.STRIPE_PRICE_AGENCY_MONTHLY!,
    yearly:  process.env.STRIPE_PRICE_AGENCY_YEARLY!,
  },
  pack_10:  { once: process.env.STRIPE_PRICE_PACK_10! },
  pack_30:  { once: process.env.STRIPE_PRICE_PACK_30! },
  pack_100: { once: process.env.STRIPE_PRICE_PACK_100! },
}

export async function POST(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'Token inválido' }, { status: 401 })

  const { plan, billing = 'monthly' } = await req.json()

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('stripe_customer_id, email')
    .eq('id', user.id)
    .single()

  // Criar customer no Stripe se não existir
  let customerId = profile?.stripe_customer_id
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { supabase_user_id: user.id },
    })
    customerId = customer.id
    await supabaseAdmin.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id)
  }

  const prices = PRICE_MAP[plan]
  const priceId = prices?.[billing] || prices?.once
  if (!priceId) return NextResponse.json({ error: 'Plano inválido' }, { status: 400 })

  const isPack = plan.startsWith('pack_')

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: isPack ? 'payment' : 'subscription',
    allow_promotion_codes: true,
    subscription_data: isPack ? undefined : {
      trial_period_days: 7,
      metadata: { supabase_user_id: user.id },
    },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/planos?canceled=true`,
    metadata: { supabase_user_id: user.id, plan },
  })

  return NextResponse.json({ url: session.url })
}
