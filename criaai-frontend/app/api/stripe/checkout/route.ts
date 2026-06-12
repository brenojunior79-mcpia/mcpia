import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase-server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-04-10' })

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const authResult = await supabase.auth.getUser()
    const user = authResult.data.user
    if (!user) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

    const reqBody = await req.json()
    const plan = reqBody.plan
    const billing = reqBody.billing || 'monthly'
    const packId = reqBody.packId

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://mcpia.site'

    const profileResult = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()

    let customerId = profileResult.data?.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      })
      customerId = customer.id
      await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id)
    }

    if (packId) {
      const packResult = await supabase
        .from('credit_packs')
        .select('id, name, credits, price, stripe_price_id, active')
        .eq('id', packId)
        .eq('active', true)
        .single()

      const pack = packResult.data
      if (!pack || !pack.stripe_price_id) {
        return NextResponse.json({ error: 'Pacote de creditos invalido' }, { status: 400 })
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [{ price: pack.stripe_price_id, quantity: 1 }],
        mode: 'payment',
        allow_promotion_codes: true,
        success_url: appUrl + '/dashboard/creditos?success=true',
        cancel_url: appUrl + '/dashboard/creditos?canceled=true',
        metadata: {
          supabase_user_id: user.id,
          kind: 'credit_pack',
          pack_id: pack.id,
          credits: String(pack.credits),
        },
      })

      return NextResponse.json({ url: session.url })
    }

    const planResult = await supabase
      .from('plans')
      .select('id, name, stripe_price_id_monthly, stripe_price_id_yearly')
      .eq('name', plan)
      .single()

    const planData = planResult.data
    if (!planData) {
      return NextResponse.json({ error: 'Plano invalido' }, { status: 400 })
    }

    const priceId = billing === 'yearly'
      ? planData.stripe_price_id_yearly
      : planData.stripe_price_id_monthly

    if (!priceId) {
      return NextResponse.json({ error: 'Price ID nao configurado para o plano ' + plan }, { status: 400 })
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      allow_promotion_codes: true,
      subscription_data: {
        metadata: { supabase_user_id: user.id },
      },
      success_url: appUrl + '/dashboard?success=true',
      cancel_url: appUrl + '/dashboard/planos?canceled=true',
      metadata: { supabase_user_id: user.id, kind: 'subscription', plan: plan, billing: billing },
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('Stripe checkout error:', err)
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 })
  }
}
