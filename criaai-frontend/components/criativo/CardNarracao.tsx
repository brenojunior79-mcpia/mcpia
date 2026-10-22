'use client'
import { useEffect, useRef, useState } from 'react'
import { input, label, dica, botao, botaoClaro, erro } from './ui'
import { carregarEditor, acelerarAudio } from '@/lib/criativoRender'

// blob = audio final (ja na velocidade escolhida); original = audio como a voz falou, sem acelerar
export type Narracao = { url: string; blob: Blob; original: Blob; velocidade: number; texto: string; voz: string }

const VELOCIDADES = [1.1, 1.2, 1.3, 1.4]


const VOZES: { id: string; nome: string; desc: string; sexo: 'h' | 'm' }[] = [
  { id: 'onyx', nome: 'Rafael', desc: 'grave e firme', sexo: 'h' },
  { id: 'echo', nome: 'Lucas', desc: 'jovem e claro', sexo: 'h' },
  { id: 'ash', nome: 'Marcos', desc: 'calmo e próximo', sexo: 'h' },
  { id: 'verse', nome: 'Thiago', desc: 'expressivo', sexo: 'h' },
  { id: 'nova', nome: 'Camila', desc: 'jovem e animada', sexo: 'm' },
  { id: 'shimmer', nome: 'Juliana', desc: 'suave e acolhedora', sexo: 'm' },
  { id: 'coral', nome: 'Fernanda', desc: 'simpática e natural', sexo: 'm' },
  { id: 'sage', nome: 'Patrícia', desc: 'segura e serena', sexo: 'm' },
]

