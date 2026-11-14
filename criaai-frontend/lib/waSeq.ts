// Construtor visual de fluxos do WhatsApp: validacao, gatilhos (palavra e eventos da compra) e motor de envio.
// Os fluxos antigos por evento (wa_auto_flows) continuam funcionando em lib/waAuto.ts; este arquivo cuida dos fluxos novos (wa_sequencias).
import { GRAPH, postMessage, graphError } from '@/lib/whatsapp'
import { normalizarNumero, primeiroNome } from '@/lib/waBroadcast'
import { casaPalavra, aplicaNome } from '@/lib/waFlows'
import { classificar } from '@/lib/waMedia'
import { EVENTOS, type Metodo } from '@/lib/waAutoTipos'
import { responderUltimaPendente, MARCA_FLUXO_IA } from '@/lib/waIA'
import { COMPRA, LIMITE, lerEvento, passaFiltro, enviar, textoDoModelo, jaPagou } from '@/lib/waAuto'
import { MAX_ATRASO_S, ehEnvio, lePos, segundosDoAtraso, type PassoSeq, type Sequencia, type Unidade } from '@/lib/waSeqTipos'

const JANELA_MS = 24 * 3600 * 1000
const REPETIR_PALAVRA_HORAS = 12

// ---------- validacao do que vem da tela ----------
export function validarSeq(input: any): { ok: true; seq: Sequencia } | { ok: false; erro: string } {
  const name = String(input?.name || '').trim().slice(0, 80)
  if (!name) return { ok: false, erro: 'Dê um nome ao fluxo.' }
  const g = input?.trigger || {}
  let trigger: Sequencia['trigger']
  if (g.tipo === 'evento') {
    const evento = String(g.evento || '')
    if (!EVENTOS.some(function(e) { return e.k === evento })) return { ok: false, erro: 'Escolha o evento que inicia o fluxo.' }
    const m = String(g.metodo || '')
    const metodo: Metodo = m === 'pix' || m === 'boleto' || m === 'cartao' ? m : ''
    const produto = String(g.produto || '').trim().slice(0, 80)
    trigger = { tipo: 'evento', evento, ...(metodo ? { metodo } : {}), ...(produto ? { produto } : {}) }
  } else {
    const palavras: string[] = (Array.isArray(g.palavras) ? g.palavras : []).map(function(x: any) { return String(x || '').trim().slice(0, 60) }).filter(Boolean).slice(0, 20)
    trigger = { tipo: 'palavra', palavras, match: g.match === 'igual' ? 'igual' : 'contem' }
  }
  const posGatilho = lePos(g.pos)
  if (posGatilho) trigger.pos = posGatilho
  const steps: PassoSeq[] = []
  const raw: any[] = Array.isArray(input?.steps) ? input.steps.slice(0, 40) : []
  const ids: Record<string, boolean> = {}
  for (const s of raw) {
    const id = String(s?.id || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24)
    if (!id || ids[id]) return { ok: false, erro: 'Fluxo com blocos repetidos. Recarregue a página e tente de novo.' }
    ids[id] = true
    if (s?.tipo === 'atraso') {
      const u = String(s.unidade)
      const unidade: Unidade = u === 'segundos' || u === 'horas' || u === 'dias' ? u : 'minutos'
      const valor = Math.round(Number(s.valor))
      const seg = segundosDoAtraso({ valor, unidade })
      if (!(valor >= 1) || seg > MAX_ATRASO_S) return { ok: false, erro: 'O atraso deve ficar entre 1 segundo e 30 dias.' }
      steps.push({ id, tipo: 'atraso', valor, unidade })
    } else if (s?.tipo === 'resposta') {
      const u = String(s.unidade)
      const unidade: Unidade = u === 'segundos' || u === 'minutos' || u === 'dias' ? u : 'horas'
      const valor = Math.max(0, Math.round(Number(s.valor) || 0))
      if (valor > 0 && segundosDoAtraso({ valor, unidade }) > MAX_ATRASO_S) return { ok: false, erro: 'O limite de espera pela resposta é de até 30 dias.' }
      steps.push({ id, tipo: 'resposta', valor, unidade, aoExpirar: s.aoExpirar === 'continuar' ? 'continuar' : 'encerrar' })
    } else if (s?.tipo === 'ia') {
      steps.push({ id, tipo: 'ia' })
    } else if (s?.tipo === 'texto') {
      const texto = String(s.texto || '').slice(0, 4000)
      steps.push({ id, tipo: 'texto', texto })
    } else if (s?.tipo === 'audio' || s?.tipo === 'imagem' || s?.tipo === 'video') {
      const path = String(s.path || '')
      if (path && (path.indexOf('seq/') !== 0 || path.indexOf('..') >= 0)) return { ok: false, erro: 'Arquivo inválido. Envie de novo.' }
      const mime = String(s.mime || '').slice(0, 80)
      const nome = String(s.nome || '').slice(0, 120)
      if (s.tipo === 'audio') steps.push({ id, tipo: 'audio', path, mime, nome })
      else if (s.tipo === 'imagem') steps.push({ id, tipo: 'imagem', path, mime, nome, legenda: String(s.legenda || '').slice(0, 1000) })
      else steps.push({ id, tipo: 'video', path, mime, nome, legenda: String(s.legenda || '').slice(0, 1000) })
    } else if (s?.tipo === 'modelo') {
      const params = (Array.isArray(s.params) ? s.params : []).slice(0, 10).map(function(p: any) {
        const mode = p?.mode === 'produto' || p?.mode === 'link' || p?.mode === 'texto' ? p.mode : 'nome'
        return { mode, value: String(p?.value || '').slice(0, 300) }
      })
      steps.push({ id, tipo: 'modelo', template: String(s.template || '').trim().slice(0, 120), language: String(s.language || 'pt_BR').slice(0, 10), params })
    } else {
      return { ok: false, erro: 'Bloco desconhecido no fluxo.' }
    }
    const posBloco = lePos(s?.pos)
    if (posBloco) steps[steps.length - 1].pos = posBloco
  }
  const seq: Sequencia = {
    name, trigger, steps, enabled: input?.enabled === true,
    connection_id: input?.connection_id ? String(input.connection_id) : null,
    cancel_on_purchase: input?.cancel_on_purchase !== false,
  }
  if (seq.enabled) {
    const erro = erroParaLigar(seq)
    if (erro) return { ok: false, erro }
  }
  return { ok: true, seq }
}

