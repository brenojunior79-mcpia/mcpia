import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function db() {
  return createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
}

async function souAdmin(): Promise<boolean> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const p = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
  return !!(p.data as any)?.is_admin
}

// Aluno sem acesso: registra que viu a tela de venda ('visita') ou clicou no botao de compra ('clique')
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  let body: any = {}
  try { body = await req.json() } catch (e) {}
  const tipo = body?.tipo === 'clique' ? 'clique' : body?.tipo === 'visita' ? 'visita' : ''
  if (!tipo) return NextResponse.json({ error: 'Tipo invalido' }, { status: 400 })

  const admin = db()
  // A visita so conta uma vez a cada 12 horas por pessoa (evita encher a lista ao atualizar a pagina)
  if (tipo === 'visita') {
    const desde = new Date(Date.now() - 12 * 3600 * 1000).toISOString()
    const ja = await admin.from('estrutura_cliques').select('id').eq('user_id', user.id).eq('tipo', 'visita').gte('created_at', desde).limit(1)
    if (ja.data && ja.data.length) return NextResponse.json({ ok: true, repetido: true })
  }
  const p = await admin.from('profiles').select('full_name, email, whatsapp').eq('id', user.id).maybeSingle()
  const r = await admin.from('estrutura_cliques').insert({
    user_id: user.id,
    email: (p.data as any)?.email || user.email || null,
    nome: (p.data as any)?.full_name || null,
    whatsapp: (p.data as any)?.whatsapp || null,
    tipo,
  })
  if (r.error) return NextResponse.json({ error: r.error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// Admin: resumo + lista de quem clicou / quem viu a tela de venda
export async function GET() {
  if (!(await souAdmin())) return NextResponse.json({ error: 'Somente o admin pode ver isso.' }, { status: 403 })
  const admin = db()
  const r = await admin.from('estrutura_cliques').select('user_id, email, nome, whatsapp, tipo, created_at').order('created_at', { ascending: false }).limit(5000)
  if (r.error) return NextResponse.json({ error: r.error.message }, { status: 500 })
  const linhas = r.data || []

  const agora = Date.now()
  const hoje = new Date(); hoje.setHours(hoje.getHours() - 3) // dia em horario de Brasilia
  const diaBR = hoje.toISOString().slice(0, 10)
  const diaDe = function(iso: string) { return new Date(new Date(iso).getTime() - 3 * 3600 * 1000).toISOString().slice(0, 10) }

  const pessoas: Record<string, any> = {}
  linhas.forEach(function(l: any) {
    const k = l.user_id || l.email || 'x'
    if (!pessoas[k]) pessoas[k] = { email: l.email, nome: l.nome, whatsapp: l.whatsapp, cliques: 0, visitas: 0, ultimoClique: null as string | null, ultimaVisita: null as string | null }
    const o = pessoas[k]
    if (l.tipo === 'clique') { o.cliques++; if (!o.ultimoClique) o.ultimoClique = l.created_at }
    else { o.visitas++; if (!o.ultimaVisita) o.ultimaVisita = l.created_at }
  })
  const lista = Object.keys(pessoas).map(function(k) { return pessoas[k] })
  const cliquesLinhas = linhas.filter(function(l: any) { return l.tipo === 'clique' })
  const resumo = {
    pessoasClicaram: lista.filter(function(p) { return p.cliques > 0 }).length,
    totalCliques: cliquesLinhas.length,
    cliquesHoje: cliquesLinhas.filter(function(l: any) { return diaDe(l.created_at) === diaBR }).length,
    cliques7: cliquesLinhas.filter(function(l: any) { return agora - new Date(l.created_at).getTime() < 7 * 86400000 }).length,
    pessoasViram: lista.filter(function(p) { return p.visitas > 0 }).length,
  }
  lista.sort(function(a, b) {
    const ta = new Date(a.ultimoClique || a.ultimaVisita || 0).getTime()
    const tb = new Date(b.ultimoClique || b.ultimaVisita || 0).getTime()
    return (b.cliques > 0 ? 1 : 0) - (a.cliques > 0 ? 1 : 0) || tb - ta
  })
  return NextResponse.json({ resumo, pessoas: lista.slice(0, 100) })
}