export default function CardNarracao({ texto, setTexto, narracao, setNarracao }: { texto: string; setTexto: (t: string) => void; narracao: Narracao | null; setNarracao: (n: Narracao | null) => void }) {
  const [voz, setVoz] = useState('onyx')
  const [velocidade, setVelocidade] = useState(1.1)
  const [ajustando, setAjustando] = useState(false)
  const [estilo, setEstilo] = useState('natural')
  const [carregando, setCarregando] = useState(false)
  const [msg, setMsg] = useState('')
  const urlAnterior = useRef<string>('')
  const amostras = useRef<Record<string, string>>({})
  const player = useRef<HTMLAudioElement | null>(null)
  const [tocando, setTocando] = useState('') // voz cuja amostra esta carregando/tocando

  // Pre-carrega as amostras (3 por vez) para o "Ouvir" tocar na hora
  async function carregarAmostra(id: string): Promise<string | null> {
    if (amostras.current[id]) return amostras.current[id]
    try {
      const r = await fetch('/api/criativo/amostra?voz=' + id)
      if (!r.ok) return null
      const url = URL.createObjectURL(await r.blob())
      amostras.current[id] = url
      return url
    } catch (e) { return null }
  }
  useEffect(function() {
    let vivo = true
    const fila = VOZES.map(function(v) { return v.id })
    async function trabalhador() { while (vivo && fila.length) { const id = fila.shift() as string; await carregarAmostra(id) } }
    const t = setTimeout(function() { trabalhador(); trabalhador(); trabalhador() }, 300)
    return function() { vivo = false; clearTimeout(t) }
  }, [])

  useEffect(function() {
    return function() {
      if (urlAnterior.current) URL.revokeObjectURL(urlAnterior.current)
      Object.keys(amostras.current).forEach(function(k) { URL.revokeObjectURL(amostras.current[k]) })
      if (player.current) player.current.pause()
    }
  }, [])

  async function ouvir(id: string) {
    setMsg('')
    if (player.current) { player.current.pause(); player.current = null }
    if (tocando === id) { setTocando(''); return }
    setTocando(id)
    const url = await carregarAmostra(id)
    if (!url) { setMsg('Não foi possível carregar a amostra.'); setTocando(''); return }
    try {
      const a = new Audio(url)
      a.playbackRate = velocidade
      ;(a as any).preservesPitch = true
      player.current = a
      a.onended = function() { setTocando(function(t) { return t === id ? '' : t }) }
      await a.play()
    } catch (e) { setTocando('') }
  }

  // Aplica a velocidade escolhida (sem mudar o tom da voz)
  async function comVelocidade(original: Blob, v: number): Promise<Blob> {
    try {
      const ff = await carregarEditor(function() { setMsg('Preparando o ajuste de velocidade (só na primeira vez)...') })
      const out = await acelerarAudio(ff, original, v)
      setMsg('')
      return out
    } catch (e) {
      setMsg('Não consegui mudar a velocidade agora. O áudio ficou na velocidade normal.')
      return original
    }
  }

  async function mudarVelocidade(v: number) {
    setVelocidade(v)
    if (!narracao || ajustando) return
    setAjustando(true); setMsg('')
    try {
      const final = await comVelocidade(narracao.original, v)
      if (urlAnterior.current) URL.revokeObjectURL(urlAnterior.current)
      const url = URL.createObjectURL(final)
      urlAnterior.current = url
      setNarracao({ ...narracao, url, blob: final, velocidade: v })
    } finally { setAjustando(false) }
  }

  async function gerar() {
    setMsg('')
    if (texto.trim().length < 5) { setMsg('Cole ou escreva o texto que será narrado.'); return }
    setCarregando(true)
    try {
      const r = await fetch('/api/criativo/narrar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ texto, voz, estilo }) })
      if (!r.ok) { const j = await r.json().catch(function() { return {} }); setMsg(j.error || 'Não foi possível gerar a narração agora.'); return }
      const original = await r.blob()
      const final = await comVelocidade(original, velocidade)
      if (urlAnterior.current) URL.revokeObjectURL(urlAnterior.current)
      const url = URL.createObjectURL(final)
      urlAnterior.current = url
      setNarracao({ url, blob: final, original, velocidade, texto, voz })
    } catch (e) { setMsg('Sem conexão. Tente de novo.') } finally { setCarregando(false) }
  }

  function grupo(titulo: string, sexo: 'h' | 'm') {
    return (
      <div style={{ marginBottom: 10 }}>
        <div style={{ ...dica, marginBottom: 6, fontWeight: 700 }}>{titulo}</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {VOZES.filter(function(v) { return v.sexo === sexo }).map(function(v) {
            const on = voz === v.id
            return (
              <div key={v.id} style={{ display: 'flex', alignItems: 'stretch', borderRadius: 12, border: on ? '2px solid #7c5cfc' : '1px solid var(--border2)', background: on ? 'rgba(124,92,252,0.10)' : 'var(--surface2)', overflow: 'hidden' }}>
                <button onClick={function() { setVoz(v.id) }} style={{ cursor: 'pointer', textAlign: 'left', padding: '8px 12px', border: 0, background: 'transparent', color: 'var(--text)', minWidth: 120 }}>
                  <div style={{ fontWeight: 800, fontSize: 14 }}>{on ? '✓ ' : ''}{v.nome}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted2)' }}>{v.desc}</div>
                </button>
                <button onClick={function() { ouvir(v.id) }} title="Ouvir esta voz" style={{ cursor: 'pointer', border: 0, borderLeft: '1px solid var(--border)', background: 'transparent', color: '#7c5cfc', fontWeight: 800, fontSize: 12.5, padding: '0 12px' }}>{tocando === v.id ? '■ Parar' : '▶ Ouvir'}</button>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const chars = texto.length
  return (
    <div>
      <div style={{ fontSize: 13, color: 'var(--muted2)', marginBottom: 14 }}>Cole o texto, escolha a voz e a velocidade. Depois gere e baixe o áudio da narração.</div>

      <label style={label}>Texto da narração</label>
      <textarea style={{ ...input, resize: 'vertical' }} rows={7} value={texto} onChange={function(e) { setTexto(e.target.value) }} placeholder="Cole aqui o texto (ou traga do card Roteiro)." />
      <div style={{ ...dica, textAlign: 'right', marginTop: 3, color: chars > 3000 ? '#b91c1c' : undefined }}>{chars} / 3000 caracteres</div>

      <div style={{ marginTop: 12 }}>
        <label style={label}>Escolha a voz</label>
        {grupo('Vozes masculinas', 'h')}
        {grupo('Vozes femininas', 'm')}
      </div>

      <div style={{ marginTop: 6, maxWidth: 320 }}>
        <label style={label}>Estilo</label>
        <select style={input} value={estilo} onChange={function(e) { setEstilo(e.target.value) }}>
          <option value="natural">Natural</option><option value="vendedor">Animado (vendedor)</option><option value="emocional">Emocional e calmo</option>
        </select>
      </div>

      <div style={{ marginTop: 14 }}>
        <label style={label}>Velocidade da voz <span style={dica}>(1.1 a 1.4, sem mudar o tom)</span></label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {VELOCIDADES.map(function(v) {
            const on = velocidade === v
            return <button key={v} onClick={function() { mudarVelocidade(v) }} disabled={ajustando} style={{ cursor: 'pointer', padding: '9px 18px', borderRadius: 999, fontSize: 14, fontWeight: 800, color: 'var(--text)', border: on ? '2px solid #7c5cfc' : '1px solid var(--border2)', background: on ? 'rgba(124,92,252,0.10)' : 'var(--surface2)' }}>{on ? '✓ ' : ''}{v.toFixed(1).replace('.', ',')}x</button>
          })}
        </div>
        {ajustando && <div style={{ ...dica, marginTop: 6 }}>Ajustando a velocidade...</div>}
      </div>

      <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <button onClick={gerar} disabled={carregando || chars > 3000} style={{ ...botao, opacity: carregando || chars > 3000 ? 0.6 : 1 }}>{carregando ? 'Gerando áudio...' : (narracao ? '🎙️ Gerar de novo' : '🎙️ Gerar narração')}</button>
      </div>
      {msg && <div style={erro}>{msg}</div>}

      {narracao && (
        <div style={{ marginTop: 18, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 14, padding: 14 }}>
          <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 8 }}>✓ Narração pronta</div>
          <audio controls src={narracao.url} style={{ width: '100%' }} />
          <div style={{ marginTop: 10, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <a href={narracao.url} download="narracao.mp3" style={{ ...botaoClaro, textDecoration: 'none', display: 'inline-block' }}>⬇ Baixar áudio (MP3)</a>
          </div>
          {narracao.texto !== texto && <div style={{ ...dica, marginTop: 8 }}>O texto foi alterado depois deste áudio. Gere de novo para atualizar.</div>}
        </div>
      )}
    </div>
  )
}