// Tudo o que precisa estar completo para o fluxo poder ficar ligado
export function erroParaLigar(seq: Sequencia): string {
  if (!seq.connection_id) return 'Escolha o número de WhatsApp do fluxo antes de ligar.'
  if (seq.trigger.tipo === 'palavra' && seq.trigger.palavras.length === 0) return 'Escreva a palavra que inicia o fluxo antes de ligar.'
  const envios = seq.steps.filter(function(s) { return s.tipo !== 'atraso' && s.tipo !== 'resposta' && s.tipo !== 'ia' })
  if (envios.length === 0) return 'Adicione pelo menos uma mensagem ao fluxo antes de ligar.'
  for (let i = 0; i < seq.steps.length - 1; i++) {
    if (seq.steps[i].tipo === 'ia') return 'O bloco "Transferir para a IA" precisa ser o último do fluxo (depois dele quem conversa é a IA).'
  }
  for (const s of seq.steps) {
    if (s.tipo === 'texto' && !s.texto.trim()) return 'Tem uma mensagem de texto vazia no fluxo.'
    if ((s.tipo === 'audio' || s.tipo === 'imagem' || s.tipo === 'video') && !s.path) return 'Tem um bloco de ' + (s.tipo === 'audio' ? 'áudio' : s.tipo) + ' sem arquivo.'
    if (s.tipo === 'modelo' && !s.template) return 'Tem um bloco de modelo sem o modelo escolhido.'
  }
  return ''
}

