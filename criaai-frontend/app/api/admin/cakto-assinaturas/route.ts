import { NextResponse } from 'next/server'
import { adminClient, requireAdmin } from '@/lib/whatsapp'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Confere as assinaturas da Cakto (API publica, so leitura) com o que o painel mostra no card "Pagando agora".
// Somente o admin. A chave (CAKTO_CLIENT_ID / CAKTO_CLIENT_SECRET) fica so no servidor e nunca vai para a tela.
const BASE = 'https://api.cakto.com.br'

function norm(s: any): string {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9@.\s]/g, ' ').replace(/\s+/g, ' ').trim()
}
function emailDe(s: any): string {
  const m = String(s || '').match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)
  return m ? m[0].toLowerCase() : ''
}
function nomeTexto(v: any): string {
  if (v == null) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'object') return String(v.name || v.nome || v.title || v.email || v.id || '')
  return String(v)
}
function valor(v: any): number {
  const n = Number(String(v == null ? '' : v).replace(',', '.'))
  return isFinite(n) ? n : 0
}

export async function GET() {
  const adminId = await requireAdmin()
  if (!adminId) return NextResponse.json({ error: 'Somente o admin.' }, { status: 403 })

  const id = (process.env.CAKTO_CLIENT_ID || '').trim()
  const secret = (process.env.CAKTO_CLIENT_SECRET || '').trim()
  if (!id || !secret) return NextResponse.json({ ok: false, etapa: 'chave', erro: 'CAKTO_CLIENT_ID / CAKTO_CLIENT_SECRET nao estao configurados na Vercel.' })

  // 1) token
  let token = ''
  let escopos = ''
  try {
    const r = await fetch(BASE + '/public_api/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: id, client_secret: secret }).toString(),
      signal: AbortSignal.timeout(15000),
    })
    const j: any = await r.json().catch(function() { return null })
    if (!r.ok || !j?.access_token) {
      return NextResponse.json({ ok: false, etapa: 'token', http: r.status, erro: String(j?.error_description || j?.error || j?.detail || 'Nao foi possivel entrar na Cakto com essa chave.').slice(0, 200) })
    }
    token = String(j.access_token)
    escopos = String(j.scope || '')
  } catch (e: any) {
    return NextResponse.json({ ok: false, etapa: 'token', erro: 'Falha de rede ao falar com a Cakto: ' + String(e?.message || e).slice(0, 120) })
  }

  // 2) todas as assinaturas (paginado)
  const subs: any[] = []
  const inicio = Date.now()
  let pagina = 1
  let truncado = false
  for (;;) {
    if (Date.now() - inicio > 45000 || pagina > 40) { truncado = true; break }
    let j: any = null
    let status = 0
    try {
      const r = await fetch(BASE + '/public_api/subscriptions/?limit=100&page=' + pagina, { headers: { Authorization: 'Bearer ' + token }, signal: AbortSignal.timeout(15000) })
      status = r.status
      j = await r.json().catch(function() { return null })
      if (!r.ok) return NextResponse.json({ ok: false, etapa: 'assinaturas', http: status, escopos: escopos, erro: String(j?.detail || j?.error_description || j?.error || 'A Cakto recusou a leitura das assinaturas (a chave precisa do escopo "subscriptions").').slice(0, 200) })
    } catch (e: any) {
      return NextResponse.json({ ok: false, etapa: 'assinaturas', erro: 'Falha de rede: ' + String(e?.message || e).slice(0, 120) })
    }
    const lista: any[] = Array.isArray(j?.results) ? j.results : Array.isArray(j) ? j : []
    for (const x of lista) subs.push(x)
    if (!j?.next || lista.length === 0) break
    pagina++
  }

  // 3) resumo da Cakto por status
  const porStatus: Record<string, { qtd: number; valor: number }> = {}
  for (const s of subs) {
    const st = String(s.status || 'desconhecido')
    if (!porStatus[st]) porStatus[st] = { qtd: 0, valor: 0 }
    porStatus[st].qtd++
    porStatus[st].valor += valor(s.amount)
  }

  // 4) o que o painel mostra (mesma conta do card "Pagando agora": ativo + plano + nao admin)
  const db = adminClient()
  const perfis: any[] = []
  for (let from = 0; ; from += 1000) {
    const r = await db.from('profiles').select('id, full_name, email, subscription_status, plan_id, is_admin, plans(name, price_monthly)').eq('subscription_status', 'active').range(from, from + 999)
    if (r.error) return NextResponse.json({ ok: false, etapa: 'painel', erro: r.error.message })
    for (const p of (r.data || [])) perfis.push(p)
    if ((r.data || []).length < 1000) break
  }
  const pagantes = perfis.filter(function(p: any) { return !!p.plan_id && !p.is_admin })
  const bi = await db.from('billing_info').select('user_id, provider, amount, next_charge_at')
  const billing: Record<string, any> = {}
  for (const b of (bi.data || [])) billing[String((b as any).user_id)] = b
  const doCakto = pagantes.filter(function(p: any) { return billing[String(p.id)]?.provider === 'cakto' })

  // 5) comparar (por e-mail quando a Cakto traz e-mail no cliente; senao pelo nome)
  const chavesPainel = new Map<string, any>()
  for (const p of pagantes) {
    const e = String(p.email || '').toLowerCase()
    if (e) chavesPainel.set(e, p)
    const n = norm(p.full_name)
    if (n && !chavesPainel.has(n)) chavesPainel.set(n, p)
  }
  const ativasCakto = subs.filter(function(s: any) { return String(s.status) === 'active' })
  const chavesCakto = new Set<string>()
  const soCakto: any[] = []
  for (const s of ativasCakto) {
    const txt = nomeTexto(s.customer)
    const e = emailDe(txt) || emailDe(JSON.stringify(s.customer || ''))
    const n = norm(txt)
    const achou = (e && chavesPainel.get(e)) || (n && chavesPainel.get(n)) || null
    if (achou) { chavesCakto.add(String(achou.id)) }
    else soCakto.push({ cliente: txt, produto: nomeTexto(s.product), oferta: nomeTexto(s.offer), valor: valor(s.amount), proxima: s.next_payment_date || null, desde: s.createdAt || null })
  }
  const soPainel = doCakto.filter(function(p: any) { return !chavesCakto.has(String(p.id)) }).map(function(p: any) {
    const b = billing[String(p.id)] || {}
    return { nome: p.full_name, email: p.email, plano: p.plans?.name || null, valor: valor(b.amount), proxima: b.next_charge_at || null }
  })

  // valores: plano (usado no card) x valor real cobrado (billing_info)
  const receitaCard = pagantes.reduce(function(a: number, p: any) { return a + valor(p.plans?.price_monthly) }, 0)
  const receitaReal = pagantes.reduce(function(a: number, p: any) { const b = billing[String(p.id)]; return a + (b && b.amount != null ? valor(b.amount) : valor(p.plans?.price_monthly)) }, 0)

  return NextResponse.json({
    ok: true,
    escopos: escopos,
    truncado: truncado,
    cakto: { total: subs.length, por_status: porStatus, ativas: ativasCakto.length, valor_ativas: ativasCakto.reduce(function(a: number, s: any) { return a + valor(s.amount) }, 0) },
    painel: { pagantes: pagantes.length, do_cakto: doCakto.length, receita_card: receitaCard, receita_real: receitaReal },
    so_cakto: soCakto,
    so_painel: soPainel,
    amostra_cliente: ativasCakto.slice(0, 3).map(function(s: any) { return typeof s.customer === 'string' ? s.customer.slice(0, 60) : typeof s.customer }),
  })
}
