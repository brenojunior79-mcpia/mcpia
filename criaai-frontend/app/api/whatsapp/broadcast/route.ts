import { NextRequest, NextResponse } from 'next/server'
import { adminClient, graphError, graphFetch, postMessage, requireAdmin, wabaId, waConfig } from '@/lib/whatsapp'
import { montarParams, montarPublico, normalizarNumero, payloadModelo, type ParamCfg, type Segmento } from '@/lib/waBroadcast'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

function maxVar(text: string): number {
  let n = 0
  const re = /\{\{(\d+)\}\}/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) { n = Math.max(n, parseInt(m[1], 10)) }
  return n
}

function segmento(v: any): Segmento {
  return v === 'plano' || v === 'sem_plano' || v === 'contatos' ? v : 'todos'
}

function lerParams(v: any): ParamCfg[] {
  if (!Array.isArray(v)) return []
  return v.slice(0, 10).map(function(p: any) { return { mode: p?.mode === 'nome' ? 'nome' : 'texto', value: String(p?.value || '').slice(0, 200) } as ParamCfg })
}

// Confere na Meta se o modelo esta aprovado e se da para usar no disparo
async function conferirModelo(name: string, language: string, params: ParamCfg[]): Promise<{ ok: true; body: string; vars: number } | { ok: false; erro: string }> {
  const waba = await wabaId()
  if (!waba) return { ok: false, erro: 'Nao achei a conta do WhatsApp (WHATSAPP_WABA_ID).' }
  const r = await graphFetch(waba + '/message_templates?name=' + encodeURIComponent(name) + '&fields=name,language,status,components&limit=50')
  if (!r.ok) return { ok: false, erro: graphError(r.data) }
  const t = (r.data?.data || []).find(function(x: any) { return x.name === name && x.language === language })
  if (!t) return { ok: false, erro: 'Esse modelo nao existe nesse idioma.' }
  if (t.status !== 'APPROVED') return { ok: false, erro: 'Esse modelo ainda nao foi aprovado pela Meta.' }
  const comps: any[] = t.components || []
  const h = comps.find(function(c) { return c.type === 'HEADER' })
  if (h && h.format !== 'TEXT') return { ok: false, erro: 'Modelos com imagem, video ou documento no topo ainda nao funcionam no disparo. Use um modelo so com texto.' }
  if (h && /\{\{/.test(String(h.text || ''))) return { ok: false, erro: 'Modelos com variavel no titulo ainda nao funcionam no disparo.' }
  const bt = comps.find(function(c) { return c.type === 'BUTTONS' })
  if (bt && (bt.buttons || []).some(function(b: any) { return /\{\{/.test(String(b.url || '')) })) return { ok: false, erro: 'Modelos com botao de link variavel ainda nao funcionam no disparo.' }
  const b = comps.find(function(c) { return c.type === 'BODY' })
  const body = String(b?.text || '')
  const vars = maxVar(body)
  if (params.length !== vars) return { ok: false, erro: 'Esse modelo tem ' + vars + ' variavel(is); preencha todas.' }
  for (const p of params) { if (p.mode === 'texto' && !p.value.trim()) return { ok: false, erro: 'Preencha o valor de todas as variaveis.' } }
  return { ok: true, body, vars }
}

// Numeros do publico (para o card de total) e lista de disparos anteriores
export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'So administradores.' }, { status: 403 })
  const view = req.nextUrl.searchParams.get('view') || 'publico'
  const admin = adminClient()
  if (view === 'publico') {
    try {
      const p = await montarPublico('todos')
      return NextResponse.json({ total: p.total, podem: p.podem, comPlano: p.comPlano, semPlano: p.semPlano, semNumero: p.semNumero, contatos: p.contatos, reembolsados: p.reembolsados, repetidos: p.repetidos })
    } catch (e: any) { return NextResponse.json({ error: e?.message || 'Erro.' }, { status: 500 }) }
  }
  if (view === 'campanha') {
    const id = req.nextUrl.searchParams.get('id') || ''
    const b = await admin.from('wa_broadcasts').select('*').eq('id', id).maybeSingle()
    if (!b.data) return NextResponse.json({ error: 'Nao encontrado.' }, { status: 404 })
    const c = await admin.rpc('wa_broadcast_counts', { p_id: id })
    return NextResponse.json({ campanha: b.data, contagem: c.data || {} })
  }
  // lista
  const l = await admin.from('wa_broadcasts').select('id, created_at, template_name, preview, segment, status, pause_reason, total').order('created_at', { ascending: false }).limit(20)
  const out: any[] = []
  for (const b of (l.data || [])) {
    const c = await admin.rpc('wa_broadcast_counts', { p_id: b.id })
    out.push({ ...b, contagem: c.data || {} })
  }
  return NextResponse.json({ campanhas: out })
}

export async function POST(req: NextRequest) {
  const staff = await requireAdmin()
  if (!staff) return NextResponse.json({ error: 'So administradores podem fazer disparos.' }, { status: 403 })
  const cfg = waConfig()
  if (!cfg.token || !cfg.phoneId) return NextResponse.json({ error: 'O WhatsApp ainda nao foi conectado.' }, { status: 400 })
  let input: any
  try { input = await req.json() } catch (e) { return NextResponse.json({ error: 'Pedido invalido.' }, { status: 400 }) }
  const admin = adminClient()
  const action = String(input?.action || '')

  if (action === 'cancelar') {
    const id = String(input?.id || '')
    await admin.from('wa_broadcast_recipients').update({ status: 'cancelled' }).eq('broadcast_id', id).in('status', ['pending', 'sending'])
    await admin.from('wa_broadcasts').update({ status: 'cancelado', pause_reason: null }).eq('id', id).neq('status', 'concluido')
    return NextResponse.json({ ok: true })
  }

  if (action === 'importar') {
    const lista: any[] = Array.isArray(input?.contatos) ? input.contatos.slice(0, 1000) : []
    const mapa = new Map<string, { wa_id: string; name: string | null }>()
    let invalidos = 0
    for (const c of lista) {
      const wa = normalizarNumero(c?.wa)
      if (!wa) { invalidos++; continue }
      mapa.set(wa, { wa_id: wa, name: String(c?.nome || '').trim().slice(0, 120) || null })
    }
    const rows = Array.from(mapa.values())
    if (rows.length > 0) {
      const up = await admin.from('wa_contatos').upsert(rows, { onConflict: 'wa_id' })
      if (up.error) return NextResponse.json({ error: 'Nao foi possivel salvar os contatos.' }, { status: 500 })
    }
    return NextResponse.json({ ok: true, salvos: rows.length, invalidos })
  }

  const name = String(input?.template?.name || '').trim()
  const language = String(input?.template?.language || 'pt_BR').trim()
  const preview = String(input?.template?.preview || '').slice(0, 1500)
  const params = lerParams(input?.params)
  if (!name) return NextResponse.json({ error: 'Escolha um modelo.' }, { status: 400 })
  const ck = await conferirModelo(name, language, params)
  if (!ck.ok) return NextResponse.json({ error: ck.erro }, { status: 400 })

  if (action === 'teste') {
    const to = normalizarNumero(input?.numero)
    if (!to) return NextResponse.json({ error: 'Numero invalido. Use DDD + numero, ex: 37 99999-9999.' }, { status: 400 })
    const r = await postMessage(payloadModelo(to, name, language, montarParams(params, 'Teste')))
    if (!r.ok) return NextResponse.json({ error: graphError(r.data) }, { status: 400 })
    return NextResponse.json({ ok: true })
  }

  if (action === 'criar') {
    const seg = segmento(input?.segmento)
    const ativa = await admin.from('wa_broadcasts').select('id').in('status', ['rodando', 'pausado']).limit(1)
    if (ativa.data && ativa.data.length > 0) return NextResponse.json({ error: 'Ja existe um disparo em andamento. Termine ou cancele ele antes de criar outro.' }, { status: 409 })
    let pub
    try { pub = await montarPublico(seg) } catch (e: any) { return NextResponse.json({ error: e?.message || 'Erro.' }, { status: 500 }) }
    if (pub.lista.length === 0) return NextResponse.json({ error: 'Nenhum aluno com WhatsApp nesse grupo.' }, { status: 400 })
    // O que a pessoa viu na tela precisa bater com o que vai ser enviado
    if (Number(input?.esperado) !== pub.lista.length) return NextResponse.json({ error: 'O numero de alunos mudou (agora sao ' + pub.lista.length + '). Confira e confirme de novo.', total: pub.lista.length }, { status: 409 })

    const b = await admin.from('wa_broadcasts').insert({ created_by: staff, template_name: name, template_language: language, preview, params, segment: seg, status: 'rodando', total: pub.lista.length }).select('id').single()
    if (b.error || !b.data) return NextResponse.json({ error: 'Nao foi possivel criar o disparo.' }, { status: 500 })
    for (let i = 0; i < pub.lista.length; i += 500) {
      const chunk = pub.lista.slice(i, i + 500).map(function(a) { return { broadcast_id: b.data!.id, user_id: a.id, name: a.nome, wa_id: a.wa, status: 'pending' } })
      const ins = await admin.from('wa_broadcast_recipients').insert(chunk)
      if (ins.error) {
        await admin.from('wa_broadcasts').delete().eq('id', b.data.id)
        return NextResponse.json({ error: 'Nao foi possivel montar a lista de envio.' }, { status: 500 })
      }
    }
    return NextResponse.json({ ok: true, id: b.data.id, total: pub.lista.length })
  }

  return NextResponse.json({ error: 'Pedido invalido.' }, { status: 400 })
}