// ---------- gatilhos ----------
// Mensagem recebida: se casa com a palavra de algum fluxo ligado, comeca o fluxo. Devolve true se comecou (o assistente nao responde esta mensagem).
export async function iniciarPorPalavra(admin: any, p: { convId: string; waId: string; msgId: string; texto: string; nome: string | null; connectionId: string | null }): Promise<boolean> {
  try {
    if (!p.texto.trim() || !p.connectionId) return false
    const q = await admin.from('wa_sequencias').select('id, name, trigger, connection_id').eq('enabled', true).eq('connection_id', p.connectionId).limit(100)
    for (const s of (q.data || []) as any[]) {
      const g = s.trigger || {}
      if (g.tipo !== 'palavra' || !casaPalavra(p.texto, Array.isArray(g.palavras) ? g.palavras : [], g.match)) continue
      const desde = new Date(Date.now() - REPETIR_PALAVRA_HORAS * 3600 * 1000).toISOString()
      const ja = await admin.from('wa_seq_runs').select('id').eq('seq_id', s.id).eq('conversation_id', p.convId).eq('is_test', false).gte('created_at', desde).limit(1)
      if (ja.data && ja.data.length > 0) {
        // Resend da Meta da mesma mensagem: continua tratando como "ja iniciou"; palavra repetida de outra mensagem fica para o assistente
        const igual = await admin.from('wa_seq_runs').select('id').eq('seq_id', s.id).eq('dedupe_key', 'palavra:' + p.msgId).limit(1)
        return !!(igual.data && igual.data.length > 0)
      }
      await admin.from('wa_seq_runs').upsert({
        seq_id: s.id, dedupe_key: 'palavra:' + p.msgId, conversation_id: p.convId, wa_id: p.waId, name: primeiroNome(p.nome) || null,
        event_type: 'palavra', data: {}, step_index: 0, next_run_at: new Date().toISOString(), status: 'ativo',
      }, { onConflict: 'seq_id,dedupe_key', ignoreDuplicates: true })
      return true
    }
  } catch (e) { console.error('[wa-seq] palavra:', e) }
  return false
}

// A pessoa respondeu: quem estava esperando a resposta (bloco "Depois que a pessoa responder") segue o fluxo agora
export async function retomarPorResposta(admin: any, p: { waId: string; connectionId: string | null }): Promise<number> {
  try {
    if (!p.connectionId) return 0
    const sq = await admin.from('wa_sequencias').select('id').eq('connection_id', p.connectionId).limit(100)
    const ids: string[] = (sq.data || []).map(function(x: any) { return x.id })
    if (ids.length === 0) return 0
    const q = await admin.from('wa_seq_runs').select('id, data').in('seq_id', ids).in('wa_id', variantes(p.waId)).eq('status', 'ativo').limit(20)
    let n = 0
    for (const r of (q.data || []) as any[]) {
      if (!r.data || r.data.aguarda_resposta !== true) continue
      const novo = { ...r.data, respondeu: true }
      delete novo.aguarda_resposta
      delete novo.aguarda_acao
      const u = await admin.from('wa_seq_runs').update({ data: novo, next_run_at: new Date().toISOString(), claimed_at: null, updated_at: new Date().toISOString() }).eq('id', r.id).eq('status', 'ativo').select('id')
      if (u.data && u.data.length > 0) n++
    }
    return n
  } catch (e) { console.error('[wa-seq] resposta:', e) }
  return 0
}

// Regra: o Junior so assume depois que o fluxo passa a conversa para ele (bloco "Transferir para a IA").
// Enquanto a pessoa esta dentro de um fluxo que ainda vai chegar nesse bloco (esperas, textos de boas-vindas...), o Junior NAO responde
// (senao a boas-vindas sai repetida: uma dele e outra do fluxo). Vale mesmo com o assistente ligado para todas as conversas.
// Fluxo parado ha mais de 6 horas nao segura o Junior (para nunca deixar a pessoa sem resposta).
async function fluxoVaiPassarParaIA(admin: any, p: { waId: string; connectionId: string | null }): Promise<boolean> {
  try {
    if (!p.connectionId) return false
    const sq = await admin.from('wa_sequencias').select('id, steps').eq('connection_id', p.connectionId).limit(100)
    const lista: any[] = sq.data || []
    if (lista.length === 0) return false
    const porId: Record<string, any[]> = {}
    for (const x of lista) porId[x.id] = Array.isArray(x.steps) ? x.steps : []
    const q = await admin.from('wa_seq_runs').select('seq_id, step_index, data').in('seq_id', Object.keys(porId)).in('wa_id', variantes(p.waId)).eq('status', 'ativo').eq('is_test', false).gte('created_at', new Date(Date.now() - 6 * 3600 * 1000).toISOString()).limit(20)
    for (const r of (q.data || []) as any[]) {
      const passos = porId[r.seq_id] || []
      if (passos.slice(Number(r.step_index) || 0).some(function(s: any) { return s && s.tipo === 'ia' })) return true
    }
  } catch (e) { console.error('[wa-seq] fluxo ate a IA:', e) }
  return false
}

