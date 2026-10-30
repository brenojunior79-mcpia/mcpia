import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { janelaRanking } from '@/lib/rankingJanela'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Premios do mes (Pix, pagos pelo admin)
const PREMIOS = [200, 150, 100]

function nomeCurto(n: string | null) {
  const p = String(n || '').trim().split(/\s+/).filter(Boolean)
  if (!p.length) return 'Aluno'
  const cap = function(s: string) { return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() }
  return p.length > 1 ? cap(p[0]) + ' ' + p[p.length - 1].charAt(0).toUpperCase() + '.' : cap(p[0])
}

// Ranking do mes (horario de Brasilia, UTC-3). Mostra so top 3 e a posicao do proprio aluno.
async function montar() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Entre na sua conta.' }, { status: 401 })

  const db = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  const j = await janelaRanking(db)
  const inicio = j.inicio, fim = j.fim
  const diasRestantes = Math.max(0, Math.ceil((fim.getTime() - Date.now()) / 86400000))
  const r = await db.rpc('ranking_pontos', { p_inicio: inicio.toISOString(), p_fim: fim.toISOString() })
  if (r.error) { console.error('[ranking] rpc:', r.error); return NextResponse.json({ error: 'Nao foi possivel carregar o ranking.', detalhe: String(r.error.message || '').slice(0, 300) }, { status: 500 }) }

  const lista = ((r.data || []) as any[]).slice().sort(function(a, b) {
    return b.pontos - a.pontos || String(a.user_id).localeCompare(String(b.user_id))
  })
  const top = lista.slice(0, 3).map(function(x, i) {
    return { posicao: i + 1, nome: nomeCurto(x.nome), foto: x.avatar_url || null, pontos: x.pontos, premio: PREMIOS[i], voce: x.user_id === user.id }
  })
  const idx = lista.findIndex(function(x) { return x.user_id === user.id })
  let eu: any = idx >= 0 ? { posicao: idx + 1, pontos: lista[idx].pontos, nome: nomeCurto(lista[idx].nome), foto: lista[idx].avatar_url || null } : { posicao: null, pontos: 0, nome: 'Aluno', foto: null }
  if (idx < 0) {
    const pf = await db.from('profiles').select('full_name, avatar_url').eq('id', user.id).maybeSingle()
    eu = { ...eu, nome: nomeCurto((pf.data as any)?.full_name || null), foto: (pf.data as any)?.avatar_url || null }
  }
  const sub = await db.from('push_subscriptions').select('id', { count: 'exact', head: true }).eq('user_id', user.id)
  const notif = (sub.count || 0) > 0
  const faltam = idx > 0 && idx < 100 ? Math.max(1, lista[idx - 1].pontos - lista[idx].pontos + 1) : 0
  return NextResponse.json({ mes: j.titulo, fimEm: j.fimEm, ano: j.ano, diasRestantes, top, eu, faltam, notif, premios: PREMIOS })
}

export async function GET() {
  try {
    return await montar()
  } catch (e: any) {
    console.error('[ranking] erro:', e)
    return NextResponse.json({ error: 'Nao foi possivel carregar o ranking.', detalhe: String(e?.message || e).slice(0, 300) }, { status: 500 })
  }
}
