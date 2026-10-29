'use client'
import { useEffect, useRef, useState } from 'react'
import { input, label, dica, botao, botaoClaro, erro } from './ui'
import type { Narracao } from './CardNarracao'
import type { Clipe } from './CardVideos'
import { carregarEditor, montarCriativo, duracaoDoAudio, compactarAudio, EstiloLegenda } from '@/lib/criativoRender'

type Faixa = { nome: string; arquivo: string }
type Musicas = { animadas: Faixa[]; emocionais: Faixa[] }

function MiniVideo({ clipe }: { clipe: Clipe }) {
  const ref = useRef<HTMLVideoElement | null>(null)
  const [tocando, setTocando] = useState(false)
  function alternar() {
    const v = ref.current
    if (!v) return
    if (v.paused) { v.play().then(function() { setTocando(true) }).catch(function() {}) } else { v.pause(); setTocando(false) }
  }
  return (
    <div style={{ width: 118 }}>
      <div style={{ position: 'relative', width: 118, aspectRatio: '9 / 16', borderRadius: 12, overflow: 'hidden', background: '#000' }}>
        <video ref={ref} src={clipe.url + '#t=0.1'} poster={clipe.thumb} muted loop playsInline preload="metadata" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        <button onClick={alternar} aria-label={tocando ? 'Pausar' : 'Tocar'} style={{ position: 'absolute', inset: 0, cursor: 'pointer', border: 0, background: tocando ? 'transparent' : 'rgba(0,0,0,0.28)', color: '#fff', fontSize: 26 }}>{tocando ? '' : '▶'}</button>
      </div>
      <div style={{ fontSize: 11.5, marginTop: 4, color: 'var(--muted2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{clipe.nome}</div>
    </div>
  )
}

export type Gerado = { id: string; url: string; mb: number; duracao: number; nVideos: number; criadoEm: number }

// Descreve o volume com palavras (a porcentagem sozinha nao diz como vai soar)
function rotuloVolume(v: number): string {
  if (v <= 10) return 'Bem baixinha (quase só a voz)'
  if (v <= 20) return 'Baixa (recomendado)'
  if (v <= 30) return 'Média'
  return 'Alta (pode atrapalhar a voz)'
}
function seg(s: number) { return s.toFixed(1).replace('.', ',') + ' s' }

export default function CardEdicao({ clipes, narracao, onIrVideos, onIrNarracao, onGerado }: { clipes: Clipe[]; narracao: Narracao | null; onIrVideos: () => void; onIrNarracao: () => void; onGerado: (g: Gerado) => void }) {
  const [audioOutro, setAudioOutro] = useState<File | null>(null)
  const [usarOutro, setUsarOutro] = useState(false)
  const [musicas, setMusicas] = useState<Musicas>({ animadas: [], emocionais: [] })
  const [faixa, setFaixa] = useState('') // '' = sem musica, 'minha' = arquivo enviado, ou o endereco da faixa
  const [tocandoFaixa, setTocandoFaixa] = useState('')
  const playerMusica = useRef<HTMLAudioElement | null>(null)
  const [minhaMusica, setMinhaMusica] = useState<File | null>(null)
  const [volume, setVolume] = useState(15)
  const [legendas, setLegendas] = useState(true)
  const [estilo, setEstilo] = useState<EstiloLegenda>('amarelo')
  const [ocupado, setOcupado] = useState(false)
  const [etapa, setEtapa] = useState('')
  const [fracao, setFracao] = useState(0)
  const [msg, setMsg] = useState('')
  const [resultado, setResultado] = useState<{ url: string; mb: number } | null>(null)
  const [duracaoAudio, setDuracaoAudio] = useState(0)
  const [ouvindoMix, setOuvindoMix] = useState(false)
  const mixNarr = useRef<HTMLAudioElement | null>(null)
  const mixMus = useRef<HTMLAudioElement | null>(null)
  const mixUrls = useRef<string[]>([])
  const blobsBaixados = useRef<Record<string, Blob>>({})

  useEffect(function() {
    fetch('/criativo/musicas.json', { cache: 'no-store' }).then(function(r) { return r.json() }).then(function(j) {
      setMusicas({ animadas: Array.isArray(j.animadas) ? j.animadas : [], emocionais: Array.isArray(j.emocionais) ? j.emocionais : [] })
    }).catch(function() {})
    return function() { if (playerMusica.current) playerMusica.current.pause(); pararMistura() }
  }, [])

  // A musica ouvida acompanha o controle de volume na hora (antes ficava sempre no mesmo volume)
  function mudarVolume(v: number) {
    setVolume(v)
    if (playerMusica.current) playerMusica.current.volume = v / 100
    if (mixMus.current) mixMus.current.volume = v / 100
  }

  function pararMistura() {
    if (mixNarr.current) { mixNarr.current.pause(); mixNarr.current = null }
    if (mixMus.current) { mixMus.current.pause(); mixMus.current = null }
    mixUrls.current.forEach(function(u) { URL.revokeObjectURL(u) }); mixUrls.current = []
    setOuvindoMix(false)
  }

  // Toca a narracao junto com a musica no mesmo volume que vai ficar no criativo
  function ouvirMistura() {
    if (ouvindoMix) { pararMistura(); return }
    if (!audioFonte || !faixa) return
    if (playerMusica.current) { playerMusica.current.pause(); playerMusica.current = null; setTocandoFaixa('') }
    let urlMus = faixa
    if (faixa === 'minha') {
      if (!minhaMusica) { setMsg('Envie o arquivo da música para ouvir a mistura.'); return }
      urlMus = URL.createObjectURL(minhaMusica); mixUrls.current.push(urlMus)
    }
    const urlNarr = usarOutro && audioOutro ? URL.createObjectURL(audioOutro) : (narracao ? narracao.url : '')
    if (usarOutro && audioOutro) mixUrls.current.push(urlNarr)
    if (!urlNarr) return
    const n = new Audio(urlNarr); n.volume = 1
    const m = new Audio(urlMus); m.volume = volume / 100; m.loop = true
    n.onended = function() { pararMistura() }
    mixNarr.current = n; mixMus.current = m
    setOuvindoMix(true)
    Promise.all([n.play(), m.play()]).catch(function() { pararMistura() })
  }

  function ouvirFaixa(arquivo: string) {
    if (playerMusica.current) { playerMusica.current.pause(); playerMusica.current = null }
    if (tocandoFaixa === arquivo) { setTocandoFaixa(''); return }
    const a = new Audio(arquivo)
    a.volume = volume / 100
    a.onended = function() { setTocandoFaixa('') }
    playerMusica.current = a
    setTocandoFaixa(arquivo)
    a.play().catch(function() { setTocandoFaixa('') })
  }

  const audioFonte: { blob: Blob; texto: string } | null = usarOutro && audioOutro ? { blob: audioOutro, texto: '' } : (narracao ? { blob: narracao.blob, texto: narracao.texto } : null)

  // Duracao do audio (para mostrar o tamanho do criativo antes de montar)
  const blobAudio = audioFonte ? audioFonte.blob : null
  useEffect(function() {
    setDuracaoAudio(0)
    if (!blobAudio) return
    let vivo = true
    duracaoDoAudio(blobAudio).then(function(d) { if (vivo) setDuracaoAudio(d) }).catch(function() {})
    return function() { vivo = false }
  }, [blobAudio])
  const duracaoCriativo = duracaoAudio > 0 ? Math.max(3, duracaoAudio + 0.5) : 0

  async function montar() {
    setMsg(''); setResultado(null)
    if (!clipes.length) { setMsg('Escolha os vídeos no card 3 primeiro.'); return }
    if (!audioFonte) { setMsg('Gere a narração no card 2 (ou envie um áudio).'); return }
    if (faixa === 'minha' && !minhaMusica) { setMsg('Envie o arquivo da música ou escolha outra opção.'); return }
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
        if (audioFonte.texto) fd.append('dica', audioFonte.texto.slice(0, 3500))
        const r = await fetch('/api/criativo/legendas', { method: 'POST', body: fd })
        const j = await r.json().catch(function() { return {} })
        if (!r.ok) throw new Error(j.error || 'Não foi possível criar as legendas. Tente de novo ou desligue as legendas.')
        palavras = j.palavras
      }

      let musica: Blob | null = null
      if (faixa === 'minha') musica = minhaMusica
      else if (faixa) musica = await (await fetch(faixa)).blob()

      // Videos da galeria / links: baixa agora (so os escolhidos)
      const blobsClipes: Blob[] = []
      for (let i = 0; i < clipes.length; i++) {
        const c = clipes[i]
        let b: Blob | undefined = c.blob || blobsBaixados.current[c.id]
        if (!b) {
          setEtapa('Baixando os vídeos (' + (i + 1) + ' de ' + clipes.length + ')...'); setFracao(0.02 + 0.03 * (i / clipes.length))
          const r = await fetch(c.origem === 'vecteezy' ? '/api/criativo/videos/arquivo?id=' + encodeURIComponent(c.fonte || '') : (c.fonte || c.url))
          if (!r.ok) throw new Error('Não consegui baixar o vídeo "' + c.nome + '". Tire-o da lista e tente de novo.')
          b = await r.blob()
          blobsBaixados.current[c.id] = b
        }
        blobsClipes.push(b)
      }

      const blob = await montarCriativo(ff, {
        clipes: blobsClipes,
        narracao: audioFonte.blob, duracaoNarracao: duracao, musica, volumeMusica: volume / 100,
        palavras, estiloLegenda: estilo,
        onProgresso: function(p, e) { setFracao(p); setEtapa(e) },
      })
      const url = URL.createObjectURL(blob)
      setResultado({ url, mb: blob.size / 1048576 })
      onGerado({ id: 'g-' + Date.now(), url, mb: blob.size / 1048576, duracao: Math.max(3, duracao + 0.5), nVideos: clipes.length, criadoEm: Date.now() })
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
      <div style={{ fontSize: 13, color: 'var(--muted2)', marginBottom: 14 }}>Confira os vídeos, o áudio e a música. A montagem junta tudo em um Reels com legendas. Ao final você baixa o criativo pronto.</div>

      <div style={bloco}>
        <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 8 }}>1. Vídeos escolhidos</div>
        {clipes.length ? (
          <div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {clipes.map(function(c) { return <MiniVideo key={c.id} clipe={c} /> })}
            </div>
            <div style={{ marginTop: 10, fontSize: 13 }}>{clipes.length} vídeo(s), na ordem em que você escolheu. <button onClick={onIrVideos} style={{ ...botaoClaro, padding: '3px 10px', fontSize: 12 }}>Mudar</button></div>
          </div>
        ) : <div style={{ fontSize: 13, color: '#b45309' }}>Nenhum vídeo escolhido. <button onClick={onIrVideos} style={{ ...botaoClaro, padding: '3px 10px', fontSize: 12 }}>Escolher no card 3</button></div>}
      </div>

      <div style={bloco}>
        <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 8 }}>2. Áudio (narração)</div>
        {narracao && !usarOutro && (
          <div>
            <audio controls src={narracao.url} style={{ width: '100%', maxWidth: 420 }} />
            <div style={{ fontSize: 13, marginTop: 6 }}>Voz na velocidade {narracao.velocidade.toFixed(1).replace('.', ',')}x. <button onClick={onIrNarracao} style={{ ...botaoClaro, padding: '3px 10px', fontSize: 12 }}>Mudar voz ou velocidade</button> <button onClick={function() { setUsarOutro(true) }} style={{ ...botaoClaro, padding: '3px 10px', fontSize: 12 }}>Enviar outro áudio</button></div>
          </div>
        )}
        {!narracao && !usarOutro && <div style={{ fontSize: 13, color: '#b45309' }}>Você ainda não gerou a narração. <button onClick={onIrNarracao} style={{ ...botaoClaro, padding: '3px 10px', fontSize: 12 }}>Gerar no card 2</button> <button onClick={function() { setUsarOutro(true) }} style={{ ...botaoClaro, padding: '3px 10px', fontSize: 12 }}>Enviar um áudio</button></div>}
        {usarOutro && (
          <div>
            <input type="file" accept="audio/*,.mp3,.wav,.m4a,.ogg" onChange={function(e) { setAudioOutro(e.target.files && e.target.files[0] ? e.target.files[0] : null) }} style={{ fontSize: 13 }} />
            {narracao && <div style={{ marginTop: 6 }}><button onClick={function() { setUsarOutro(false) }} style={{ ...botaoClaro, padding: '3px 10px', fontSize: 12 }}>Voltar para a narração do card 2</button></div>}
          </div>
        )}
      </div>

      <div style={bloco}>
        <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>3. Música de fundo</div>
        <div style={{ ...dica, marginBottom: 10 }}>Toque no ▶ para ouvir e marque a que você quer no criativo.</div>

        <button onClick={function() { setFaixa('') }} style={{ ...chip(faixa === ''), marginBottom: 10 }}>{faixa === '' ? '✓ ' : ''}Sem música</button>

        {([['🎉 Animadas', musicas.animadas], ['💛 Emocionais', musicas.emocionais]] as [string, Faixa[]][]).map(function(grp) {
          return grp[1].length ? (
            <div key={grp[0]} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--muted2)', marginBottom: 6 }}>{grp[0]}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 420 }}>
                {grp[1].map(function(f) {
                  const on = faixa === f.arquivo
                  return (
                    <div key={f.arquivo} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 12, border: on ? '2px solid #7c5cfc' : '1px solid var(--border2)', background: on ? 'rgba(124,92,252,0.10)' : 'var(--surface)' }}>
                      <button onClick={function() { ouvirFaixa(f.arquivo) }} aria-label={tocandoFaixa === f.arquivo ? 'Parar' : 'Ouvir'} style={{ cursor: 'pointer', width: 36, height: 36, borderRadius: '50%', border: 0, background: '#7c5cfc', color: '#fff', fontSize: 14, fontWeight: 800, flexShrink: 0 }}>{tocandoFaixa === f.arquivo ? '■' : '▶'}</button>
                      <div style={{ flex: 1, fontWeight: 700, fontSize: 14 }}>{f.nome}</div>
                      <button onClick={function() { setFaixa(on ? '' : f.arquivo) }} style={{ cursor: 'pointer', padding: '6px 12px', borderRadius: 999, fontSize: 12.5, fontWeight: 800, border: on ? '0' : '1px solid var(--border2)', background: on ? '#15803d' : 'var(--surface2)', color: on ? '#fff' : 'var(--text)' }}>{on ? '✓ Escolhida' : 'Escolher'}</button>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : null
        })}
        {!musicas.animadas.length && !musicas.emocionais.length && <div style={{ fontSize: 13, color: 'var(--muted2)', marginBottom: 8 }}>As músicas ainda não foram adicionadas. Use “Enviar a minha”.</div>}

        <div style={{ marginTop: 4 }}>
          <button onClick={function() { setFaixa('minha') }} style={chip(faixa === 'minha')}>{faixa === 'minha' ? '✓ ' : ''}📁 Enviar a minha</button>
          {faixa === 'minha' && <div style={{ marginTop: 8 }}><input type="file" accept="audio/*,.mp3,.wav,.m4a,.ogg" onChange={function(e) { setMinhaMusica(e.target.files && e.target.files[0] ? e.target.files[0] : null) }} style={{ fontSize: 13 }} /></div>}
        </div>

        {faixa !== '' && (
          <div style={{ marginTop: 12, maxWidth: 360 }}>
            <label style={label}>Volume da música: {volume}% · {rotuloVolume(volume)}</label>
            <input type="range" min={5} max={40} value={volume} onChange={function(e) { mudarVolume(parseInt(e.target.value, 10)) }} style={{ width: '100%' }} />
            <div style={{ ...dica, marginTop: 4 }}>Ao mexer, a música que está tocando muda de volume na hora. A voz fica sempre mais alta que a música.</div>
            {audioFonte && (
              <button onClick={ouvirMistura} style={{ ...botaoClaro, marginTop: 8 }}>{ouvindoMix ? '■ Parar' : '▶ Ouvir a narração com a música'}</button>
            )}
          </div>
        )}
      </div>

      <div style={bloco}>
        <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 8 }}>4. Legendas <span style={{ ...dica, fontWeight: 400 }}>(o criativo sai em formato Reels, 9:16)</span></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700 }}>
          <input id="leg-check" type="checkbox" checked={legendas} onChange={function(e) { setLegendas(e.target.checked) }} style={{ cursor: 'pointer', width: 18, height: 18, flex: 'none', padding: 0 }} /> <span onClick={function() { setLegendas(!legendas) }} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>Colocar legendas</span>
        </div>
        {legendas && (
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            <button onClick={function() { setEstilo('amarelo') }} style={chip(estilo === 'amarelo')}>Palavra em amarelo</button>
            <button onClick={function() { setEstilo('branco') }} style={chip(estilo === 'branco')}>Tudo branco</button>
          </div>
        )}
      </div>

      <div style={bloco}>
        <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 8 }}>Tamanho do criativo</div>
        <div style={{ fontSize: 13.5, lineHeight: 1.6 }}>
          📐 Vídeo em pé (Reels), <b>720 × 1280</b>, MP4.<br />
          {duracaoCriativo > 0
            ? <>⏱ Duração: <b>{seg(duracaoCriativo)}</b> (narração {seg(duracaoAudio)} + 0,5 s de respiro no final).{clipes.length > 0 ? <> Cada um dos {clipes.length} vídeo(s) fica cerca de {seg(duracaoCriativo / clipes.length)} na tela.</> : null}</>
            : <>⏱ Duração: igual à da narração + 0,5 s. Gere a narração para ver o tempo.</>}
          <br />
          🎵 A música tem sempre o mesmo tamanho do vídeo: se a faixa for curta ela repete, se for longa ela é cortada no fim do vídeo, baixando aos poucos nos últimos 1,5 s.
        </div>
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
          <video src={resultado.url} controls playsInline style={{ width: '100%', maxWidth: 360, borderRadius: 12, background: '#000', display: 'block' }} />
          <div style={{ marginTop: 10 }}>
            <a href={resultado.url} download="criativo.mp4" style={{ ...botao, textDecoration: 'none', display: 'inline-block' }}>⬇ Baixar criativo (MP4)</a>
          </div>
        </div>
      )}
    </div>
  )
}
