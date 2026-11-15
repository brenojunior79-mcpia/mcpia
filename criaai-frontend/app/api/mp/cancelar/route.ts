import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { adminClient } from '@/lib/whatsapp'
import { mp, mpConfigurado } from '@/lib/mercadopago'

export const dynamic = 'force-dynamic'

// GET: diz se o aluno tem assinatura no Mercado Pago (para mostrar o botao de cancelar)
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ temAssinatura: false })
  const p = await adminClient().from('profiles').select('mp_preapproval_id, payment_provider, subscription_status, plans(name)').eq('id', user.id).maybeSingle()
  const d: any = p.data || {}
  return NextResponse.json({ temAssinatura: !!d.mp_preapproval_id && d.payment_provider === 'mercadopago' && d.subscription_status === 'active', plano: d.plans?.name || null })
}

// POST: cancela a assinatura do cartao. O plano continua ate o aviso do Mercado Pago confirmar o cancelamento.
export async function POST() {
  if (!mpConfigurado()) return NextResponse.json({ error: 'Pagamento pelo cartão não configurado.' }, { status: 503 })
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Entre na sua conta.' }, { status: 401 })
  const admin = adminClient()
  const p = await admin.from('profiles').select('mp_preapproval_id').eq('id', user.id).maybeSingle()
  const id = String(p.data?.mp_preapproval_id || '')
  if (!id) return NextResponse.json({ error: 'Você não tem assinatura no cartão.' }, { status: 400 })
  const r = await mp('/preapproval/' + encodeURIComponent(id), { method: 'PUT', json: { status: 'cancelled' } })
  if (!r.ok) return NextResponse.json({ error: 'Não foi possível cancelar agora. Tente de novo em alguns minutos.' }, { status: 502 })
  await admin.from('profiles').update({ subscription_status: 'canceled', updated_at: new Date().toISOString() }).eq('id', user.id).eq('mp_preapproval_id', id)
  return NextResponse.json({ ok: true })
}
