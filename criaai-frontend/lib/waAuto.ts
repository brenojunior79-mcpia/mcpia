// Fluxos automaticos do WhatsApp disparados por eventos da Hubla (recuperacao de vendas etc.)
import { GRAPH } from '@/lib/whatsapp'
import { normalizarNumero, primeiroNome, payloadModelo } from '@/lib/waBroadcast'

import { EVENTOS, type Metodo, type Passo, type FluxoAuto } from '@/lib/waAutoTipos'
export type { Metodo, Passo, FluxoAuto }

// Eventos que provam que a pessoa comprou: cancelam fluxos de recuperacao que ainda estao esperando
const COMPRA = ['invoice.payment_succeeded', 'customer.member_added', 'subscription.activated']

// ---------- leitura do aviso da Hubla (tolerante: a Hubla muda campos de evento para evento) ----------
function str(v: any): string { return typeof v === 'string' ? v.trim() : '' }

export type Info = { wa: string | null; email: string; nome: string; produto: string; link: string; metodo: Metodo; chave: string }

export function lerEvento(eventType: string, payload: any): Info {
  const ev = payload?.event || {}
  const user = ev.user || {}
  const lead = ev.lead || {}
  const inv = ev.invoice || {}
  const payer = inv.payer || inv.customer || {}
  const phone = str(user.phone) || str(lead.phone) || str(payer.phone) || str(user.phoneNumber) || str(lead.phoneNumber)
  const email = (str(user.email) || str(lead.email) || str(payer.email)).toLowerCase()
  const nomeCru = str(user.firstName) || str(user.name) || str(user.fullName) || str(lead.fullName) || str(lead.name) || str(payer.name)
  const prods: any[] = Array.isArray(ev.products) ? ev.products : (ev.product ? [ev.product] : [])
  const produto = str(prods[0]?.name)
  const link = str(lead.session?.url) || str(inv.paymentUrl) || str(inv.checkoutUrl) || str(inv.url) || str(ev.checkoutUrl) || ''
  const mCru = (str(inv.paymentMethod) || str(inv.payment_method) || str(inv.paymentType) || str(inv.method) || str(ev.paymentMethod)).toLowerCase()
  let metodo: Metodo = ''
  if (mCru.indexOf('pix') >= 0) metodo = 'pix'
  else if (mCru.indexOf('boleto') >= 0 || mCru.indexOf('slip') >= 0) metodo = 'boleto'
  else if (mCru.indexOf('card') >= 0 || mCru.indexOf('cart') >= 0 || mCru.indexOf('credit') >= 0) metodo = 'cartao'
  const chave = str(inv.id) || str(lead.id) || str(ev.subscription?.id) || email || (phone || '')
  return { wa: normalizarNumero(phone), email, nome: primeiroNome(nomeCru), produto, link, metodo, chave }
}

function passaFiltro(f: FluxoAuto['trigger_filter'], info: Info): boolean {
  if (f?.metodo && info.metodo !== f.metodo) return false
  const p = String(f?.produto || '').trim().toLowerCase()
  if (p && info.produto.toLowerCase().indexOf(p) < 0) return false
  return true
}

// ---------- validacao do que vem da tela ----------
export function validarAuto(input: any): { ok: true; fluxo: FluxoAuto } | { ok: false; erro: string } {
  const name = String(input?.name || '').trim().slice(0, 80)
  if (!name) return { ok: false, erro: 'Dê um nome ao fluxo.' }
  const trigger_event = String(input?.trigger_event || '')
  if (!EVENTOS.some(function(e) { return e.k === trigger_event })) return { ok: false, erro: 'Escolha o evento que inicia o fluxo.' }
  const m = String(input?.trigger_filter?.metodo || '')
  const metodo: Metodo = m === 'pix' || m === 'boleto' || m === 'cartao' ? m : ''
  const produto = String(input?.trigger_filter?.produto || '').trim().slice(0, 80)
  const steps: Passo[] = []
  const raw: any[] = Array.isArray(input?.steps) ? input.steps.slice(0, 20) : []
  for (const s of raw) {
    if (s?.tipo === 'esperar') {
      const min = Math.round(Number(s.minutos))
      if (!(min >= 1 && min <= 60 * 24 * 30)) return { ok: false, erro: 'A espera deve ficar entre 1 minuto e 30 dias.' }
      steps.push({ tipo: 'esperar', minutos: min })
    } else if (s?.tipo === 'modelo') {
      const template = String(s.template || '').trim()
      if (!template) return { ok: false, erro: 'Escolha o modelo de mensagem em todos os passos de envio.' }
      const params = (Array.isArray(s.params) ? s.params : []).slice(0, 10).map(function(p: any) {
        const mode = p?.mode === 'produto' || p?.mode === 'link' || p?.mode === 'texto' ? p.mode : 'nome'
        return { mode, value: String(p?.value || '').slice(0, 300) }
      })
      steps.push({ tipo: 'modelo', template, language: String(s.language || 'pt_BR').slice(0, 10), params })
    }
  }
  if (!steps.some(function(s) { return s.tipo === 'modelo' })) return { ok: false, erro: 'Adicione pelo menos um passo de envio de mensagem.' }
  return {
    ok: true,
    fluxo: {
      name, trigger_event, trigger_filter: { ...(metodo ? { metodo } : {}), ...(produto ? { produto } : {}) },
      steps, cancel_on_purchase: input?.cancel_on_purchase !== false, enabled: input?.enabled === true,
      connection_id: input?.connection_id ? String(input.connection_id) : null,
    },
  }
}

