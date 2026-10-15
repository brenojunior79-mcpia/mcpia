import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { recordPayment, clearBilling, firstFutureDate, toAmount } from '@/lib/billing'
import { recordSale, markRefunded } from '@/lib/sales-ledger'

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


// Conta a venda (ou o reembolso) no card "Melhores meses de vendas" do admin.
// Roda antes de procurar o aluno: quem compra Mentoria/Express quase nunca tem cadastro na plataforma.
async function trackSale(eventName: string, payload: any, email: string | null): Promise<void> {
  const d = payload.data || {}
  const id = d.refId || d.id
  if (eventName === 'purchase_approved') {
    await recordSale(admin, { provider: 'cakto', externalId: id, productName: d.product?.name || d.offer?.name, amount: d.baseAmount ?? d.offer?.price ?? d.amount, paidAt: d.paidAt || d.paid_at, email })
  } else if (eventName === 'refund' || eventName === 'chargeback') {
    await markRefunded(admin, { provider: 'cakto', externalId: id, email })
  }
}

// Registra a data do pagamento e da proxima cobranca (card "Assinaturas" do admin)
async function trackBilling(userId: string, payload: any, planName: string | null): Promise<void> {
  const sub = payload.data?.subscription || {}
  const next = firstFutureDate([sub.next_payment_date, sub.nextPaymentDate, sub.next_payment_at, sub.next_charge_date])
  const amount = toAmount(payload.data?.amount ?? payload.data?.offer?.price ?? payload.data?.baseAmount)
  await recordPayment(admin, { userId, provider: 'cakto', amount, planName, nextChargeAt: next })
}

// Historico de compras e reembolsos para o painel Admin (mesma tabela da Hubla, com provider = 'cakto')
async function logCakto(eventType: string, email: string | null, userId: string | null, action: string, note: string): Promise<void> {
  try {
    await admin.from('hubla_events').insert({ provider: 'cakto', event_type: eventType, email, user_id: userId, action, note: note.slice(0, 300) })
  } catch (e) {}
}

// Compra nova = o aluno nao tinha nenhum pagamento nos ultimos 45 dias (senao e' renovacao e nao vai pro historico)
async function isNewCustomer(userId: string): Promise<boolean> {
  try {
    const since = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString()
    const r = await admin.from('billing_payments').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('paid_at', since)
    return (r.count || 0) === 0
  } catch (e) {
    return false
  }
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

    await trackSale(eventName, payload, email)

    if (!email) {
      console.error('[cakto-webhook] sem email no payload')
      return NextResponse.json({ received: true, warning: 'sem email' })
    }

    const userId = await findUserIdByEmail(email)
    if (!userId) {
      console.error('[cakto-webhook] usuario nao encontrado para email', email)
      if (eventName === 'purchase_approved' || eventName === 'subscription_created' || eventName === 'refund' || eventName === 'chargeback') {
        await logCakto(eventName, email, null, 'ignorado', 'aluno nao encontrado na plataforma')
      }
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
          } else {
            const novo = await isNewCustomer(userId)
            await trackBilling(userId, payload, planName)
            if (novo) await logCakto(eventName, email, userId, 'liberado', 'plano: ' + planName)
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
            await logCakto(eventName, email, userId, 'liberado', 'créditos avulsos: +' + credits + ' vídeos')
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
        if (planId) {
          const novo = await isNewCustomer(userId)
          await trackBilling(userId, payload, planName)
          if (novo && eventName === 'subscription_created') await logCakto(eventName, email, userId, 'liberado', 'plano: ' + planName)
        }
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
        await clearBilling(admin, userId)
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
        await clearBilling(admin, userId, true)
        await logCakto(eventName, email, userId, 'removido', eventName === 'chargeback' ? 'chargeback (contestação no cartão)' : 'reembolso')
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
