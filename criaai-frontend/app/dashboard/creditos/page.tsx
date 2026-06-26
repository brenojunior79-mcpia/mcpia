import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CAKTO_OFFER_TO_PLAN: Record<string, string> = {
  'jkx9urd_929562': 'Starter',
  'hqhmn8e': 'Pro',
  'kbwoae2': 'Premium',
}

const CAKTO_OFFER_TO_CREDITS: Record<string, number> = {
  'i74jv7b_943777': 10,
  '35j9btc_943780': 30,
  'bjwi3d9_943781': 100,
}

async function getPlanIdByName(planName: string): Promise<string | null> {
  const { data } = await admin.from('plans').select('id').eq('name', planName).maybeSingle()
  return data?.id || null
}

function resolvePlanName(payload: any): string | null {
  const offerId = payload.data?.offer?.id
  if (offerId && CAKTO_OFFER_TO_PLAN[offerId]) return CAKTO_OFFER_TO_PLAN[offerId]
  const price = payload.data?.offer?.price ?? payload.data?.baseAmount
  if (price !== undefined && price !== null) {
    const rounded = Math.round(Number(price) * 100) / 100
    if (rounded === 29.9) return 'Starter'
    if (rounded === 39.9) return 'Pro'
    if (rounded === 69.9) return 'Premium'
  }
  return null
}

function resolveCreditsPackage(payload: any): number | null {
  const offerId = payload.data?.offer?.id
  if (offerId && CAKTO_OFFER_TO_CREDITS[offerId]) return CAKTO_OFFER_TO_CREDITS[offerId]
  const price = payload.data?.offer?.price ?? payload.data?.baseAmount
  if (price !== undefined && price !== null) {
    const rounded = Math.round(Number(price) * 100) / 100
    if (rounded === 19.9) return 10
    if (rounded === 49.9) return 30
    if (rounded === 149.9) return 100
  }
  return null
}

function isSubscription(payload: any): boolean {
  return !!(payload.data?.subscription?.id)
}

function getCustomerEmail(payload: any): string | null {
  return (
    payload.data?.customer?.email ||
    payload.data?.subscription?.customer?.email ||
    payload.customer?.email ||
    null
  )
}

async function findUserIdByEmail(email: string): Promise<string | null> {
  const { data } = await admin
    .from('profiles')
    .select('id')
    .eq('email', email.toLowerCase().trim())
    .maybeSingle()
  return data?.id || null
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json()

    const secretEnv = process.env.CAKTO_WEBHOOK_SECRET
    const incomingSecret = payload.secret || req.headers.get('x-cakto-secret') || req.nextUrl.searchParams.get('secret')

    if (secretEnv && incomingSecret !== secretEnv) {
      return NextResponse.json({ error: 'Assinatura invalida' }, { status: 401 })
    }

    const eventName: string = payload.event || payload.type || ''
    const email = getCustomerEmail(payload)

    if (!email) {
      console.error('[cakto-webhook] sem email no payload')
      return NextResponse.json({ received: true, warning: 'sem email' })
    }

    const userId = await findUserIdByEmail(email)
    if (!userId) {
      console.error('[cakto-webhook] usuario nao encontrado para email', email)
      return NextResponse.json({ received: true, warning: 'usuario nao encontrado' })
    }

    const orderId = payload.data?.id || null

    switch (eventName) {
      case 'purchase_approved': {
        if (isSubscription(payload)) {
          // Compra de assinatura
          const planName = resolvePlanName(payload)
          const planId = planName ? await getPlanIdByName(planName) : null

          await admin
            .from('profiles')
            .update({
              subscription_status: 'active',
              plan_id: planId,
              payment_provider: 'cakto',
              cakto_order_id: orderId,
              credits_videos_used: 0,
              credits_ebooks_used: 0,
              updated_at: new Date().toISOString(),
            })
            .eq('id', userId)

          if (!planId) {
            console.error('[cakto-webhook] plano nao identificado, offer:', JSON.stringify(payload.data?.offer))
          }
        } else {
          // Compra de creditos avulsos (pagamento unico)
          const credits = resolveCreditsPackage(payload)

          if (credits) {
            const profileResult = await admin
              .from('profiles')
              .select('credits_videos_extra')
              .eq('id', userId)
              .single()

            const current = profileResult.data?.credits_videos_extra || 0

            await admin
              .from('profiles')
              .update({
                credits_videos_extra: current + credits,
                payment_provider: 'cakto',
                updated_at: new Date().toISOString(),
              })
              .eq('id', userId)

            console.log('[cakto-webhook] ' + credits + ' creditos adicionados para', email)
          } else {
            console.error('[cakto-webhook] creditos nao identificados, offer:', JSON.stringify(payload.data?.offer))
          }
        }
        break
      }

      case 'subscription_created':
      case 'subscription_renewed': {
        const planName = resolvePlanName(payload)
        const planId = planName ? await getPlanIdByName(planName) : null

        await admin
          .from('profiles')
          .update({
            subscription_status: 'active',
            plan_id: planId,
            payment_provider: 'cakto',
            cakto_order_id: orderId,
            credits_videos_used: 0,
            credits_ebooks_used: 0,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId)
        break
      }

      case 'subscription_canceled': {
        await admin
          .from('profiles')
          .update({
            subscription_status: 'canceled',
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId)
        break
      }

      case 'subscription_renewal_refused':
      case 'purchase_refused': {
        await admin
          .from('profiles')
          .update({
            subscription_status: 'past_due',
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId)
        break
      }

      case 'refund':
      case 'chargeback': {
        await admin
          .from('profiles')
          .update({
            subscription_status: 'canceled',
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId)
        break
      }

      default:
        console.log('[cakto-webhook] evento nao tratado:', eventName)
        break
    }

    return NextResponse.json({ received: true })
  } catch (err: any) {
    console.error('[cakto-webhook] erro:', err)
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 })
  }
}
