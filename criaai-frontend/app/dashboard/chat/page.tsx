'use client'
import { useState, useRef, useEffect } from 'react'
import TextoComLinks from '@/components/layout/TextoComLinks'
import { createClient } from '@/lib/supabase-browser'
import styles from './chat.module.css'

// Suporte (chat com o Junior) no visual e no jeito do WhatsApp:
// balões verde/branco, horário e tiques, "digitando…", "gravando áudio…", áudio de ida e de volta,
// e a resposta chega em mensagens curtas, uma de cada vez, como uma pessoa escrevendo.

interface Message {
  id?: string
  role: 'user' | 'assistant'
  content: string
  imageUrl?: string
  human?: boolean
  audio?: boolean      // mensagem de voz
  audioUrl?: string    // so existe enquanto a página está aberta (não vai para o histórico)
  hora?: string
  lido?: boolean
}

type Status = 'online' | 'digitando' | 'gravando'

const STORAGE_KEY = 'mcpia_chat_history'
const ADMIN_SEEN_KEY = 'mcpia_chat_admin_seen'
const FOTO = '/avatar-junior/junior.jpg'

function agora() { return new Date().toISOString() }
function hhmm(iso?: string) {
  if (!iso) return ''
  try { return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) } catch (e) { return '' }
}
function esperar(ms: number) { return new Promise(function(r) { setTimeout(r, Math.max(0, ms)) }) }

function buildWelcome(firstName: string): Message {
  const name = firstName ? ', ' + firstName : ''
  return { role: 'assistant', content: 'A paz do Senhor' + name + '! 🙏\n\nAqui é o Júnior, do suporte da Mentoria Cristão Próspero.\n\nMe conta como posso te ajudar. Pode escrever, mandar áudio ou um print da tela.', hora: agora() }
}

// Quebra a resposta em mensagens curtas (como uma pessoa manda no WhatsApp): por parágrafo, no máximo 4
function partes(texto: string): string[] {
  const blocos = texto.split(/\n\s*\n/).map(function(t) { return t.trim() }).filter(Boolean)
  const out: string[] = []
  for (const b of blocos) {
    if (out.length && (out[out.length - 1].length < 60 || b.length < 25)) out[out.length - 1] += '\n\n' + b
    else out.push(b)
  }
  while (out.length > 4) { const u = out.pop() as string; out[out.length - 1] += '\n\n' + u }
  return out.length ? out : [texto]
}