// ---------- motor ----------
function quando(steps: Passo[], from: number, agora: number): { idx: number; at: number } {
  // Se o primeiro passo for uma espera, ja agenda direto
  const s = steps[from]
  if (s && s.tipo === 'esperar') return { idx: from + 1, at: agora + s.minutos * 60000 }
  return { idx: from, at: agora }
}

// Chamado pelo aviso da Hubla: guarda exemplo, cancela quem comprou e inicia os fluxos do evento
export async function tratarEventoHubla(admin: any, eventType: string, payload: any): Promise<void> {
  try {
    await admin.from('wa_auto_samples').upsert({ event_type: eventType, payload, received_at: new Date().toISOString() }, { onConflict: 'event_type' })
  } catch (e) {}
  const info = lerEvento(eventType, payload)

  // Comprou: cancela os fluxos de recuperacao que ainda estavam esperando
  if (COMPRA.indexOf(eventType) >= 0 && (info.email || info.wa)) {
    const q = await admin.from('wa_auto_runs').select('id, flow_id, event_type, email, wa_id').eq('status', 'ativo').eq('is_test', false)
    const ativos: any[] = q.data || []
    if (ativos.length > 0) {
      const f = await admin.from('wa_auto_flows').select('id, cancel_on_purchase').in('id', Array.from(new Set(ativos.map(function(r) { return r.flow_id }))))
      const cancela: Record<string, boolean> = {}
      for (const x of (f.data || [])) cancela[x.id] = x.cancel_on_purchase === true
      const ids = ativos.filter(function(r) {
        if (!cancela[r.flow_id] || COMPRA.indexOf(r.event_type) >= 0) return false
        return (!!info.email && String(r.email || '').toLowerCase() === info.email) || (!!info.wa && r.wa_id === info.wa)
      }).map(function(r) { return r.id })
      if (ids.length > 0) await admin.from('wa_auto_runs').update({ status: 'cancelado', error: 'A pessoa comprou', updated_at: new Date().toISOString() }).in('id', ids)
    }
  }

  const fl = await admin.from('wa_auto_flows').select('*').eq('enabled', true).eq('trigger_event', eventType)
  const fluxos: any[] = fl.data || []
  if (fluxos.length === 0) return
  if (!info.wa) return // sem telefone valido nao ha como enviar
  const agora = Date.now()
  for (const fx of fluxos) {
    if (!passaFiltro(fx.trigger_filter || {}, info)) continue
    const steps: Passo[] = Array.isArray(fx.steps) ? fx.steps : []
    const p = quando(steps, 0, agora)
    await admin.from('wa_auto_runs').upsert({
      flow_id: fx.id, dedupe_key: eventType + ':' + info.chave, wa_id: info.wa, email: info.email || null, name: info.nome || null,
      event_type: eventType, data: { produto: info.produto, link: info.link, metodo: info.metodo },
      step_index: p.idx, next_run_at: new Date(p.at).toISOString(), status: 'ativo',
    }, { onConflict: 'flow_id,dedupe_key', ignoreDuplicates: true })
  }
}

// Cria um envio de teste para o proprio numero do admin
export async function criarTeste(admin: any, fluxo: any, numero: string, nome: string, pularEsperas: boolean): Promise<{ ok: boolean; erro?: string }> {
  const wa = normalizarNumero(numero)
  if (!wa) return { ok: false, erro: 'Número inválido. Use DDD + número.' }
  let steps: Passo[] = Array.isArray(fluxo.steps) ? fluxo.steps : []
  if (pularEsperas) steps = steps.filter(function(s) { return s.tipo !== 'esperar' })
  const p = quando(steps, 0, Date.now())
  const r = await admin.from('wa_auto_runs').insert({
    flow_id: fluxo.id, dedupe_key: 'teste:' + Date.now(), wa_id: wa, name: primeiroNome(nome) || 'Teste', event_type: fluxo.trigger_event,
    data: { produto: 'Produto de teste', link: 'https://mcpia.site', metodo: '', steps_override: pularEsperas ? steps : undefined },
    step_index: p.idx, next_run_at: new Date(p.at).toISOString(), status: 'ativo', is_test: true,
  })
  if (r.error) return { ok: false, erro: 'Não consegui criar o teste.' }
  return { ok: true }
}

const LIMITE = [130429, 131048, 80007, 4, 17, 32, 613]

