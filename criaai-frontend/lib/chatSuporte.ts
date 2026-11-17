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
}
export type StatusChat = 'online' | 'digitando' | 'gravando'

const STORAGE_KEY = 'mcpia_chat_history'
const NAO_LIDAS_KEY = 'mcpia_chat_nao_lidas'
const LIMPO_EM_KEY = 'mcpia_chat_limpo_em'

type Estado = { mensagens: MsgChat[]; status: StatusChat; naoLidas: number; carregado: boolean }
let estado: Estado = { mensagens: [], status: 'online', naoLidas: 0, carregado: false }
const ouvintes = new Set<() => void>()
let telaAberta = false
let iniciando: Promise<void> | null = null
let timerResp: any = null
let ocupado = false

function agora() { return new Date().toISOString() }
function esperar(ms: number) { return new Promise(function(r) { setTimeout(r, Math.max(0, ms)) }) }

function salvar() {
  try {
    const leve = estado.mensagens.map(function(m) { const c: any = { ...m }; delete c.audioUrl; return c })
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
  document.addEventListener('visibilitychange', function() { if (vendoAgora() && estado.naoLidas) mudar({ naoLidas: 0 }) })
}

export function adicionarMensagem(m: MsgChat) {
  if (m.id && estado.mensagens.some(function(x) { return x.id === m.id })) return
  const naoLidas = m.role === 'assistant' && !vendoAgora() ? estado.naoLidas + 1 : estado.naoLidas
  mudar({ mensagens: [...estado.mensagens, m], naoLidas })
}

function marcarLido() {
  mudar({ mensagens: estado.mensagens.map(function(m) { return m.role === 'user' && !m.lido ? { ...m, lido: true } : m }) })
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
      const supabase = createClient()
      const u = (await supabase.auth.getUser()).data.user
      if (u) {
        const ultAssist = lista.filter(function(m) { return m.role === 'assistant' && !m.human && m.hora }).map(function(m) { return new Date(m.hora as string).getTime() })
        let desde = ultAssist.length ? Math.max.apply(null, ultAssist) : Date.now() - 24 * 3600 * 1000
        try { const limpo = Number(localStorage.getItem(LIMPO_EM_KEY) || 0); if (limpo > desde) desde = limpo } catch (e) {}
        const r = await supabase.from('chat_messages').select('id, content, created_at').eq('user_id', u.id).eq('role', 'assistant').gt('created_at', new Date(desde + 1000).toISOString()).order('created_at', { ascending: true }).limit(20)
        for (const row of (r.data || []) as any[]) {
          const t = new Date(row.created_at).getTime()
          // so entra resposta que ainda nao esta na tela (as que ja apareceram tem hora depois da gravacao no servidor)
          if (lista.some(function(m) { return m.role === 'assistant' && m.content && String(row.content || '').indexOf(m.content.slice(0, 40)) >= 0 })) continue
          lista = lista.map(function(m) { return m.role === 'user' && m.hora && new Date(m.hora).getTime() <= t ? { ...m, lido: true } : m })
          lista.push({ id: 'db-' + row.id, role: 'assistant', content: String(row.content || ''), hora: row.created_at })
          naoLidas++
        }
      }
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
  try {
    const lista = estado.mensagens
    const pendentes = lista.filter(function(m) { return m.role === 'user' && !m.lido })
    if (!pendentes.length) return
    const imagem = pendentes.slice().reverse().find(function(m) { return !!m.imageUrl })?.imageUrl || null
    const veioAudio = !!pendentes[pendentes.length - 1].audio
    const supabase = createClient()
    const session = (await supabase.auth.getSession()).data.session
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (session ? session.access_token : '') },
      body: JSON.stringify({ messages: lista.map(function(m) { return { role: m.role, content: m.content } }), imageBase64: imagem }),
    })
    const data = await res.json()
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
    adicionarMensagem({ role: 'assistant', content: 'Minha internet oscilou aqui. Pode mandar de novo?', hora: agora() })
  } finally {
    mudar({ status: 'online' })
    ocupado = false
    // Chegou mensagem nova enquanto respondia: responde de novo, no tempo das mensagens seguintes
    if (estado.mensagens.some(function(m) { return m.role === 'user' && !m.lido })) agendarResposta()
  }
}

export function enviarAoChat(conteudo: string, imagem: string | null, audioUrl?: string) {
  mudar({ mensagens: [...estado.mensagens, { role: 'user', content: conteudo, imageUrl: imagem || undefined, audio: !!audioUrl, audioUrl, hora: agora(), lido: false }] })
  agendarResposta()
}

export function limparChat() {
  try { localStorage.setItem(LIMPO_EM_KEY, String(Date.now())) } catch (e) {}
  mudar({ mensagens: [], naoLidas: 0 })
}
