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
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const meta = session.metadata || {}

      if (meta.kind === 'credit_pack' && session.payment_status === 'paid') {
        const userId = meta.supabase_user_id
        const credits = parseInt(meta.credits || '0', 10)
        const paymentId = (session.payment_intent as string) || session.id

        if (!userId || !credits) {
          console.error('Webhook: metadata incompleta', meta)
          return NextResponse.json({ received: true })
        }

        // Idempotência: não credita duas vezes
        const { data: existing } = await admin
          .from('credit_transactions')
          .select('id')
          .eq('stripe_payment_id', paymentId)
          .maybeSingle()

        if (existing) {
          return NextResponse.json({ received: true, duplicate: true })
        }

        // Soma no saldo extra
        const { data: profile } = await admin
          .from('profiles')
          .select('credits_videos_extra')
          .eq('id', userId)
          .single()

        const novoExtra = (profile?.credits_videos_extra || 0) + credits

        await admin
          .from('profiles')
          .update({ credits_videos_extra: novoExtra, updated_at: new Date().toISOString() })
          .eq('id', userId)

        // Registra a transação
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
    }

    return NextResponse.json({ received: true })
  } catch (err: any) {
    console.error('Webhook handler error:', err)
    return NextResponse.json({ error: 'Erro ao processar' }, { status: 500 })
  }
}
