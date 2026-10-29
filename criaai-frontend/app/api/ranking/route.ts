import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createClient as createAdmin } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Premios do mes (Pix, pagos pelo admin)
const PREMIOS = [200, 150, 100]
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

function nomeCurto(n: string | null) {
  const p = String(n || '').trim().split(/\s+/).filter(Boolean)
  if (!p.length) return 'Aluno'
  const cap = function(s: string) { return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() }
  return p.length > 1 ? cap(p[0]) + ' ' + p[p.length - 1].charAt(0).toUpperCase() + '.' : cap(p[0])
}

// Ranking do mes (horario de Brasilia, UTC-3). Mostra so top 3 e a posicao do proprio aluno.
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Entre na sua conta.' }, { status: 401 })

  const agora = new Date(Date.now() - 3 * 3600 * 1000) // "agora" em Brasilia (lido com getUTC*)
  const ano = agora.getUTCFullYear()
  const mes = agora.getUTCMonth()
  const inicio = new Date(Date.UTC(ano, mes, 1, 3, 0, 0))
  const fim = new Date(Date.UTC(ano, mes + 1, 1, 3, 0, 0))
  const diasRestantes = Math.max(0, Math.ceil((fim.getTime() - Date.now()) / 86400000))

  const db = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  const r = await db.rpc('ranking_pontos', { p_inicio: inicio.toISOString(), p_fim: fim.toISOString() })
  if (r.error) return NextResponse.json({ error: 'Nao foi possivel carregar o ranking.' }, { status: 500 })

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
  const faltam = idx > 0 && idx < 100 ? Math.max(1, lista[idx - 1].pontos - lista[idx].pontos + 1) : 0
  return NextResponse.json({ mes: MESES[mes], ano, diasRestantes, top, eu, faltam, premios: PREMIOS })
}
