'use client'
import { useEffect, useRef, useState } from 'react'

type Traco = { cor: string; larg: number; pts: { x: number; y: number }[] }

const CORES = ['#ef4444', '#facc15', '#22c55e', '#3b82f6', '#ffffff', '#111111']
const LARGS = [0.004, 0.008, 0.016] // proporcao da largura da imagem

// Tela de envio de imagem (print colado ou escolhido): rabiscar por cima, escrever legenda e enviar.
export default function EditorImagem({ blob, enviando, erro, onCancel, onSend }: {
  blob: Blob
  enviando: boolean
  erro: string
  onCancel: () => void
  onSend: (img: Blob, legenda: string) => void
}) {
  const cvRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const tracos = useRef<Traco[]>([])
  const atualTraco = useRef<Traco | null>(null)
  const [cor, setCor] = useState(CORES[0])
  const [larg, setLarg] = useState(1)
  const [legenda, setLegenda] = useState('')
  const [pronto, setPronto] = useState(false)
  const [falhou, setFalhou] = useState(false)
  const [qtd, setQtd] = useState(0)
  const [preparando, setPreparando] = useState(false)

  function desenhar() {
    const cv = cvRef.current, img = imgRef.current
    if (!cv || !img) return
    const ctx = cv.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, cv.width, cv.height)
    ctx.drawImage(img, 0, 0, cv.width, cv.height)
    const todos = tracos.current.concat(atualTraco.current ? [atualTraco.current] : [])
    for (const t of todos) {
      ctx.strokeStyle = t.cor; ctx.fillStyle = t.cor
      ctx.lineWidth = t.larg; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
      if (t.pts.length === 1) { ctx.beginPath(); ctx.arc(t.pts[0].x, t.pts[0].y, t.larg / 2, 0, Math.PI * 2); ctx.fill(); continue }
      ctx.beginPath()
      ctx.moveTo(t.pts[0].x, t.pts[0].y)
      for (let i = 1; i < t.pts.length; i++) ctx.lineTo(t.pts[i].x, t.pts[i].y)
      ctx.stroke()
    }
  }

  useEffect(function() {
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = function() {
      const cv = cvRef.current
      if (!cv) return
      const max = 2000
      const esc = Math.min(1, max / Math.max(img.width, img.height))
      cv.width = Math.max(1, Math.round(img.width * esc))
      cv.height = Math.max(1, Math.round(img.height * esc))
      imgRef.current = img
      tracos.current = []; atualTraco.current = null
      desenhar(); setPronto(true)
    }
    img.onerror = function() { setFalhou(true) }
    img.src = url
    return function() { URL.revokeObjectURL(url) }
  }, [blob])

  useEffect(function() {
    const k = function(e: KeyboardEvent) { if (e.key === 'Escape' && !enviando) onCancel() }
    window.addEventListener('keydown', k)
    return function() { window.removeEventListener('keydown', k) }
  }, [enviando, onCancel])

  function ponto(e: React.PointerEvent<HTMLCanvasElement>) {
    const cv = cvRef.current!
    const r = cv.getBoundingClientRect()
    return { x: (e.clientX - r.left) * (cv.width / r.width), y: (e.clientY - r.top) * (cv.height / r.height) }
  }
  function comeca(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!pronto || enviando) return
    e.currentTarget.setPointerCapture(e.pointerId)
    const cv = cvRef.current!
    atualTraco.current = { cor, larg: Math.max(3, cv.width * LARGS[larg]), pts: [ponto(e)] }
    desenhar()
  }
  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!atualTraco.current) return
    atualTraco.current.pts.push(ponto(e))
    desenhar()
  }
  function termina() {
    if (!atualTraco.current) return
    tracos.current.push(atualTraco.current)
    atualTraco.current = null
    setQtd(tracos.current.length)
    desenhar()
  }
  function desfazer() { tracos.current.pop(); setQtd(tracos.current.length); desenhar() }
  function limpar() { tracos.current = []; setQtd(0); desenhar() }

  // O WhatsApp aceita imagem ate 5 MB: comprime se precisar
  async function enviar() {
    const cv = cvRef.current
    if (!cv || !pronto || enviando) return
    setPreparando(true)
    desenhar()
    const gerar = function(q: number) { return new Promise<Blob | null>(function(res) { cv.toBlob(function(b) { res(b) }, 'image/jpeg', q) }) }
    let saida: Blob | null = null
    for (const q of [0.9, 0.75, 0.55]) {
      saida = await gerar(q)
      if (saida && saida.size <= 4.6 * 1048576) break
    }
    setPreparando(false)
    if (!saida) return
    onSend(saida, legenda.trim())
  }

  const bt: React.CSSProperties = { cursor: 'pointer', border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.12)', color: '#fff', borderRadius: 8, padding: '7px 11px', fontSize: 13, fontWeight: 700 }
  const ocupado = enviando || preparando

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 210, background: 'rgba(8,10,14,0.94)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '10px 12px' }}>
        <button onClick={onCancel} disabled={ocupado} style={bt} aria-label="Cancelar">✕ Cancelar</button>
        <div style={{ flex: 1 }} />
        <span style={{ color: '#cbd5e1', fontSize: 12 }}>✏️ Rabisque no print</span>
        {CORES.map(function(c) {
          return <button key={c} onClick={function() { setCor(c) }} aria-label={'Cor ' + c} style={{ width: 26, height: 26, borderRadius: '50%', background: c, border: cor === c ? '3px solid #fff' : '2px solid rgba(255,255,255,0.4)', cursor: 'pointer', boxShadow: cor === c ? '0 0 0 2px #2563eb' : 'none' }} />
        })}
        {LARGS.map(function(_l, i) {
          return <button key={i} onClick={function() { setLarg(i) }} aria-label={'Espessura ' + (i + 1)} style={{ ...bt, padding: '6px 10px', background: larg === i ? '#2563eb' : 'rgba(255,255,255,0.12)' }}><span style={{ display: 'inline-block', width: 4 + i * 4, height: 4 + i * 4, borderRadius: '50%', background: '#fff', verticalAlign: 'middle' }} /></button>
        })}
        <button onClick={desfazer} disabled={qtd === 0 || ocupado} style={{ ...bt, opacity: qtd === 0 ? 0.45 : 1 }}>↩ Desfazer</button>
        <button onClick={limpar} disabled={qtd === 0 || ocupado} style={{ ...bt, opacity: qtd === 0 ? 0.45 : 1 }}>🗑 Limpar</button>
      </div>

      <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 12px', overflow: 'auto' }}>
        {falhou
          ? <div style={{ color: '#fecaca', fontSize: 14 }}>Não consegui abrir essa imagem. Use JPG ou PNG.</div>
          : <canvas ref={cvRef} onPointerDown={comeca} onPointerMove={move} onPointerUp={termina} onPointerCancel={termina} style={{ maxWidth: '100%', maxHeight: '100%', touchAction: 'none', cursor: 'crosshair', background: '#fff', borderRadius: 6, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', opacity: pronto ? 1 : 0.2 }} />}
      </div>

      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {erro && <div style={{ color: '#fecaca', fontSize: 13, fontWeight: 600 }}>{erro}</div>}
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <textarea value={legenda} onChange={function(e) { setLegenda(e.target.value) }} rows={2} placeholder="Legenda (opcional)…" style={{ flex: 1, resize: 'none', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 14, fontFamily: 'inherit' }} />
          <button onClick={enviar} disabled={!pronto || ocupado || falhou} style={{ cursor: 'pointer', border: 0, background: '#16a34a', color: '#fff', borderRadius: 10, padding: '12px 20px', fontWeight: 800, fontSize: 14, opacity: !pronto || ocupado || falhou ? 0.55 : 1 }}>{ocupado ? 'Enviando…' : 'Enviar'}</button>
        </div>
      </div>
    </div>
  )
}