// Mensagem recebida: primeiro retoma quem esperava a resposta; senao, ve se a palavra inicia um fluxo. true = o fluxo cuida desta mensagem (o assistente nao responde).
export async function tratarMensagemSequencias(admin: any, p: { convId: string; waId: string; msgId: string; tipo: string; texto: string; nome: string | null; connectionId: string | null }): Promise<boolean> {
  if ((await retomarPorResposta(admin, { waId: p.waId, connectionId: p.connectionId })) > 0) return true
  if (await fluxoVaiPassarParaIA(admin, { waId: p.waId, connectionId: p.connectionId })) return true
  if (p.tipo !== 'text') return false
  return iniciarPorPalavra(admin, { convId: p.convId, waId: p.waId, msgId: p.msgId, texto: p.texto, nome: p.nome, connectionId: p.connectionId })
}

// Aviso da Hubla: cancela quem comprou e inicia os fluxos ligados para o evento
export async function tratarEventoSequencias(admin: any, eventType: string, payload: any): Promise<void> {
  try {
    const info = lerEvento(eventType, payload)
    if (COMPRA.indexOf(eventType) >= 0 && (info.email || info.wa)) {
      const q = await admin.from('wa_seq_runs').select('id, seq_id, event_type, email, wa_id').eq('status', 'ativo').eq('is_test', false).neq('event_type', 'palavra')
      const ativos: any[] = q.data || []
      if (ativos.length > 0) {
        const f = await admin.from('wa_sequencias').select('id, cancel_on_purchase').in('id', Array.from(new Set(ativos.map(function(r) { return r.seq_id }))))
        const cancela: Record<string, boolean> = {}
        for (const x of (f.data || [])) cancela[x.id] = x.cancel_on_purchase === true
        const ids = ativos.filter(function(r) {
          if (!cancela[r.seq_id] || COMPRA.indexOf(r.event_type) >= 0) return false
          return (!!info.email && String(r.email || '').toLowerCase() === info.email) || (!!info.wa && r.wa_id === info.wa)
        }).map(function(r) { return r.id })
        if (ids.length > 0) await admin.from('wa_seq_runs').update({ status: 'cancelado', error: 'A pessoa comprou', updated_at: new Date().toISOString() }).in('id', ids)
      }
    }
    if (!info.wa) return
    const sq = await admin.from('wa_sequencias').select('id, trigger').eq('enabled', true).limit(100)
    const agora = Date.now()
    for (const s of (sq.data || []) as any[]) {
      const g = s.trigger || {}
      if (g.tipo !== 'evento' || g.evento !== eventType) continue
      if (!passaFiltro({ metodo: g.metodo, produto: g.produto }, info)) continue
      // Cobranca gerada ou paga: a mesma pessoa nao entra duas vezes no mesmo fluxo em 24 h (gerou duas cobrancas = recebia a mesma mensagem em dobro)
      if (eventType === 'invoice.payment_succeeded' || eventType === 'invoice.created') {
        const desde = new Date(agora - 24 * 3600 * 1000).toISOString()
        const ja = await admin.from('wa_seq_runs').select('id').eq('seq_id', s.id).eq('wa_id', info.wa).eq('is_test', false).in('status', ['ativo', 'concluido']).gte('created_at', desde).limit(1)
        if (ja.data && ja.data.length > 0) continue
      }
      // Cobranca gerada: espera 2 minutos para dar tempo do aviso de pagamento chegar (cartao aprova em segundos)
      const quando = eventType === 'invoice.created' ? agora + 120000 : agora
      await admin.from('wa_seq_runs').upsert({
        seq_id: s.id, dedupe_key: eventType + ':' + info.chave, wa_id: info.wa, email: info.email || null, name: info.nome || null,
        event_type: eventType, data: { produto: info.produto, link: info.link, metodo: info.metodo },
        step_index: 0, next_run_at: new Date(quando).toISOString(), status: 'ativo',
      }, { onConflict: 'seq_id,dedupe_key', ignoreDuplicates: true })
    }
  } catch (e) { console.error('[wa-seq] evento:', e) }
}

