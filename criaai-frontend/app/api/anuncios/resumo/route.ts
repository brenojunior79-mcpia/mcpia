import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

// Os 3 cards do Gerenciador (so admin): Faturamento, Gasto em anuncios e Lucro, comparados com o periodo anterior.
// Faturamento = vendas aprovadas de Mentoria e Estrutura Express (Hubla e Cakto) no livro de vendas, sem reembolsos.
// Lucro = valor liquido das vendas (ja sem taxas) menos o gasto em anuncios cobrado pelo Meta.
const GRAPH = 'https://graph.facebook.com/v26.0'
const DIA = 24 * 60 * 60 * 1000

const iso = (d: Date) => d.toISOString().slice(0, 10)
const somaDias = (d: Date, n: number) => new Date(d.getTime() + n * DIA)

// Hoje no horario de Brasilia (UTC-3, sem horario de verao)
function hojeBrasilia(): Date {
  const b = new Date(Date.now() - 3 * 60 * 60 * 1000)
  return new Date(Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate()))
}

function janela(preset: string): { ini: Date; fim: Date; rotulo: string } {
  const h = hojeBrasilia()
  if (preset === 'today') return { ini: h, fim: h, rotulo: 'vs ontem' }
  if (preset === 'yesterday') { const y = somaDias(h, -1); return { ini: y, fim: y, rotulo: 'vs anteontem' } }
  if (preset === 'this_month') return { ini: new Date(Date.UTC(h.getUTCFullYear(), h.getUTCMonth(), 1)), fim: h, rotulo: 'vs período anterior' }
  const n = preset === 'last_14d' ? 14 : preset === 'last_30d' ? 30 : 7
  return { ini: somaDias(h, -n), fim: somaDias(h, -1), rotulo: 'vs período anterior' }
}

function anterior(ini: Date, fim: Date) {
  const len = Math.round((fim.getTime() - ini.getTime()) / DIA) + 1
  return { ini: somaDias(ini, -len), fim: somaDias(ini, -1) }
}

async function gastoMeta(conta: string, token: string, ini: Date, fim: Date): Promise<number | null> {
  try {
    const tr = encodeURIComponent(JSON.stringify({ since: iso(ini), until: iso(fim) }))
    const r = await fetch(GRAPH + '/' + conta + '/insights?level=account&fields=spend&time_range=' + tr + '&access_token=' + token)
    const j: any = await r.json()
    if (j.error) { console.error('[anuncios-resumo] meta:', j.error.message); return null }
    return Number((j.data && j.data[0] && j.data[0].spend) || 0)
  } catch (e) { console.error('[anuncios-resumo] meta:', e); return null }
}

async function vendas(admin: any, ini: Date, fim: Date) {
  // Dia de Brasilia comeca as 03:00 UTC
  const de = new Date(ini.getTime() + 3 * 60 * 60 * 1000).toISOString()
  const ate = new Date(somaDias(fim, 1).getTime() + 3 * 60 * 60 * 1000).toISOString()
  let bruto = 0, liquido = 0, qtd = 0
  let desde = 0
  for (let i = 0; i < 20; i++) {
    const r = await admin.from('sales_ledger').select('amount, net, qty').gte('paid_at', de).lt('paid_at', ate).is('refunded_at', null).range(desde, desde + 999)
    if (r.error) { console.error('[anuncios-resumo] vendas:', r.error.message); break }
    const linhas = r.data || []
    linhas.forEach(function(l: any) { const q = Number(l.qty || 1); bruto += Number(l.amount || 0); liquido += Number(l.net || 0); qtd += q })
    if (linhas.length < 1000) break
    desde += 1000
  }
  return { bruto, liquido, qtd }
}

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  const p = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
  if (!(p.data as any)?.is_admin) return NextResponse.json({ error: 'Nao autorizado' }, { status: 403 })

  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  const preset = req.nextUrl.searchParams.get('datePreset') || 'last_7d'
  const atual = janela(preset)
  const ant = anterior(atual.ini, atual.fim)

  const con = (await admin.from('facebook_connections').select('access_token, ad_account_id').eq('user_id', user.id).maybeSingle()).data as any
  const temMeta = !!(con && con.access_token && con.ad_account_id)

  const [vAtual, vAnt, gAtual, gAnt] = await Promise.all([
    vendas(admin, atual.ini, atual.fim),
    vendas(admin, ant.ini, ant.fim),
    temMeta ? gastoMeta(con.ad_account_id, con.access_token, atual.ini, atual.fim) : Promise.resolve(null),
    temMeta ? gastoMeta(con.ad_account_id, con.access_token, ant.ini, ant.fim) : Promise.resolve(null),
  ])

  const lucro = gAtual === null ? null : vAtual.liquido - gAtual
  const lucroAnt = gAnt === null ? null : vAnt.liquido - gAnt
  return NextResponse.json({
    rotuloComparacao: atual.rotulo,
    faturamento: { valor: vAtual.bruto, anterior: vAnt.bruto, vendas: vAtual.qtd },
    gasto: { valor: gAtual, anterior: gAnt },
    lucro: { valor: lucro, anterior: lucroAnt },
  })
}
