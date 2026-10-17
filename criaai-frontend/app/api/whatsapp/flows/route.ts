import { NextRequest, NextResponse } from 'next/server'
import { adminClient, requireAdmin } from '@/lib/whatsapp'
import { validarFluxo } from '@/lib/waFlows'

export const dynamic = 'force-dynamic'

// Lista os fluxos (so admin)
export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'So administradores.' }, { status: 403 })
  const r = await adminClient().from('wa_flows').select('id, name, enabled, trigger, keywords, match, when_hours, message, cooldown_hours, created_at').order('created_at', { ascending: true }).limit(100)
  if (r.error) return NextResponse.json({ error: 'Nao foi possivel carregar os fluxos.' }, { status: 500 })
  return NextResponse.json({ fluxos: r.data || [] })
}

// Cria, edita, liga/desliga ou apaga um fluxo
export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'So administradores.' }, { status: 403 })
  let input: any
  try { input = await req.json() } catch (e) { return NextResponse.json({ error: 'Pedido invalido.' }, { status: 400 }) }
  const admin = adminClient()
  const action = String(input?.action || 'salvar')
  const id = typeof input?.id === 'string' && input.id ? input.id : null

  if (action === 'apagar') {
    if (!id) return NextResponse.json({ error: 'Pedido invalido.' }, { status: 400 })
    await admin.from('wa_flows').delete().eq('id', id)
    return NextResponse.json({ ok: true })
  }
  if (action === 'ligar') {
    if (!id) return NextResponse.json({ error: 'Pedido invalido.' }, { status: 400 })
    const u = await admin.from('wa_flows').update({ enabled: input?.enabled === true, updated_at: new Date().toISOString() }).eq('id', id)
    if (u.error) return NextResponse.json({ error: 'Nao foi possivel salvar.' }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  const v = validarFluxo(input)
  if (!v.ok) return NextResponse.json({ error: v.erro }, { status: 400 })
  if (id) {
    const u = await admin.from('wa_flows').update({ ...v.fluxo, updated_at: new Date().toISOString() }).eq('id', id)
    if (u.error) return NextResponse.json({ error: 'Nao foi possivel salvar.' }, { status: 500 })
    return NextResponse.json({ ok: true, id })
  }
  const n = await admin.from('wa_flows').select('id', { count: 'exact', head: true })
  if ((n.count || 0) >= 30) return NextResponse.json({ error: 'Limite de 30 fluxos. Apague algum para criar outro.' }, { status: 400 })
  const ins = await admin.from('wa_flows').insert(v.fluxo).select('id').single()
  if (ins.error || !ins.data) return NextResponse.json({ error: 'Nao foi possivel salvar.' }, { status: 500 })
  return NextResponse.json({ ok: true, id: ins.data.id })
}
