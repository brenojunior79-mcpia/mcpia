import { NextRequest, NextResponse } from 'next/server'
import { adminClient, requireAdmin } from '@/lib/whatsapp'
import { criarTeste, validarAuto } from '@/lib/waAuto'

export const dynamic = 'force-dynamic'

// Lista os fluxos por evento da Hubla, com numeros de cada um (so admin)
export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'So administradores.' }, { status: 403 })
  const admin = adminClient()
  const [f, s, c, a] = await Promise.all([
    admin.from('wa_auto_flows').select('id, name, connection_id, trigger_event, trigger_filter, steps, cancel_on_purchase, enabled, created_at').order('created_at', { ascending: true }).limit(100),
    admin.rpc('wa_auto_stats'),
    admin.from('wa_connections').select('id, name, display_phone, active').order('created_at', { ascending: true }),
    admin.from('wa_auto_runs').select('id, flow_id, name, wa_id, event_type, status, error, step_index, sent_count, is_test, created_at').order('created_at', { ascending: false }).limit(30),
  ])
  if (f.error) return NextResponse.json({ error: 'Nao foi possivel carregar os fluxos.' }, { status: 500 })
  const stats: Record<string, any> = {}
  for (const x of ((s.data as any[]) || [])) stats[x.flow_id] = x
  return NextResponse.json({ fluxos: f.data || [], stats, conexoes: c.data || [], recentes: a.data || [] })
}

// Cria, edita, liga/desliga, apaga ou testa um fluxo
export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'So administradores.' }, { status: 403 })
  let input: any
  try { input = await req.json() } catch (e) { return NextResponse.json({ error: 'Pedido invalido.' }, { status: 400 }) }
  const admin = adminClient()
  const action = String(input?.action || 'salvar')
  const id = typeof input?.id === 'string' && input.id ? input.id : null

  if (action === 'apagar') {
    if (!id) return NextResponse.json({ error: 'Pedido invalido.' }, { status: 400 })
    await admin.from('wa_auto_flows').delete().eq('id', id)
    return NextResponse.json({ ok: true })
  }
  if (action === 'ligar') {
    if (!id) return NextResponse.json({ error: 'Pedido invalido.' }, { status: 400 })
    const on = input?.enabled === true
    if (on) {
      const cur = await admin.from('wa_auto_flows').select('connection_id, steps').eq('id', id).maybeSingle()
      if (!cur.data?.connection_id) return NextResponse.json({ error: 'Escolha o número de WhatsApp do fluxo antes de ligar.' }, { status: 400 })
    }
    const u = await admin.from('wa_auto_flows').update({ enabled: on, updated_at: new Date().toISOString() }).eq('id', id)
    if (u.error) return NextResponse.json({ error: 'Nao foi possivel salvar.' }, { status: 500 })
    // Desligou: quem estava esperando e cancelado pelo motor quando chegar a hora
    return NextResponse.json({ ok: true })
  }
  if (action === 'teste') {
    if (!id) return NextResponse.json({ error: 'Salve o fluxo antes de testar.' }, { status: 400 })
    const cur = await admin.from('wa_auto_flows').select('*').eq('id', id).maybeSingle()
    if (!cur.data) return NextResponse.json({ error: 'Fluxo nao encontrado.' }, { status: 404 })
    if (!cur.data.connection_id) return NextResponse.json({ error: 'Escolha o número de WhatsApp do fluxo.' }, { status: 400 })
    const r = await criarTeste(admin, cur.data, String(input?.numero || ''), String(input?.nome || ''), input?.pularEsperas !== false)
    if (!r.ok) return NextResponse.json({ error: r.erro }, { status: 400 })
    return NextResponse.json({ ok: true })
  }

  const v = validarAuto(input)
  if (!v.ok) return NextResponse.json({ error: v.erro }, { status: 400 })
  if (v.fluxo.enabled && !v.fluxo.connection_id) return NextResponse.json({ error: 'Escolha o número de WhatsApp do fluxo antes de ligar.' }, { status: 400 })
  if (id) {
    const u = await admin.from('wa_auto_flows').update({ ...v.fluxo, updated_at: new Date().toISOString() }).eq('id', id)
    if (u.error) return NextResponse.json({ error: 'Nao foi possivel salvar.' }, { status: 500 })
    return NextResponse.json({ ok: true, id })
  }
  const n = await admin.from('wa_auto_flows').select('id', { count: 'exact', head: true })
  if ((n.count || 0) >= 50) return NextResponse.json({ error: 'Limite de 50 fluxos. Apague algum para criar outro.' }, { status: 400 })
  const ins = await admin.from('wa_auto_flows').insert(v.fluxo).select('id').single()
  if (ins.error || !ins.data) return NextResponse.json({ error: 'Nao foi possivel salvar.' }, { status: 500 })
  return NextResponse.json({ ok: true, id: ins.data.id })
}
