'use client'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { QUADROS } from '@/lib/avatarEscritorio'

type Opcao = { id: string; nome: string }
type Midia = { path: string; tipo: 'video' | 'imagem'; nome: string; videoId?: string }
type Fase = 'inicio' | 'conectando' | 'ativa'

const MAX_VIDEO = 50 * 1024 * 1024
const MAX_IMAGEM = 8 * 1024 * 1024
const MAX_MINUTOS = 25

// Se a imagem de uma boca ainda nao existe, usa a mais parecida
const PARECIDA: Record<string, string> = { redonda: 'meia', larga: 'aberta', aberta: 'meia', meia: 'base', piscando: 'base' }
let gerandoImagens = false

const roxo = 'rgba(255,255,255,0.07)'
const borda = '1px solid rgba(255,255,255,0.14)'

export default function CamilaAnuncios({ onCriado }: { onCriado?: () => void }) {
  const [fase, setFase] = useState<Fase>('inicio')
  const [boca, setBoca] = useState<string>('base')
  const [quadros, setQuadros] = useState<Record<string, string>>({})
  const [prep, setPrep] = useState('')
  const [prepErro, setPrepErro] = useState('')
  const [trabalhando, setTrabalhando] = useState(false)
  const [salvo, setSalvo] = useState<any>(null)
  const [falando, setFalando] = useState(false)
  const [ouvindo, setOuvindo] = useState(false)
  const [pensando, setPensando] = useState(false)
  const [mudo, setMudo] = useState(false)
  const [legendaEla, setLegendaEla] = useState('')
  const [legendaVoce, setLegendaVoce] = useState('')
  const [somBloqueado, setSomBloqueado] = useState(false)
  const [rascunho, setRascunho] = useState<any>(null)
  const [pronto, setPronto] = useState(false)
  const [paginas, setPaginas] = useState<Opcao[]>([])
  const [pixels, setPixels] = useState<Opcao[]>([])
  const [midia, setMidia] = useState<Midia | null>(null)
  const [link, setLink] = useState('')
  const [enviandoMidia, setEnviandoMidia] = useState(false)
  const [criando, setCriando] = useState(false)
  const [resultado, setResultado] = useState<any>(null)
  const [erro, setErro] = useState('')

  const pcRef = useRef<RTCPeerConnection | null>(null)
  const dcRef = useRef<RTCDataChannel | null>(null)
  const audioElRef = useRef<HTMLAudioElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const ctxRef = useRef<AudioContext | null>(null)
  const analiserRef = useRef<AnalyserNode | null>(null)
  const relogioRef = useRef<number>(0)
  const feitosRef = useRef<Record<string, boolean>>({})
  const rascunhoRef = useRef<any>(null)
  const midiaRef = useRef<Midia | null>(null)
  const prontoRef = useRef(false)
  const criandoRef = useRef(false)
  const faseRef = useRef<Fase>('inicio')
  const trabalhoRef = useRef<number>(0)
  const dialogoRef = useRef<{ r: 'u' | 'c'; t: string }[]>([])
  const salvarRef = useRef<number>(0)
  const textoElaRef = useRef('')
  const textoCompletoRef = useRef(false)
  const ultimoSomRef = useRef(0)
  const zerarLegendaRef = useRef(false)

  useEffect(function() { rascunhoRef.current = rascunho }, [rascunho])
  useEffect(function() { midiaRef.current = midia }, [midia])
  useEffect(function() { prontoRef.current = pronto }, [pronto])
  useEffect(function() { faseRef.current = fase }, [fase])

  // ----- Imagens da Camila (iguais para todos). O admin cria as que faltam, sozinho, uma vez. -----
  async function prepararImagens() {
    try {
      const r = await fetch('/api/avatar/escritorio')
      const j = await r.json()
      if (!r.ok) return
      setQuadros(j.quadros || {})
      if (!j.podeCriar || gerandoImagens) return
      const faltam = (QUADROS as readonly string[]).filter(function(q) { return !(j.quadros || {})[q] })
      if (!faltam.length) return
      gerandoImagens = true
      setPrepErro('')
      try {
        for (let i = 0; i < faltam.length; i++) {
          setPrep('Preparando a Camila... imagem ' + (i + 1) + ' de ' + faltam.length + ' (cerca de 1 minuto cada)')
          const rr = await fetch('/api/avatar/escritorio', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ quadro: faltam[i] }) })
          const jj = await rr.json()
          if (!rr.ok) { setPrepErro(jj.error || 'Não consegui criar a imagem.'); break }
          setQuadros(function(ant) { const n = Object.assign({}, ant); n[jj.quadro] = jj.url; return n })
        }
      } catch (e) { setPrepErro('Não consegui criar a imagem.') }
      gerandoImagens = false
      setPrep('')
    } catch (e) {}
  }
  useEffect(function() { prepararImagens() }, [])

  // ----- Trabalho no computador (a Camila digita quando faz algo para a pessoa) -----
  function trabalhar(ms: number) {
    setTrabalhando(true)
    window.clearTimeout(trabalhoRef.current)
    trabalhoRef.current = window.setTimeout(function() { setTrabalhando(false) }, ms)
  }

  // ----- Andamento salvo: ao voltar, ela continua de onde parou -----
  useEffect(function() {
    fetch('/api/anuncios/assistente/estado').then(function(r) { return r.json() }).then(function(j) {
      const e = j && j.estado
      if (!e) return
      setSalvo(e)
      if (e.rascunho) { setRascunho(e.rascunho); rascunhoRef.current = e.rascunho }
      if (e.midia) { setMidia(e.midia); midiaRef.current = e.midia }
      dialogoRef.current = Array.isArray(e.dialogo) ? e.dialogo : []
      fetch('/api/anuncios/assistente/rascunho', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rascunho: e.rascunho, temMidia: !!e.midia }) })
        .then(function(r) { return r.json() }).then(function(k) { if (k && k.rascunho) { setRascunho(k.rascunho); rascunhoRef.current = k.rascunho; setPronto(!!k.pronto); prontoRef.current = !!k.pronto } }).catch(function() {})
    }).catch(function() {})
  }, [])

  function lembrar(r: 'u' | 'c', t: string) {
    const txt = t.trim()
    if (!txt) return
    dialogoRef.current = dialogoRef.current.concat([{ r: r, t: txt }]).slice(-20)
    window.clearTimeout(salvarRef.current)
    salvarRef.current = window.setTimeout(function() {
      fetch('/api/anuncios/assistente/estado', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dialogo: dialogoRef.current }) }).catch(function() {})
    }, 1200)
  }

  // ----- Boca: acompanha o som da voz, no mesmo instante (sem atraso) -----
  useEffect(function() {
    let raf = 0
    let pico = 0.05, cand = 'base', candN = 0, atual = 'base'
    let proxPiscar = Date.now() + 2500, fimPiscar = 0
    let falandoAgora = false, acum = 0, mostradas = 0
    let antes = performance.now()
    const buf = new Uint8Array(1024)
    const freq = new Uint8Array(512)
    function loop() {
      const agora = Date.now()
      const t = performance.now(); const dt = Math.min(0.1, (t - antes) / 1000); antes = t
      const an = analiserRef.current
      let alvo = 'base'
      if (an) {
        an.getByteTimeDomainData(buf)
        an.getByteFrequencyData(freq)
        let soma = 0
        for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; soma += v * v }
        const rms = Math.sqrt(soma / buf.length)
        pico = Math.max(rms, pico * 0.998, 0.03)
        const rel = rms / pico
        if (rms > 0.01 && rel > 0.12) {
          let baixo = 0, medio = 0, alto = 0
          for (let i = 2; i < 17; i++) baixo += freq[i] * freq[i]
          for (let i = 17; i < 41; i++) medio += freq[i] * freq[i]
          for (let i = 41; i < 90; i++) alto += freq[i] * freq[i]
          const tot = baixo + medio + alto + 1
          const rBaixo = baixo / tot, rAlto = alto / tot
          if (rel > 0.6) alvo = rAlto > 0.3 ? 'larga' : 'aberta'
          else if (rel > 0.3) alvo = rBaixo > 0.62 ? 'redonda' : rAlto > 0.3 ? 'larga' : 'meia'
          else alvo = 'meia'
        }
      }
      // so troca depois de 2 a 3 quadros iguais (evita tremer)
      if (alvo === cand) candN++; else { cand = alvo; candN = 1 }
      if (cand !== atual && candN >= (cand === 'base' ? 3 : 2)) atual = cand
      if (atual !== 'base') { ultimoSomRef.current = agora; proxPiscar = Math.max(proxPiscar, agora + 800) }
      let q = atual
      if (q === 'base' && agora > proxPiscar) { fimPiscar = agora + 140; proxPiscar = agora + 2500 + Math.random() * 3000 }
      if (q === 'base' && agora < fimPiscar) q = 'piscando'
      setBoca(function(p) { return p === q ? p : q })
      const f = agora - ultimoSomRef.current < 450
      if (f !== falandoAgora) { falandoAgora = f; setFalando(f) }

      // Legenda no ritmo da voz: so mostra as palavras que ela ja falou
      if (zerarLegendaRef.current) { zerarLegendaRef.current = false; acum = 0; mostradas = 0; setLegendaEla('') }
      const texto = textoElaRef.current
      if (texto) {
        const palavras = texto.split(/\s+/).filter(Boolean)
        if (falandoAgora) acum += dt * 3
        else if (textoCompletoRef.current && agora - ultimoSomRef.current > 1200) acum = palavras.length
        const n = Math.min(palavras.length, Math.floor(acum))
        if (n !== mostradas) { mostradas = n; setLegendaEla(palavras.slice(0, n).join(' ')) }
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return function() { cancelAnimationFrame(raf) }
  }, [])

  // ----- Conversa em tempo real (OpenAI) -----
  function enviarEvento(ev: any) {
    const dc = dcRef.current
    if (dc && dc.readyState === 'open') { try { dc.send(JSON.stringify(ev)) } catch (e) {} }
  }

  function avisarModelo(texto: string) {
    enviarEvento({ type: 'conversation.item.create', item: { type: 'message', role: 'user', content: [{ type: 'input_text', text: texto }] } })
    enviarEvento({ type: 'response.create' })
  }

  function limparTudoDaConversa() {
    window.clearTimeout(relogioRef.current)
    try { if (dcRef.current) dcRef.current.close() } catch (e) {}
    try { if (pcRef.current) pcRef.current.close() } catch (e) {}
    if (streamRef.current) { streamRef.current.getTracks().forEach(function(t) { t.stop() }); streamRef.current = null }
    if (audioElRef.current) { try { audioElRef.current.pause() } catch (e) {} audioElRef.current.srcObject = null }
    if (ctxRef.current) { try { ctxRef.current.close() } catch (e) {} ctxRef.current = null }
    dcRef.current = null; pcRef.current = null; analiserRef.current = null
  }

  function encerrar() {
    limparTudoDaConversa()
    setFase('inicio'); setFalando(false); setOuvindo(false); setPensando(false); setMudo(false); setSomBloqueado(false)
    textoElaRef.current = ''; zerarLegendaRef.current = true; setLegendaVoce('')
  }
  useEffect(function() { return function() { limparTudoDaConversa() } }, [])

  function ligarAnalisador(remoto: MediaStream) {
    try {
      const AC: any = (window as any).AudioContext || (window as any).webkitAudioContext
      const ctx = new AC()
      ctx.resume()
      const an = ctx.createAnalyser()
      an.fftSize = 1024
      an.smoothingTimeConstant = 0
      ctx.createMediaStreamSource(remoto).connect(an)
      ctxRef.current = ctx; analiserRef.current = an
    } catch (e) {}
  }

  async function comecar(continuar: boolean) {
    if (faseRef.current !== 'inicio') return
    setErro(''); setResultado(null); setFase('conectando')
    if (!continuar) { await limparAndamento() }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !(window as any).RTCPeerConnection) {
      setErro('Este navegador não aceita conversa por voz. Use o Chrome atualizado.'); setFase('inicio'); return
    }
    const audioEl = new Audio()
    audioEl.autoplay = true
    audioElRef.current = audioEl
    const sessaoP = fetch('/api/anuncios/assistente/realtime', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ continuar: continuar }) })
      .then(function(r) { return r.json().then(function(j) { return { ok: r.ok, j: j } }) })
      .catch(function() { return { ok: false, j: { error: 'Não consegui falar com o servidor.' } } })
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } })
    } catch (e) {
      setErro('Libere o microfone no navegador (ícone do cadeado, ao lado do endereço) para conversar com a Camila.'); setFase('inicio'); return
    }
    streamRef.current = stream
    const s: any = await sessaoP
    if (!s.ok) { setErro((s.j && s.j.error) || 'Não consegui abrir a conversa agora.'); limparTudoDaConversa(); setFase('inicio'); return }
    setPaginas(s.j.paginas || []); setPixels(s.j.pixels || [])
    if (s.j.avisos && s.j.avisos.length) setErro(s.j.avisos.join(' '))
    try {
      const pc = new RTCPeerConnection()
      pcRef.current = pc
      stream.getTracks().forEach(function(t) { pc.addTrack(t, stream) })
      pc.ontrack = function(e) {
        const remoto = e.streams[0]
        audioEl.srcObject = remoto
        audioEl.play().catch(function() { setSomBloqueado(true) })
        ligarAnalisador(remoto)
      }
      pc.onconnectionstatechange = function() {
        if ((pc.connectionState === 'failed' || pc.connectionState === 'closed') && faseRef.current !== 'inicio') {
          setErro('A conversa caiu. Clique em "Vamos começar" para falar de novo.'); encerrar()
        }
      }
      const dc = pc.createDataChannel('oai-events')
      dcRef.current = dc
      dc.onmessage = function(e) { try { tratar(JSON.parse(e.data)) } catch (x) {} }
      dc.onopen = function() {
        setFase('ativa')
        relogioRef.current = window.setTimeout(function() { setErro('A conversa foi encerrada por tempo. Clique em "Vamos começar" para continuar.'); encerrar() }, MAX_MINUTOS * 60 * 1000)
        enviarEvento({ type: 'response.create', response: { instructions: s.j.retomada ? 'A pessoa voltou. Diga que e bom falar de novo, resuma em uma frase o que ja esta anotado e faca a proxima pergunta que falta. Nao recomece do zero.' : 'Comece dizendo, com naturalidade e voz simpatica, exatamente isto: Olá, eu sou a Camila e eu quero te ajudar a fazer o seu anúncio. Qual produto que você já escolheu? É afiliado ou o produto é seu? Depois espere a resposta.' } })
      }
      const oferta = await pc.createOffer()
      await pc.setLocalDescription(oferta)
      const r = await fetch('https://api.openai.com/v1/realtime/calls', {
        method: 'POST', body: oferta.sdp, headers: { Authorization: 'Bearer ' + s.j.chave, 'Content-Type': 'application/sdp' },
      })
      if (!r.ok) throw new Error('sdp ' + r.status)
      await pc.setRemoteDescription({ type: 'answer', sdp: await r.text() })
    } catch (e) {
      setErro('Não consegui iniciar a voz agora. Tente de novo em instantes.'); limparTudoDaConversa(); setFase('inicio')
    }
  }

  function tratar(ev: any) {
    const tipo = String(ev.type || '')
    if (tipo === 'input_audio_buffer.speech_started') {
      setOuvindo(true); textoElaRef.current = ''; zerarLegendaRef.current = true
    } else if (tipo === 'input_audio_buffer.speech_stopped') {
      setOuvindo(false); setPensando(true)
    } else if (tipo === 'conversation.item.input_audio_transcription.completed') {
      const t = String(ev.transcript || '').trim()
      if (t) { setLegendaVoce(t); lembrar('u', t) }
    } else if (tipo === 'response.created') {
      textoElaRef.current = ''; textoCompletoRef.current = false; zerarLegendaRef.current = true; setPensando(true)
    } else if (tipo === 'response.output_audio_transcript.delta' || tipo === 'response.audio_transcript.delta') {
      textoElaRef.current += String(ev.delta || ''); setPensando(false)
    } else if (tipo === 'response.output_audio_transcript.done' || tipo === 'response.audio_transcript.done') {
      if (ev.transcript) textoElaRef.current = String(ev.transcript)
      textoCompletoRef.current = true; ultimoSomRef.current = Date.now()
      if (textoElaRef.current) lembrar('c', textoElaRef.current)
    } else if (tipo === 'response.done') {
      setPensando(false)
      tratarFerramentas(ev.response)
    } else if (tipo === 'error') {
      const cod = ev.error && ev.error.code
      if (cod !== 'response_cancel_not_active' && cod !== 'conversation_already_has_active_response') console.error('[camila realtime]', ev.error)
    }
  }

  async function tratarFerramentas(resp: any) {
    const itens: any[] = (resp && resp.output) || []
    let respondeu = false
    for (let i = 0; i < itens.length; i++) {
      const it = itens[i]
      if (!it || it.type !== 'function_call' || feitosRef.current[it.call_id]) continue
      feitosRef.current[it.call_id] = true
      let args: any = {}
      try { args = JSON.parse(it.arguments || '{}') } catch (e) {}
      let saida: any
      try { saida = await executar(String(it.name), args) } catch (e) { saida = { erro: 'Não deu certo agora.' } }
      enviarEvento({ type: 'conversation.item.create', item: { type: 'function_call_output', call_id: it.call_id, output: JSON.stringify(saida) } })
      respondeu = true
    }
    if (respondeu) enviarEvento({ type: 'response.create' })
  }

  async function guardar(corpo: any, temMidia: boolean) {
    const r = await fetch('/api/anuncios/assistente/rascunho', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.assign({ rascunho: rascunhoRef.current, temMidia: temMidia }, corpo)),
    })
    const j = await r.json()
    if (!r.ok) throw new Error(j.error || 'erro')
    setRascunho(j.rascunho); rascunhoRef.current = j.rascunho
    setPronto(!!j.pronto); prontoRef.current = !!j.pronto
    return j
  }

  async function executar(nome: string, args: any): Promise<any> {
    if (nome === 'atualizar_anuncio') {
      trabalhar(2600)
      const j = await guardar({ campos: args }, !!midiaRef.current)
      return { ok: true, falta: j.falta, pronto: j.pronto, recusados: j.recusados }
    }
    if (nome === 'criar_anuncio') {
      trabalhar(8000)
      if (!prontoRef.current || !midiaRef.current) return { erro: 'Ainda não dá para criar: falta preencher tudo e anexar o arquivo.' }
      return await criar()
    }
    return { erro: 'Ferramenta desconhecida.' }
  }

  // ----- Link, arquivo e criacao -----
  async function enviarLink() {
    const t = link.trim()
    if (!t) return
    setErro('')
    try {
      const j = await guardar({ linkColado: t }, !!midiaRef.current)
      setLink('')
      trabalhar(2200)
      if (j.linkStatus === 'ok') avisarModelo('(Aviso da tela: colei o link da página de vendas no campo.)')
      else if (j.linkStatus === 'rede_social') avisarModelo('(Aviso da tela: colei um link de rede social, que não serve. Explique com carinho que precisa ser o link da página de vendas e peça de novo.)')
      else avisarModelo('(Aviso da tela: o link que colei não funcionou. Peça para eu colar de novo o link completo, começando com https.)')
    } catch (e) { setErro('Não consegui guardar o link. Tente de novo.') }
  }

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
      if (!r.ok) { setErro(j.error || 'Não consegui preparar o envio.'); setEnviandoMidia(false); return }
      const up = await createClient().storage.from('wa-media').uploadToSignedUrl(j.path, j.token, arquivo)
      if (up.error) { setErro('Não consegui enviar o arquivo. Tente de novo.'); setEnviandoMidia(false); return }
      const nova: Midia = { path: j.path, tipo: j.tipo, nome: arquivo.name }
      setMidia(nova); midiaRef.current = nova
      setEnviandoMidia(false)
      try { await guardar({}, true) } catch (e) {}
      fetch('/api/anuncios/assistente/estado', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ midia: nova }) }).catch(function() {})
      trabalhar(2200)
      avisarModelo('(Aviso da tela: anexei ' + (j.tipo === 'video' ? 'o vídeo' : 'a imagem') + ' do anúncio.)')
    } catch (e) { setErro('Não consegui enviar o arquivo. Tente de novo.'); setEnviandoMidia(false) }
  }

  async function criar(): Promise<any> {
    const m = midiaRef.current
    if (!m || criandoRef.current) return { erro: 'Já estou criando.' }
    criandoRef.current = true
    setCriando(true); setErro('')
    try {
      const r = await fetch('/api/anuncios/assistente/criar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rascunho: rascunhoRef.current, midia: m }) })
      const j = await r.json()
      if (r.status === 202 && j.videoId) { const n = Object.assign({}, m, { videoId: j.videoId }); setMidia(n); midiaRef.current = n; setErro(j.error); return { erro: 'O Facebook ainda está processando o vídeo. Peça para a pessoa tocar em confirmar de novo em alguns segundos.' } }
      if (!r.ok) { setErro(j.error || 'Não consegui criar o anúncio.'); return { erro: j.error || 'Não consegui criar o anúncio.' } }
      setResultado(j)
      limparAndamento()
      if (onCriado) onCriado()
      return { ok: true, observacao: 'Anúncio criado e PAUSADO. Avise a pessoa com alegria e diga que é só conferir e ligar quando estiver tudo certo.' }
    } catch (e) { setErro('Não consegui criar o anúncio.'); return { erro: 'Não consegui criar o anúncio.' } }
    finally { criandoRef.current = false; setCriando(false) }
  }

  async function criarPeloBotao() {
    const r = await criar()
    if (r && r.ok) avisarModelo('(Aviso da tela: o anúncio foi criado, pausado. Comemore em uma frase e diga para conferir no Gerenciador.)')
  }

  function alternarMudo() {
    const novo = !mudo
    setMudo(novo)
    if (streamRef.current) streamRef.current.getAudioTracks().forEach(function(t) { t.enabled = !novo })
  }

  function liberarSom() {
    setSomBloqueado(false)
    if (audioElRef.current) audioElRef.current.play().catch(function() {})
    if (ctxRef.current) { try { ctxRef.current.resume() } catch (e) {} }
  }

  async function limparAndamento() {
    dialogoRef.current = []
    window.clearTimeout(salvarRef.current)
    setSalvo(null)
    try { await fetch('/api/anuncios/assistente/estado', { method: 'DELETE' }) } catch (e) {}
  }

  function zerarTela() {
    setRascunho(null); rascunhoRef.current = null; setPronto(false); prontoRef.current = false; setMidia(null); midiaRef.current = null
    setResultado(null); setLink(''); setLegendaVoce(''); feitosRef.current = {}
  }

  function novoAnuncio() {
    encerrar()
    zerarTela()
    limparAndamento()
  }

  // ----- Tela -----
  const ativa = fase === 'ativa'
  const nomeDe = function(lista: Opcao[], id: string | null, padrao: string) { const o = lista.filter(function(x) { return x.id === id })[0]; return o ? o.nome : padrao }
  const r = rascunho || {}
  const urlQuadro = function(q: string) {
    let k = q
    for (let i = 0; i < 4 && !quadros[k] && PARECIDA[k]; i++) k = PARECIDA[k]
    return quadros[k] || quadros.base || ''
  }
  const temFotos = !!quadros.base
  const statusTxt = mudo ? 'Microfone desligado' : ouvindo ? 'Ouvindo você...' : falando ? 'Camila falando' : trabalhando || criando ? 'Anotando no computador...' : pensando ? 'Pensando...' : 'Pode falar, estou ouvindo'
  const corStatus = mudo ? '#94a3b8' : ouvindo ? '#f87171' : falando ? '#c084fc' : trabalhando || criando || pensando ? '#facc15' : '#4ade80'
  const temAndamento = !!salvo && !ativa
  const resumoSalvo = temAndamento ? (r.produto ? 'Produto: ' + r.produto + '. ' : '') + 'Você parou no meio do anúncio, eu lembro de tudo.' : ''

  return (
    <div style={{ position: 'relative', borderRadius: 20, overflow: 'hidden', color: '#fff', border: '1px solid rgba(124,92,252,0.5)', background: 'radial-gradient(ellipse at 15% 0%, #3b1a73 0%, #1a0f3a 50%, #0e0820 100%)', padding: 16, marginBottom: 14 }}>
      <style>{`
        .cam-linha{display:flex;flex-wrap:wrap;gap:18px;align-items:flex-start}
        .cam-cena{flex:0 0 280px;max-width:100%}
        @media (max-width:720px){.cam-cena{flex:1 1 100%;max-width:240px;margin:0 auto}}
        .cam-ctrl{flex:1 1 300px;min-width:0;display:flex;flex-direction:column;gap:12px}
        @keyframes camPulso{0%,100%{box-shadow:0 0 0 0 rgba(168,85,247,.5)}50%{box-shadow:0 0 0 10px rgba(168,85,247,0)}}
      `}</style>
      <div className="cam-linha">
        <div className="cam-cena">
          <div style={{ position: 'relative', width: '100%', aspectRatio: '2 / 3', borderRadius: 18, overflow: 'hidden', background: 'linear-gradient(160deg,#2a1757,#15102b)', border: '2px solid ' + (falando ? '#c084fc' : 'rgba(255,255,255,0.18)'), boxShadow: falando ? '0 0 36px rgba(168,85,247,0.6)' : '0 8px 30px rgba(0,0,0,0.4)', transition: 'box-shadow .15s, border-color .15s' }}>
            {temFotos ? (QUADROS as readonly string[]).map(function(q) {
              const url = urlQuadro(q)
              return url ? <img key={q} src={url} alt={q === 'base' ? 'Camila, gestora de anúncios' : ''} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: boca === q ? 1 : 0 }} /> : null
            }) : (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 60, fontWeight: 800, color: 'rgba(255,255,255,0.35)' }}>C</div>
            )}
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '22px 12px 10px', background: 'linear-gradient(180deg, transparent, rgba(8,4,20,0.85))' }}>
              <div style={{ fontWeight: 800, fontSize: 15 }}>Camila</div>
              <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.75)' }}>Gestora de anúncios</div>
            </div>
          </div>
        </div>

        {!ativa ? (
          <div className="cam-ctrl" style={{ alignSelf: 'center' }}>
            <div style={{ fontWeight: 800, fontSize: 22, lineHeight: 1.2 }}>{temAndamento ? 'Quer continuar o seu anúncio?' : 'Vamos começar o anúncio?'}</div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.78)', lineHeight: 1.5 }}>{temAndamento ? resumoSalvo : 'Eu sou a Camila. É só conversar comigo falando, como em uma ligação, que eu monto o anúncio junto com você. Tudo é criado pausado.'}</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button onClick={function() { comecar(temAndamento) }} disabled={fase === 'conectando'} style={{ cursor: fase === 'conectando' ? 'wait' : 'pointer', background: 'linear-gradient(135deg,#7c3aed,#a21caf)', color: '#fff', border: 'none', borderRadius: 14, padding: '14px 24px', fontSize: 16, fontWeight: 800 }}>{fase === 'conectando' ? 'Conectando com a Camila...' : temAndamento ? '🎙️ Continuar de onde parei' : '🎙️ Vamos começar'}</button>
              {temAndamento && fase !== 'conectando' && (
                <button onClick={function() { zerarTela(); comecar(false) }} style={{ cursor: 'pointer', background: roxo, border: borda, color: '#fff', borderRadius: 14, padding: '14px 18px', fontSize: 14, fontWeight: 700 }}>Começar outro do zero</button>
              )}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>Dica: use fone de ouvido para a Camila não ouvir a própria voz. O navegador vai pedir o microfone.</div>
            {prep && <div style={{ fontSize: 12.5, color: '#facc15' }}>{prep}</div>}
            {prepErro && <div style={{ fontSize: 12.5, color: '#fca5a5' }}>{prepErro} <button onClick={function() { prepararImagens() }} style={{ cursor: 'pointer', background: 'none', border: 'none', color: '#fff', textDecoration: 'underline', fontSize: 12.5 }}>Tentar de novo</button></div>}
            {erro && <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.5)', borderRadius: 12, padding: '10px 12px', fontSize: 13 }}>{erro}</div>}
            {resultado && (
              <div style={{ background: 'rgba(22,163,74,0.15)', border: '1px solid rgba(22,163,74,0.5)', borderRadius: 14, padding: 12, fontSize: 14 }}>
                <b>Anúncio criado, pausado.</b> {resultado.nome}
              </div>
            )}
          </div>
        ) : (
          <div className="cam-ctrl">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: roxo, border: '1px solid ' + corStatus, borderRadius: 99, padding: '7px 13px', fontSize: 13, fontWeight: 700, animation: !mudo && !falando && !pensando ? 'camPulso 1.8s infinite' : 'none' }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: corStatus }} />{statusTxt}
              </div>
              <button onClick={alternarMudo} style={{ cursor: 'pointer', marginLeft: 'auto', background: roxo, border: borda, color: '#fff', borderRadius: 10, padding: '7px 12px', fontSize: 12.5, fontWeight: 700 }}>{mudo ? '🔇 Ligar microfone' : '🎙️ Silenciar'}</button>
              <button onClick={encerrar} style={{ cursor: 'pointer', background: roxo, border: borda, color: '#fff', borderRadius: 10, padding: '7px 12px', fontSize: 12.5, fontWeight: 700 }}>Pausar</button>
            </div>

            <div style={{ minHeight: 84, background: 'rgba(0,0,0,0.25)', borderRadius: 14, padding: '12px 14px' }}>
              {legendaVoce && <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.55)', marginBottom: 6 }}>Você: {legendaVoce}</div>}
              <div style={{ fontSize: 17, lineHeight: 1.45, fontWeight: 600 }}>{legendaEla || (pensando ? '...' : '')}</div>
            </div>

            {!resultado && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input value={link} onChange={function(e) { setLink(e.target.value) }} onKeyDown={function(e) { if (e.key === 'Enter') enviarLink() }} placeholder="Cole aqui o link da página de vendas" style={{ flex: '1 1 200px', minWidth: 0, background: 'rgba(255,255,255,0.08)', border: borda, color: '#fff', borderRadius: 12, padding: '10px 12px', fontSize: 14 }} />
                <button onClick={enviarLink} disabled={!link.trim()} style={{ cursor: 'pointer', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 12, padding: '10px 16px', fontWeight: 800, opacity: link.trim() ? 1 : 0.5 }}>Enviar link</button>
                <label style={{ cursor: enviandoMidia ? 'wait' : 'pointer', background: roxo, border: borda, borderRadius: 12, padding: '10px 14px', fontSize: 13, fontWeight: 700 }}>
                  {enviandoMidia ? 'Enviando...' : midia ? '📎 Trocar arquivo' : '📎 Anexar vídeo ou imagem'}
                  <input type="file" accept="video/*,image/*" disabled={enviandoMidia} style={{ display: 'none' }} onChange={function(e) { anexar(e.target.files && e.target.files[0] ? e.target.files[0] : null); e.target.value = '' }} />
                </label>
              </div>
            )}

            {pronto && rascunho && !resultado && (
              <div style={{ background: roxo, border: borda, borderRadius: 16, padding: 12 }}>
                <div style={{ fontSize: 13.5, lineHeight: 1.45 }}>Tudo pronto, confira na tela do computador. O anúncio é criado <b>pausado</b>, para você conferir antes de gastar.</div>
                <button onClick={criarPeloBotao} disabled={criando} style={{ cursor: criando ? 'wait' : 'pointer', marginTop: 10, width: '100%', background: 'linear-gradient(135deg,#16a34a,#15803d)', color: '#fff', border: 'none', borderRadius: 12, padding: '13px 16px', fontSize: 15, fontWeight: 800 }}>{criando ? 'Criando... pode levar até 1 minuto' : 'Confirmar e criar (fica pausado)'}</button>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 8, textAlign: 'center' }}>Ou diga "pode criar" para a Camila.</div>
              </div>
            )}

            {resultado && (
              <div style={{ background: 'rgba(22,163,74,0.15)', border: '1px solid rgba(22,163,74,0.5)', borderRadius: 16, padding: 14, fontSize: 14, lineHeight: 1.5 }}>
                <b>Anúncio criado, pausado.</b><br />{resultado.nome}<br />
                <a href={'https://adsmanager.facebook.com/adsmanager/manage/campaigns?selected_campaign_ids=' + resultado.campanhaId} target="_blank" rel="noopener noreferrer" style={{ color: '#86efac', fontWeight: 700 }}>Abrir no Gerenciador do Facebook</a>
                <div><button onClick={novoAnuncio} style={{ cursor: 'pointer', marginTop: 10, background: roxo, border: borda, color: '#fff', borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 700 }}>Criar outro anúncio</button></div>
              </div>
            )}

            {erro && <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.5)', borderRadius: 12, padding: '10px 12px', fontSize: 13 }}>{erro}</div>}
          </div>
        )}
      </div>

      {somBloqueado && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(8,4,20,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5 }}>
          <button onClick={liberarSom} style={{ cursor: 'pointer', background: 'linear-gradient(135deg,#7c3aed,#a21caf)', color: '#fff', border: 'none', borderRadius: 16, padding: '16px 28px', fontSize: 16, fontWeight: 800 }}>🔊 Toque para ouvir a Camila</button>
        </div>
      )}
    </div>
  )
}
