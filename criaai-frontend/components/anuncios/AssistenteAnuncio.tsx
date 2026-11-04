'use client'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { AVATARES, avatarSvg, Boca } from '@/lib/avatares'
import { QUADROS } from '@/lib/avatarEscritorio'

type Msg = { role: 'user' | 'assistant'; content: string }
type Opcao = { id: string; nome: string }
type Midia = { path: string; tipo: 'video' | 'imagem'; nome: string; videoId?: string }

const AVATAR = AVATARES.filter(function(a) { return a.id === 'camila' })[0]
const SAUDACAO = 'Oi! Eu sou a Camila. Vou criar o seu anúncio de vendas junto com você, é bem simples. Pra começar: qual produto você quer anunciar?'
const FALA_SAUDACAO = 'Oi! Eu sou a Camila. Vou criar o seu anuncio de vendas junto com você, é bem simples. Pra começar: qual produto você quer anunciar?'
const MAX_VIDEO = 50 * 1024 * 1024
const MAX_IMAGEM = 8 * 1024 * 1024

const cx = {
  fundo: 'linear-gradient(160deg,#1a1033 0%,#2a1757 55%,#15102b 100%)',
  painel: 'rgba(255,255,255,0.06)',
  borda: '1px solid rgba(255,255,255,0.12)',
}