// Teste para o proprio numero do admin
export async function criarTesteSeq(admin: any, seq: any, numero: string, nome: string, pularAtrasos: boolean): Promise<{ ok: boolean; erro?: string }> {
  const wa = normalizarNumero(numero)
  if (!wa) return { ok: false, erro: 'Número inválido. Use DDD + número.' }
  const steps: PassoSeq[] = (Array.isArray(seq.steps) ? seq.steps : []).filter(function(s: PassoSeq) { return !(pularAtrasos && s.tipo === 'atraso') })
  const r = await admin.from('wa_seq_runs').insert({
    seq_id: seq.id, dedupe_key: 'teste:' + Date.now(), wa_id: wa, name: primeiroNome(nome) || 'Teste', event_type: 'teste',
    data: { produto: 'Produto de teste', link: 'https://mcpia.site', metodo: '', steps_override: pularAtrasos ? steps : undefined },
    step_index: 0, next_run_at: new Date().toISOString(), status: 'ativo', is_test: true,
  })
  if (r.error) return { ok: false, erro: 'Não consegui criar o teste.' }
  return { ok: true }
}

// ---------- conversa da pessoa ----------
function variantes(wa: string): string[] {
  const m = String(wa || '').match(/^55(\d{2})(9?)(\d{8})$/)
  return m ? [wa, '55' + m[1] + (m[2] ? '' : '9') + m[3]] : [wa]
}

async function acharConversa(admin: any, connId: string, wa: string): Promise<any | null> {
  const ex = await admin.from('wa_conversations').select('id, wa_id, last_inbound_at, last_message_at').in('wa_id', variantes(wa)).eq('connection_id', connId).order('last_message_at', { ascending: false })
  const lista: any[] = ex.data || []
  return lista.find(function(x) { return x.wa_id === wa }) || lista[0] || null
}

async function garantirConversa(admin: any, connId: string, run: any, texto: string): Promise<string | null> {
  const c = await acharConversa(admin, connId, run.wa_id)
  if (c) return c.id
  const agora = new Date().toISOString()
  const m = await admin.rpc('wa_match_profile', { p_wa: run.wa_id })
  const ins = await admin.from('wa_conversations').insert({ wa_id: run.wa_id, name: run.name || null, profile_id: m.data?.id || null, profile_label: m.data?.label || null, connection_id: connId, status: 'aberta', last_message_at: agora, last_text: texto.slice(0, 140), unread: 0 }).select('id').single()
  return ins.data?.id || null
}

async function registrar(admin: any, connId: string, run: any, tipo: string, corpo: string, waMsgId: string, extra: { media_path?: string; mime?: string; template?: any }): Promise<void> {
  try {
    const cid = await garantirConversa(admin, connId, run, corpo)
    if (!cid) return
    const agora = new Date().toISOString()
    await admin.from('wa_messages').insert({ conversation_id: cid, wa_message_id: waMsgId || null, direction: 'out', type: tipo, body: corpo || null, media_path: extra.media_path || null, mime: extra.mime || null, template: extra.template || null, status: 'sent', sent_by: null, created_at: agora })
    const rotulo = tipo === 'image' ? '📷 ' + (corpo || 'Imagem') : tipo === 'video' ? '🎬 ' + (corpo || 'Vídeo') : tipo === 'audio' ? '🎤 Áudio' : corpo
    await admin.from('wa_conversations').update({ last_message_at: agora, last_text: '🤖 ' + String(rotulo || '').slice(0, 120) }).eq('id', cid)
  } catch (e) { /* o historico e so conforto */ }
}

