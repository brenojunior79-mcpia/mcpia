import { NextRequest, NextResponse } from 'next/server'
import { adminClient, requireAdmin } from '@/lib/whatsapp'
import { criarTesteSeq, erroParaLigar, validarSeq } from '@/lib/waSeq'
import { novoId } from '@/lib/waSeqTipos'

export const dynamic = 'force-dynamic'

// Lista os fluxos do construtor com os numeros de cada bloco (so admin)
export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'So administradores.' }, { status: 403 })
  const admin = adminClient()
  const [f, c] = await Promise.all([
    admin.from('wa_sequencias').select('id, name, enabled, connection_id, trigger, steps, cancel_on_purchase, created_at, updated_at').order('created_at', { ascending: true }).limit(100),
    admin.from('wa_connections').select('id, name, display_phone, active').order('created_at', { ascending: true }),
  ])
  if (f.error) return NextResponse.json({ error: 'Nao foi possivel carregar os fluxos.' }, { status: 500 })
  const lista: any[] = f.data || []
  const stats: Record<string, any> = {}
  await Promise.all(lista.map(async function(x) {
    const r = await admin.rpc('wa_seq_stats', { p_seq: x.id })
    stats[x.id] = r.data || { runs: [], sends: [] }
  }))
  return NextResponse.json({ fluxos: lista, stats, conexoes: c.data || [] })
}

// Cria, edita, liga/desliga, duplica, apaga ou testa um fluxo
export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'So administradores.' }, { status: 403 })
  let input: any
  try { input = await req.json() } catch (e) { return NextResponse.json({ error: 'Pedido invalido.' }, { status: 400 }) }
  const admin = adminClient()
  const action = String(input?.action || 'salvar')
  const id = typeof input?.id === 'string' && input.id ? input.id : null

  if (action === 'apagar') {
    if (!id) return NextResponse.json({ error: 'Pedido invalido.' }, { status: 400 })
    await admin.from('wa_sequencias').delete().eq('id', id)
    return NextResponse.json({ ok: true })
  }
  if (action === 'ligar') {
    if (!id) return NextResponse.json({ error: 'Pedido invalido.' }, { status: 400 })
    const on = input?.enabled === true
    if (on) {
      const cur = await admin.from('wa_sequencias').select('*').eq('id', id).maybeSingle()
      if (!cur.data) return NextResponse.json({ error: 'Fluxo nao encontrado.' }, { status: 404 })
      const erro = erroParaLigar(cur.data as any)
      if (erro) return NextResponse.json({ error: erro }, { status: 400 })
    }
    const u = await admin.from('wa_sequencias').update({ enabled: on, updated_at: new Date().toISOString() }).eq('id', id)
    if (u.error) return NextResponse.json({ error: 'Nao foi possivel salvar.' }, { status: 500 })
    return NextResponse.json({ ok: true })
  }
  if (action === 'duplicar') {
    if (!id) return NextResponse.json({ error: 'Pedido invalido.' }, { status: 400 })
    const cur = await admin.from('wa_sequencias').select('*').eq('id', id).maybeSingle()
    if (!cur.data) return NextResponse.json({ error: 'Fluxo nao encontrado.' }, { status: 404 })
    const c: any = cur.data
    const steps = (Array.isArray(c.steps) ? c.steps : []).map(function(s: any) { return { ...s, id: novoId() } })
    const ins = await admin.from('wa_sequencias').insert({ name: String(c.name).slice(0, 70) + ' (cópia)', enabled: false, connection_id: c.connection_id, trigger: c.trigger, steps, cancel_on_purchase: c.cancel_on_purchase }).select('id').single()
    if (ins.error || !ins.data) return NextResponse.json({ error: 'Nao foi possivel duplicar.' }, { status: 500 })
    return NextResponse.json({ ok: true, id: ins.data.id })
  }
  if (action === 'teste') {
    if (!id) return NextResponse.json({ error: 'Salve o fluxo antes de testar.' }, { status: 400 })
    const cur = await admin.from('wa_sequencias').select('*').eq('id', id).maybeSingle()
    if (!cur.data) return NextResponse.json({ error: 'Fluxo nao encontrado.' }, { status: 404 })
    const erro = erroParaLigar(cur.data as any)
    if (erro) return NextResponse.json({ error: erro }, { status: 400 })
    const r = await criarTesteSeq(admin, cur.data, String(input?.numero || ''), String(input?.nome || ''), input?.pularAtrasos !== false)
    if (!r.ok) return NextResponse.json({ error: r.erro }, { status: 400 })
    return NextResponse.json({ ok: true })
  }

  const v = validarSeq(input)
  if (!v.ok) return NextResponse.json({ error: v.erro }, { status: 400 })
  if (id) {
    const u = await admin.from('wa_sequencias').update({ ...v.seq, updated_at: new Date().toISOString() }).eq('id', id)
    if (u.error) return NextResponse.json({ error: 'Nao foi possivel salvar.' }, { status: 500 })
    return NextResponse.json({ ok: true, id })
  }
  const n = await admin.from('wa_sequencias').select('id', { count: 'exact', head: true })
  if ((n.count || 0) >= 50) return NextResponse.json({ error: 'Limite de 50 fluxos. Apague algum para criar outro.' }, { status: 400 })
  const ins = await admin.from('wa_sequencias').insert(v.seq).select('id').single()
  if (ins.error || !ins.data) return NextResponse.json({ error: 'Nao foi possivel salvar.' }, { status: 500 })
  return NextResponse.json({ ok: true, id: ins.data.id })
}