export default function AssistenteAnuncio({ onClose, onCriado }: { onClose: () => void; onCriado?: () => void }) {
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [rascunho, setRascunho] = useState<any>(null)
  const [falta, setFalta] = useState<string[]>([])
  const [pronto, setPronto] = useState(false)
  const [paginas, setPaginas] = useState<Opcao[]>([])
  const [pixels, setPixels] = useState<Opcao[]>([])
  const [midia, setMidia] = useState<Midia | null>(null)
  const [texto, setTexto] = useState('')
  const [pensando, setPensando] = useState(false)
  const [falando, setFalando] = useState(false)
  const [gravando, setGravando] = useState(false)
  const [conversaAtiva, setConversaAtiva] = useState(false)
  const [enviandoMidia, setEnviandoMidia] = useState(false)
  const [criando, setCriando] = useState(false)
  const [vozLigada, setVozLigada] = useState(true)
  const [erro, setErro] = useState('')
  const [resultado, setResultado] = useState<any>(null)
  const [quadros, setQuadros] = useState<Record<string, string>>({})
  const [quadroAtual, setQuadroAtual] = useState('base')
  const [podeCriarImgs, setPodeCriarImgs] = useState(false)
  const [progImg, setProgImg] = useState('')
  const [somBloqueado, setSomBloqueado] = useState(false)

  const avatarRef = useRef<HTMLDivElement>(null)
  const temQuadrosRef = useRef(false)
  const quadroAtualRef = useRef('base')
  const pendenteRef = useRef('')
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const ctxRef = useRef<AudioContext | null>(null)
  const analiserRef = useRef<AnalyserNode | null>(null)
  const fonteRef = useRef(false)
  const quadroRef = useRef<number>(0)
  const bocaRef = useRef<Boca>(0)
  const piscarRef = useRef(false)
  const recRef = useRef<MediaRecorder | null>(null)
  const pedacosRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const falaIdRef = useRef(0)
  const ativaRef = useRef(false)
  const gravandoRef = useRef(false)
  const falandoRef = useRef(false)
  const ocupadoRef = useRef(false)
  const vadCtxRef = useRef<AudioContext | null>(null)
  const vadAnRef = useRef<AnalyserNode | null>(null)
  const vadTimerRef = useRef<number>(0)
  const baseRef = useRef(0.01)
  const nivelRef = useRef(0)
  const somDesdeRef = useRef(0)
  const ultimoSomRef = useRef(0)
  const inicioFalaRef = useRef(0)
  const enviarRef = useRef<((t: string) => void) | null>(null)
  const fimRef = useRef<HTMLDivElement>(null)
  const msgsRef = useRef<Msg[]>([])
  const rascunhoRef = useRef<any>(null)
  const midiaRef = useRef<Midia | null>(null)
  const vozRef = useRef(true)

  useEffect(function() { temQuadrosRef.current = !!quadros.base }, [quadros])
  useEffect(function() {
    fetch('/api/avatar/escritorio').then(function(r) { return r.json() }).then(function(j) {
      if (j && !j.error) { setQuadros(j.quadros || {}); setPodeCriarImgs(!!j.podeCriar) }
    }).catch(function() {})
  }, [])
  // A conversa comeca sozinha ao abrir (o toque no botao "Criar anuncio" libera o som e o microfone)
  useEffect(function() { comecar() }, [])
  useEffect(function() { falandoRef.current = falando }, [falando])
  useEffect(function() { ocupadoRef.current = pensando || criando }, [pensando, criando])
  useEffect(function() { msgsRef.current = msgs }, [msgs])
  useEffect(function() { rascunhoRef.current = rascunho }, [rascunho])
  useEffect(function() { midiaRef.current = midia }, [midia])
  useEffect(function() { vozRef.current = vozLigada; if (!vozLigada) pararFala() }, [vozLigada])
  useEffect(function() { if (fimRef.current) fimRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [msgs, pensando, pronto, resultado])

  function desenhar() {
    if (avatarRef.current) avatarRef.current.innerHTML = avatarSvg(AVATAR, bocaRef.current, piscarRef.current).replace('width="400" height="400"', 'width="100%" height="100%"')
  }

  // Avatar: a boca acompanha o volume da voz e os olhos piscam de vez em quando
  useEffect(function() {
    desenhar()
    let ultimo = 0
    let proxPiscar = Date.now() + 2500
    let fimPiscar = 0
    function loop() {
      let boca: Boca = 0
      const an = analiserRef.current
      if (an && audioRef.current && !audioRef.current.paused) {
        const dados = new Uint8Array(an.fftSize)
        an.getByteTimeDomainData(dados)
        let soma = 0
        for (let i = 0; i < dados.length; i++) { const v = (dados[i] - 128) / 128; soma += v * v }
        const rms = Math.sqrt(soma / dados.length)
        boca = rms > 0.12 ? 2 : rms > 0.04 ? 1 : 0
      }
      const agora = Date.now()
      let piscar = piscarRef.current
      if (!piscar && agora > proxPiscar) { piscar = true; fimPiscar = agora + 140; proxPiscar = agora + 2500 + Math.random() * 3000 }
      else if (piscar && agora > fimPiscar) piscar = false
      if (temQuadrosRef.current) {
        // Imagens da Camila: boca fechada, meio aberta, aberta e piscando
        const q = piscar && boca === 0 ? 'piscando' : boca === 2 ? 'aberta' : boca === 1 ? 'meia' : 'base'
        if (q !== quadroAtualRef.current) { quadroAtualRef.current = q; setQuadroAtual(q) }
        bocaRef.current = boca
      } else if (boca !== bocaRef.current || piscar !== piscarRef.current || agora - ultimo > 1000) {
        bocaRef.current = boca; piscarRef.current = piscar; ultimo = agora; desenhar()
      }
      quadroRef.current = requestAnimationFrame(loop)
    }
    quadroRef.current = requestAnimationFrame(loop)
    return function() {
      cancelAnimationFrame(quadroRef.current)
      pararFala()
      if (vadTimerRef.current) window.clearInterval(vadTimerRef.current)
      if (streamRef.current) streamRef.current.getTracks().forEach(function(t) { t.stop() })
      if (vadCtxRef.current) { try { vadCtxRef.current.close() } catch (e) {} }
      if (ctxRef.current) { try { ctxRef.current.close() } catch (e) {} }
    }
  }, [])

  function prepararAudio() {
    if (!audioRef.current) audioRef.current = new Audio()
    if (!ctxRef.current) {
      const AC: any = (window as any).AudioContext || (window as any).webkitAudioContext
      if (AC) {
        ctxRef.current = new AC()
        analiserRef.current = ctxRef.current!.createAnalyser()
        analiserRef.current!.fftSize = 512
      }
    }
    if (ctxRef.current && analiserRef.current && !fonteRef.current && audioRef.current) {
      try {
        const src = ctxRef.current.createMediaElementSource(audioRef.current)
        src.connect(analiserRef.current)
        analiserRef.current.connect(ctxRef.current.destination)
        fonteRef.current = true
      } catch (e) {}
    }
    if (ctxRef.current && ctxRef.current.state === 'suspended') ctxRef.current.resume()
  }

  function pararFala() {
    falaIdRef.current++
    const a = audioRef.current
    if (a) { try { a.pause(); a.currentTime = 0 } catch (e) {} }
    setFalando(false)
  }

  async function falar(t: string) {
    if (!vozRef.current) return
    prepararAudio()
    pararFala()
    const meuId = ++falaIdRef.current
    try {
      const r = await fetch('/api/anuncios/assistente/falar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ texto: t }) })
      if (!r.ok) return
      const blob = await r.blob()
      if (meuId !== falaIdRef.current || !vozRef.current || gravandoRef.current) return
      const a = audioRef.current!
      a.src = URL.createObjectURL(blob)
      a.onended = function() { setFalando(false) }
      setFalando(true)
      await a.play()
    } catch (e: any) {
      setFalando(false)
      if (e && e.name === 'NotAllowedError') { pendenteRef.current = t; setSomBloqueado(true) }
    }
  }

  async function comecar() {
    prepararAudio()
    ativarConversa()
    setMsgs([{ role: 'assistant', content: SAUDACAO }])
    falar(FALA_SAUDACAO)
    try {
      const r = await fetch('/api/anuncios/assistente/contexto')
      const j = await r.json()
      if (!r.ok) { setErro(j.error || 'Nao consegui carregar a conta.'); return }
      setPaginas((j.paginas || []).map(function(p: any) { return { id: p.id, nome: p.name } }))
      setPixels((j.pixels || []).map(function(p: any) { return { id: p.id, nome: p.name } }))
      if (j.avisos && j.avisos.length) setErro(j.avisos.join(' '))
    } catch (e) { setErro('Nao consegui carregar a conta.') }
  }

  async function enviar(conteudo: string, comMidia?: Midia | null) {
    const t = conteudo.trim()
    if (!t || pensando) return
    setErro('')
    pararFala()
    const lista = msgsRef.current.concat([{ role: 'user', content: t }])
    setMsgs(lista)
    setTexto('')
    setPensando(true)
    try {
      const m = comMidia === undefined ? midiaRef.current : comMidia
      const r = await fetch('/api/anuncios/assistente/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensagens: lista, rascunho: rascunhoRef.current, temMidia: !!m }),
      })
      const j = await r.json()
      if (!r.ok) { setErro(j.error || 'Nao consegui responder agora.'); setPensando(false); return }
      setMsgs(lista.concat([{ role: 'assistant', content: j.fala }]))
      setRascunho(j.rascunho); setFalta(j.falta || []); setPronto(!!j.pronto)
      if (j.paginas) setPaginas(j.paginas)
      if (j.pixels) setPixels(j.pixels)
      setPensando(false)
      falar(j.fala)
    } catch (e) { setErro('Nao consegui responder agora.'); setPensando(false) }
  }

  // ----- Conversa sem apertar botao -----
  // Ela escuta o microfone o tempo todo: quando voce fala, ela se cala; quando voce para de falar (1,3 s de silencio), ela responde.
  function tickVad() {
    const an = vadAnRef.current
    if (!an || !ativaRef.current) return
    const dados = new Uint8Array(an.fftSize)
    an.getByteTimeDomainData(dados)
    let soma = 0
    for (let i = 0; i < dados.length; i++) { const v = (dados[i] - 128) / 128; soma += v * v }
    const rms = Math.sqrt(soma / dados.length)
    nivelRef.current = rms
    const agora = Date.now()
    // Enquanto ela fala o limiar sobe, para o som do alto-falante nao ser confundido com a sua voz
    const limiar = Math.max(0.03, baseRef.current * 3) * (falandoRef.current ? 2.5 : 1)
    const fala = rms > limiar
    if (!gravandoRef.current) {
      if (!fala) { baseRef.current = baseRef.current * 0.95 + rms * 0.05; somDesdeRef.current = 0; return }
      if (ocupadoRef.current) return
      if (!somDesdeRef.current) somDesdeRef.current = agora
      if (agora - somDesdeRef.current >= 120) iniciarGravacao()
    } else {
      if (fala) ultimoSomRef.current = agora
      else if (agora - ultimoSomRef.current >= 1300) finalizarGravacao()
      else if (agora - inicioFalaRef.current > 60000) finalizarGravacao()
    }
  }

  function iniciarGravacao() {
    const stream = streamRef.current
    if (!stream) return
    pararFala()
    try {
      const tipo = (window as any).MediaRecorder && MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : (MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '')
      const rec = tipo ? new MediaRecorder(stream, { mimeType: tipo }) : new MediaRecorder(stream)
      pedacosRef.current = []
      rec.ondataavailable = function(e) { if (e.data && e.data.size) pedacosRef.current.push(e.data) }
      rec.onstop = async function() {
        const durFala = ultimoSomRef.current - inicioFalaRef.current
        const blob = new Blob(pedacosRef.current, { type: rec.mimeType || 'audio/webm' })
        if (!ativaRef.current || durFala < 450 || blob.size < 1500) return
        setPensando(true); ocupadoRef.current = true
        try {
          const fd = new FormData()
          fd.append('audio', blob, 'fala')
          const r = await fetch('/api/anuncios/assistente/transcrever', { method: 'POST', body: fd })
          const j = await r.json()
          setPensando(false); ocupadoRef.current = false
          if (!r.ok) { setErro(j.error || 'Nao consegui entender o audio.'); return }
          if (!j.texto || j.texto.length < 2) return
          if (enviarRef.current) enviarRef.current(j.texto)
        } catch (e) { setPensando(false); ocupadoRef.current = false; setErro('Nao consegui entender o audio.') }
      }
      recRef.current = rec
      rec.start()
      gravandoRef.current = true
      inicioFalaRef.current = Date.now()
      ultimoSomRef.current = Date.now()
      setGravando(true)
    } catch (e) { gravandoRef.current = false }
  }

  function finalizarGravacao() {
    gravandoRef.current = false
    somDesdeRef.current = 0
    setGravando(false)
    const rec = recRef.current
    if (rec && rec.state !== 'inactive') { try { rec.stop() } catch (e) {} }
  }

  async function ativarConversa() {
    if (ativaRef.current) return
    prepararAudio()
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } })
      const AC: any = (window as any).AudioContext || (window as any).webkitAudioContext
      const ctx = new AC()
      const an = ctx.createAnalyser()
      an.fftSize = 1024
      ctx.createMediaStreamSource(stream).connect(an)
      streamRef.current = stream; vadCtxRef.current = ctx; vadAnRef.current = an
      baseRef.current = 0.01
      ativaRef.current = true
      setConversaAtiva(true)
      vadTimerRef.current = window.setInterval(tickVad, 60)
    } catch (e) {
      setErro('Não consegui usar o microfone. Libere o microfone no navegador ou escreva a sua resposta.')
    }
  }

  function pausarConversa() {
    ativaRef.current = false
    gravandoRef.current = false
    if (vadTimerRef.current) { window.clearInterval(vadTimerRef.current); vadTimerRef.current = 0 }
    const rec = recRef.current
    if (rec && rec.state !== 'inactive') { try { rec.stop() } catch (e) {} }
    if (streamRef.current) { streamRef.current.getTracks().forEach(function(t) { t.stop() }); streamRef.current = null }
    if (vadCtxRef.current) { try { vadCtxRef.current.close() } catch (e) {} vadCtxRef.current = null }
    vadAnRef.current = null
    setConversaAtiva(false); setGravando(false)
  }

  // ----- Video ou imagem -----
  async function anexar(arquivo: File | null) {
    if (!arquivo) return
    setErro('')
    const ehVideo = /^video\//.test(arquivo.type) || /\.(mp4|mov|m4v|webm)$/i.test(arquivo.name)
    if (ehVideo && arquivo.size > MAX_VIDEO) { setErro('O vídeo passa de 50 MB. Envie um vídeo menor.'); return }
    if (!ehVideo && arquivo.size > MAX_IMAGEM) { setErro('A imagem passa de 8 MB. Envie uma imagem menor.'); return }
    setEnviandoMidia(true)
    try {
      const r = await fetch('/api/anuncios/assistente/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome: arquivo.name }) })
      const j = await r.json()
      if (!r.ok) { setErro(j.error || 'Nao consegui preparar o envio.'); setEnviandoMidia(false); return }
      const up = await createClient().storage.from('wa-media').uploadToSignedUrl(j.path, j.token, arquivo)
      if (up.error) { setErro('Não consegui enviar o arquivo. Tente de novo.'); setEnviandoMidia(false); return }
      const nova: Midia = { path: j.path, tipo: j.tipo, nome: arquivo.name }
      setMidia(nova); midiaRef.current = nova
      setEnviandoMidia(false)
      enviar(j.tipo === 'video' ? 'Anexei o vídeo do anúncio.' : 'Anexei a imagem do anúncio.', nova)
    } catch (e) { setErro('Não consegui enviar o arquivo. Tente de novo.'); setEnviandoMidia(false) }
  }

  async function criar() {
    if (!pronto || !midia || criando) return
    setCriando(true); setErro(''); pararFala()
    try {
      const r = await fetch('/api/anuncios/assistente/criar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rascunho, midia }) })
      const j = await r.json()
      if (r.status === 202 && j.videoId) { setMidia(Object.assign({}, midia, { videoId: j.videoId })); setErro(j.error); setCriando(false); return }
      if (!r.ok) { setErro(j.error || 'Nao consegui criar o anuncio.'); setCriando(false); return }
      setResultado(j); setCriando(false)
      falar('Pronto! Criei o seu anuncio. Ele esta pausado para você conferir. Quando estiver tudo certo, é só ligar a campanha.')
      if (onCriado) onCriado()
    } catch (e) { setErro('Nao consegui criar o anuncio.'); setCriando(false) }
  }

  enviarRef.current = function(t: string) { enviar(t) }

  async function criarImagens() {
    if (progImg) return
    setErro('')
    for (let i = 0; i < QUADROS.length; i++) {
      setProgImg((i + 1) + ' de ' + QUADROS.length)
      try {
        const r = await fetch('/api/avatar/escritorio', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ quadro: QUADROS[i] }) })
        const j = await r.json()
        if (!r.ok) { setErro(j.error || 'Não consegui criar a imagem.'); break }
        setQuadros(function(ant) { const n = Object.assign({}, ant); n[j.quadro] = j.url; return n })
      } catch (e) { setErro('Não consegui criar a imagem.'); break }
    }
    setProgImg('')
  }

  function liberarSom() {
    setSomBloqueado(false)
    prepararAudio()
    if (pendenteRef.current) { const t = pendenteRef.current; pendenteRef.current = ''; falar(t) }
  }

  function nomeDe(lista: Opcao[], id: string | null) { const o = lista.filter(function(x) { return x.id === id })[0]; return o ? o.nome : '—' }

  const bolha = function(m: Msg, i: number) {
    const eu = m.role === 'user'
    return (
      <div key={i} style={{ alignSelf: eu ? 'flex-end' : 'flex-start', maxWidth: '86%', background: eu ? 'linear-gradient(135deg,#7c3aed,#a21caf)' : 'rgba(255,255,255,0.09)', border: eu ? 'none' : cx.borda, color: '#fff', borderRadius: eu ? '16px 16px 4px 16px' : '16px 16px 16px 4px', padding: '10px 14px', fontSize: 14.5, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{m.content}</div>
    )
  }

  const linhaResumo = function(rot: string, val: string) {
    return <div style={{ display: 'flex', gap: 8, fontSize: 13, padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}><span style={{ color: 'rgba(255,255,255,0.6)', minWidth: 96 }}>{rot}</span><span style={{ color: '#fff', fontWeight: 600, wordBreak: 'break-word' }}>{val}</span></div>
  }

  const temQuadros = !!quadros.base
  const equipe = [
    { nome: 'Camila', funcao: 'Gestora de anúncios', ativa: true },
    { nome: 'Em breve', funcao: 'Criadora de criativos', ativa: false },
    { nome: 'Em breve', funcao: 'Páginas de venda', ativa: false },
    { nome: 'Em breve', funcao: 'Autora de e-books', ativa: false },
  ]
  const statusTxt = !conversaAtiva ? 'Conversa pausada' : gravando ? 'Ouvindo você...' : pensando ? 'Pensando...' : falando ? 'Falando...' : 'Pode falar, estou ouvindo'
  const corStatus = !conversaAtiva ? '#94a3b8' : gravando ? '#f87171' : pensando ? '#facc15' : falando ? '#c084fc' : '#4ade80'

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'radial-gradient(ellipse at 20% 0%, #3b1a73 0%, #160d33 45%, #0b0719 100%)', color: '#fff', display: 'flex', flexDirection: 'column', height: '100dvh' }}>
      <style>{`
        .asst-grid{display:grid;grid-template-columns:minmax(260px,400px) 1fr;gap:16px;flex:1;min-height:0;padding:0 16px 14px}
        @media (max-width:760px){.asst-grid{grid-template-columns:1fr;grid-template-rows:auto minmax(0,1fr);gap:10px;padding:0 10px 10px}.asst-card{height:30vh!important;aspect-ratio:auto!important;width:auto!important;margin:0 auto}}
        @keyframes asstResp{0%,100%{transform:scale(1)}50%{transform:scale(1.015)}}
        @keyframes asstPulso{0%,100%{box-shadow:0 0 0 0 rgba(168,85,247,.55)}50%{box-shadow:0 0 0 12px rgba(168,85,247,0)}}
      `}</style>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 16 }}>Escritório de anúncios <span style={{ fontSize: 11, fontWeight: 700, background: 'rgba(250,204,21,0.18)', color: '#facc15', borderRadius: 99, padding: '2px 8px', marginLeft: 6 }}>só para você (teste)</span></div>
        </div>
        <button onClick={function() { setVozLigada(!vozLigada) }} style={{ cursor: 'pointer', background: cx.painel, border: cx.borda, color: '#fff', borderRadius: 10, padding: '6px 10px', fontSize: 12.5, fontWeight: 700 }}>{vozLigada ? '🔊 Voz' : '🔇 Mudo'}</button>
        <button onClick={function() { pausarConversa(); pararFala(); onClose() }} aria-label="Fechar" style={{ cursor: 'pointer', background: cx.painel, border: cx.borda, color: '#fff', borderRadius: 10, width: 34, height: 34, fontSize: 16 }}>✕</button>
      </div>

      <div className="asst-grid">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, minHeight: 0 }}>
          <div className="asst-card" style={{ position: 'relative', width: '100%', aspectRatio: '3 / 4', maxHeight: '64vh', borderRadius: 28, overflow: 'hidden', border: '2px solid ' + (falando ? '#c084fc' : 'rgba(255,255,255,0.18)'), boxShadow: falando ? '0 0 40px rgba(168,85,247,0.65)' : '0 10px 40px rgba(0,0,0,0.45)', transition: 'box-shadow .2s, border-color .2s', background: '#1a1033' }}>
            {temQuadros ? (
              <div style={{ position: 'absolute', inset: 0, animation: 'asstResp 5s ease-in-out infinite' }}>
                {QUADROS.map(function(q) {
                  const url = quadros[q] || quadros.base
                  const ativo = (quadros[quadroAtual] ? quadroAtual : 'base') === q
                  return <img key={q} src={url} alt={q === 'base' ? 'Camila' : ''} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: ativo ? 1 : 0 }} />
                })}
              </div>
            ) : (
              <div ref={avatarRef} style={{ position: 'absolute', inset: 0 }} />
            )}
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '28px 14px 12px', background: 'linear-gradient(180deg, transparent, rgba(8,4,20,0.85))' }}>
              <div style={{ fontWeight: 800, fontSize: 17 }}>Camila</div>
              <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.75)' }}>Gestora de anúncios</div>
            </div>
          </div>
          {!temQuadros && podeCriarImgs && (
            <button onClick={criarImagens} disabled={!!progImg} style={{ cursor: progImg ? 'wait' : 'pointer', background: cx.painel, border: cx.borda, color: '#fff', borderRadius: 12, padding: '9px 14px', fontSize: 12.5, fontWeight: 700 }}>{progImg ? 'Criando a Camila... imagem ' + progImg + ' (cerca de 1 minuto cada)' : '✨ Criar a Camila no escritório (4 imagens)'}</button>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, gap: 10 }}>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
            {equipe.map(function(m, i) {
              return (
                <div key={i} style={{ flex: '0 0 auto', minWidth: 140, background: cx.painel, border: m.ativa ? '1px solid rgba(168,85,247,0.7)' : cx.borda, borderRadius: 12, padding: '8px 12px', opacity: m.ativa ? 1 : 0.55 }}>
                  <div style={{ fontWeight: 800, fontSize: 13 }}>{m.nome}</div>
                  <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.7)' }}>{m.funcao}</div>
                  <div style={{ fontSize: 11, marginTop: 2, color: m.ativa ? '#4ade80' : 'rgba(255,255,255,0.45)' }}>{m.ativa ? (falando ? 'Falando' : 'Livre') : 'Em breve'}</div>
                </div>
              )
            })}
          </div>

          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', background: 'rgba(255,255,255,0.04)', border: cx.borda, borderRadius: 18, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {msgs.map(bolha)}
            {pensando && <div style={{ alignSelf: 'flex-start', color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>Camila está pensando...</div>}
            {pronto && rascunho && !resultado && (
              <div style={{ background: cx.painel, border: cx.borda, borderRadius: 16, padding: 14 }}>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>Resumo do anúncio</div>
                {linhaResumo('Produto', rascunho.produto || '—')}
                {linhaResumo('Página', nomeDe(paginas, rascunho.paginaId))}
                {linhaResumo('Pixel', nomeDe(pixels, rascunho.pixelId))}
                {linhaResumo('Link', rascunho.link || '—')}
                {linhaResumo('Orçamento', 'R$ ' + String(rascunho.orcamentoDiario).replace('.', ',') + ' por dia')}
                {linhaResumo('Público', rascunho.idadeMin + ' a ' + rascunho.idadeMax + ' anos, ' + (rascunho.genero === 'todos' ? 'homens e mulheres' : rascunho.genero) + ', Brasil')}
                {linhaResumo('Título', rascunho.titulo || '—')}
                {linhaResumo('Legenda', rascunho.legenda || '—')}
                {linhaResumo('Arquivo', midia ? midia.nome : '—')}
                <button onClick={criar} disabled={criando} style={{ cursor: criando ? 'wait' : 'pointer', marginTop: 12, width: '100%', background: 'linear-gradient(135deg,#16a34a,#15803d)', color: '#fff', border: 'none', borderRadius: 12, padding: '13px 16px', fontSize: 15, fontWeight: 800 }}>{criando ? 'Criando... pode levar até 1 minuto' : 'Confirmar e criar (fica pausado)'}</button>
              </div>
            )}
            {resultado && (
              <div style={{ background: 'rgba(22,163,74,0.15)', border: '1px solid rgba(22,163,74,0.5)', borderRadius: 16, padding: 14, fontSize: 14, lineHeight: 1.5 }}>
                <b>Anúncio criado, pausado.</b><br />{resultado.nome}<br />
                <a href={'https://adsmanager.facebook.com/adsmanager/manage/campaigns?selected_campaign_ids=' + resultado.campanhaId} target="_blank" rel="noopener noreferrer" style={{ color: '#86efac', fontWeight: 700 }}>Abrir no Gerenciador do Facebook</a>
              </div>
            )}
            {erro && <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.5)', borderRadius: 12, padding: '10px 12px', fontSize: 13 }}>{erro}</div>}
            <div ref={fimRef} />
          </div>

          {!resultado && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button onClick={function() { if (conversaAtiva) pausarConversa(); else ativarConversa() }} title={conversaAtiva ? 'Pausar o microfone' : 'Voltar a conversar'}
                  style={{ cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, background: cx.painel, border: '1px solid ' + corStatus, color: '#fff', borderRadius: 99, padding: '8px 12px', fontSize: 12.5, fontWeight: 700, animation: conversaAtiva && !pensando ? 'asstPulso 1.8s infinite' : 'none' }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: corStatus }} />{statusTxt}
                </button>
                <label style={{ cursor: enviandoMidia ? 'wait' : 'pointer', marginLeft: 'auto', background: cx.painel, border: cx.borda, borderRadius: 99, padding: '8px 14px', fontSize: 12.5, fontWeight: 700 }}>
                  {enviandoMidia ? 'Enviando...' : midia ? '📎 Trocar arquivo' : '📎 Anexar vídeo ou imagem'}
                  <input type="file" accept="video/*,image/*" disabled={enviandoMidia} style={{ display: 'none' }} onChange={function(e) { anexar(e.target.files && e.target.files[0] ? e.target.files[0] : null); e.target.value = '' }} />
                </label>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={texto} onChange={function(e) { setTexto(e.target.value) }} onKeyDown={function(e) { if (e.key === 'Enter') enviar(texto) }} placeholder="Ou escreva aqui (cole o link da página de vendas aqui)" style={{ flex: 1, minWidth: 0, background: 'rgba(255,255,255,0.08)', border: cx.borda, color: '#fff', borderRadius: 12, padding: '11px 13px', fontSize: 14 }} />
                <button onClick={function() { enviar(texto) }} disabled={pensando || !texto.trim()} style={{ cursor: 'pointer', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 12, padding: '0 16px', fontWeight: 800, opacity: pensando || !texto.trim() ? 0.5 : 1 }}>Enviar</button>
              </div>
              {falta.length > 0 && rascunho && <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>Falta: {falta.join(', ')}.</div>}
            </div>
          )}
        </div>
      </div>

      {somBloqueado && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(8,4,20,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5 }}>
          <button onClick={liberarSom} style={{ cursor: 'pointer', background: 'linear-gradient(135deg,#7c3aed,#a21caf)', color: '#fff', border: 'none', borderRadius: 16, padding: '16px 28px', fontSize: 16, fontWeight: 800 }}>🔊 Toque para ouvir a Camila</button>
        </div>
      )}
    </div>
  )
}
