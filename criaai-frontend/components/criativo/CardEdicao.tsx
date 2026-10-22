'use client'
import { useEffect, useRef, useState } from 'react'
import { input, label, dica, botao, botaoClaro, erro } from './ui'
import type { Narracao } from './CardNarracao'
import type { Clipe } from './CardVideos'
import { carregarEditor, montarCriativo, duracaoDoAudio, compactarAudio, Formato, EstiloLegenda } from '@/lib/criativoRender'

type Faixa = { nome: string; arquivo: string }
type Musicas = { animadas: Faixa[]; emocionais: Faixa[] }
type MusicaOpcao = 'nenhuma' | 'animada' | 'emocional' | 'minha'

export default function CardEdicao({ clipes, narracao, onIrVideos, onIrNarracao }: { clipes: Clipe[]; narracao: Narracao | null; onIrVideos: () => void; onIrNarracao: () => void }) {
  const [audioOutro, setAudioOutro] = useState<File | null>(null)
  const [usarOutro, setUsarOutro] = useState(false)
  const [musicas, setMusicas] = useState<Musicas>({ animadas: [], emocionais: [] })
  const [musicaTipo, setMusicaTipo] = useState<MusicaOpcao>('nenhuma')
  const [faixa, setFaixa] = useState('')
  const [minhaMusica, setMinhaMusica] = useState<File | null>(null)
  const [volume, setVolume] = useState(15)
  const [formato, setFormato] = useState<Formato>('9:16')
  const [legendas, setLegendas] = useState(true)
  const [estilo, setEstilo] = useState<EstiloLegenda>('amarelo')
  const [ocupado, setOcupado] = useState(false)
  const [etapa, setEtapa] = useState('')
  const [fracao, setFracao] = useState(0)
  const [msg, setMsg] = useState('')
  const [resultado, setResultado] = useState<{ url: string; mb: number } | null>(null)
  const urlRes = useRef('')

  useEffect(function() {
    fetch('/criativo/musicas.json', { cache: 'no-store' }).then(function(r) { return r.json() }).then(function(j) {
      setMusicas({ animadas: Array.isArray(j.animadas) ? j.animadas : [], emocionais: Array.isArray(j.emocionais) ? j.emocionais : [] })
    }).catch(function() {})
    return function() { if (urlRes.current) URL.revokeObjectURL(urlRes.current) }
  }, [])

  const lista = musicaTipo === 'animada' ? musicas.animadas : musicaTipo === 'emocional' ? musicas.emocionais : []
  useEffect(function() { setFaixa(lista.length ? lista[0].arquivo : '') }, [musicaTipo, musicas]) // eslint-disable-line

  const audioFonte: { blob: Blob; texto: string } | null = usarOutro && audioOutro ? { blob: audioOutro, texto: '' } : (narracao ? { blob: narracao.blob, texto: narracao.texto } : null)

  async function montar() {
    setMsg(''); setResultado(null)
    if (!clipes.length) { setMsg('Escolha os vídeos no card 3 primeiro.'); return }
    if (!audioFonte) { setMsg('Gere a narração no card 2 (ou envie um áudio).'); return }
    if (musicaTipo === 'minha' && !minhaMusica) { setMsg('Envie o arquivo da música ou escolha outra opção.'); return }
    setOcupado(true); setFracao(0)
    try {
      setEtapa('Lendo o áudio...')
      const duracao = await duracaoDoAudio(audioFonte.blob)
      if (duracao > 120) throw new Error('A narração passa de 2 minutos. Use um áudio mais curto.')

      const ff = await carregarEditor(setEtapa)

      let palavras = null
      if (legendas) {
        setEtapa('Criando as legendas...'); setFracao(0.02)
        let para = audioFonte.blob
        if (para.size > 3.5 * 1048576) para = await compactarAudio(ff, para)
        const fd = new FormData()
        fd.append('audio', para, 'narracao.mp3')
        if (audioFonte.texto) fd.append('dica', audioFonte.texto.slice(0, 600))
        const r = await fetch('/api/criativo/legendas', { method: 'POST', body: fd })
        const j = await r.json().catch(function() { return {} })
        if (!r.ok) throw new Error(j.error || 'Não foi possível criar as legendas. Tente de novo ou desligue as legendas.')
        palavras = j.palavras
      }

      let musica: Blob | null = null
      if (musicaTipo === 'minha') musica = minhaMusica
      else if (musicaTipo !== 'nenhuma' && faixa) musica = await (await fetch(faixa)).blob()

      const blob = await montarCriativo(ff, {
        clipes: clipes.map(function(c) { return c.blob }),
        narracao: audioFonte.blob, duracaoNarracao: duracao, musica, volumeMusica: volume / 100,
        palavras, formato, estiloLegenda: estilo,
        onProgresso: function(p, e) { setFracao(p); setEtapa(e) },
      })
      if (urlRes.current) URL.revokeObjectURL(urlRes.current)
      const url = URL.createObjectURL(blob)
      urlRes.current = url
      setResultado({ url, mb: blob.size / 1048576 })
    } catch (e: any) {
      setMsg(e && e.message ? String(e.message) : 'Algo deu errado na montagem. Tente de novo.')
    } finally { setOcupado(false); setEtapa('') }
  }

  const chip = function(on: boolean): React.CSSProperties {
    return { cursor: 'pointer', padding: '8px 14px', borderRadius: 999, fontSize: 13, fontWeight: 700, color: 'var(--text)', border: on ? '2px solid #7c5cfc' : '1px solid var(--border2)', background: on ? 'rgba(124,92,252,0.10)' : 'var(--surface2)' }
  }
  const bloco: React.CSSProperties = { background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 14, padding: 14, marginBottom: 12 }

  return (
    <div>
      <div style={{ fontSize: 13, color: 'var(--muted2)', marginBottom: 14 }}>A montagem junta seus vídeos, a narração e a música de fundo, e coloca as legendas. Ao final você baixa o criativo pronto.</div>

      <div style={bloco}>
        <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 6 }}>1. Vídeos</div>
        {clipes.length ? <div style={{ fontSize: 13 }}>{clipes.length} vídeo(s) escolhido(s). <button onClick={onIrVideos} style={{ ...botaoClaro, padding: '3px 10px', fontSize: 12 }}>Mudar</button></div>
          : <div style={{ fontSize: 13, color: '#b45309' }}>Nenhum vídeo escolhido. <button onClick={onIrVideos} style={{ ...botaoClaro, padding: '3px 10px', fontSize: 12 }}>Escolher no card 3</button></div>}
      </div>

      <div style={bloco}>
        <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 6 }}>2. Áudio (narração)</div>
        {narracao && !usarOutro && <div style={{ fontSize: 13 }}>✓ Usando a narração do card 2. <button onClick={function() { setUsarOutro(true) }} style={{ ...botaoClaro, padding: '3px 10px', fontSize: 12 }}>Enviar outro áudio</button></div>}
        {!narracao && !usarOutro && <div style={{ fontSize: 13, color: '#b45309' }}>Você ainda não gerou a narração. <button onClick={onIrNarracao} style={{ ...botaoClaro, padding: '3px 10px', fontSize: 12 }}>Gerar no card 2</button> <button onClick={function() { setUsarOutro(true) }} style={{ ...botaoClaro, padding: '3px 10px', fontSize: 12 }}>Enviar um áudio</button></div>}
        {usarOutro && (
          <div>
            <input type="file" accept="audio/*,.mp3,.wav,.m4a,.ogg" onChange={function(e) { setAudioOutro(e.target.files && e.target.files[0] ? e.target.files[0] : null) }} style={{ fontSize: 13 }} />
            {narracao && <div style={{ marginTop: 6 }}><button onClick={function() { setUsarOutro(false) }} style={{ ...botaoClaro, padding: '3px 10px', fontSize: 12 }}>Voltar para a narração do card 2</button></div>}
          </div>
        )}
      </div>

      <div style={bloco}>
        <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 8 }}>3. Música de fundo</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {([['nenhuma', 'Sem música'], ['animada', '🎉 Animada'], ['emocional', '💛 Emocional'], ['minha', '📁 Enviar a minha']] as [MusicaOpcao, string][]).map(function(o) {
            return <button key={o[0]} onClick={function() { setMusicaTipo(o[0]) }} style={chip(musicaTipo === o[0])}>{o[1]}</button>
          })}
        </div>
        {(musicaTipo === 'animada' || musicaTipo === 'emocional') && (
          <div style={{ marginTop: 10 }}>
            {lista.length ? (
              <div>
                <select style={{ ...input, maxWidth: 360 }} value={faixa} onChange={function(e) { setFaixa(e.target.value) }}>
                  {lista.map(function(f) { return <option key={f.arquivo} value={f.arquivo}>{f.nome}</option> })}
                </select>
                {faixa && <audio controls src={faixa} style={{ width: '100%', maxWidth: 360, marginTop: 8 }} />}
              </div>
            ) : <div style={{ fontSize: 13, color: 'var(--muted2)' }}>As músicas desta categoria ainda não foram adicionadas. Use “Enviar a minha” por enquanto.</div>}
          </div>
        )}
        {musicaTipo === 'minha' && (
          <div style={{ marginTop: 10 }}><input type="file" accept="audio/*,.mp3,.wav,.m4a,.ogg" onChange={function(e) { setMinhaMusica(e.target.files && e.target.files[0] ? e.target.files[0] : null) }} style={{ fontSize: 13 }} /></div>
        )}
        {musicaTipo !== 'nenhuma' && (
          <div style={{ marginTop: 12, maxWidth: 360 }}>
            <label style={label}>Volume da música: {volume}% <span style={dica}>(a voz fica sempre mais alta)</span></label>
            <input type="range" min={5} max={40} value={volume} onChange={function(e) { setVolume(parseInt(e.target.value, 10)) }} style={{ width: '100%' }} />
          </div>
        )}
      </div>

      <div style={bloco}>
        <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 8 }}>4. Formato e legendas</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
          {([['9:16', '9:16 · Reels / Stories'], ['1:1', '1:1 · Feed'], ['16:9', '16:9 · Horizontal']] as [Formato, string][]).map(function(o) {
            return <button key={o[0]} onClick={function() { setFormato(o[0]) }} style={chip(formato === o[0])}>{o[1]}</button>
          })}
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          <input type="checkbox" checked={legendas} onChange={function(e) { setLegendas(e.target.checked) }} /> Colocar legendas
        </label>
        {legendas && (
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            <button onClick={function() { setEstilo('amarelo') }} style={chip(estilo === 'amarelo')}>Palavra em amarelo</button>
            <button onClick={function() { setEstilo('branco') }} style={chip(estilo === 'branco')}>Tudo branco</button>
          </div>
        )}
      </div>

      <button onClick={montar} disabled={ocupado} style={{ ...botao, opacity: ocupado ? 0.6 : 1, padding: '13px 22px', fontSize: 15 }}>{ocupado ? 'Montando...' : '🎬 Montar meu criativo'}</button>

      {ocupado && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{etapa}</div>
          <div style={{ height: 10, borderRadius: 999, background: 'var(--surface2)', overflow: 'hidden', border: '1px solid var(--border)' }}>
            <div style={{ height: '100%', width: Math.round(fracao * 100) + '%', background: '#7c5cfc', transition: 'width .3s' }} />
          </div>
          <div style={{ ...dica, marginTop: 6 }}>Mantenha esta tela aberta. Pode levar alguns minutos, principalmente no celular.</div>
        </div>
      )}
      {msg && <div style={erro}>{msg}</div>}

      {resultado && (
        <div style={{ marginTop: 18, ...bloco }}>
          <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 8 }}>✓ Criativo pronto ({resultado.mb.toFixed(1)} MB)</div>
          <video src={resultado.url} controls playsInline style={{ width: '100%', maxWidth: formato === '16:9' ? 640 : 360, borderRadius: 12, background: '#000', display: 'block' }} />
          <div style={{ marginTop: 10 }}>
            <a href={resultado.url} download="criativo.mp4" style={{ ...botao, textDecoration: 'none', display: 'inline-block' }}>⬇ Baixar criativo (MP4)</a>
          </div>
        </div>
      )}
    </div>
  )
}
