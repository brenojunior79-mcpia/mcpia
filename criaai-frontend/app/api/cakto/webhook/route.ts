import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CAKTO_PRODUCT_TO_PLAN: Record<string, string> = {
  // Preencher com: 'nome_ou_id_do_produto_na_cakto': 'Starter' | 'Pro' | 'Premium'
}

const CAKTO_PRICE_TO_PLAN: Record<string, string> = {
  '29.9': 'Starter',
  '29.90': 'Starter',
  '39.9': 'Pro',
  '39.90': 'Pro',
  '69.9': 'Premium',
  '69.90': 'Premium',
}

async function getPlanIdByName(planName: string): Promise<string | null> {
  const { data } = await admin.from('plans').select('id').eq('name', planName).maybeSingle()
  return data?.id || null
}

function resolvePlanName(payload: any): string | null {
  const product = payload.data?.product || payload.product || {}
  const price = product.price ?? payload.data?.amount ?? payload.amount

  if (product.name && CAKTO_PRODUCT_TO_PLAN[product.name]) {
    return CAKTO_PRODUCT_TO_PLAN[product.name]
  }
  if (product.id && CAKTO_PRODUCT_TO_PLAN[product.id]) {
    return CAKTO_PRODUCT_TO_PLAN[product.id]
  }
  if (price !== undefined && price !== null) {
    const key = String(price)
    if (CAKTO_PRICE_TO_PLAN[key]) return CAKTO_PRICE_TO_PLAN[key]
  }
  return null
}

function getCustomerEmail(payload: any): string | null {
  return (
    payload.data?.customer?.email ||
    payload.customer?.email ||
    payload.data?.customer_email ||
    payload.customer_email ||
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
    const secret = process.env.CAKTO_WEBHOOK_SECRET
    const incomingSecret = req.headers.get('x-cakto-secret') || req.nextUrl.searchParams.get('secret')

    if (secret && incomingSecret !== secret) {
      return NextResponse.json({ error: 'Assinatura invalida' }, { status: 401 })
    }

    const payload = await req.json()
    const eventName: string = payload.event || payload.type || payload.custom_id || ''

    const email = getCustomerEmail(payload)
    if (!email) {
      console.error('[cakto-webhook] sem email no payload', JSON.stringify(payload).slice(0, 500))
      return NextResponse.json({ received: true, warning: 'sem email' })
    }

    const userId = await findUserIdByEmail(email)
    if (!userId) {
      console.error('[cakto-webhook] usuario nao encontrado para email', email)
      return NextResponse.json({ received: true, warning: 'usuario nao encontrado' })
    }

    const orderId =
      payload.data?.id || payload.data?.order_id || payload.id || payload.order_id || null

    switch (eventName) {
      case 'purchase_approved':
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