// ---------- envio de cada bloco ----------
type Resultado = { ok: boolean; code: number; msgId: string; erro: string }
const cacheMidia: Record<string, { id: string; exp: number }> = {}

async function enviarMidia(admin: any, token: string, phoneId: string, to: string, s: Extract<PassoSeq, { tipo: 'audio' | 'imagem' | 'video' }>): Promise<Resultado & { mime?: string; legenda?: string }> {
  const falha = function(erro: string): Resultado { return { ok: false, code: 0, msgId: '', erro } }
  const cl = classificar(s.mime)
  if ('erro' in cl) return falha(cl.erro)
  let mediaId = ''
  const chave = phoneId + '|' + s.path
  const hit = cacheMidia[chave]
  if (hit && hit.exp > Date.now()) mediaId = hit.id
  if (!mediaId) {
    const dl = await admin.storage.from('wa-media').download(s.path)
    if (dl.error || !dl.data) return falha('O arquivo deste bloco não foi encontrado. Envie de novo.')
    const fd = new FormData()
    fd.append('messaging_product', 'whatsapp')
    fd.append('type', cl.mime)
    fd.append('file', new Blob([await dl.data.arrayBuffer()], { type: cl.mime }), String(s.nome || 'arquivo').replace(/[^\w.\- ()]/g, '_').slice(0, 100))
    let up: any = null
    try {
      const res = await fetch(GRAPH + '/' + phoneId + '/media', { method: 'POST', headers: { Authorization: 'Bearer ' + token }, body: fd })
      up = { ok: res.ok, data: await res.json().catch(function() { return null }) }
    } catch (e) { return { ok: false, code: -1, msgId: '', erro: 'Falha de rede ao enviar o arquivo.' } }
    if (!up.ok || !up.data?.id) return { ok: false, code: Number(up.data?.error?.code) || 0, msgId: '', erro: graphError(up.data) }
    mediaId = String(up.data.id)
    cacheMidia[chave] = { id: mediaId, exp: Date.now() + 20 * 60000 }
  }
  const obj: any = { id: mediaId }
  const legenda = s.tipo === 'audio' ? '' : String((s as any).legenda || '')
  if (legenda && cl.kind !== 'audio') obj.caption = legenda
  const r = await postMessage({ messaging_product: 'whatsapp', to, type: cl.kind, [cl.kind]: obj }, phoneId)
  if (r.ok) return { ok: true, code: 0, msgId: String(r.data?.messages?.[0]?.id || ''), erro: '', mime: cl.mime, legenda }
  return { ok: false, code: Number(r.data?.error?.code) || 0, msgId: '', erro: graphError(r.data) }
}

function foraDaJanela(c: any): boolean {
  const t = c?.last_inbound_at ? new Date(c.last_inbound_at).getTime() : 0
  return !t || Date.now() - t > JANELA_MS
}

const MSG_JANELA = 'Fora da janela de 24 horas: a pessoa precisa ter falado com você nas últimas 24 horas. Use um "Modelo aprovado" para este envio.'

