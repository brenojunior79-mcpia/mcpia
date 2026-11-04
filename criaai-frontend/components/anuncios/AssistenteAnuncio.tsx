'use client'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { AVATARES, avatarSvg, Boca } from '@/lib/avatares'

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
  const [comecou, setComecou] = useState(false)
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
  const [enviandoMidia, setEnviandoMidia] = useState(false)
  const [criando, setCriando] = useState(false)
  const [vozLigada, setVozLigada] = useState(true)
  const [erro, setErro] = useState('')
  const [resultado, setResultado] = useState<any>(null)
  const [avatarIa, setAvatarIa] = useState<string | null>(null)
  const [avatarInfo, setAvatarInfo] = useState<{ temFoto: boolean; podeCriar: boolean; restantes: number }>({ temFoto: false, podeCriar: false, restantes: 0 })
  const [criandoAvatar, setCriandoAvatar] = useState(false)

  const avatarRef = useRef<HTMLDivElement>(null)
  const imgAvatarRef = useRef<HTMLImageElement>(null)
  const usandoFotoRef = useRef(false)
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
  const segurandoRef = useRef(false)
  const fimRef = useRef<HTMLDivElement>(null)
  const msgsRef = useRef<Msg[]>([])
  const rascunhoRef = useRef<any>(null)
  const midiaRef = useRef<Midia | null>(null)
  const vozRef = useRef(true)

  useEffect(function() { usandoFotoRef.current = !!avatarIa }, [avatarIa])
  useEffect(function() {
    fetch('/api/avatar/ia').then(function(r) { return r.json() }).then(function(j) {
      if (j && !j.error) { setAvatarIa(j.avatar || null); setAvatarInfo({ temFoto: !!j.temFoto, podeCriar: !!j.podeCriar, restantes: Number(j.restantes || 0) }) }
    }).catch(function() {})
  }, [])
  useEffect(function() { msgsRef.current = msgs }, [msgs])
  useEffect(function() { rascunhoRef.current = rascunho }, [rascunho])
  useEffect(function() { midiaRef.current = midia }, [midia])
  useEffect(function() { vozRef.current = vozLigada; if (!vozLigada) pararFala() }, [vozLigada])
  useEffect(function() { if (fimRef.current) fimRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [msgs, pensando, pronto, resultado])

  function desenhar() {
    if (avatarRef.current) avatarRef.current.innerHTML = avatarSvg(AVATAR, bocaRef.current, piscarRef.current)
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
      if (usandoFotoRef.current) {
        // Avatar da foto: da um leve zoom no ritmo da voz
        if (imgAvatarRef.current) imgAvatarRef.current.style.transform = 'scale(' + (1 + boca * 0.018) + ')'
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
      if (streamRef.current) streamRef.current.getTracks().forEach(function(t) { t.stop() })
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
    const a = audioRef.current
    if (a) { try { a.pause(); a.currentTime = 0 } catch (e) {} }
    setFalando(false)
  }

  async function falar(t: string) {
    if (!vozRef.current) return
    prepararAudio()
    pararFala()
    try {
      const r = await fetch('/api/anuncios/assistente/falar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ texto: t }) })
      if (!r.ok) return
      const blob = await r.blob()
      if (!vozRef.current || segurandoRef.current) return
      const a = audioRef.current!
      a.src = URL.createObjectURL(blob)
      a.onended = function() { setFalando(false) }
      setFalando(true)
      await a.play()
    } catch (e) { setFalando(false) }
  }

  async function comecar() {
    prepararAudio()
    setComecou(true)
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

  // ----- Segurar para falar -----
  async function comecarGravar() {
    if (gravando || pensando || criando) return
    segurandoRef.current = true
    pararFala()
    setErro('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      if (!segurandoRef.current) { stream.getTracks().forEach(function(t) { t.stop() }); return }
      streamRef.current = stream
      const tipo = (window as any).MediaRecorder && MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : (MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '')
      const rec = tipo ? new MediaRecorder(stream, { mimeType: tipo }) : new MediaRecorder(stream)
      pedacosRef.current = []
      rec.ondataavailable = function(e) { if (e.data && e.data.size) pedacosRef.current.push(e.data) }
      rec.onstop = async function() {
        stream.getTracks().forEach(function(t) { t.stop() })
        const blob = new Blob(pedacosRef.current, { type: rec.mimeType || 'audio/webm' })
        if (blob.size < 1500) { setGravando(false); return }
        setPensando(true)
        try {
          const fd = new FormData()
          fd.append('audio', blob, 'fala')
          const r = await fetch('/api/anuncios/assistente/transcrever', { method: 'POST', body: fd })
          const j = await r.json()
          setPensando(false)
          if (!r.ok) { setErro(j.error || 'Nao consegui entender o audio.'); return }
          if (!j.texto) { setErro('Não ouvi nada. Segure o botão e fale de novo.'); return }
          enviar(j.texto)
        } catch (e) { setPensando(false); setErro('Nao consegui entender o audio.') }
      }
      recRef.current = rec
      rec.start()
      setGravando(true)
    } catch (e) {
      segurandoRef.current = false
      setErro('Não consegui usar o microfone. Libere o microfone no navegador ou escreva a sua resposta.')
    }
  }

  function pararGravar() {
    segurandoRef.current = false
    const rec = recRef.current
    if (rec && rec.state !== 'inactive') { try { rec.stop() } catch (e) {} }
    setGravando(false)
  }

  // Barra de espaco = segurar para falar (so quando nao esta digitando)
  useEffect(function() {
    function dentroDeCampo(e: KeyboardEvent) { const t: any = e.target; return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') }
    function baixo(e: KeyboardEvent) { if (e.code === 'Space' && !e.repeat && !dentroDeCampo(e) && comecou) { e.preventDefault(); comecarGravar() } }
    function cima(e: KeyboardEvent) { if (e.code === 'Space' && !dentroDeCampo(e) && segurandoRef.current) { e.preventDefault(); pararGravar() } }
    window.addEventListener('keydown', baixo)
    window.addEventListener('keyup', cima)
    return function() { window.removeEventListener('keydown', baixo); window.removeEventListener('keyup', cima) }
  }, [comecou, gravando, pensando, criando])

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

  async function criarAvatar() {
    if (criandoAvatar) return
    setCriandoAvatar(true); setErro('')
    try {
      const r = await fetch('/api/avatar/ia', { method: 'POST' })
      const j = await r.json()
      if (!r.ok) { setErro(j.error || 'Nao consegui criar o avatar.'); setCriandoAvatar(false); return }
      setAvatarIa(j.avatar); setAvatarInfo(Object.assign({}, avatarInfo, { restantes: Number(j.restantes || 0) }))
    } catch (e) { setErro('Nao consegui criar o avatar.') }
    setCriandoAvatar(false)
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

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(8,4,20,0.78)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }}>
      <div style={{ width: '100%', maxWidth: 1000, height: 'min(760px, 96vh)', background: cx.fundo, borderRadius: 22, border: cx.borda, display: 'flex', flexDirection: 'column', overflow: 'hidden', color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: cx.borda }}>
          <div style={{ fontWeight: 800, fontSize: 15, flex: 1 }}>Criar anúncio com a Camila <span style={{ fontSize: 11, fontWeight: 700, background: 'rgba(250,204,21,0.18)', color: '#facc15', borderRadius: 99, padding: '2px 8px', marginLeft: 6 }}>só para você (teste)</span></div>
          <button onClick={function() { setVozLigada(!vozLigada) }} style={{ cursor: 'pointer', background: cx.painel, border: cx.borda, color: '#fff', borderRadius: 10, padding: '6px 10px', fontSize: 12.5, fontWeight: 700 }}>{vozLigada ? '🔊 Voz ligada' : '🔇 Voz desligada'}</button>
          <button onClick={function() { pararFala(); onClose() }} aria-label="Fechar" style={{ cursor: 'pointer', background: cx.painel, border: cx.borda, color: '#fff', borderRadius: 10, width: 34, height: 34, fontSize: 16 }}>✕</button>
        </div>

        <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 0 }}>
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, borderRight: cx.borda, minHeight: 0 }}>
            <div style={{ width: 'min(240px, 60%)', aspectRatio: '1 / 1', borderRadius: 26, overflow: 'hidden', border: falando ? '3px solid #c084fc' : '3px solid rgba(255,255,255,0.15)', boxShadow: falando ? '0 0 36px rgba(168,85,247,0.7)' : 'none', transition: 'all .2s' }}>
              {avatarIa
                ? <img ref={imgAvatarRef} src={avatarIa} alt="Seu avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform .08s' }} />
                : <div ref={avatarRef} style={{ width: '100%', height: '100%' }} />}
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 800, fontSize: 16 }}>{avatarIa ? 'Seu avatar' : 'Camila'}</div>
              <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.65)' }}>{gravando ? 'Ouvindo você...' : pensando ? 'Pensando...' : falando ? 'Falando...' : 'Gestora de anúncios'}</div>
            </div>
            {avatarInfo.podeCriar && avatarInfo.temFoto && avatarInfo.restantes > 0 && (
              <button onClick={criarAvatar} disabled={criandoAvatar} style={{ cursor: criandoAvatar ? 'wait' : 'pointer', background: cx.painel, border: cx.borda, color: '#fff', borderRadius: 12, padding: '9px 14px', fontSize: 12.5, fontWeight: 700 }}>{criandoAvatar ? 'Criando o avatar... (até 1 minuto)' : avatarIa ? '🔄 Criar outro avatar com a minha foto' : '✨ Criar o meu avatar com a minha foto'}</button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {!comecou ? (
                <div style={{ margin: 'auto', textAlign: 'center', maxWidth: 360 }}>
                  <p style={{ fontSize: 15, lineHeight: 1.6, color: 'rgba(255,255,255,0.85)' }}>A Camila vai conversar com você por voz, fazer uma pergunta de cada vez e montar o seu anúncio. Ele é criado <b>pausado</b>, só depois que você confirmar.</p>
                  <button onClick={comecar} style={{ cursor: 'pointer', marginTop: 10, background: 'linear-gradient(135deg,#7c3aed,#a21caf)', color: '#fff', border: 'none', borderRadius: 14, padding: '14px 28px', fontSize: 16, fontWeight: 800 }}>Começar conversa</button>
                </div>
              ) : (
                <>
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
                </>
              )}
              {erro && <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.5)', borderRadius: 12, padding: '10px 12px', fontSize: 13 }}>{erro}</div>}
              <div ref={fimRef} />
            </div>

            {comecou && !resultado && (
              <div style={{ padding: 12, borderTop: cx.borda, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input value={texto} onChange={function(e) { setTexto(e.target.value) }} onKeyDown={function(e) { if (e.key === 'Enter') enviar(texto) }} placeholder="Ou escreva aqui (cole o link da página de vendas aqui)" style={{ flex: 1, minWidth: 0, background: 'rgba(255,255,255,0.08)', border: cx.borda, color: '#fff', borderRadius: 12, padding: '11px 13px', fontSize: 14 }} />
                  <button onClick={function() { enviar(texto) }} disabled={pensando || !texto.trim()} style={{ cursor: 'pointer', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 12, padding: '0 16px', fontWeight: 800, opacity: pensando || !texto.trim() ? 0.5 : 1 }}>Enviar</button>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
                  <label style={{ cursor: enviandoMidia ? 'wait' : 'pointer', background: cx.painel, border: cx.borda, borderRadius: 14, padding: '0 14px', display: 'flex', alignItems: 'center', fontSize: 13, fontWeight: 700, textAlign: 'center' }}>
                    {enviandoMidia ? 'Enviando...' : midia ? '📎 Trocar arquivo' : '📎 Anexar vídeo ou imagem'}
                    <input type="file" accept="video/*,image/*" disabled={enviandoMidia} style={{ display: 'none' }} onChange={function(e) { anexar(e.target.files && e.target.files[0] ? e.target.files[0] : null); e.target.value = '' }} />
                  </label>
                  <button
                    onPointerDown={function(e) { e.preventDefault(); comecarGravar() }}
                    onPointerUp={pararGravar} onPointerLeave={function() { if (segurandoRef.current) pararGravar() }} onPointerCancel={pararGravar}
                    onContextMenu={function(e) { e.preventDefault() }}
                    style={{ flex: 1, touchAction: 'none', userSelect: 'none', cursor: 'pointer', background: gravando ? 'linear-gradient(135deg,#dc2626,#b91c1c)' : 'linear-gradient(135deg,#7c3aed,#a21caf)', color: '#fff', border: 'none', borderRadius: 14, padding: '14px 12px', fontSize: 15, fontWeight: 800 }}>
                    {gravando ? '🎙️ Solte para enviar' : falando ? '✋ Segure para interromper' : '🎙️ Segure para falar'}
                  </button>
                </div>
                <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>No computador, você também pode segurar a barra de espaço.{falta.length > 0 && rascunho ? ' Falta: ' + falta.join(', ') + '.' : ''}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