// Player de áudio no jeito do WhatsApp (botão play, barra e tempo)
function Audio({ url, foto, saida }: { url?: string; foto?: string; saida: boolean }) {
  const ref = useRef<HTMLAudioElement>(null)
  const [tocando, setTocando] = useState(false)
  const [pos, setPos] = useState(0)
  const [dur, setDur] = useState(0)
  function fmt(s: number) { if (!isFinite(s) || s <= 0) return '0:00'; const m = Math.floor(s / 60); const r = Math.floor(s % 60); return m + ':' + (r < 10 ? '0' : '') + r }
  if (!url) return <div className={styles.audio}><i className="ti ti-microphone" style={{ fontSize: 22, color: 'var(--wa-meta)' }} /><span style={{ fontSize: 13, color: 'var(--wa-meta)' }}>Mensagem de voz</span></div>
  const pct = dur > 0 ? Math.min(100, (pos / dur) * 100) : 0
  return (
    <div className={styles.audio}>
      {!saida && foto && <img src={foto} alt="" className={styles.audioFoto} />}
      <button className={styles.audioPlay} aria-label={tocando ? 'Pausar' : 'Ouvir'} onClick={function() { const a = ref.current; if (!a) return; if (a.paused) a.play(); else a.pause() }}>
        <i className={'ti ' + (tocando ? 'ti-player-pause-filled' : 'ti-player-play-filled')} />
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className={styles.audioBarra}><span style={{ width: pct + '%' }} /><i style={{ left: pct + '%' }} /></div>
        <div className={styles.audioTempo}>{fmt(tocando || pos > 0 ? pos : dur)}</div>
      </div>
      <audio ref={ref} src={url} preload="metadata"
        onLoadedMetadata={function(e) { setDur((e.target as HTMLAudioElement).duration) }}
        onTimeUpdate={function(e) { setPos((e.target as HTMLAudioElement).currentTime) }}
        onPlay={function() { setTocando(true) }} onPause={function() { setTocando(false) }}
        onEnded={function() { setTocando(false); setPos(0) }} />
    </div>
  )
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([buildWelcome('')])
  const [firstName, setFirstName] = useState('')
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<Status>('online')
  const [hydrated, setHydrated] = useState(false)
  const [pendingImage, setPendingImage] = useState<string | null>(null)
  const [humanActive, setHumanActive] = useState(false)
  const [menu, setMenu] = useState(false)
  const [gravando, setGravando] = useState(false)
  const [segGravando, setSegGravando] = useState(0)
  const [erroAudio, setErroAudio] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const recRef = useRef<MediaRecorder | null>(null)
  const pedacosRef = useRef<Blob[]>([])
  const timerRef = useRef<any>(null)
  const cancelouRef = useRef(false)
  const supabase = createClient()

  useEffect(function() {
    async function init() {
      let name = ''
      let currentUserId: string | null = null
      try {
        const userResult = await supabase.auth.getUser()
        const user = userResult.data.user
        if (user) {
          currentUserId = user.id
          const profileResult = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
          name = ((profileResult.data?.full_name || '').split(' ')[0]) || ''
        }
      } catch (e) {}
      setFirstName(name)
      if (currentUserId) startHumanSync(currentUserId)
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
          const parsed = JSON.parse(saved)
          if (Array.isArray(parsed) && parsed.length > 0) { setMessages(parsed); setHydrated(true); return }
        }
      } catch (e) {}
      setMessages([buildWelcome(name)])
      setHydrated(true)
    }
    init()
  }, [])

  // Mensagens de um atendente humano: busca as que chegaram enquanto o aluno estava fora e escuta as novas
  function addHumanMessage(row: any) {
    setMessages(function(prev) {
      if (prev.some(function(m) { return m.id === row.id })) return prev
      return [...prev, { id: row.id, role: 'assistant', content: row.content, human: true, hora: row.created_at }]
    })
    try { localStorage.setItem(ADMIN_SEEN_KEY, row.created_at) } catch (e) {}
  }

  async function startHumanSync(userId: string) {
    try {
      let since = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      try { since = localStorage.getItem(ADMIN_SEEN_KEY) || since } catch (e) {}
      const missed = await supabase.from('chat_messages').select('id, content, created_at').eq('user_id', userId).eq('role', 'admin').gt('created_at', since).order('created_at', { ascending: true })
      if (missed.data) missed.data.forEach(addHumanMessage)
      const st = await supabase.from('chat_takeovers').select('active').eq('user_id', userId).maybeSingle()
      setHumanActive(st.data?.active === true)
      supabase
        .channel('chat_human_' + userId)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: 'user_id=eq.' + userId }, function(payload: any) {
          if (payload.new && payload.new.role === 'admin') addHumanMessage(payload.new)
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_takeovers', filter: 'user_id=eq.' + userId }, function(payload: any) {
          if (payload.new) setHumanActive(payload.new.active === true)
        })
        .subscribe()
    } catch (e) {}
  }

  // Histórico no aparelho (o áudio em si não é guardado, só o texto dele)
  useEffect(function() {
    if (!hydrated) return
    try {
      const leve = messages.map(function(m) { const c: any = { ...m }; delete c.audioUrl; return c })
      localStorage.setItem(STORAGE_KEY, JSON.stringify(leve.slice(-200)))
    } catch (e) {}
  }, [messages, hydrated])

  useEffect(function() { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, status])

  function marcarLido() {
    setMessages(function(prev) { return prev.map(function(m) { return m.role === 'user' && !m.lido ? { ...m, lido: true } : m }) })
  }

  function falar(m: Message) { setMessages(function(prev) { return [...prev, m] }) }

  async function enviar(conteudo: string, imagem: string | null, audioUrl?: string) {
    if (loading) return
    const userMsg: Message = { role: 'user', content: conteudo, imageUrl: imagem || undefined, audio: !!audioUrl, audioUrl, hora: agora(), lido: false }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setLoading(true)
    const inicio = Date.now()
    try {
      const sessionResult = await supabase.auth.getSession()
      const session = sessionResult.data.session
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (session ? session.access_token : '') },
        body: JSON.stringify({
          messages: newMessages.filter(function(m, idx) { return m.role !== 'assistant' || idx > 0 }).map(function(m) { return { role: m.role, content: m.content } }),
          imageBase64: imagem,
        }),
      })
      const data = await res.json()
      // "visualizou" a mensagem: tiques azuis
      await esperar(700 + Math.random() * 900 - (Date.now() - inicio))
      marcarLido()
      if (data.human) { setHumanActive(true); return }
      const resposta = String(data.reply || (res.ok ? '' : 'Não consegui responder agora. Pode mandar de novo?'))
      if (!resposta) return

      // Aluno mandou áudio: o Júnior responde em áudio (se a resposta não tiver link e não for longa demais)
      if (audioUrl && !/https?:\/\//i.test(resposta) && resposta.length <= 700) {
        setStatus('gravando')
        const t0 = Date.now()
        let urlVoz = ''
        try {
          const rv = await fetch('/api/chat/voz', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ texto: resposta.replace(/\*/g, '') }) })
          if (rv.ok) urlVoz = URL.createObjectURL(await rv.blob())
        } catch (e) {}
        await esperar(Math.min(9000, 2500 + resposta.length * 22) - (Date.now() - t0))
        setStatus('online')
        if (urlVoz) { falar({ role: 'assistant', content: resposta, audio: true, audioUrl: urlVoz, hora: agora() }); return }
      }

      // Texto: uma mensagem curta de cada vez, com "digitando…" antes de cada uma
      const ps = partes(resposta)
      for (let i = 0; i < ps.length; i++) {
        setStatus('digitando')
        const tempo = Math.min(7000, 900 + ps[i].length * 26) + Math.random() * 900
        await esperar(i === 0 ? tempo - (Date.now() - inicio) * 0.4 : tempo)
        setStatus('online')
        falar({ role: 'assistant', content: ps[i], hora: agora() })
        if (i < ps.length - 1) await esperar(500 + Math.random() * 700)
      }
    } catch (e) {
      falar({ role: 'assistant', content: 'Minha internet oscilou aqui. Pode mandar de novo?', hora: agora() })
    } finally {
      setStatus('online')
      setLoading(false)
    }
  }

  function send() {
    if ((!input.trim() && !pendingImage) || loading) return
    const txt = input.trim()
    const img = pendingImage
    setInput('')
    setPendingImage(null)
    enviar(txt, img)
  }

  // ---------- Áudio do aluno ----------
  async function comecarGravar() {
    setErroAudio('')
    if (loading) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const tipo = typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      const rec = new MediaRecorder(stream, { mimeType: tipo })
      pedacosRef.current = []
      cancelouRef.current = false
      rec.ondataavailable = function(e) { if (e.data && e.data.size) pedacosRef.current.push(e.data) }
      rec.onstop = function() {
        stream.getTracks().forEach(function(t) { t.stop() })
        clearInterval(timerRef.current)
        setGravando(false)
        if (cancelouRef.current) return
        const blob = new Blob(pedacosRef.current, { type: tipo })
        if (blob.size < 1500) return
        mandarAudio(blob)
      }
      recRef.current = rec
      rec.start()
      setGravando(true)
      setSegGravando(0)
      timerRef.current = setInterval(function() { setSegGravando(function(s) { if (s >= 179) { try { rec.stop() } catch (e) {} } return s + 1 }) }, 1000)
    } catch (e) {
      setErroAudio('Não consegui usar o microfone. Libere o microfone no navegador ou escreva a mensagem.')
    }
  }
  function pararGravar(cancelar: boolean) {
    cancelouRef.current = cancelar
    try { recRef.current?.stop() } catch (e) {}
  }
  async function mandarAudio(blob: Blob) {
    const url = URL.createObjectURL(blob)
    try {
      const fd = new FormData()
      fd.append('audio', blob, 'audio')
      const r = await fetch('/api/chat/audio', { method: 'POST', body: fd })
      const d = await r.json()
      if (!r.ok || !d.texto) { setErroAudio(d.error || 'Não consegui entender o áudio. Tente de novo ou escreva.'); return }
      enviar(String(d.texto), null, url)
    } catch (e) {
      setErroAudio('Não consegui enviar o áudio. Tente de novo.')
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { alert('Por favor, selecione uma imagem (print da tela).'); return }
    if (file.size > 5 * 1024 * 1024) { alert('A imagem precisa ter no máximo 5MB.'); return }
    const reader = new FileReader()
    reader.onload = function() { setPendingImage(reader.result as string) }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  function clearHistory() {
    setMenu(false)
    setMessages([buildWelcome(firstName)])
    try { localStorage.removeItem(STORAGE_KEY) } catch (e) {}
  }

  const textoStatus = status === 'digitando' ? 'digitando…' : status === 'gravando' ? 'gravando áudio…' : 'online'
  const temTexto = !!input.trim() || !!pendingImage
  const mm = Math.floor(segGravando / 60) + ':' + String(segGravando % 60).padStart(2, '0')

  return (
    <div className={styles.page}>
      <div className={styles.header} style={{ position: 'relative' }}>
        <img src={FOTO} alt="Júnior" className={styles.headerFoto} />
        <div className={styles.headerInfo}>
          <div className={styles.headerNome}>Júnior</div>
          <div className={styles.headerStatus}>{textoStatus}</div>
        </div>
        <button className={styles.headerBtn} aria-label="Mais opções" onClick={function() { setMenu(!menu) }}><i className="ti ti-dots-vertical" /></button>
        {menu && (
          <div className={styles.menu} onMouseLeave={function() { setMenu(false) }}>
            <button onClick={clearHistory}>Limpar conversa</button>
          </div>
        )}
      </div>

      <div className={styles.mensagens}>
        <div className={styles.dia}>Hoje</div>
        <div className={styles.aviso}>🔒 Conversa do suporte da Mentoria Cristão Próspero. Pode mandar texto, áudio ou print da tela.</div>
        {humanActive && <div className={styles.aviso}>Um atendente da equipe está cuidando da sua conversa. Pode mandar sua mensagem por aqui.</div>}
        {messages.map(function(msg, i) {
          const saida = msg.role === 'user'
          const anterior = messages[i - 1]
          const primeiro = !anterior || anterior.role !== msg.role
          return (
            <div key={i} className={styles.linha + ' ' + (saida ? styles.linhaOut : '') + ' ' + (primeiro ? styles.linhaNova : '')}>
              <div className={styles.balao + ' ' + (saida ? styles.balaoOut : styles.balaoIn) + ' ' + (primeiro ? styles.rabo : '')}>
                {msg.human && primeiro && <div className={styles.equipe}>Equipe</div>}
                {msg.imageUrl && <img src={msg.imageUrl} alt="Print enviado" className={styles.foto} />}
                {msg.audio
                  ? <>
                      <Audio url={msg.audioUrl} foto={FOTO} saida={saida} />
                      {saida && msg.content && <div className={styles.transcricao}>“{msg.content}”</div>}
                    </>
                  : (msg.content ? <TextoComLinks texto={msg.content} /> : null)}
                <span className={styles.meta}>
                  {hhmm(msg.hora)}
                  {saida && <i className={'ti ti-checks ' + styles.tick + ' ' + (msg.lido ? styles.tickLido : '')} />}
                </span>
              </div>
            </div>
          )
        })}
        {status === 'digitando' && (
          <div className={styles.linha + ' ' + styles.linhaNova}>
            <div className={styles.balao + ' ' + styles.balaoIn + ' ' + styles.rabo}><div className={styles.digitando}><span /><span /><span /></div></div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {pendingImage && (
        <div className={styles.anexo}>
          <img src={pendingImage} alt="Print anexado" />
          <span style={{ flex: 1 }}>Print anexado</span>
          <button className={styles.clipe} onClick={function() { setPendingImage(null) }} aria-label="Remover imagem"><i className="ti ti-x" /></button>
        </div>
      )}
      {erroAudio && <div className={styles.anexo} style={{ color: '#f15c6d' }}>{erroAudio}</div>}

      <div className={styles.barra}>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} style={{ display: 'none' }} />
        {gravando ? (
          <>
            <div className={styles.gravando}>
              <b /> {mm}
              <button className={styles.cancelar} onClick={function() { pararGravar(true) }} aria-label="Apagar áudio"><i className="ti ti-trash" /></button>
            </div>
            <button className={styles.enviar} onClick={function() { pararGravar(false) }} aria-label="Enviar áudio"><i className="ti ti-send" /></button>
          </>
        ) : (
          <>
            <div className={styles.campo}>
              <textarea
                value={input}
                rows={1}
                onChange={function(e) { setInput(e.target.value) }}
                onKeyDown={function(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                placeholder="Mensagem"
              />
              <button className={styles.clipe} onClick={function() { fileInputRef.current?.click() }} aria-label="Anexar print" title="Anexar um print da tela"><i className="ti ti-paperclip" /></button>
            </div>
            {temTexto
              ? <button className={styles.enviar} onClick={send} disabled={loading} aria-label="Enviar"><i className="ti ti-send" /></button>
              : <button className={styles.enviar} onClick={comecarGravar} disabled={loading} aria-label="Gravar áudio" title="Gravar áudio"><i className="ti ti-microphone" /></button>}
          </>
        )}
      </div>
    </div>
  )
}
