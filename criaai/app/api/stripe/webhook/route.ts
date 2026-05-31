// app/api/stripe/webhook/route.ts

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-04-10' })

const PLAN_MAP: Record<string, string> = {
  [process.env.STRIPE_PRICE_STARTER_MONTHLY!]: 'Starter',
  [process.env.STRIPE_PRICE_STARTER_YEARLY!]:  'Starter',
  [process.env.STRIPE_PRICE_PRO_MONTHLY!]:     'Pro',
  [process.env.STRIPE_PRICE_PRO_YEARLY!]:      'Pro',
  [process.env.STRIPE_PRICE_AGENCY_MONTHLY!]:  'Agency',
  [process.env.STRIPE_PRICE_AGENCY_YEARLY!]:   'Agency',
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Webhook signature inválida' }, { status: 400 })
  }

  try {
    switch (event.type) {

      // Assinatura criada ou atualizada
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const priceId = sub.items.data[0]?.price.id
        const planName = PLAN_MAP[priceId]
        if (!planName) break

        const { data: plan } = await supabaseAdmin
          .from('plans')
          .select('id')
          .eq('name', planName)
          .single()

        const billingCycle = sub.items.data[0]?.price.recurring?.interval === 'year' ? 'yearly' : 'monthly'

        await supabaseAdmin
          .from('profiles')
          .update({
            plan_id: plan?.id,
            stripe_subscription_id: sub.id,
            subscription_status: sub.status,
            billing_cycle: billingCycle,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_customer_id', sub.customer as string)
        break
      }

      // Pagamento confirmado — resetar créditos se for renovação
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        if (invoice.billing_reason === 'subscription_cycle') {
          const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('stripe_customer_id', invoice.customer as string)
            .single()

          if (profile) {
            await supabaseAdmin
              .from('profiles')
              .update({
                credits_videos_used: 0,
                credits_ebooks_used: 0,
                updated_at: new Date().toISOString(),
              })
              .eq('id', profile.id)

            await supabaseAdmin.from('credit_transactions').insert({
              user_id: profile.id,
              type: 'reset',
              description: 'Renovação mensal — créditos resetados',
            })
          }
        }

        // Compra de pack avulso
        if (invoice.billing_reason === 'manual') {
          const lineItem = invoice.lines.data[0]
          const priceId = lineItem?.price?.id
          const packMap: Record<string, { videos: number }> = {
            [process.env.STRIPE_PRICE_PACK_10!]:  { videos: 10 },
            [process.env.STRIPE_PRICE_PACK_30!]:  { videos: 30 },
            [process.env.STRIPE_PRICE_PACK_100!]: { videos: 100 },
          }
          const pack = packMap[priceId || '']
          if (pack) {
            const { data: profile } = await supabaseAdmin
              .from('profiles')
              .select('id')
              .eq('stripe_customer_id', invoice.customer as string)
              .single()

            if (profile) {
              await supabaseAdmin
                .from('profiles')
                .update({ credits_videos_extra: pack.videos })
                .eq('id', profile.id)

              await supabaseAdmin.from('credit_transactions').insert({
                user_id: profile.id,
                type: 'purchased',
                credits_videos: pack.videos,
                description: `Pack de ${pack.videos} créditos comprado`,
                stripe_payment_id: invoice.payment_intent as string,
                amount_paid: (invoice.amount_paid || 0) / 100,
              })
            }
          }
        }
        break
      }

      // Assinatura cancelada
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        await supabaseAdmin
          .from('profiles')
          .update({ subscription_status: 'canceled', updated_at: new Date().toISOString() })
          .eq('stripe_customer_id', sub.customer as string)
        break
      }

      // Pagamento falhou
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        await supabaseAdmin
          .from('profiles')
          .update({ subscription_status: 'past_due', updated_at: new Date().toISOString() })
          .eq('stripe_customer_id', invoice.customer as string)
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (err: any) {
    console.error('Webhook error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export const config = { api: { bodyParser: false } }
