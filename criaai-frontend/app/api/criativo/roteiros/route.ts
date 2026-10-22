import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { usuarioCriativo } from '@/lib/criativoAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Historico de roteiros de cada pessoa (so ela ve os dela: regras de seguranca no banco).
const txt = (v: any, n: number) => String(v || '').slice(0, n)

export async function GET() {
  const u = await usuarioCriativo()
  if (!u) return NextResponse.json({ error: 'Este recurso esta em atualizacao no momento.' }, { status: 403 })
  const supabase = createClient()
  const r = await supabase.from('criativo_roteiros').select('id, produto, o_que_faz, publico, dor, gancho, corpo, mecanismo, cta, created_at, updated_at').order('created_at', { ascending: false }).limit(100)
  if (r.error) { console.error('[criativo/roteiros] lista:', r.error.message); return NextResponse.json({ error: 'Nao foi possivel carregar seus roteiros.' }, { status: 500 }) }
  return NextResponse.json({ roteiros: r.data || [] })
}

export async function PUT(req: NextRequest) {
  const u = await usuarioCriativo()
  if (!u) return NextResponse.json({ error: 'Este recurso esta em atualizacao no momento.' }, { status: 403 })
  let b: any = {}
  try { b = await req.json() } catch (e) {}
  const id = String(b.id || '')
  if (!id) return NextResponse.json({ error: 'Roteiro invalido.' }, { status: 400 })
  const supabase = createClient()
  const r = await supabase.from('criativo_roteiros').update({
    gancho: txt(b.gancho, 4000), corpo: txt(b.corpo, 6000), mecanismo: txt(b.mecanismo, 4000), cta: txt(b.cta, 2000), updated_at: new Date().toISOString(),
  }).eq('id', id).eq('user_id', u.id)
  if (r.error) { console.error('[criativo/roteiros] salvar:', r.error.message); return NextResponse.json({ error: 'Nao foi possivel salvar.' }, { status: 500 }) }
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const u = await usuarioCriativo()
  if (!u) return NextResponse.json({ error: 'Este recurso esta em atualizacao no momento.' }, { status: 403 })
  const id = String(req.nextUrl.searchParams.get('id') || '')
  if (!id) return NextResponse.json({ error: 'Roteiro invalido.' }, { status: 400 })
  const supabase = createClient()
  const r = await supabase.from('criativo_roteiros').delete().eq('id', id).eq('user_id', u.id)
  if (r.error) { console.error('[criativo/roteiros] excluir:', r.error.message); return NextResponse.json({ error: 'Nao foi possivel excluir.' }, { status: 500 }) }
  return NextResponse.json({ ok: true })
}
