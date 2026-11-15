import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { adminClient } from '@/lib/whatsapp'
import { PLANOS_MP, mp, mpConfigurado, erroCartao, liberarPlanoMP } from '@/lib/mercadopago'

export const dynamic = 'force-dynamic'

// Cria a assinatura mensal no cartao (o cartao vem como token do checkout do Mercado Pago, nunca o numero)
export async function POST(req: NextRequest) {
  if (!mpConfigurado()) return NextResponse.json({ error: 'O pagamento pelo cartão ainda não foi configurado.' }, { status: 503 })
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Entre na sua conta para assinar.' }, { status: 401 })
  let input: any
  try { input = await req.json() } catch (e) { return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 }) }
  const plano = String(input?.plano || '')
  const valor = PLANOS_MP[plano]
  const token = String(input?.token || '')
  const email = String(input?.email || user.email || '').trim().toLowerCase()
  if (!valor) return NextResponse.json({ error: 'Plano inválido.' }, { status: 400 })
  if (!token) return NextResponse.json({ error: 'Faltam os dados do cartão.' }, { status: 400 })

  const admin = adminClient()
  // Ja tem assinatura ativa no Mercado Pago: cancela a antiga depois que a nova for autorizada (troca de plano)
  const cur = await admin.from('profiles').select('mp_preapproval_id').eq('id', user.id).maybeSingle()
  const antiga = String(cur.data?.mp_preapproval_id || '')

  const r = await mp('/preapproval', {
    method: 'POST',
    chave: user.id + '-' + plano + '-' + token.slice(0, 16),
    json: {
      reason: 'Plano ' + plano + ' - Plataforma Cristão Próspero',
      external_reference: user.id + '|' + plano,
      payer_email: email,
      card_token_id: token,
      back_url: 'https://www.mcpia.site/dashboard/planos',
      status: 'authorized',
      auto_recurring: { frequency: 1, frequency_type: 'months', transaction_amount: valor, currency_id: 'BRL' },
    },
  })
  if (!r.ok || !r.data?.id) {
    console.error('[mp-assinar] recusado:', r.status, JSON.stringify({ message: r.data?.message, cause: r.data?.cause }))
    return NextResponse.json({ error: erroCartao(r.data) }, { status: 400 })
  }
  const id = String(r.data.id)
  const status = String(r.data.status || '')
  if (status !== 'authorized') {
    // Pendente: o aviso do Mercado Pago libera o plano quando for autorizado
    await admin.from('profiles').update({ mp_preapproval_id: id, updated_at: new Date().toISOString() }).eq('id', user.id)
    return NextResponse.json({ ok: true, status, mensagem: 'Recebemos o seu pedido. Assim que o cartão for aprovado, o plano é liberado.' })
  }
  const ok = await liberarPlanoMP(admin, user.id, plano, id)
  if (antiga && antiga !== id) {
    const c = await mp('/preapproval/' + encodeURIComponent(antiga), { method: 'PUT', json: { status: 'cancelled' } })
    if (!c.ok) console.error('[mp-assinar] nao cancelou a assinatura antiga', antiga, c.status)
  }
  return NextResponse.json({ ok, status, mensagem: ok ? 'Assinatura feita! O plano ' + plano + ' já está liberado.' : 'Pagamento aprovado. Seu plano será liberado em instantes.' })
}
