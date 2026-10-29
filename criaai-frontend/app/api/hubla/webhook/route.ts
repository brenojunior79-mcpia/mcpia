import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { recordPayment, clearBilling, firstFutureDate, toAmount } from '@/lib/billing'
import { recordSale, markRefunded } from '@/lib/sales-ledger'
import { trackReferralSale, trackReferralRefund } from '@/lib/referrals'
import { tratarEventoHubla, lerEvento } from '@/lib/waAuto'
import { avisarVendaAdmin } from '@/lib/pushAdmin'

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


// Conta a venda (ou o reembolso) no card "Melhores meses de vendas" do admin.
// Roda antes de procurar o aluno: quem compra Mentoria/Express quase nunca tem cadastro na plataforma.
async function trackSale(admin2: any, eventType: string, payload: any, email: string | null): Promise<void> {
  const inv = payload.event?.invoice || {}
  if (eventType === 'invoice.payment_succeeded') {
    const products: any[] = payload.event?.products || (payload.event?.product ? [payload.event.product] : [])
    const a = inv.amount || {}
    const cents = Number(a.subtotalCents ?? a.totalCents)
    for (const pr of products) {
      await recordSale(admin2, { provider: 'hubla', externalId: inv.id, productName: pr?.name, amount: isFinite(cents) ? cents / 100 : null, paidAt: inv.paidAt || inv.createdAt, email })
    }
    // Indique e ganhe: compra da Mentoria feita pelo link de um aluno
    const u = payload.event?.user || {}
    await trackReferralSale(admin2, { provider: 'hubla', externalId: inv.id, productNames: products.map(function(x: any) { return x?.name }), email, name: u.firstName || u.name || u.fullName || '', paidAt: inv.paidAt || inv.createdAt, payload })
  } else if (eventType === 'invoice.refunded') {
    await markRefunded(admin2, { provider: 'hubla', externalId: inv.id, email })
    await trackReferralRefund(admin2, { provider: 'hubla', externalId: inv.id, email })
  }
}

// Avisa o admin no celular quando cai uma venda ou renovacao paga
async function avisarVendaHubla(payload: any, email: string | null): Promise<void> {
  try {
    const inv = payload.event?.invoice || {}
    const products: any[] = payload.event?.products || (payload.event?.product ? [payload.event.product] : [])
    const planName = resolvePlanName(payload)
    const nomes = products.map(function(x: any) { return String(x?.name || '').trim() }).filter(Boolean)
    const produto = planName ? 'Plano ' + planName : (nomes.join(' + ') || 'Produto')
    const a = inv.amount || {}
    const cents = Number(a.totalCents ?? a.subtotalCents)
    const u = payload.event?.user || {}
    const nome = String(u.fullName || u.name || ((u.firstName || '') + ' ' + (u.lastName || '')) || '').trim()
    // Renovacao: plano que a pessoa ja tinha ativo na mesma assinatura
    let renovacao = false
    const paidSub: string | null = inv.subscriptionId || payload.event?.subscription?.id || null
    if (planName && paidSub && email) {
      const cur = await admin.from('profiles').select('hubla_subscription_id, subscription_status').eq('email', email.toLowerCase().trim()).maybeSingle()
      renovacao = cur.data?.hubla_subscription_id === paidSub && cur.data?.subscription_status === 'active'
    }
    await avisarVendaAdmin(admin, { chave: 'hubla:' + (inv.id || (email + ':' + Date.now())), renovacao, produto, valor: isFinite(cents) && cents > 0 ? cents / 100 : null, email, nome, origem: 'Hubla' })
  } catch (e) { console.error('[hubla-webhook] aviso venda:', e) }
}

