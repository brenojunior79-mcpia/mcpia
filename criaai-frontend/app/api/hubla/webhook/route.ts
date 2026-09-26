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
      return NextResponse.json({ received: true, warning: 'sem email' })
    }

    const userId = await findUserIdByEmail(email)
    if (!userId) {
      console.error('[hubla-webhook] usuario nao encontrado para email', email)
      return NextResponse.json({ received: true, warning: 'usuario nao encontrado' })
    }

    const subscriptionId = payload.event?.subscription?.id || null

    switch (eventType) {
      case 'customer.member_added': {
        const planName = resolvePlanName(payload)
        const planId = planName ? await getPlanIdByName(planName) : null

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
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId)

        if (!planId) {
          console.error('[hubla-webhook] plano nao identificado, products:', JSON.stringify(payload.event?.products))
        }
        break
      }

      case 'customer.member_removed': {
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
        console.log('[hubla-webhook] evento nao tratado:', eventType)
        break
    }

    return NextResponse.json({ received: true })
  } catch (err: any) {
    console.error('[hubla-webhook] erro:', err)
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 })
  }
}
