import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function checarAdmin() {
  const { data: { user } } = await createClient().auth.getUser()
  if (!user) return null
  const db: any = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  const me = await db.from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
  return me.data?.is_admin ? db : null
}

function janelaMes() {
  const agora = new Date(Date.now() - 3 * 3600 * 1000)
  const ano = agora.getUTCFullYear(), mes = agora.getUTCMonth()
  return { inicio: new Date(Date.UTC(ano, mes, 1, 3)), fim: new Date(Date.UTC(ano, mes + 1, 1, 3)), mes, ano }
}

// Conferencia do ranking (so admin): top 20 do mes com os pontos de cada tipo
export async function GET() {
  const db = await checarAdmin()
  if (!db) return NextResponse.json({ error: 'Somente o admin' }, { status: 403 })
  const j = janelaMes()
  const r = await db.rpc('ranking_detalhe', { p_inicio: j.inicio.toISOString(), p_fim: j.fim.toISOString() })
  if (r.error) return NextResponse.json({ error: r.error.message }, { status: 500 })
  const lista = (r.data || []).slice().sort(function(a: any, b: any) { return b.pontos - a.pontos || String(a.user_id).localeCompare(String(b.user_id)) })
  // Posicao oficial = so entre quem nao foi excluido
  let pos = 0
  const linhas = lista.slice(0, 40).map(function(x: any) { return { ...x, posicao: x.excluido ? null : ++pos } })
  return NextResponse.json({ mes: j.mes, ano: j.ano, total: lista.length, linhas })
}

// Tira (ou devolve) um aluno da disputa do ranking
export async function POST(req: NextRequest) {
  const db = await checarAdmin()
  if (!db) return NextResponse.json({ error: 'Somente o admin' }, { status: 403 })
  let b: any = {}
  try { b = await req.json() } catch (e) {}
  const userId = String(b.userId || '')
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return NextResponse.json({ error: 'Aluno invalido' }, { status: 400 })
  if (b.acao === 'excluir') {
    const r = await db.from('ranking_excluidos').upsert({ user_id: userId, motivo: String(b.motivo || '').slice(0, 200) || null })
    if (r.error) return NextResponse.json({ error: r.error.message }, { status: 500 })
  } else if (b.acao === 'voltar') {
    const r = await db.from('ranking_excluidos').delete().eq('user_id', userId)
    if (r.error) return NextResponse.json({ error: r.error.message }, { status: 500 })
  } else return NextResponse.json({ error: 'Acao invalida' }, { status: 400 })
  return NextResponse.json({ ok: true })
}