function montar(params: { mode: string; value: string }[], run: any): string[] {
  const d = run.data || {}
  return params.map(function(p) {
    if (p.mode === 'nome') return run.name || (p.value || '').trim() || 'amigo(a)'
    if (p.mode === 'produto') return d.produto || (p.value || '').trim() || 'seu produto'
    if (p.mode === 'link') return d.link || (p.value || '').trim() || 'https://mcpia.site'
    return (p.value || '').trim()
  })
}

async function enviar(token: string, phoneId: string, to: string, p: Extract<Passo, { tipo: 'modelo' }>, run: any): Promise<{ ok: boolean; code: number; msgId: string; erro: string }> {
  try {
    const res = await fetch(GRAPH + '/' + phoneId + '/messages', {
      method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadModelo(to, p.template, p.language, montar(p.params, run))),
    })
    let data: any = null
    try { data = await res.json() } catch (e) {}
    if (res.ok) return { ok: true, code: 0, msgId: String(data?.messages?.[0]?.id || ''), erro: '' }
    const code = Number(data?.error?.code) || 0
    return { ok: false, code, msgId: '', erro: String(data?.error?.error_user_msg || data?.error?.message || 'Erro ao enviar').slice(0, 300) + (code ? ' (código ' + code + ')' : '') }
  } catch (e) {
    return { ok: false, code: -1, msgId: '', erro: 'Falha de rede ao falar com a Meta.' }
  }
}

// Roda os passos que ja estao no horario. Chamado pelo agendador a cada minuto.
export async function processarFluxos(admin: any, token: string): Promise<{ processados: number; enviados: number; falhas: number }> {
  const out = { processados: 0, enviados: 0, falhas: 0 }
  const claim = await admin.rpc('wa_auto_claim', { p_n: 40 })
  const runs: any[] = claim.data || []
  if (runs.length === 0) return out
  const flows: Record<string, any> = {}
  const conns: Record<string, any> = {}
  const inicio = Date.now()

  for (const run of runs) {
    if (Date.now() - inicio > 45000) { await admin.from('wa_auto_runs').update({ claimed_at: null }).eq('id', run.id); continue }
    out.processados++
    if (!flows[run.flow_id]) {
      const f = await admin.from('wa_auto_flows').select('*').eq('id', run.flow_id).maybeSingle()
      flows[run.flow_id] = f.data || null
    }
    const fx = flows[run.flow_id]
    const fim = async function(status: string, erro: string | null, extra?: any) {
      await admin.from('wa_auto_runs').update({ status, error: erro, claimed_at: null, updated_at: new Date().toISOString(), ...(extra || {}) }).eq('id', run.id)
    }
    if (!fx) { await fim('cancelado', 'Fluxo apagado'); continue }
    if (!fx.enabled && !run.is_test) { await fim('cancelado', 'Fluxo desligado'); continue }
    if (!fx.connection_id) { await fim('falhou', 'O fluxo não tem número de WhatsApp escolhido.'); continue }
    if (!conns[fx.connection_id]) {
      const c = await admin.from('wa_connections').select('*').eq('id', fx.connection_id).maybeSingle()
      conns[fx.connection_id] = c.data || null
    }
    const cn = conns[fx.connection_id]
    if (!cn || !cn.active) { await fim('falhou', 'O número de WhatsApp deste fluxo não está ativo.'); continue }

    const steps: Passo[] = Array.isArray(run.data?.steps_override) ? run.data.steps_override : (Array.isArray(fx.steps) ? fx.steps : [])
    let idx: number = run.step_index
    let enviados: number = run.sent_count
    let parou = false
    while (idx < steps.length) {
      const s = steps[idx]
      if (s.tipo === 'esperar') {
        await fim('ativo', null, { step_index: idx + 1, next_run_at: new Date(Date.now() + s.minutos * 60000).toISOString(), sent_count: enviados })
        parou = true
        break
      }
      const r = await enviar(token, cn.phone_number_id, run.wa_id, s, run)
      if (r.ok) {
        enviados++; out.enviados++; idx++
        await admin.from('wa_auto_sends').insert({ run_id: run.id, flow_id: run.flow_id, wa_message_id: r.msgId, to_wa: run.wa_id, template: s.template, status: 'sent', is_test: run.is_test === true })
        continue
      }
      if (LIMITE.indexOf(r.code) >= 0 || r.code === -1) {
        // a Meta pediu calma (ou caiu a rede): tenta de novo daqui a pouco
        await fim('ativo', r.erro, { step_index: idx, next_run_at: new Date(Date.now() + 10 * 60000).toISOString(), sent_count: enviados })
      } else {
        out.falhas++
        await admin.from('wa_auto_sends').insert({ run_id: run.id, flow_id: run.flow_id, to_wa: run.wa_id, template: s.template, status: 'failed', error: r.erro, is_test: run.is_test === true })
        await fim('falhou', r.erro, { step_index: idx, sent_count: enviados })
      }
      parou = true
      break
    }
    if (!parou) await fim('concluido', null, { step_index: idx, sent_count: enviados })
  }
  return out
}