// Registra a data do pagamento e da proxima cobranca (card "Assinaturas" do admin)
async function trackBilling(userId: string, payload: any, planName: string | null): Promise<void> {
  const sub = payload.event?.subscription || {}
  const next = firstFutureDate([sub.nextBillingAt, sub.nextChargeAt, sub.nextInvoiceAt, sub.nextPaymentAt, sub.currentPeriodEnd, sub.expiresAt])
  const inv = payload.event?.invoice || {}
  const cents = Number(inv.amount?.totalCents ?? inv.amount?.subtotalCents)
  const amount = isFinite(cents) && cents > 0 ? toAmount(cents / 100) : null
  await recordPayment(admin, { userId, provider: 'hubla', amount, planName, nextChargeAt: next })
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

    await trackSale(admin, eventType, payload, email)
    if (eventType === 'invoice.payment_succeeded') await avisarVendaHubla(payload, email)

    // Reembolso da Estrutura Express (upsell): so tira o acesso ao menu Estrutura Express.
    // Nao pode cancelar o plano da plataforma nem bloquear a conta do aluno.
    if (eventType === 'invoice.refunded') {
      const prods: any[] = payload.event?.products || (payload.event?.product ? [payload.event.product] : [])
      const soExpress = prods.length > 0 && prods.every(function(pr: any) { return String(pr?.name || '').toLowerCase().includes('express') })
      if (soExpress) {
        try {
          const info = lerEvento(eventType, payload)
          if (info.email) await admin.from('hubla_compras').update({ reembolsado: true }).eq('cat', 'e').eq('email', info.email.toLowerCase())
          if (info.wa) await admin.from('hubla_compras').update({ reembolsado: true }).eq('cat', 'e').eq('wa', info.wa)
        } catch (e) { console.error('[hubla-webhook] reembolso express:', e) }
        await logEvent(eventType, email, null, 'ignorado', 'reembolso da Estrutura Express: acesso ao menu removido, plano da plataforma mantido')
        return NextResponse.json({ received: true, express: true })
      }
    }

    // Guarda o dia da compra (com e-mail e telefone) para aparecer no cabecalho do chat de atendimento
    if (eventType === 'invoice.payment_succeeded' || eventType === 'customer.member_added' || eventType === 'subscription.activated') {
      try {
        const info = lerEvento(eventType, payload)
        const chave = (eventType === 'invoice.payment_succeeded' ? 'inv:' : 'ev:') + (info.chave || (info.email + ':' + Date.now()))
        const u = payload.event?.user || {}
        const nomeCompleto = String(u.fullName || u.name || ((u.firstName || '') + ' ' + (u.lastName || '')) || '').trim()
        const nomeNorm = nomeCompleto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
        const prodTxt = String(info.produto || '').toLowerCase()
        const cat = prodTxt.startsWith('mentoria') ? 'm' : prodTxt.includes('express') ? 'e' : 'p'
        await admin.from('hubla_compras').upsert({ email: info.email || null, wa: info.wa || null, produto: info.produto || null, chave, paid_at: new Date().toISOString(), cat, nome_norm: nomeNorm || null, tokens: nomeNorm ? nomeNorm.split(' ') : null, origem: 'webhook' }, { onConflict: 'chave', ignoreDuplicates: true })
      } catch (e) { console.error('[hubla-webhook] compra:', e) }
    }

    // Fluxos de WhatsApp por evento (recuperacao). Nunca pode atrapalhar o resto do aviso.
    try { await tratarEventoHubla(admin, eventType, payload) } catch (e) { console.error('[hubla-webhook] fluxos whatsapp:', e) }

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

    const grantAccess = async function(): Promise<boolean> {
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

      // Produto que nao e plano da plataforma (Estrutura Express, Mentoria...): nao mexe em nada do aluno
      if (!planId) {
        console.error('[hubla-webhook] produto nao e plano da plataforma, ignorado. products:', JSON.stringify(payload.event?.products))
        return false
      }

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
      await trackBilling(userId, payload, planName)
      return true
    }

    const revokeAccess = async function(): Promise<boolean> {
      // Cancelamento de outro produto (Express/Mentoria) ou de uma assinatura antiga nao tira o plano atual
      const cur = await admin.from('profiles').select('hubla_subscription_id, is_admin').eq('id', userId).maybeSingle()
      if (cur.data?.is_admin) return false
      const sameSub = !!subscriptionId && subscriptionId === cur.data?.hubla_subscription_id
      if (subscriptionId && cur.data?.hubla_subscription_id && !sameSub) return false
      if (!sameSub && !resolvePlanName(payload)) return false

      await admin
        .from('profiles')
        .update({
          subscription_status: 'canceled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
      await clearBilling(admin, userId)
      return true
    }

    switch (eventType) {
      case 'customer.member_added':
      case 'subscription.activated': {
        const ok = await grantAccess()
        await logEvent(eventType, email, userId, ok ? 'liberado' : 'ignorado', ok ? 'plano: ' + resolvePlanName(payload) : 'produto não é plano da plataforma (nada alterado)')
        break
      }

      case 'customer.member_removed':
      case 'subscription.deactivated': {
        const ok = await revokeAccess()
        await logEvent(eventType, email, userId, ok ? 'removido' : 'ignorado', ok ? 'assinatura encerrada' : 'não era o plano atual (nada alterado)')
        break
      }

      // Renovacao mensal paga: so atualiza a data da proxima cobranca (nao mexe em plano nem creditos)
      case 'invoice.payment_succeeded': {
        const paidSub: string | null = payload.event?.invoice?.subscriptionId || payload.event?.subscription?.id || null
        const planName = resolvePlanName(payload)
        const cur = await admin.from('profiles').select('hubla_subscription_id, subscription_status').eq('id', userId).maybeSingle()
        if (planName && paidSub && cur.data?.hubla_subscription_id === paidSub && cur.data?.subscription_status === 'active') {
          await trackBilling(userId, payload, planName)
          await logEvent(eventType, email, userId, 'registrado', 'pagamento registrado: ' + planName)
        } else {
          await logEvent(eventType, email, userId, 'ignorado', 'pagamento de outro produto ou assinatura')
        }
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
        await clearBilling(admin, userId, true)
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
