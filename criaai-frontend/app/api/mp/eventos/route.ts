import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { adminClient } from '@/lib/whatsapp'

export const dynamic = 'force-dynamic'

// Avisos da Hubla que entram no card (o resto, como aula concluida, fica de fora)
const TIPO_HUBLA: Record<string, { tipo: string; motivo: string }> = {
  'invoice.payment_succeeded': { tipo: 'aprovado', motivo: 'Pagamento aprovado' },
  'invoice.created': { tipo: 'pendente', motivo: 'Fatura em aberto (ainda não pagou)' },
  'invoice.expired': { tipo: 'vencido', motivo: 'Fatura venceu sem pagamento' },
  'invoice.payment_failed': { tipo: 'recusado', motivo: 'Pagamento recusado' },
  'invoice.refunded': { tipo: 'reembolsado', motivo: 'Pagamento reembolsado' },
  'subscription.deactivated': { tipo: 'cancelado', motivo: 'Assinatura desativada' },
}

// Ultimas tentativas de pagamento: cartao na plataforma (Mercado Pago) + vendas da Hubla (so admin)
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Entre na sua conta.' }, { status: 401 })
  const admin = adminClient()
  const p = await admin.from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
  if (!(p.data as any)?.is_admin) return NextResponse.json({ error: 'Só o admin.' }, { status: 403 })

  const desde = new Date(Date.now() - 30 * 86400000).toISOString()
  const [mpR, hbR] = await Promise.all([
    admin.from('mp_eventos').select('id, created_at, user_id, email, nome, plano, tipo, motivo').order('created_at', { ascending: false }).limit(100),
    admin.from('hubla_events').select('id, created_at, event_type, email, plano, note').eq('provider', 'hubla').in('event_type', Object.keys(TIPO_HUBLA)).gte('created_at', desde).order('created_at', { ascending: false }).limit(400),
  ])

  const lista: any[] = ((mpR.data || []) as any[]).map(function(e) { return { ...e, id: 'mp-' + e.id, origem: 'Cartão (plataforma)' } })

  // Hubla: o mesmo aluno e o mesmo tipo em ate 30 minutos contam uma vez; fatura em aberto que foi paga depois some
  const hb: any[] = []
  for (const ev of (hbR.data || []) as any[]) {
    const t = TIPO_HUBLA[ev.event_type]
    // So eventos de PLANO (Starter, Pro, Premium). Avisos antigos nao tinham o plano: vale o que esta escrito na nota.
    const mNota = String(ev.note || '').match(/\b(Starter|Pro|Premium)\b/)
    const plano = ev.plano || (mNota ? mNota[1] : '')
    if (!plano) continue
    const email = String(ev.email || '').toLowerCase()
    const ms = new Date(ev.created_at).getTime()
    if (hb.some(function(x) { return x.tipo === t.tipo && x.email === email && Math.abs(x.ms - ms) < 30 * 60000 })) continue
    hb.push({ id: 'hb-' + ev.id, created_at: ev.created_at, ms, email, plano, tipo: t.tipo, motivo: t.motivo, origem: 'Hubla' })
  }
  const hbLimpa = hb.filter(function(x) {
    if (x.tipo !== 'pendente' || !x.email) return true
    return !hb.some(function(y) { return y.tipo === 'aprovado' && y.email === x.email && y.ms >= x.ms && y.ms - x.ms < 24 * 3600000 })
  })

  // Nome, produto e WhatsApp pelo e-mail (cadastro da plataforma e compras da Hubla)
  const emails = Array.from(new Set(lista.concat(hbLimpa).map(function(e) { return String(e.email || '').toLowerCase() }).filter(Boolean)))
  const ids = Array.from(new Set(lista.map(function(e) { return e.user_id }).filter(Boolean)))
  const porId: Record<string, any> = {}, porEmail: Record<string, any> = {}, compra: Record<string, any> = {}
  if (ids.length) { const q = await admin.from('profiles').select('id, full_name, whatsapp').in('id', ids); for (const x of (q.data || []) as any[]) porId[x.id] = x }
  if (emails.length) {
    const [q1, q2] = await Promise.all([
      admin.from('profiles').select('email, full_name, whatsapp').in('email', emails),
      admin.from('hubla_compras').select('email, wa, produto, nome_norm, paid_at').in('email', emails).order('paid_at', { ascending: false }),
    ])
    for (const x of (q1.data || []) as any[]) porEmail[String(x.email).toLowerCase()] = x
    for (const x of (q2.data || []) as any[]) { const k = String(x.email || '').toLowerCase(); if (!compra[k]) compra[k] = x }
  }

  const todos = lista.concat(hbLimpa).map(function(e) {
    const k = String(e.email || '').toLowerCase()
    const pf = porId[e.user_id] || porEmail[k] || {}
    const cp = compra[k] || {}
    const nomeCompra = cp.nome_norm ? String(cp.nome_norm).replace(/\b\w/g, function(c: string) { return c.toUpperCase() }) : ''
    return {
      id: e.id, created_at: e.created_at, email: e.email || '', tipo: e.tipo, motivo: e.motivo, origem: e.origem,
      nome: e.nome || pf.full_name || nomeCompra || '',
      plano: e.plano || '', produto: e.plano ? '' : (cp.produto || ''),
      whatsapp: pf.whatsapp || cp.wa || '',
    }
  }).sort(function(a, b) { return new Date(b.created_at).getTime() - new Date(a.created_at).getTime() }).slice(0, 150)

  return NextResponse.json({ eventos: todos })
}
