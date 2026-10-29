'use client'
import { useEffect, useRef, useState } from 'react'
import { input, botaoClaro } from './ui'

export type Clipe = {
  id: string; nome: string
  origem: 'vecteezy' | 'arquivo' | 'link'
  url: string          // para pre-visualizar
  thumb?: string
  duracao?: number
  blob?: Blob          // arquivos enviados pelo aluno
  fonte?: string       // endereco do arquivo para usar na edicao (videos da galeria / links)
}
export const MAX_CLIPES = 8
export const MAX_TOTAL_MB = 250

type Video = { id: string; titulo: string; duracao: number; thumb: string; previa: string; arquivo: string; largura: number; altura: number; pagina: string }

const SUGESTOES = ['maternidade', 'receitas', 'crianças', 'atividades', 'cristão', 'ansiedade']
const verde = '#15803d'

function mmss(s: number) { const m = Math.floor(s / 60); const r = Math.round(s % 60); return m + ':' + String(r).padStart(2, '0') }

export default function CardVideos({ clipes, setClipes, onSeguir }: { clipes: Clipe[]; setClipes: (c: Clipe[]) => void; onSeguir: () => void }) {
  const [q, setQ] = useState('')
  const [buscado, setBuscado] = useState('')
  const [formato, setFormato] = useState('vertical')
  const [videos, setVideos] = useState<Video[]>([])
  const [carregando, setCarregando] = useState(true)
  const [conectado, setConectado] = useState<boolean | null>(null)
  const [erro, setErro] = useState('')
  const [tocando, setTocando] = useState('')
  const [link, setLink] = useState('')
  const [msg, setMsg] = useState('')
  const [baixando, setBaixando] = useState(false)
  const arqRef = useRef<HTMLInputElement>(null)
  const clipesRef = useRef(clipes)
  clipesRef.current = clipes

  async function buscar(termo: string, fmt: string) {
    setCarregando(true); setErro(''); setTocando('')
    try {
      const r = await fetch('/api/criativo/videos?q=' + encodeURIComponent(termo) + '&formato=' + fmt)
      const j = await r.json().catch(function() { return {} })
      setConectado(j.conectado !== false)
      setVideos(Array.isArray(j.videos) ? j.videos : [])
      setBuscado(termo)
      if (j.error) setErro(j.error)
      else if (!j.videos || !j.videos.length) setErro('Nenhum vídeo encontrado. Tente outra palavra ou outro formato.')
    } catch (e) { setErro('Sem conexão. Tente de novo.') } finally { setCarregando(false) }
  }

  // A galeria ja abre com videos, antes de qualquer busca
  useEffect(function() { buscar('', 'vertical') }, []) // eslint-disable-line

  const indice = function(id: string) { return clipes.findIndex(function(c) { return c.id === id }) }

  function alternar(v: Video) {
    setMsg('')
    const i = indice('vecteezy-' + v.id)
    if (i >= 0) { setClipes(clipes.filter(function(c) { return c.id !== 'vecteezy-' + v.id })); return }
    if (clipes.length >= MAX_CLIPES) { setMsg('No máximo ' + MAX_CLIPES + ' vídeos por criativo.'); return }
    setClipes(clipes.concat([{ id: 'vecteezy-' + v.id, nome: v.titulo || 'Vídeo ' + v.id, origem: 'vecteezy', url: v.previa, thumb: v.thumb, duracao: v.duracao, fonte: v.arquivo }]))
  }

  async function adicionarLink() {
    setMsg('')
    const t = link.trim()
    if (!t) return
    const pix = /vecteezy\.com\/.*?-(\d+)\/?(?:\?.*)?$/i.exec(t)
    if (pix) {
      try {
        const r = await fetch('/api/criativo/videos?id=' + pix[1])
        const j = await r.json()
        if (j.videos && j.videos[0]) { alternarSeNovo(j.videos[0]); setLink(''); return }
      } catch (e) {}
      setMsg('Não encontrei esse vídeo no Vecteezy.'); return
    }
    if (/^https:\/\/.+\.(mp4|mov|m4v|webm)(\?.*)?$/i.test(t)) {
      if (clipes.length >= MAX_CLIPES) { setMsg('No máximo ' + MAX_CLIPES + ' vídeos por criativo.'); return }
      setClipes(clipes.concat([{ id: 'link-' + Math.random().toString(36).slice(2), nome: t.split('/').pop() || 'Vídeo do link', origem: 'link', url: t, fonte: t }]))
      setLink(''); return
    }
    setMsg('Cole o link de um vídeo do Vecteezy ou o endereço direto de um arquivo de vídeo (.mp4).')
  }
  function alternarSeNovo(v: Video) { if (indice('vecteezy-' + v.id) === -1) alternar(v) }

  function adicionarArquivos(files: FileList | null) {
    setMsg('')
    if (!files || !files.length) return
    const novos: Clipe[] = []
    let ignorados = 0
    Array.from(files).forEach(function(f) {
      if (!/^video\//.test(f.type) && !/\.(mp4|mov|m4v|webm)$/i.test(f.name)) { ignorados++; return }
      if (clipes.length + novos.length >= MAX_CLIPES) { ignorados++; return }
      novos.push({ id: 'arq-' + Math.random().toString(36).slice(2), nome: f.name, origem: 'arquivo', blob: f, url: URL.createObjectURL(f) })
    })
    const soma = clipes.concat(novos).reduce(function(s, c) { return s + (c.blob ? c.blob.size : 0) }, 0) / 1048576
    if (soma > MAX_TOTAL_MB) { novos.forEach(function(c) { URL.revokeObjectURL(c.url) }); setMsg('Os arquivos passam de ' + MAX_TOTAL_MB + ' MB juntos. Escolha vídeos menores.'); return }
    if (ignorados) setMsg(ignorados + ' arquivo(s) ignorado(s): só vídeos, no máximo ' + MAX_CLIPES + ' no total.')
    if (novos.length) setClipes(clipes.concat(novos))
    if (arqRef.current) arqRef.current.value = ''
  }

  async function baixarSelecionados() {
    setMsg(''); setBaixando(true)
    try {
      for (let i = 0; i < clipes.length; i++) {
        const c = clipes[i]
        let href = c.url
        let revogar = false
        if (c.fonte) {
          const r = await fetch(c.origem === 'vecteezy' ? '/api/criativo/videos/arquivo?id=' + encodeURIComponent(c.fonte) : c.fonte)
          if (!r.ok) throw new Error('falhou')
          href = URL.createObjectURL(await r.blob()); revogar = true
        }
        const a = document.createElement('a')
        a.href = href; a.download = 'video-' + (i + 1) + '.mp4'
        document.body.appendChild(a); a.click(); a.remove()
        if (revogar) setTimeout(function() { URL.revokeObjectURL(href) }, 4000)
        await new Promise(function(r) { setTimeout(r, 400) })
      }
    } catch (e) { setMsg('Não foi possível baixar todos os vídeos. Tente de novo.') } finally { setBaixando(false) }
  }

  const rotuloFormato: Record<string, string> = { vertical: 'Vertical 9:16', quadrado: 'Quadrado 1:1', horizontal: 'Horizontal 16:9' }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 22 }}>3 · Buscar vídeos</div>
          <div style={{ fontSize: 13.5, color: 'var(--muted2)', marginTop: 2 }}>Procure cenas no Vecteezy, com licença para usar em anúncio. Marque as que quiser e baixe ou mande direto para a edição.</div>
        </div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#16161d', color: '#fff', fontWeight: 800, fontSize: 13, padding: '9px 14px', borderRadius: 999 }}>
          Vecteezy
          <span style={{ background: conectado === false ? '#fde2e2' : '#dcf5e6', color: conectado === false ? '#b91c1c' : verde, fontSize: 11.5, fontWeight: 800, padding: '2px 9px', borderRadius: 999 }}>{conectado === false ? 'não conectado' : 'conectado'}</span>
        </span>
      </div>

      <form onSubmit={function(e) { e.preventDefault(); buscar(q.trim(), formato) }} style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 5 }}>Buscar no Vecteezy</div>
          <input style={{ ...input, padding: '13px 14px', borderRadius: 12, background: 'var(--surface)' }} value={q} onChange={function(e) { setQ(e.target.value) }} placeholder="Ex: criança no celular, mulher sorrindo..." />
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 5 }}>Formato</div>
          <select style={{ ...input, padding: '13px 12px', borderRadius: 12, background: 'var(--surface)', minWidth: 160 }} value={formato} onChange={function(e) { setFormato(e.target.value); buscar(q.trim(), e.target.value) }}>
            <option value="vertical">{rotuloFormato.vertical}</option><option value="quadrado">{rotuloFormato.quadrado}</option><option value="horizontal">{rotuloFormato.horizontal}</option>
          </select>
        </div>
        <button type="submit" disabled={carregando} style={{ cursor: 'pointer', border: 0, background: '#16161d', color: '#fff', fontWeight: 800, fontSize: 14, padding: '14px 24px', borderRadius: 12, opacity: carregando ? 0.7 : 1 }}>{carregando ? 'Buscando...' : 'Buscar'}</button>
      </form>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
        <span style={{ fontSize: 12.5, color: 'var(--muted2)' }}>Nichos:</span>
        {SUGESTOES.map(function(s) {
          return <button key={s} onClick={function() { setQ(s); buscar(s, formato) }} style={{ cursor: 'pointer', border: '1px solid var(--border2)', background: 'var(--surface)', color: 'var(--text)', fontSize: 13.5, fontWeight: 600, padding: '8px 14px', borderRadius: 999 }}>{s}</button>
        })}
      </div>

      <div style={{ marginTop: 16, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 14, padding: '12px 14px' }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Ou cole o link de um vídeo</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input style={{ ...input, flex: 1, minWidth: 200, background: 'var(--surface)', borderRadius: 12 }} value={link} onChange={function(e) { setLink(e.target.value) }} onKeyDown={function(e) { if (e.key === 'Enter') adicionarLink() }} placeholder="https://..." />
          <button onClick={adicionarLink} style={{ ...botaoClaro, background: 'var(--surface)', padding: '10px 18px', fontSize: 14 }}>Adicionar</button>
        </div>
        <div style={{ marginTop: 8, fontSize: 12.5 }}>
          <input ref={arqRef} type="file" accept="video/*,.mp4,.mov,.m4v,.webm" multiple onChange={function(e) { adicionarArquivos(e.target.files) }} style={{ display: 'none' }} />
          <span style={{ color: 'var(--muted2)' }}>Tem vídeos no computador? </span>
          <button onClick={function() { arqRef.current && arqRef.current.click() }} style={{ cursor: 'pointer', border: 0, background: 'transparent', color: '#7c5cfc', fontWeight: 800, fontSize: 12.5, padding: 0, textDecoration: 'underline' }}>Enviar do meu computador</button>
        </div>
      </div>

      {msg && <div style={{ marginTop: 10, fontSize: 13, fontWeight: 700, color: '#b91c1c' }}>{msg}</div>}

      {conectado === false ? (
        <div style={{ marginTop: 14, background: '#fef3c7', border: '1px solid #fcd34d', color: '#92400e', borderRadius: 12, padding: '12px 14px', fontSize: 13.5 }}>
          A galeria do Vecteezy ainda não está conectada. Falta cadastrar a chave de acesso (VECTEEZY_API_KEY e VECTEEZY_ACCOUNT_ID) na Vercel.
        </div>
      ) : erro ? (
        <div style={{ marginTop: 14, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', fontSize: 13.5 }}>{erro}</div>
      ) : (
        <div style={{ marginTop: 14, background: '#e8eefc', borderRadius: 12, padding: '11px 14px', fontSize: 13.5, color: '#1e3a8a' }}>
          {carregando ? 'Buscando vídeos...' : (
            <span><b>{videos.length} vídeos encontrados no Vecteezy</b>{buscado ? ' para “' + buscado + '”' : ' (os mais populares)'}. Aperte o play para assistir e “+ Escolher” para usar no criativo.</span>
          )}
        </div>
      )}

      <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 14, opacity: carregando ? 0.55 : 1, transition: 'opacity .2s' }}>
        {videos.map(function(v) {
          const i = indice('vecteezy-' + v.id)
          const on = i >= 0
          const reproduzindo = tocando === v.id
          return (
            <div key={v.id} style={{ position: 'relative', aspectRatio: '9 / 16', borderRadius: 16, overflow: 'hidden', background: '#000', border: on ? '3px solid ' + verde : '3px solid transparent', boxSizing: 'border-box' }}>
              {reproduzindo
                ? <video src={v.previa} autoPlay controls loop playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                : <div onClick={function() { setTocando(v.id) }} style={{ position: 'absolute', inset: 0, cursor: 'pointer', backgroundImage: 'url("' + v.thumb + '")', backgroundSize: 'cover', backgroundPosition: 'center' }}>
                    <span style={{ position: 'absolute', left: '50%', top: '42%', transform: 'translate(-50%,-50%)', width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,255,255,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(0,0,0,.35)' }}>
                      <span style={{ width: 0, height: 0, marginLeft: 4, borderTop: '9px solid transparent', borderBottom: '9px solid transparent', borderLeft: '15px solid #111' }} />
                    </span>
                  </div>}
              {on && <span style={{ position: 'absolute', top: 8, left: 8, width: 26, height: 26, borderRadius: '50%', background: verde, color: '#fff', fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>{i + 1}</span>}
              {!reproduzindo && v.duracao > 0 && <span style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,.6)', color: '#fff', fontWeight: 700, fontSize: 12, padding: '2px 8px', borderRadius: 8, pointerEvents: 'none' }}>{mmss(v.duracao)}</span>}
              {!reproduzindo && (
                <div style={{ position: 'absolute', left: 8, right: 8, bottom: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ background: 'rgba(255,255,255,.92)', color: '#111', fontSize: 12, fontWeight: 600, padding: '4px 8px', borderRadius: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.titulo}</div>
                  <button onClick={function() { alternar(v) }} style={{ cursor: 'pointer', border: 0, background: on ? verde : 'rgba(255,255,255,.95)', color: on ? '#fff' : '#111', fontWeight: 800, fontSize: 13, padding: '9px 0', borderRadius: 10 }}>{on ? '✓ Escolhido · ' + (i + 1) + 'º' : '+ Escolher'}</button>
                </div>
              )}
              {reproduzindo && <button onClick={function() { alternar(v) }} style={{ position: 'absolute', left: 8, right: 8, bottom: 40, cursor: 'pointer', border: 0, background: on ? verde : 'rgba(255,255,255,.95)', color: on ? '#fff' : '#111', fontWeight: 800, fontSize: 13, padding: '8px 0', borderRadius: 10 }}>{on ? '✓ Escolhido · ' + (i + 1) + 'º' : '+ Escolher'}</button>}
            </div>
          )
        })}
      </div>

      {clipes.some(function(c) { return c.origem !== 'vecteezy' }) && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 6 }}>Seus vídeos adicionados</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {clipes.map(function(c, i) {
              if (c.origem === 'vecteezy') return null
              return (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, background: 'var(--surface2)', borderRadius: 10, padding: '6px 10px' }}>
                  <b style={{ color: verde }}>{i + 1}º</b><span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nome}</span>
                  <button onClick={function() { setClipes(clipes.filter(function(x) { return x.id !== c.id })) }} style={{ cursor: 'pointer', border: 0, background: 'transparent', color: '#b91c1c', fontWeight: 800 }}>✕</button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 160, fontWeight: 800, fontSize: 16 }}>{clipes.length === 0 ? 'Nenhum vídeo selecionado' : clipes.length + (clipes.length === 1 ? ' vídeo selecionado' : ' vídeos selecionados')}</div>
        <button onClick={baixarSelecionados} disabled={!clipes.length || baixando} style={{ ...botaoClaro, padding: '12px 20px', fontSize: 14, background: 'var(--surface)', opacity: !clipes.length || baixando ? 0.5 : 1 }}>{baixando ? 'Baixando...' : 'Baixar selecionados'}</button>
        <button onClick={onSeguir} disabled={!clipes.length} style={{ cursor: clipes.length ? 'pointer' : 'default', border: 0, background: verde, color: '#fff', fontWeight: 800, fontSize: 14, padding: '13px 22px', borderRadius: 12, opacity: clipes.length ? 1 : 0.5 }}>Próximo: edição</button>
      </div>
      <div style={{ marginTop: 8, fontSize: 11.5, color: 'var(--muted2)' }}>Vídeos fornecidos pelo Vecteezy.</div>
    </div>
  )
}
