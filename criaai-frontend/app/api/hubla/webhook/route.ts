import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// O slug que aparece no link de checkout (pay.hub.la/<slug>) geralmente e' o mesmo
// id usado internamente pela Hubla no produto/oferta. Mapeamos os 3 planos por ele,
// conferindo tanto o id do produto quanto o id da oferta no payload do evento.
const HUBLA_ID_TO_PLAN: Record<string, string> = {
  '0AueQQcwJxUeV9BE1ax7': 'Starter',
  '16HkQulcBTksGN8AEnow': 'Pro',
  'TwrkZegsChmWcaJ9LO4z': 'Premium',
}

async function getPlanIdByName(planName: string): Promise<string | null> {
  const { data } = await admin.from('plans').select('id').eq('name', planName).maybeSingle()
  return data?.id || null
}

function resolvePlanName(payload: any): string | null {
  const products = payload.event?.products || []
  for (const product of products) {
    if (product?.id && HUBLA_ID_TO_PLAN[product.id]) return HUBLA_ID_TO_PLAN[product.id]
    for (const offer of product?.offers || []) {
      if (offer?.id && HUBLA_ID_TO_PLAN[offer.id]) return HUBLA_ID_TO_PLAN[offer.id]
    }
  }
  const singleProduct = payload.event?.product
  if (singleProduct?.id && HUBLA_ID_TO_PLAN[singleProduct.id]) return HUBLA_ID_TO_PLAN[singleProduct.id]
  return null
}

async function findUserIdByEmail(email: string): Promise<string | null> {
  const { data } = await admin
    .from('profiles')
    .select('id')
    .eq('email', email.toLowerCase().trim())
    .maybeSingle()
  return data?.id || null
}

// Guarda um historico simples do que a Hubla avisou e do que fizemos (para o admin conferir).
async function logEvent(eventType: string, email: string | null, userId: string | null, action: string, note: string): Promise<void> {
  try {
    await admin.from('hubla_events').insert({ event_type: eventType, email, user_id: userId, action, note: note.slice(0, 300) })
  } catch (e) {}
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json()

    const tokenEnv = process.env.HUBLA_WEBHOOK_TOKEN
    const incomingToken = req.headers.get('x-hubla-token')

    if (tokenEnv && incomingToken !== tokenEnv) {
      return NextResponse.json({ error: 'Token invalido' }, { status: 401 })
    }

    const eventType: string = payload.type || ''
    const email = payload.event?.user?.email || null

    if (!email) {
      console.error('[hubla-webhook] sem email no payload')
      await logEvent(eventType, null, null, 'ignorado', 'sem email no aviso')
      return NextResponse.json({ received: true, warning: 'sem email' })
    }

    const userId = await findUserIdByEmail(email)
    if (!userId) {
      console.error('[hubla-webhook] usuario nao encontrado para email', email)
      await logEvent(eventType, email, null, 'ignorado', 'aluno nao encontrado na plataforma')
      return NextResponse.json({ received: true, warning: 'usuario nao encontrado' })
    }

    const subscriptionId = payload.event?.subscription?.id || null

    const grantAccess = async function(): Promise<void> {
      const planName = resolvePlanName(payload)
      const planId = planName ? await getPlanIdByName(planName) : null

      // Log sempre (nao so quando falha), pra conseguirmos conferir se o plano batido
      // realmente corresponde ao que a pessoa comprou, mesmo quando parece ter dado certo.
      console.log(
        '[hubla-webhook] GRANT email:', email,
        '| planName resolvido:', planName,
        '| planId:', planId,
        '| products cru:', JSON.stringify(payload.event?.products),
        '| subscription cru:', JSON.stringify(payload.event?.subscription)
      )

      await admin
        .from('profiles')
        .update({
          subscription_status: 'active',
          plan_id: planId,
          payment_provider: 'hubla',
          hubla_subscription_id: subscriptionId,
          credits_videos_used: 0,
          credits_ebooks_used: 0,
          credits_sites_used: 0,
          refunded_at: null, // se comprou de novo, o bloqueio por reembolso sai
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)

      if (!planId) {
        console.error('[hubla-webhook] plano nao identificado, products:', JSON.stringify(payload.event?.products))
      }
    }

    const revokeAccess = async function(): Promise<void> {
      await admin
        .from('profiles')
        .update({
          subscription_status: 'canceled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
    }

    switch (eventType) {
      case 'customer.member_added':
      case 'subscription.activated': {
        await grantAccess()
        await logEvent(eventType, email, userId, 'liberado', 'plano: ' + (resolvePlanName(payload) || 'nao identificado'))
        break
      }

      case 'customer.member_removed':
      case 'subscription.deactivated': {
        await revokeAccess()
        await logEvent(eventType, email, userId, 'removido', 'assinatura encerrada')
        break
      }

      // Reembolso concluido: tira o acesso. (A Hubla tambem manda "invoice.status_updated" junto; so tratamos este.)
      case 'invoice.refunded': {
        const refundedSub: string | null = payload.event?.invoice?.subscriptionId || payload.event?.subscriptions?.[0]?.id || null
        const prof = await admin.from('profiles').select('hubla_subscription_id, is_admin').eq('id', userId).maybeSingle()
        if (prof.data?.is_admin) {
          await logEvent(eventType, email, userId, 'ignorado', 'conta admin')
          break
        }
        // Se o aluno ja comprou de novo (outra assinatura), um reembolso antigo nao pode tirar o plano novo
        if (refundedSub && prof.data?.hubla_subscription_id && refundedSub !== prof.data.hubla_subscription_id) {
          await logEvent(eventType, email, userId, 'ignorado', 'reembolso de uma assinatura antiga; o plano atual foi mantido')
          break
        }
        await admin.from('profiles').update({ subscription_status: 'canceled', refunded_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', userId)
        await logEvent(eventType, email, userId, 'removido', 'reembolso')
        break
      }

      // Eventos apenas informativos, nao mudam o acesso
      case 'subscription.created':
      case 'subscription.expiring':
      case 'subscription.renewal_disabled':
      case 'subscription.renewal_enabled':
        console.log('[hubla-webhook] evento informativo:', eventType)
        break

      default:
        console.log('[hubla-webhook] evento nao tratado:', eventType)
        await logEvent(eventType, email, userId, 'ignorado', 'evento sem acao')
        break
    }

    return NextResponse.json({ received: true })
  } catch (err: any) {
    console.error('[hubla-webhook] erro:', err)
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 })
  }
}
