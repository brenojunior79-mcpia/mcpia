'use client'
// Conversa do menu Suporte (chat com o Junior), guardada FORA da tela.
// Antes, a espera de 1-2 minutos rodava dentro da tela do chat: se o aluno saisse para outro menu, a resposta se perdia.
// Agora a conversa continua rodando enquanto o aluno usa a plataforma, e o menu Suporte mostra a bolinha vermelha
// com o numero de mensagens que ele ainda nao viu (como no WhatsApp).
import { createClient } from '@/lib/supabase-browser'

export interface MsgChat {
  id?: string
  role: 'user' | 'assistant'
  content: string
  imageUrl?: string
  human?: boolean
  audio?: boolean      // mensagem de voz
  audioUrl?: string    // so existe enquanto a pagina esta aberta (nao vai para o historico)
  hora?: string
  lido?: boolean
  pendente?: boolean   // audio ja na tela, esperando o texto (transcricao)
  salvo?: boolean      // ja esta guardada no servidor
}
export type StatusChat = 'online' | 'digitando' | 'gravando'

const STORAGE_KEY = 'mcpia_chat_history'
const NAO_LIDAS_KEY = 'mcpia_chat_nao_lidas'
const LIMPO_EM_KEY = 'mcpia_chat_limpo_em'

type Estado = { mensagens: MsgChat[]; status: StatusChat; naoLidas: number; carregado: boolean; foto: string }
let estado: Estado = { mensagens: [], status: 'online', naoLidas: 0, carregado: false, foto: '' }
const ouvintes = new Set<() => void>()
let telaAberta = false
let iniciando: Promise<void> | null = null
let timerResp: any = null
let ocupado = false
let falhas = 0

function agora() { return new Date().toISOString() }
function esperar(ms: number) { return new Promise(function(r) { setTimeout(r, Math.max(0, ms)) }) }

function salvar() {
  try {
    const leve = estado.mensagens.filter(function(m) { return !m.pendente }).map(function(m) { const c: any = { ...m }; delete c.audioUrl; return c })
    localStorage.setItem(STORAGE_KEY, JSON.stringify(leve.slice(-200)))
    localStorage.setItem(NAO_LIDAS_KEY, String(estado.naoLidas))
  } catch (e) { /* sem armazenamento */ }
}
function mudar(parcial: Partial<Estado>) {
  estado = { ...estado, ...parcial }
  salvar()
  ouvintes.forEach(function(f) { f() })
}

export function assinarChat(f: () => void) { ouvintes.add(f); return function() { ouvintes.delete(f) } }
export function estadoChat(): Estado { return estado }

function vendoAgora() { return telaAberta && (typeof document === 'undefined' || document.visibilityState === 'visible') }

// A tela do chat avisa quando abre e fecha: com ela aberta, nada fica "nao lido"
export function telaDoChat(aberta: boolean) {
  telaAberta = aberta
  if (aberta && estado.naoLidas) mudar({ naoLidas: 0 })
}
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', function() {
    if (vendoAgora() && estado.naoLidas) mudar({ naoLidas: 0 })
    if (document.visibilityState === 'visible' && estado.carregado && !ocupado && estado.mensagens.some(function(m) { return m.role === 'user' && !m.lido })) agendarResposta(true)
    else if (document.visibilityState === 'visible') sincronizarChat()
  })
}

export function adicionarMensagem(m: MsgChat) {
  if (m.id && estado.mensagens.some(function(x) { return x.id === m.id })) return
  const naoLidas = m.role === 'assistant' && !vendoAgora() ? estado.naoLidas + 1 : estado.naoLidas
  mudar({ mensagens: [...estado.mensagens, m], naoLidas })
}

function marcarLido() {
  mudar({ mensagens: estado.mensagens.map(function(m) { return m.role === 'user' && !m.lido && !m.pendente ? { ...m, lido: true } : m }) })
}

