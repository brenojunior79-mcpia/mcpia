import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-04-10' })

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function getPlanIdByPriceId(priceId: string): Promise<string | null> {
  const { data } = await admin
    .from('plans')
    .select('id')
    .or(`stripe_price_id_monthly.eq.${priceId},stripe_price_id_yearly.eq.${priceId}`)
    .single()
  return data?.id || null
}

async function getBillingCycle(priceId: string): Promise<string> {
  const { data } = await admin
    .from('plans')
    .select('stripe_price_id_yearly')
    .eq('stripe_price_id_yearly', priceId)
    .maybeSingle()
  return data ? 'yearly' : 'monthly'
}

export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature')
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!sig || !secret) {
    return NextResponse.json({ error: 'Webhook não configurado' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    const rawBody = await req.text()
    event = stripe.webhooks.constructEvent(rawBody, sig, secret)
  } catch (err: any) {
    console.error('Webhook signature error:', err.message)
    return NextResponse.json({ error: `Assinatura inválida: ${err.message}` }, { status: 400 })
  }

  try {
    switch (event.type) {

      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const meta = session.metadata || {}

        if (meta.kind === 'credit_pack' && session.payment_status === 'paid') {
          const userId = meta.supabase_user_id
          const credits = parseInt(meta.credits || '0', 10)
          const paymentId = (session.payment_intent as string) || session.id

          if (!userId || !credits) break

          const { data: existing } = await admin
            .from('credit_transactions')
            .select('id')
            .eq('stripe_payment_id', paymentId)
            .maybeSingle()

          if (existing) break

          const { data: profile } = await admin
            .from('profiles')
            .select('credits_videos_extra')
            .eq('id', userId)
            .single()

          await admin
            .from('profiles')
            .update({
              credits_videos_extra: (profile?.credits_videos_extra || 0) + credits,
              updated_at: new Date().toISOString(),
            })
            .eq('id', userId)

          await admin.from('credit_transactions').insert({
            user_id: userId,
            type: 'purchased',
            credits_videos: credits,
            credits_ebooks: 0,
            description: `Compra de ${credits} créditos de vídeo`,
            stripe_payment_id: paymentId,
            amount_paid: session.amount_total ? session.amount_total / 100 : null,
          })
        }

        if (meta.kind === 'subscription' && session.subscription) {
          const userId = meta.supabase_user_id
          const subscriptionId = session.subscription as string

          const subscription = await stripe.subscriptions.retrieve(subscriptionId)
          const priceId = subscription.items.data[0]?.price?.id
          const planId = priceId ? await getPlanIdByPriceId(priceId) : null
          const billingCycle = priceId ? await getBillingCycle(priceId) : 'monthly'

          const status = subscription.status
          const trialEnd = subscription.trial_end
            ? new Date(subscription.trial_end * 1000).toISOString()
            : null

          await admin
            .from('profiles')
            .update({
              stripe_subscription_id: subscriptionId,
              subscription_status: status,
              plan_id: planId,
              billing_cycle: billingCycle,
              ...(trialEnd ? { trial_ends_at: trialEnd } : {}),
              credits_videos_used: 0,
              credits_ebooks_used: 0,
              updated_at: new Date().toISOString(),
            })
            .eq('id', userId)
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const priceId = subscription.items.data[0]?.price?.id
        const planId = priceId ? await getPlanIdByPriceId(priceId) : null
        const billingCycle = priceId ? await getBillingCycle(priceId) : 'monthly'
        const trialEnd = subscription.trial_end
          ? new Date(subscription.trial_end * 1000).toISOString()
          : null
        const prevAttr = event.data.previous_attributes as any
        const isRenewal = prevAttr?.current_period_start !== undefined

        await admin
          .from('profiles')
          .update({
            stripe_subscription_id: subscription.id,
            subscription_status: subscription.status,
            plan_id: planId,
            billing_cycle: billingCycle,
            ...(trialEnd ? { trial_ends_at: trialEnd } : {}),
            ...(isRenewal ? { credits_videos_used: 0, credits_ebooks_used: 0 } : {}),
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_customer_id', subscription.customer as string)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await admin
          .from('profiles')
          .update({
            subscription_status: 'canceled',
            stripe_subscription_id: null,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_customer_id', subscription.customer as string)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        if (!invoice.subscription) break
        await admin
          .from('profiles')
          .update({
            subscription_status: 'past_due',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_customer_id', invoice.customer as string)
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        if (!invoice.subscription || invoice.billing_reason === 'subscription_create') break
        await admin
          .from('profiles')
          .update({
            subscription_status: 'active',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_customer_id', invoice.customer as string)
        break
      }

      default:
        break
    }

    return NextResponse.json({ received: true })
  } catch (err: any) {
    console.error('Webhook handler error:', err)
    return NextResponse.json({ error: 'Erro ao processar' }, { status: 500 })
  }
}