// ---------- motor ----------
export async function processarSequencias(admin: any, token: string): Promise<{ processados: number; enviados: number; falhas: number }> {
  const out = { processados: 0, enviados: 0, falhas: 0 }
  const claim = await admin.rpc('wa_seq_claim', { p_n: 40 })
  const runs: any[] = claim.data || []
  if (runs.length === 0) return out
  const seqs: Record<string, any> = {}
  const conns: Record<string, any> = {}
  const inicio = Date.now()

  for (const run of runs) {
    if (Date.now() - inicio > 45000) { await admin.from('wa_seq_runs').update({ claimed_at: null }).eq('id', run.id); continue }
    out.processados++
    if (!seqs[run.seq_id]) {
      const f = await admin.from('wa_sequencias').select('*').eq('id', run.seq_id).maybeSingle()
      seqs[run.seq_id] = f.data || null
    }
    const sq = seqs[run.seq_id]
    const fim = async function(status: string, erro: string | null, extra?: any) {
      await admin.from('wa_seq_runs').update({ status, error: erro, claimed_at: null, updated_at: new Date().toISOString(), ...(extra || {}) }).eq('id', run.id)
    }
    if (!sq) { await fim('cancelado', 'Fluxo apagado'); continue }
    if (!sq.enabled && !run.is_test) { await fim('cancelado', 'Fluxo desligado'); continue }
    if (!sq.connection_id) { await fim('falhou', 'O fluxo não tem número de WhatsApp escolhido.'); continue }
    if (!conns[sq.connection_id]) {
      const c = await admin.from('wa_connections').select('*').eq('id', sq.connection_id).maybeSingle()
      conns[sq.connection_id] = c.data || null
    }
    const cn = conns[sq.connection_id]
    if (!cn || !cn.active) { await fim('falhou', 'O número de WhatsApp deste fluxo não está ativo.'); continue }

    // Chegou o limite de espera pela resposta da pessoa (se ela tivesse respondido, o bloco ja teria sido retomado)
    if (run.data && run.data.aguarda_resposta === true) {
      if (run.data.aguarda_acao === 'encerrar') { await fim('cancelado', 'A pessoa não respondeu'); continue }
      const limpo = { ...run.data }
      delete limpo.aguarda_resposta
      delete limpo.aguarda_acao
      run.data = limpo
      await admin.from('wa_seq_runs').update({ data: limpo }).eq('id', run.id)
    }

    const steps: PassoSeq[] = Array.isArray(run.data?.steps_override) ? run.data.steps_override : (Array.isArray(sq.steps) ? sq.steps : [])
    let idx: number = run.step_index
    let parou = false
    while (idx < steps.length) {
      const s = steps[idx]
      if (s.tipo === 'atraso') {
        const seg = Math.max(1, segundosDoAtraso(s))
        await fim('ativo', null, { step_index: idx + 1, next_run_at: new Date(Date.now() + seg * 1000).toISOString() })
        parou = true
        break
      }
      if (s.tipo === 'resposta') {
        // Fica esperando a pessoa responder (ate o limite escolhido, ou ate 30 dias)
        const seg = s.valor > 0 ? Math.max(1, segundosDoAtraso(s)) : MAX_ATRASO_S
        await fim('ativo', null, { step_index: idx + 1, next_run_at: new Date(Date.now() + seg * 1000).toISOString(), data: { ...(run.data || {}), aguarda_resposta: true, aguarda_acao: s.valor > 0 ? s.aoExpirar : 'encerrar' } })
        parou = true
        break
      }
      if (s.tipo === 'ia') {
        // Passa a conversa para o Junior: liga a IA nesta conversa e ele responde a ultima mensagem da pessoa (se estiver sem resposta), sem cumprimentar de novo
        const conv = await acharConversa(admin, sq.connection_id, run.wa_id)
        if (!conv) { await fim('concluido', null, { step_index: idx + 1 }); parou = true; break }
        try {
          await admin.from('wa_conversations').update({ ia_ativa: true, ia_humano: false }).eq('id', conv.id)
          await admin.from('wa_messages').insert({ conversation_id: conv.id, direction: 'out', type: 'system', body: MARCA_FLUXO_IA, status: 'sent', sent_by: null, created_at: new Date().toISOString() })
          await responderUltimaPendente(admin, conv.id)
        } catch (e) { console.error('[wa-seq] transferir para IA:', e) }
        await fim('concluido', null, { step_index: idx + 1 })
        parou = true
        break
      }
      // Fluxo de cobranca/carrinho: confere se a pessoa ja pagou
      if (!run.is_test && sq.cancel_on_purchase !== false && run.event_type !== 'palavra' && COMPRA.indexOf(run.event_type) < 0 && await jaPagou(admin, run)) {
        await fim('cancelado', 'A pessoa já pagou', { step_index: idx })
        parou = true
        break
      }
      let r: Resultado = { ok: false, code: 0, msgId: '', erro: 'Bloco não suportado.' }
      let tipoMsg = 'text'
      let corpo = ''
      let extra: { media_path?: string; mime?: string; template?: any } = {}
      if (s.tipo === 'modelo') {
        const passo: any = { tipo: 'modelo', template: s.template, language: s.language, params: s.params }
        r = await enviar(token, cn.phone_number_id, run.wa_id, passo, run)
        if (r.ok) { tipoMsg = 'template'; corpo = await textoDoModelo(cn, passo, run); extra = { template: { name: s.template, language: s.language, params: s.params.map(function(p) { return p.value }) } } }
      } else {
        // Texto, audio, imagem e video so dentro das 24 horas depois da ultima mensagem da pessoa
        const conv = await acharConversa(admin, sq.connection_id, run.wa_id)
        if (foraDaJanela(conv)) {
          r = { ok: false, code: -2, msgId: '', erro: MSG_JANELA }
        } else if (s.tipo === 'texto') {
          const texto = aplicaNome(s.texto, primeiroNome(run.name)).trim()
          // Trava: se esse mesmo texto ja foi enviado nesta conversa nos ultimos 15 minutos (ex.: dois fluxos esperando a mesma resposta), nao manda de novo
          let repetido = false
          if (conv && conv.id) {
            const rec = await admin.from('wa_messages').select('id').eq('conversation_id', conv.id).eq('direction', 'out').eq('type', 'text').eq('body', texto).gte('created_at', new Date(Date.now() - 15 * 60000).toISOString()).limit(1)
            repetido = !!(rec.data && rec.data.length > 0)
          }
          if (repetido) { idx++; continue }
          r = await enviarTexto(cn.phone_number_id, run.wa_id, texto)
          if (r.ok) { tipoMsg = 'text'; corpo = texto }
        } else {
          const m = await enviarMidia(admin, token, cn.phone_number_id, run.wa_id, s)
          r = m
          if (r.ok) { const k = classificar(s.mime); tipoMsg = 'erro' in k ? s.tipo : k.kind; corpo = String(m.legenda || ''); extra = { media_path: s.path, mime: m.mime } }
        }
      }
      if (r.ok) {
        out.enviados++; idx++
        await admin.from('wa_seq_sends').insert({ run_id: run.id, seq_id: run.seq_id, step_id: s.id, wa_message_id: r.msgId || null, status: 'sent', is_test: run.is_test === true })
        await registrar(admin, sq.connection_id, run, tipoMsg, corpo, r.msgId, extra)
        // Pausa natural: duas mensagens seguidas nao saem coladas. A proxima fica para daqui a 4 a 12 segundos
        // (o agendador passa a cada 15 segundos, entao na pratica chega entre 15 e 30 segundos depois).
        if (idx < steps.length && ehEnvio(steps[idx])) {
          await fim('ativo', null, { step_index: idx, next_run_at: new Date(Date.now() + (4 + Math.random() * 8) * 1000).toISOString() })
          parou = true
          break
        }
        continue
      }
      if (LIMITE.indexOf(r.code) >= 0 || r.code === -1) {
        // a Meta pediu calma (ou caiu a rede): tenta de novo daqui a pouco
        await fim('ativo', r.erro, { step_index: idx, next_run_at: new Date(Date.now() + 10 * 60000).toISOString() })
      } else {
        out.falhas++
        await admin.from('wa_seq_sends').insert({ run_id: run.id, seq_id: run.seq_id, step_id: s.id, status: 'failed', error: r.erro, is_test: run.is_test === true })
        await fim('falhou', r.erro, { step_index: idx })
      }
      parou = true
      break
    }
    if (!parou) await fim('concluido', null, { step_index: idx })
  }
  return out
}

async function enviarTexto(phoneId: string, to: string, texto: string): Promise<Resultado> {
  if (!texto) return { ok: false, code: 0, msgId: '', erro: 'Mensagem de texto vazia.' }
  const r = await postMessage({ messaging_product: 'whatsapp', to, type: 'text', text: { body: texto, preview_url: true } }, phoneId)
  if (r.ok) return { ok: true, code: 0, msgId: String(r.data?.messages?.[0]?.id || ''), erro: '' }
  return { ok: false, code: Number(r.data?.error?.code) || 0, msgId: '', erro: graphError(r.data) }
}