// Tira a antiga mensagem automatica de boas-vindas do historico salvo no aparelho
function semBoasVindas(lista: MsgChat[]): MsgChat[] {
  return lista.filter(function(m, i) { return !(i === 0 && m.role === 'assistant' && !m.human && /^A paz do Senhor/.test(m.content) && /(assistente da Mentoria|do suporte da Mentoria)/i.test(m.content)) })
}

// Quebra a resposta em mensagens curtas (como uma pessoa manda no WhatsApp): por paragrafo, no maximo 4
export function partes(texto: string): string[] {
  const blocos = texto.split(/\n\s*\n/).map(function(t) { return t.trim() }).filter(Boolean)
  const out: string[] = []
  for (const b of blocos) {
    if (out.length && (out[out.length - 1].length < 60 || b.length < 25)) out[out.length - 1] += '\n\n' + b
    else out.push(b)
  }
  while (out.length > 4) { const u = out.pop() as string; out[out.length - 1] += '\n\n' + u }
  return out.length ? out : [texto]
}

// Carrega a conversa (uma vez por visita): historico do aparelho + respostas do Junior que ficaram guardadas no servidor
// (por exemplo, se a pagina foi recarregada durante a espera). Se tiver mensagem do aluno sem resposta, responde.
// A conversa vem do servidor (a mesma no celular, no aplicativo e no computador).
// O aparelho so guarda o que ainda nao chegou no servidor (mensagem do aluno esperando resposta) e marca quais eram audio.
async function doServidor(local: MsgChat[]): Promise<{ lista: MsgChat[]; novas: number } | null> {
  const supabase = createClient()
  const u = (await supabase.auth.getUser()).data.user
  if (!u) return null
  try {
    const pf = await supabase.from('profiles').select('avatar_url').eq('id', u.id).maybeSingle()
    const foto = String((pf.data as any)?.avatar_url || '')
    if (foto !== estado.foto) estado = { ...estado, foto }
  } catch (e) {}
  const desde = 0 // a conversa e a mesma em todos os aparelhos
  let q = supabase.from('chat_messages').select('id, role, content, created_at').eq('user_id', u.id).order('created_at', { ascending: false }).limit(120)
  if (desde) q = q.gt('created_at', new Date(desde).toISOString())
  const r = await q
  if (r.error) return null
  const rows = ((r.data || []) as any[]).slice().reverse()
  const lista: MsgChat[] = []
  let novas = 0
  let ultimo = 0
  for (const row of rows) {
    const hora = String(row.created_at)
    const t = new Date(hora).getTime()
    if (t > ultimo) ultimo = t
    const content = String(row.content || '').replace(/\s*\[imagem anexada\]\s*$/, '').trim()
    if (row.role === 'user') {
      const mesmo = local.find(function(m) { return m.id === 'db-' + row.id })
      if (mesmo) { lista.push({ ...mesmo, lido: mesmo.lido !== false, hora }); continue }
      const loc = local.find(function(m) { return m.role === 'user' && m.audio && m.content && content.indexOf(m.content) >= 0 })
      lista.push({ id: 'db-' + row.id, role: 'user', content: content || '📷 Imagem', hora, lido: true, ...(loc ? { audio: true, audioUrl: loc.audioUrl } : {}) })
    } else {
      const ps = partes(content)
      for (let k = 0; k < ps.length; k++) {
        const ja = local.some(function(m) { return m.role === 'assistant' && !!m.content && (m.content === ps[k] || ps[k].indexOf(m.content.slice(0, 40)) >= 0) })
        if (!ja) novas++
        const loc = local.find(function(m) { return m.role === 'assistant' && m.audio && m.content === content })
        if (loc && ps.length === 1) lista.push({ id: 'db-' + row.id, role: 'assistant', content, hora, audio: true, audioUrl: loc.audioUrl })
        else lista.push({ id: 'db-' + row.id + '-' + k, role: 'assistant', content: ps[k], hora })
      }
    }
  }
  // O que o aluno mandou e ainda nao foi respondido (ainda nao esta no servidor) continua na tela
  for (const m of local) {
    if (m.role === 'user' && !m.lido && !lista.some(function(x) { return x.id === m.id }) && (m.pendente || !m.hora || new Date(m.hora).getTime() > ultimo - 1000)) lista.push(m)
  }
  // Conversa nova (servidor vazio): mantem o que esta no aparelho
  if (!rows.length) return { lista: local, novas: 0 }
  return { lista, novas }
}

