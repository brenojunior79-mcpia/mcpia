'use client'
import { useState, useRef, useEffect, useSyncExternalStore } from 'react'
import { MsgChat, assinarChat, estadoChat, iniciarChat, telaDoChat, adicionarMensagem, enviarAoChat, audioNaTela, confirmarAudio, tirarAudio, limparChat } from '@/lib/chatSuporte'
import TextoComLinks from '@/components/layout/TextoComLinks'
import { createClient } from '@/lib/supabase-browser'
import styles from './chat.module.css'

// Suporte (chat com o Junior) no visual e no jeito do WhatsApp:
// balões verde/branco, horário e tiques, "digitando…", "gravando áudio…", áudio de ida e de volta,
// e a resposta chega em mensagens curtas, uma de cada vez, como uma pessoa escrevendo.

type Message = MsgChat

const ADMIN_SEEN_KEY = 'mcpia_chat_admin_seen'
const FOTO = '/avatar-junior/junior.jpg'

function agora() { return new Date().toISOString() }
function hhmm(iso?: string) {
  if (!iso) return ''
  try { return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) } catch (e) { return '' }
}

const NOME = 'Breno/Suporte'

// Altura das ondinhas do audio (sempre a mesma)
const ONDAS = Array.from({ length: 34 }, function(_v, i) { return 5 + Math.round(Math.abs(Math.sin(i * 1.7) * 13 + Math.cos(i * 0.6) * 6)) })

