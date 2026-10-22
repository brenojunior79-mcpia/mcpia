'use client'
import { useRef, useState } from 'react'
import { dica, botao, botaoClaro, erro } from './ui'

export type Clipe = { id: string; nome: string; blob: Blob; url: string }
export const MAX_CLIPES = 8
export const MAX_TOTAL_MB = 250

export default function CardVideos({ clipes, setClipes, onSeguir }: { clipes: Clipe[]; setClipes: (c: Clipe[]) => void; onSeguir: () => void }) {
  const [msg, setMsg] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const totalMb = clipes.reduce(function(s, c) { return s + c.blob.size }, 0) / 1048576

  function adicionar(files: FileList | null) {
    setMsg('')
    if (!files || !files.length) return
    const novos: Clipe[] = []
    let ignorados = 0
    Array.from(files).forEach(function(f) {
      if (!/^video\//.test(f.type) && !/\.(mp4|mov|m4v|webm)$/i.test(f.name)) { ignorados++; return }
      if (clipes.length + novos.length >= MAX_CLIPES) { ignorados++; return }
      novos.push({ id: Math.random().toString(36).slice(2), nome: f.name, blob: f, url: URL.createObjectURL(f) })
    })
    const soma = (clipes.concat(novos)).reduce(function(s, c) { return s + c.blob.size }, 0) / 1048576
    if (soma > MAX_TOTAL_MB) { novos.forEach(function(c) { URL.revokeObjectURL(c.url) }); setMsg('Os vídeos passam de ' + MAX_TOTAL_MB + ' MB juntos. Escolha vídeos menores ou menos vídeos.'); return }
    if (ignorados) setMsg(ignorados + ' arquivo(s) ignorado(s): só vídeos, no máximo ' + MAX_CLIPES + ' no total.')
    if (novos.length) setClipes(clipes.concat(novos))
    if (inputRef.current) inputRef.current.value = ''
  }
  function remover(id: string) {
    const c = clipes.find(function(x) { return x.id === id })
    if (c) URL.revokeObjectURL(c.url)
    setClipes(clipes.filter(function(x) { return x.id !== id }))
  }
  function mover(i: number, d: number) {
    const j = i + d
    if (j < 0 || j >= clipes.length) return
    const c = clipes.slice(); const t = c[i]; c[i] = c[j]; c[j] = t
    setClipes(c)
  }

  return (
    <div>
      <div style={{ fontSize: 13, color: 'var(--muted2)', marginBottom: 14 }}>Selecione os vídeos que vão aparecer no criativo. Eles vão automaticamente para a edição, na ordem da lista, e o tempo de cada um é dividido durante a narração.</div>

      <div style={{ border: '1px dashed var(--border2)', borderRadius: 14, padding: 14, marginBottom: 16, background: 'var(--surface2)' }}>
        <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 2 }}>🔎 Galeria de vídeos (Vecteezy)</div>
        <div style={{ fontSize: 13, color: 'var(--muted2)' }}>Em breve: a galeria aparece aqui já aberta, com busca por nicho. Você só seleciona os vídeos e eles vão direto para a edição, sem precisar baixar nada.</div>
      </div>

      <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 8 }}>📁 Ou use seus próprios vídeos</div>
      <input ref={inputRef} type="file" accept="video/*,.mp4,.mov,.m4v,.webm" multiple onChange={function(e) { adicionar(e.target.files) }} style={{ display: 'none' }} />
      <button onClick={function() { inputRef.current && inputRef.current.click() }} disabled={clipes.length >= MAX_CLIPES} style={{ ...botao, opacity: clipes.length >= MAX_CLIPES ? 0.5 : 1 }}>+ Enviar vídeos</button>
      <span style={{ ...dica, marginLeft: 10 }}>{clipes.length} de {MAX_CLIPES} · {totalMb.toFixed(0)} MB</span>
      {msg && <div style={erro}>{msg}</div>}

      {clipes.length > 0 && (
        <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
          {clipes.map(function(c, i) {
            return (
              <div key={c.id} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ position: 'relative', background: '#000' }}>
                  <video src={c.url + '#t=0.1'} muted playsInline preload="metadata" controls style={{ width: '100%', height: 190, objectFit: 'cover', display: 'block' }} />
                  <span style={{ position: 'absolute', top: 6, left: 6, background: '#7c5cfc', color: '#fff', fontWeight: 800, fontSize: 12, borderRadius: 8, padding: '2px 8px' }}>{i + 1}</span>
                </div>
                <div style={{ padding: '6px 8px' }}>
                  <div style={{ fontSize: 11.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.nome}>{c.nome}</div>
                  <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                    <button onClick={function() { mover(i, -1) }} disabled={i === 0} style={{ ...botaoClaro, padding: '3px 8px', fontSize: 12 }}>←</button>
                    <button onClick={function() { mover(i, 1) }} disabled={i === clipes.length - 1} style={{ ...botaoClaro, padding: '3px 8px', fontSize: 12 }}>→</button>
                    <button onClick={function() { remover(c.id) }} style={{ ...botaoClaro, padding: '3px 8px', fontSize: 12, color: '#b91c1c', marginLeft: 'auto' }}>✕</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {clipes.length > 0 && <div style={{ marginTop: 16 }}><button onClick={onSeguir} style={botao}>✂️ Ir para a edição →</button></div>}
    </div>
  )
}
