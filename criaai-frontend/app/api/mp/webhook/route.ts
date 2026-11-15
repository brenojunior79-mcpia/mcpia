import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/whatsapp'
import { mp, avisoValido, lerReferencia, liberarPlanoMP, encerrarPlanoMP, registrarEventoMP } from '@/lib/mercadopago'

export const dynamic = 'force-dynamic'

// Aviso do Mercado Pago sobre as assinaturas (preapproval). Sempre confere o estado direto na API,
// entao um aviso falso nao consegue liberar nada; mesmo assim exige a assinatura secreta (MP_WEBHOOK_SECRET).
export async function POST(req: NextRequest) {
  const url = new URL(req.url)
  let corpo: any = {}
  try { corpo = await req.json() } catch (e) { /* alguns avisos vem so na URL */ }
  const tipo = String(corpo?.type || url.searchParams.get('type') || url.searchParams.get('topic') || '')
  const dataId = String(corpo?.data?.id || url.searchParams.get('data.id') || url.searchParams.get('id') || '')
  if (!dataId) return NextResponse.json({ ok: true })
  if (!avisoValido(req.headers.get('x-signature'), req.headers.get('x-request-id'), dataId)) {
    console.error('[mp-webhook] assinatura invalida', tipo)
    return NextResponse.json({ error: 'assinatura invalida' }, { status: 401 })
  }
  const admin = adminClient()

  let preapprovalId = ''
  let pagamento: any = null
  if (tipo === 'subscription_preapproval' || tipo === 'preapproval') preapprovalId = dataId
  else if (tipo === 'subscription_authorized_payment') {
    const pg = await mp('/authorized_payments/' + encodeURIComponent(dataId))
    preapprovalId = String(pg.data?.preapproval_id || '')
    pagamento = pg.data || null
  } else {
    return NextResponse.json({ ok: true })
  }
  if (!preapprovalId) return NextResponse.json({ ok: true })

  const r = await mp('/preapproval/' + encodeURIComponent(preapprovalId))
  if (!r.ok || !r.data) { console.error('[mp-webhook] nao li a assinatura', r.status); return NextResponse.json({ error: 'tente de novo' }, { status: 500 }) }
  const status = String(r.data.status || '')
  const ref = lerReferencia(r.data.external_reference)
  if (status === 'authorized' && ref) {
    await liberarPlanoMP(admin, ref.userId, ref.plano, preapprovalId)
  } else if (status === 'cancelled' || status === 'paused') {
    await encerrarPlanoMP(admin, preapprovalId)
  }
  // Card do admin: cobranca mensal aprovada/recusada e assinatura cancelada
  const pagEmail = String(r.data.payer_email || '')
  if (pagamento && ref) {
    const st = String(pagamento.status || pagamento.payment?.status || '')
    if (st === 'approved' || st === 'processed') await registrarEventoMP(admin, { user_id: ref.userId, email: pagEmail, plano: ref.plano, tipo: 'aprovado', motivo: 'Cobrança mensal aprovada', codigo: 'pag-' + dataId })
    else if (st === 'rejected' || st === 'recycling') await registrarEventoMP(admin, { user_id: ref.userId, email: pagEmail, plano: ref.plano, tipo: 'recusado', motivo: 'Cobrança mensal recusada pelo banco', codigo: 'pag-' + dataId })
  } else if ((status === 'cancelled' || status === 'paused') && ref) {
    await registrarEventoMP(admin, { user_id: ref.userId, email: pagEmail, plano: ref.plano, tipo: 'cancelado', motivo: status === 'paused' ? 'Assinatura pausada' : 'Assinatura cancelada', codigo: preapprovalId })
  }
  return NextResponse.json({ ok: true })
}