// Icones desenhados direto (a fonte de icones nao carrega alguns no iPhone)
const IcPlay = <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l12.5-7.5z" fill="currentColor" /></svg>
const IcPause = <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="4.5" width="4" height="15" rx="1" fill="currentColor" /><rect x="14" y="4.5" width="4" height="15" rx="1" fill="currentColor" /></svg>
const IcMic = <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><rect x="8.5" y="2.5" width="7" height="12" rx="3.5" fill="currentColor" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" /></svg>
function Ticks({ lido }: { lido?: boolean }) {
  return <svg width="17" height="11" viewBox="0 0 17 11" aria-hidden="true" style={{ color: lido ? 'var(--wa-tick)' : 'var(--wa-meta)', flexShrink: 0 }}><path d="M1 6l3 3.2L10.5 1.5M6.5 9.2l.9.9L15.5 1.5" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

// Player de áudio igual ao WhatsApp: foto com microfone, play, bolinha e ondinhas; embaixo o tempo e a hora com os tiques
function Audio({ url, foto, saida, hora, lido, enviando }: { url?: string; foto?: string; saida: boolean; hora: string; lido?: boolean; enviando?: boolean }) {
  const ref = useRef<HTMLAudioElement>(null)
  const [tocando, setTocando] = useState(false)
  const [pos, setPos] = useState(0)
  const [dur, setDur] = useState(0)
  function fmt(s: number) { if (!isFinite(s) || s <= 0) return '0:00'; const m = Math.floor(s / 60); const r = Math.floor(s % 60); return m + ':' + (r < 10 ? '0' : '') + r }
  const pct = dur > 0 && isFinite(dur) ? Math.min(100, (pos / dur) * 100) : 0
  return (
    <div className={styles.audio}>
      <div className={styles.audioFotoBox}>
        {foto ? <img src={foto} alt="" className={styles.audioFoto} /> : <div className={styles.audioFoto + ' ' + styles.audioSemFoto}><svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="9" r="4.2" fill="currentColor" /><path d="M3.5 21a8.5 8.5 0 0 1 17 0z" fill="currentColor" /></svg></div>}
        <span className={styles.audioMic}>{IcMic}</span>
      </div>
      <button className={styles.audioPlay} aria-label={tocando ? 'Pausar' : 'Ouvir'} disabled={!url} onClick={function() { const a = ref.current; if (!a) return; if (a.paused) a.play(); else a.pause() }}>
        {tocando ? IcPause : IcPlay}
      </button>
      <div className={styles.audioMeio}>
        <div className={styles.ondas}>
          <i className={styles.ondaBola} style={{ left: pct + '%' }} />
          {ONDAS.map(function(h, k) { return <span key={k} className={(k / ONDAS.length) * 100 < pct ? styles.tocado : ''} style={{ height: h }} /> })}
        </div>
        <div className={styles.audioRodape}>
          <span>{fmt(tocando || pos > 0 ? pos : dur)}</span>
          <span className={styles.audioHora}>{hora}{saida && (enviando ? <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="2" fill="none" /><path d="M12 7.5V12l3 2" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" /></svg> : <Ticks lido={lido} />)}</span>
        </div>
      </div>
      {url && <audio ref={ref} src={url} preload="metadata"
        onLoadedMetadata={function(e) { const d = (e.target as HTMLAudioElement).duration; if (isFinite(d)) setDur(d) }}
        onDurationChange={function(e) { const d = (e.target as HTMLAudioElement).duration; if (isFinite(d)) setDur(d) }}
        onTimeUpdate={function(e) { setPos((e.target as HTMLAudioElement).currentTime) }}
        onPlay={function() { setTocando(true) }} onPause={function() { setTocando(false) }}
        onEnded={function() { setTocando(false); setPos(0) }} />}
    </div>
  )
}

export default function ChatPage() {
  // A conversa fica guardada fora da tela (lib/chatSuporte.ts): se o aluno sair para outro menu, a resposta continua chegando
  const chat = useSyncExternalStore(assinarChat, estadoChat, estadoChat)
  const messages = chat.mensagens
  const status = chat.status
  const loading = false
  const [input, setInput] = useState('')
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
    telaDoChat(true)
    iniciarChat()
    supabase.auth.getUser().then(function(r) { if (r.data.user) startHumanSync(r.data.user.id) }).catch(function() {})
    return function() { telaDoChat(false) }
  }, [])

  // Mensagens de um atendente humano: busca as que chegaram enquanto o aluno estava fora e escuta as novas
  function addHumanMessage(row: any) {
    adicionarMensagem({ id: row.id, role: 'assistant', content: row.content, human: true, hora: row.created_at })
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

  useEffect(function() { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, status])

  function enviar(conteudo: string, imagem: string | null, audioUrl?: string) { enviarAoChat(conteudo, imagem, audioUrl) }

  function send() {
    if (!input.trim() && !pendingImage) return
    const txt = input.trim()
    const img = pendingImage
    setInput('')
    setPendingImage(null)
    enviar(txt, img)
  }

  // ---------- Áudio do aluno ----------
  async function comecarGravar() {
    setErroAudio('')
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
    // Aparece no chat na hora (como no WhatsApp); o texto do audio chega por tras
    const idAudio = audioNaTela(url)
    try {
      const fd = new FormData()
      fd.append('audio', blob, 'audio')
      const r = await fetch('/api/chat/audio', { method: 'POST', body: fd })
      const d = await r.json()
      if (!r.ok || !d.texto) { tirarAudio(idAudio); setErroAudio(d.error || 'Não consegui entender o áudio. Tente de novo ou escreva.'); return }
      confirmarAudio(idAudio, String(d.texto))
    } catch (e) {
      tirarAudio(idAudio)
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
    limparChat()
  }


  const textoStatus = status === 'digitando' ? 'digitando…' : status === 'gravando' ? 'gravando áudio…' : 'online'
  const temTexto = !!input.trim() || !!pendingImage
  const mm = Math.floor(segGravando / 60) + ':' + String(segGravando % 60).padStart(2, '0')

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <a href="/dashboard" className={styles.voltar} aria-label="Voltar para o menu da plataforma"><i className="ti ti-chevron-left" /></a>
        <div className={styles.pilula}>
          <img src={FOTO} alt={NOME} className={styles.headerFoto} />
          <div className={styles.headerInfo}>
            <div className={styles.headerNome}>{NOME}</div>
            <div className={styles.headerStatus + ' ' + (status !== 'online' ? styles.headerStatusAtivo : '')}>{textoStatus}</div>
          </div>
        </div>
        {/* Camera: abre a galeria para mandar uma foto (print da tela, por exemplo) */}
        <button className={styles.headerBtn} aria-label="Mandar uma foto da galeria" onClick={function() { if (fileInputRef.current) fileInputRef.current.click() }}><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.6l1.3-1.8A1.5 1.5 0 0 1 10.6 3.6h2.8a1.5 1.5 0 0 1 1.2.6L15.9 6h1.6A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5z" /><circle cx="12" cy="12.4" r="3.6" /></svg></button>
      </div>

      <div className={styles.mensagens}>
        <div className={styles.dia}>Hoje</div>
        {humanActive && <div className={styles.aviso}>Um atendente da equipe está cuidando da sua conversa. Pode mandar sua mensagem por aqui.</div>}
        {messages.map(function(msg, i) {
          const saida = msg.role === 'user'
          const anterior = messages[i - 1]
          const proximo = messages[i + 1]
          const primeiro = !anterior || anterior.role !== msg.role
          const ultimo = !proximo || proximo.role !== msg.role
          return (
            <div key={i} className={styles.linha + ' ' + (saida ? styles.linhaOut : '') + ' ' + (primeiro ? styles.linhaNova : '')}>
              <div className={styles.balao + ' ' + (saida ? styles.balaoOut : styles.balaoIn) + ' ' + (ultimo ? styles.rabo : '')}>
                {msg.human && primeiro && <div className={styles.equipe}>Equipe</div>}
                {msg.imageUrl && <img src={msg.imageUrl} alt="Print enviado" className={styles.foto} />}
                {msg.audio
                  ? <>
                      <Audio url={msg.audioUrl} foto={saida ? undefined : FOTO} saida={saida} hora={hhmm(msg.hora)} lido={msg.lido} enviando={!!msg.pendente} />
                    </>
                  : (msg.content ? <TextoComLinks texto={msg.content} /> : null)}
                {!msg.audio && <span className={styles.meta}>
                  {hhmm(msg.hora)}
                  {saida && <Ticks lido={msg.lido} />}
                </span>}
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
          <button onClick={function() { setPendingImage(null) }} aria-label="Remover imagem"><i className="ti ti-x" /></button>
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
            <button className={styles.mais} onClick={function() { fileInputRef.current?.click() }} aria-label="Anexar" title="Anexar um print"><i className="ti ti-plus" /></button>
            <div className={styles.campo}>
              <textarea
                value={input}
                rows={1}
                onChange={function(e) { setInput(e.target.value) }}
                onKeyDown={function(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                aria-label="Mensagem"
              />
              <button className={styles.figurinha} onClick={function() { fileInputRef.current?.click() }} aria-label="Anexar imagem"><i className="ti ti-sticker" /></button>
            </div>
            {temTexto
              ? <button className={styles.enviar} onClick={send} aria-label="Enviar"><i className="ti ti-send" /></button>
              : <>
                  <button className={styles.camera} onClick={function() { fileInputRef.current?.click() }} aria-label="Enviar foto ou print"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.6l1.3-1.8A1.5 1.5 0 0 1 10.6 3.6h2.8a1.5 1.5 0 0 1 1.2.6L15.9 6h1.6A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5z" /><circle cx="12" cy="12.4" r="3.6" /></svg></button>
                  <button className={styles.enviar} onClick={comecarGravar} aria-label="Gravar áudio" title="Gravar áudio"><i className="ti ti-microphone" /></button>
                </>}
          </>
        )}
      </div>
    </div>
  )
}