// Voltou para a tela (ou trocou de aparelho): busca de novo no servidor
let sincronizando = false
export async function sincronizarChat() {
  if (sincronizando || ocupado || timerResp || !estado.carregado) return
  sincronizando = true
  try {
    const r = await doServidor(estado.mensagens)
    if (r && !ocupado) mudar({ mensagens: r.lista, naoLidas: vendoAgora() ? 0 : estado.naoLidas + r.novas })
  } catch (e) {} finally { sincronizando = false }
}

export function iniciarChat(): Promise<void> {
  if (iniciando) return iniciando
  iniciando = (async function() {
    let lista: MsgChat[] = []
    let naoLidas = 0
    try {
      const salvo = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
      if (Array.isArray(salvo)) lista = semBoasVindas(salvo)
      naoLidas = Number(localStorage.getItem(NAO_LIDAS_KEY) || 0) || 0
    } catch (e) {}
    try {
      const r = await doServidor(lista)
      if (r) { lista = r.lista; naoLidas += r.novas }
    } catch (e) {}
    estado = { ...estado, mensagens: lista, naoLidas: vendoAgora() ? 0 : naoLidas, carregado: true }
    salvar()
    ouvintes.forEach(function(f) { f() })
    if (lista.some(function(m) { return m.role === 'user' && !m.lido })) agendarResposta(true)
  })()
  return iniciando
}

// Tempo de resposta como uma pessoa (ordem do Breno): primeira mensagem da conversa em ~2 minutos, as seguintes em ~1 minuto.
// Enquanto espera, o aluno pode mandar mais mensagens; o Junior responde tudo junto, no fim da espera.
function agendarResposta(retomando?: boolean) {
  if (timerResp || ocupado) return
  const lista = estado.mensagens
  const conversando = lista.some(function(m) { return m.role === 'assistant' && m.hora && Date.now() - new Date(m.hora).getTime() < 3 * 3600 * 1000 })
  let espera = (conversando ? 60000 : 120000) + Math.random() * 8000
  if (retomando) {
    // voltou depois de recarregar: conta o tempo desde a mensagem do aluno
    const pend = lista.find(function(m) { return m.role === 'user' && !m.lido })
    const desde = pend && pend.hora ? Date.now() - new Date(pend.hora).getTime() : 0
    espera = Math.max(30000, espera - desde)
  }
  // A IA e chamada ~25s antes, para a resposta ficar pronta e o "digitando..." terminar perto do tempo certo
  timerResp = setTimeout(function() { timerResp = null; responder() }, Math.max(3000, espera - 25000))
}

