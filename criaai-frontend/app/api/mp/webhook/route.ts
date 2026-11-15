import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/whatsapp'
import { mp, avisoValido, lerReferencia, liberarPlanoMP, encerrarPlanoMP } from '@/lib/mercadopago'

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
  if (tipo === 'subscription_preapproval' || tipo === 'preapproval') preapprovalId = dataId
  else if (tipo === 'subscription_authorized_payment') {
    const pg = await mp('/authorized_payments/' + encodeURIComponent(dataId))
    preapprovalId = String(pg.data?.preapproval_id || '')
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
  return NextResponse.json({ ok: true })
}
