'use client'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// Ajuste da foto de perfil: o aluno arrasta para posicionar e usa o zoom; salva um quadrado de 256x256.
const P = 260 // tamanho da area de ajuste na tela

export default function FotoPerfilModal({ arquivo, onCancelar, onSalvar, salvando }: { arquivo: File; onCancelar: () => void; onSalvar: (blob: Blob) => void; salvando: boolean }) {
  const [url, setUrl] = useState('')
  const [dim, setDim] = useState<{ w: number; h: number } | null>(null)
  const [zoom, setZoom] = useState(1)
  const [off, setOff] = useState({ x: 0, y: 0 })
  const [erro, setErro] = useState('')
  const imgRef = useRef<HTMLImageElement | null>(null)
  const arrasto = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)

  useEffect(function() {
    const u = URL.createObjectURL(arquivo)
    setUrl(u)
    const im = new Image()
    im.onload = function() { imgRef.current = im; setDim({ w: im.naturalWidth, h: im.naturalHeight }) }
    im.onerror = function() { setErro('Não consegui abrir essa imagem. Escolha outra (JPG ou PNG).') }
    im.src = u
    return function() { URL.revokeObjectURL(u) }
  }, [arquivo])

  const s0 = dim ? P / Math.min(dim.w, dim.h) : 1
  const s = s0 * zoom

  // Mantem a imagem sempre cobrindo toda a area (sem bordas vazias)
  function limitar(o: { x: number; y: number }, z: number) {
    if (!dim) return o
    const sc = s0 * z
    const mx = Math.max(0, (dim.w * sc - P) / 2), my = Math.max(0, (dim.h * sc - P) / 2)
    return { x: Math.min(mx, Math.max(-mx, o.x)), y: Math.min(my, Math.max(-my, o.y)) }
  }

  function mudarZoom(z: number) { setZoom(z); setOff(function(o) { return limitar(o, z) }) }

  function salvar() {
    if (!dim || !imgRef.current) return
    const canvas = document.createElement('canvas')
    canvas.width = 256; canvas.height = 256
    const ctx = canvas.getContext('2d')
    if (!ctx) { setErro('Seu navegador não conseguiu preparar a foto.'); return }
    const sx = dim.w / 2 - (P / 2 + off.x) / s
    const sy = dim.h / 2 - (P / 2 + off.y) / s
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 256, 256)
    ctx.drawImage(imgRef.current, sx, sy, P / s, P / s, 0, 0, 256, 256)
    canvas.toBlob(function(b) { if (b) onSalvar(b); else setErro('Não consegui preparar a foto.') }, 'image/jpeg', 0.85)
  }

  // Portal: fica por cima de tudo mesmo quando aberto de dentro do menu lateral (no celular ele desliza)
  if (typeof document === 'undefined') return null
  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onCancelar}>
      <div onClick={function(e) { e.stopPropagation() }} style={{ width: '100%', maxWidth: 340, background: 'var(--surface)', color: 'var(--text)', borderRadius: 20, padding: 20, boxShadow: '0 24px 60px rgba(0,0,0,.4)', textAlign: 'center' }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 18, marginBottom: 4 }}>Ajustar foto de perfil</div>
        <div style={{ fontSize: 12.5, color: 'var(--muted2)', marginBottom: 14 }}>Arraste para posicionar e use o zoom para ajustar.</div>

        <div
          onPointerDown={function(e) { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); arrasto.current = { x: e.clientX, y: e.clientY, ox: off.x, oy: off.y } }}
          onPointerMove={function(e) { const a = arrasto.current; if (!a) return; setOff(limitar({ x: a.ox + (e.clientX - a.x), y: a.oy + (e.clientY - a.y) }, zoom)) }}
          onPointerUp={function() { arrasto.current = null }}
          onPointerCancel={function() { arrasto.current = null }}
          style={{ position: 'relative', width: P, height: P, margin: '0 auto', borderRadius: '50%', overflow: 'hidden', background: '#000', cursor: 'grab', touchAction: 'none', border: '3px solid var(--border2)' }}>
          {dim && url && (
            <img src={url} alt="" draggable={false} style={{ position: 'absolute', left: P / 2 + off.x - (dim.w * s) / 2, top: P / 2 + off.y - (dim.h * s) / 2, width: dim.w * s, height: dim.h * s, maxWidth: 'none', userSelect: 'none', pointerEvents: 'none' }} />
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 4px 6px' }}>
          <span style={{ fontSize: 16 }}>−</span>
          <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={function(e) { mudarZoom(parseFloat(e.target.value)) }} aria-label="Zoom" style={{ flex: 1, accentColor: '#7c5cfc' }} />
          <span style={{ fontSize: 16 }}>+</span>
        </div>

        {erro && <div style={{ color: '#dc2626', fontSize: 12.5, fontWeight: 700, margin: '6px 0' }}>{erro}</div>}

        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button onClick={onCancelar} disabled={salvando} style={{ flex: 1, padding: '11px 0', borderRadius: 12, border: '1px solid var(--border2)', background: 'var(--surface2)', color: 'var(--text)', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Cancelar</button>
          <button onClick={salvar} disabled={salvando || !dim} style={{ flex: 1, padding: '11px 0', borderRadius: 12, border: 0, background: '#7c5cfc', color: '#fff', fontWeight: 800, fontSize: 14, cursor: salvando || !dim ? 'default' : 'pointer', opacity: salvando || !dim ? 0.6 : 1 }}>{salvando ? 'Salvando…' : 'Salvar foto'}</button>
        </div>
      </div>
    </div>,
    document.body
  )
}
