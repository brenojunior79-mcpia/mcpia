'use client'
// Player do Vimeo usado em todas as aulas da plataforma, com uma barra de botoes GRANDES embaixo do video
// (pausar/continuar, som, voltar/avancar 10 segundos e ampliar). Os botoes do proprio Vimeo ficam pequenos no celular.
// A aula comeca sem legenda (o aluno liga no botao CC do player, se quiser).
import { useEffect, useRef, useState } from 'react'
import { carregarPlayerJs } from '@/lib/vimeoAssistida'

type Props = {
  videoId: string
  title?: string
  radius?: number
  frameRef?: React.RefObject<HTMLIFrameElement>
  autoplay?: boolean
  ratio?: number // largura / altura do video (padrao 16/9)
}

const ic = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true }
const IPlay = <svg {...ic}><path d="M7 4v16l13-8z" fill="currentColor" /></svg>
const IPause = <svg {...ic}><path d="M8 5v14M16 5v14" /></svg>
const ISom = <svg {...ic}><path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor" /><path d="M16.5 8.5a5 5 0 010 7M19 6a8.5 8.5 0 010 12" /></svg>
const IMudo = <svg {...ic}><path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor" /><path d="M17 9l5 6M22 9l-5 6" /></svg>
const IAmpliar = <svg {...ic}><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg>
const IFechar = <svg {...ic}><path d="M6 6l12 12M18 6L6 18" /></svg>
const IVolta = <svg {...ic}><path d="M3 12a9 9 0 109-9 9 9 0 00-6.4 2.6L3 8" /><path d="M3 3v5h5" /></svg>
const IAvanca = <svg {...ic}><path d="M21 12a9 9 0 11-9-9 9 9 0 016.4 2.6L21 8" /><path d="M21 3v5h-5" /></svg>

export default function PlayerVimeo({ videoId, title, radius, frameRef, autoplay, ratio }: Props) {
  const proporcao = ratio && ratio > 0.3 && ratio < 4 ? ratio : 16 / 9
  const interno = useRef<HTMLIFrameElement>(null)
  const ref = frameRef || interno
  const player = useRef<any>(null)
  const [tocando, setTocando] = useState(autoplay !== false)
  const [mudo, setMudo] = useState(false)
  const [ampliado, setAmpliado] = useState(false)
  const [pronto, setPronto] = useState(false)

  useEffect(function() {
    let vivo = true
    const f = ref.current
    if (!f) return
    carregarPlayerJs().then(function(V) {
      if (!vivo) return
      const pl = new V.Player(f)
      player.current = pl
      pl.on('play', function() { setTocando(true) })
      pl.on('pause', function() { setTocando(false) })
      pl.on('ended', function() { setTocando(false) })
      pl.on('volumechange', function(d: any) { if (d && typeof d.volume === 'number') setMudo(d.volume === 0) })
      pl.ready().then(function() {
        if (!vivo) return
        setPronto(true)
        pl.disableTextTrack().catch(function() {})
        pl.getMuted().then(function(m: boolean) { if (vivo) setMudo(!!m) }).catch(function() {})
        pl.getPaused().then(function(p: boolean) { if (vivo) setTocando(!p) }).catch(function() {})
      }).catch(function() {})
    }).catch(function() {})
    return function() { vivo = false; try { if (player.current) player.current.destroy() } catch (e) {}; player.current = null }
  }, [videoId])

  // Fecha a tela ampliada com a tecla Esc
  useEffect(function() {
    if (!ampliado) return
    function tecla(e: KeyboardEvent) { if (e.key === 'Escape') setAmpliado(false) }
    document.addEventListener('keydown', tecla)
    const antes = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return function() { document.removeEventListener('keydown', tecla); document.body.style.overflow = antes }
  }, [ampliado])

  function alternarPlay() {
    const pl = player.current
    if (!pl) return
    if (tocando) pl.pause().catch(function() {}); else pl.play().catch(function() {})
  }
  function alternarSom() {
    const pl = player.current
    if (!pl) return
    if (mudo) { pl.setMuted(false).catch(function() {}); pl.setVolume(1).catch(function() {}); setMudo(false) }
    else { pl.setMuted(true).catch(function() {}); setMudo(true) }
  }
  function pular(seg: number) {
    const pl = player.current
    if (!pl) return
    pl.getCurrentTime().then(function(t: number) { return pl.setCurrentTime(Math.max(0, t + seg)) }).catch(function() {})
  }
  function ampliar() {
    // Em muitos celulares a tela cheia de verdade nao abre dentro da pagina: entao a gente amplia o video para ocupar a tela toda
    setAmpliado(!ampliado)
  }

  const botao: React.CSSProperties = {
    flex: '1 1 0', minWidth: 0, minHeight: 52, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
    border: '1px solid var(--border2, rgba(128,128,128,0.35))', borderRadius: 12, background: 'var(--surface2, #f1f1f5)', color: 'var(--text, #111)',
    fontSize: 11.5, fontWeight: 800, cursor: 'pointer', padding: '6px 4px', fontFamily: 'inherit', lineHeight: 1.1, WebkitTapHighlightColor: 'transparent',
  }
  const botaoAmpliado: React.CSSProperties = { ...botao, background: 'rgba(255,255,255,0.14)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)' }
  const b = ampliado ? botaoAmpliado : botao

  const caixaVideo: React.CSSProperties = ampliado
    ? { position: 'relative', width: 'min(100vw, calc((100vh - 96px) * ' + proporcao.toFixed(4) + '))', aspectRatio: String(proporcao), background: '#000' }
    : { position: 'relative', width: '100%', paddingBottom: (100 / proporcao).toFixed(3) + '%', height: 0, borderRadius: radius === undefined ? 12 : radius, overflow: 'hidden', background: '#000' }

  const raiz: React.CSSProperties = ampliado
    ? { position: 'fixed', inset: 0, zIndex: 100000, background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '8px 8px calc(8px + env(safe-area-inset-bottom))' }
    : { width: '100%' }

  return (
    <div style={raiz}>
      <div style={caixaVideo}>
        <iframe
          ref={ref}
          src={'https://player.vimeo.com/video/' + videoId + '?title=0&byline=0&portrait=0&dnt=1&autoplay=1&muted=0&playsinline=1'}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
          allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media"
          allowFullScreen
          title={title || 'Aula'}
        />
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: ampliado ? 0 : 8, width: ampliado ? 'min(100vw - 16px, 560px)' : '100%', opacity: pronto ? 1 : 0.6 }}>
        <button type="button" onClick={alternarPlay} style={b} aria-label={tocando ? 'Pausar' : 'Continuar'}>{tocando ? IPause : IPlay}<span>{tocando ? 'Pausar' : 'Continuar'}</span></button>
        <button type="button" onClick={function() { pular(-10) }} style={b} aria-label="Voltar 10 segundos">{IVolta}<span>Voltar 10s</span></button>
        <button type="button" onClick={function() { pular(10) }} style={b} aria-label="Avançar 10 segundos">{IAvanca}<span>Avançar 10s</span></button>
        <button type="button" onClick={alternarSom} style={b} aria-label={mudo ? 'Ligar o som' : 'Desligar o som'}>{mudo ? IMudo : ISom}<span>{mudo ? 'Ligar som' : 'Som ligado'}</span></button>
        <button type="button" onClick={ampliar} style={b} aria-label={ampliado ? 'Fechar a tela ampliada' : 'Ampliar o vídeo'}>{ampliado ? IFechar : IAmpliar}<span>{ampliado ? 'Fechar' : 'Ampliar'}</span></button>
      </div>
    </div>
  )
}