async function responder() {
  if (ocupado) return
  ocupado = true
  let retentar = false
  try {
    const lista = estado.mensagens
    const pendentes = lista.filter(function(m) { return m.role === 'user' && !m.lido && !m.pendente })
    if (!pendentes.length) return
    const imagem = pendentes.slice().reverse().find(function(m) { return !!m.imageUrl })?.imageUrl || null
    const veioAudio = !!pendentes[pendentes.length - 1].audio
    const supabase = createClient()
    const session = (await supabase.auth.getSession()).data.session
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (session ? session.access_token : '') },
      body: JSON.stringify({ messages: lista.filter(function(m) { return !m.pendente && !(m.role === 'assistant' && /^Minha internet oscilou aqui/.test(m.content)) }).map(function(m) { return { role: m.role, content: m.content } }), imageBase64: imagem, enviadaEm: pendentes[0].hora || null, jaSalvo: pendentes.every(function(m) { return !!m.salvo }) }),
    })
    const data = await res.json()
    falhas = 0
    marcarLido() // "visualizou": tiques azuis
    await esperar(2500 + Math.random() * 3000)
    if (data.human) return
    const resposta = String(data.reply || (res.ok ? '' : 'Não consegui responder agora. Pode mandar de novo?'))
    if (!resposta) return

    // Aluno mandou audio: o Junior responde em audio (se a resposta nao tiver link e nao for longa demais)
    if (veioAudio && !/https?:\/\//i.test(resposta) && resposta.length <= 700) {
      mudar({ status: 'gravando' })
      const t0 = Date.now()
      let urlVoz = ''
      try {
        const rv = await fetch('/api/chat/voz', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ texto: resposta.replace(/\*/g, '') }) })
        if (rv.ok) urlVoz = URL.createObjectURL(await rv.blob())
      } catch (e) {}
      await esperar(Math.min(20000, 6000 + resposta.length * 60) - (Date.now() - t0))
      mudar({ status: 'online' })
      if (urlVoz) { adicionarMensagem({ role: 'assistant', content: resposta, audio: true, audioUrl: urlVoz, hora: agora() }); return }
    }

    // Texto: uma mensagem curta de cada vez, com "digitando..." no tempo de quem escreve no celular
    const ps = partes(resposta)
    for (let i = 0; i < ps.length; i++) {
      mudar({ status: 'digitando' })
      await esperar(Math.min(18000, 3000 + ps[i].length * 60) + Math.random() * 1500)
      mudar({ status: 'online' })
      adicionarMensagem({ role: 'assistant', content: ps[i], hora: agora() })
      if (i < ps.length - 1) await esperar(1200 + Math.random() * 1500)
    }
  } catch (e) {
    // Falha de internet (comum no celular quando o aluno sai do app): nao mostra erro; tenta de novo sozinho daqui a pouco
    falhas++
    if (falhas <= 5) { retentar = true; setTimeout(function() { responder() }, 15000 * falhas) }
  } finally {
    mudar({ status: 'online' })
    ocupado = false
    if (retentar) return
    // Chegou mensagem nova enquanto respondia: responde de novo, no tempo das mensagens seguintes
    if (estado.mensagens.some(function(m) { return m.role === 'user' && !m.lido })) agendarResposta()
  }
}

export function enviarAoChat(conteudo: string, imagem: string | null, audioUrl?: string) {
  const id = 'l-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7)
  const hora = agora()
  mudar({ mensagens: [...estado.mensagens, { id, role: 'user', content: conteudo, imageUrl: imagem || undefined, audio: !!audioUrl, audioUrl, hora, lido: false }] })
  if (!imagem) salvarNoServidor(id, conteudo, hora)
  agendarResposta()
}

// Guarda a fala do aluno no servidor na hora (aparece nos outros aparelhos); o id passa a ser o do servidor
async function salvarNoServidor(id: string, content: string, hora: string) {
  try {
    const r = await fetch('/api/chat/salvar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content, hora }) })
    const d = await r.json()
    if (r.ok && d.id) mudar({ mensagens: estado.mensagens.map(function(m) { return m.id === id ? { ...m, id: 'db-' + d.id, salvo: true } : m }) })
  } catch (e) {}
}

// Audio do aluno: aparece na hora; quando o texto (transcricao) chega, segue para o Junior
export function audioNaTela(audioUrl: string): string {
  const id = 'a-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7)
  mudar({ mensagens: [...estado.mensagens, { id, role: 'user', content: '', audio: true, audioUrl, hora: agora(), lido: false, pendente: true }] })
  return id
}
export function confirmarAudio(id: string, texto: string) {
  mudar({ mensagens: estado.mensagens.map(function(m) { return m.id === id ? { ...m, content: texto, pendente: false } : m }) })
  const m = estado.mensagens.find(function(x) { return x.id === id })
  if (m) salvarNoServidor(id, texto, m.hora || agora())
  agendarResposta()
}
export function tirarAudio(id: string) {
  mudar({ mensagens: estado.mensagens.filter(function(m) { return m.id !== id }) })
}

export function limparChat() {
  try { localStorage.setItem(LIMPO_EM_KEY, String(Date.now())) } catch (e) {}
  mudar({ mensagens: [], naoLidas: 0 })
}
