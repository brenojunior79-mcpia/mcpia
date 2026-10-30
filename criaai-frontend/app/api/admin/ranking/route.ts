import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase-server'
import { janelaRanking } from '@/lib/rankingJanela'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function checarAdmin() {
  const { data: { user } } = await createClient().auth.getUser()
  if (!user) return null
  const db: any = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  const me = await db.from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
  return me.data?.is_admin ? db : null
}

// Conferencia do ranking (so admin). periodo=recente: de ontem ate agora; periodo=ciclo: ranking inteiro
export async function GET(req: NextRequest) {
  const db = await checarAdmin()
  if (!db) return NextResponse.json({ error: 'Somente o admin' }, { status: 403 })
  const j = await janelaRanking(db)
  const recente = req.nextUrl.searchParams.get('periodo') !== 'ciclo'
  // "Ontem" = meia-noite de ontem em Brasilia (a funcao do banco nunca conta antes do inicio do ranking)
  const br = new Date(Date.now() - 3 * 3600 * 1000)
  const ontem = new Date(Date.UTC(br.getUTCFullYear(), br.getUTCMonth(), br.getUTCDate() - 1, 3))
  const ini = recente && ontem > j.inicio ? ontem : j.inicio
  const r = await db.rpc('ranking_atividade', { p_inicio: ini.toISOString(), p_fim: j.fim.toISOString() })
  if (r.error) return NextResponse.json({ error: r.error.message }, { status: 500 })
  const lista = (r.data || []).slice().sort(function(a: any, b: any) { return b.pontos - a.pontos || String(a.user_id).localeCompare(String(b.user_id)) })
  // Posicao oficial = so entre quem nao foi excluido
  let pos = 0
  const linhas = lista.slice(0, 300).map(function(x: any) { return { ...x, posicao: x.excluido ? null : ++pos } })
  const desde = new Date(Math.max(ini.getTime(), j.inicio.getTime()))
  return NextResponse.json({ mes: j.titulo, fimEm: j.fimEm, ano: j.ano, periodo: recente ? 'recente' : 'ciclo', desde: desde.toISOString(), total: lista.length, linhas })
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
