'use client'
import { useEffect, useRef, useState } from 'react'
import { input, label, dica, botao, botaoClaro, erro } from './ui'
import type { Narracao } from './CardNarracao'
import type { Clipe } from './CardVideos'
import { carregarEditor, montarCriativo, duracaoDoAudio, compactarAudio, EstiloLegenda } from '@/lib/criativoRender'
import { AvatarFoto, prepararAvatar } from '@/lib/avatares'

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

export default function CardEdicao({ clipes, narracao, avatar, onIrVideos, onIrNarracao }: { clipes: Clipe[]; narracao: Narracao | null; avatar: AvatarFoto | null; onIrVideos: () => void; onIrNarracao: () => void }) {
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
  const urlRes = useRef('')
  const blobsBaixados = useRef<Record<string, Blob>>({})

  useEffect(function() {
    fetch('/criativo/musicas.json', { cache: 'no-store' }).then(function(r) { return r.json() }).then(function(j) {
      setMusicas({ animadas: Array.isArray(j.animadas) ? j.animadas : [], emocionais: Array.isArray(j.emocionais) ? j.emocionais : [] })
    }).catch(function() {})
    return function() { if (urlRes.current) URL.revokeObjectURL(urlRes.current); if (playerMusica.current) playerMusica.current.pause() }
  }, [])

  function ouvirFaixa(arquivo: string) {
    if (playerMusica.current) { playerMusica.current.pause(); playerMusica.current = null }
    if (tocandoFaixa === arquivo) { setTocandoFaixa(''); return }
    const a = new Audio(arquivo)
    a.volume = 0.8
    a.onended = function() { setTocandoFaixa('') }
    playerMusica.current = a
    setTocandoFaixa(arquivo)
    a.play().catch(function() { setTocandoFaixa('') })
  }

  const avatarSel = avatar
  const audioFonte: { blob: Blob; texto: string } | null = usarOutro && audioOutro ? { blob: audioOutro, texto: '' } : (narracao ? { blob: narracao.blob, texto: narracao.texto } : null)

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
        if (audioFonte.texto) fd.append('dica', audioFonte.texto.slice(0, 600))
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
          const r = await fetch(c.origem === 'pixabay' ? '/api/criativo/videos/arquivo?u=' + encodeURIComponent(c.fonte || '') : (c.fonte || c.url))
          if (!r.ok) throw new Error('Não consegui baixar o vídeo "' + c.nome + '". Tire-o da lista e tente de novo.')
          b = await r.blob()
          blobsBaixados.current[c.id] = b
        }
        blobsClipes.push(b)
      }

      let av = null
      if (avatar) {
        setEtapa('Preparando o avatar...'); setFracao(0.05)
        av = await prepararAvatar(avatar, audioFonte.blob, duracao + 0.5)
      }

      const blob = await montarCriativo(ff, {
        clipes: blobsClipes,
        narracao: audioFonte.blob, duracaoNarracao: duracao, musica, volumeMusica: volume / 100,
        palavras, avatar: av, estiloLegenda: estilo,
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
      <div style={{ fontSize: 13, color: 'var(--muted2)', marginBottom: 14 }}>Confira os vídeos, o áudio e a música. A montagem junta tudo em um Reels no estilo UGC, com avatar e legendas. Ao final você baixa o criativo pronto.</div>

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
            <div style={{ fontSize: 13, marginTop: 6 }}>Voz na velocidade {narracao.velocidade.toFixed(1).replace('.', ',')}x. <button onClick={onIrNarracao} style={{ ...botaoClaro, padding: '3px 10px', fontSize: 12 }}>Mudar voz, velocidade ou avatar</button> <button onClick={function() { setUsarOutro(true) }} style={{ ...botaoClaro, padding: '3px 10px', fontSize: 12 }}>Enviar outro áudio</button></div>
          </div>
        )}
        {!narracao && !usarOutro && <div style={{ fontSize: 13, color: '#b45309' }}>Você ainda não gerou a narração. <button onClick={onIrNarracao} style={{ ...botaoClaro, padding: '3px 10px', fontSize: 12 }}>Gerar no card 2</button> <button onClick={function() { setUsarOutro(true) }} style={{ ...botaoClaro, padding: '3px 10px', fontSize: 12 }}>Enviar um áudio</button></div>}
        {usarOutro && (
          <div>
            <input type="file" accept="audio/*,.mp3,.wav,.m4a,.ogg" onChange={function(e) { setAudioOutro(e.target.files && e.target.files[0] ? e.target.files[0] : null) }} style={{ fontSize: 13 }} />
            {narracao && <div style={{ marginTop: 6 }}><button onClick={function() { setUsarOutro(false) }} style={{ ...botaoClaro, padding: '3px 10px', fontSize: 12 }}>Voltar para a narração do card 2</button></div>}
          </div>
        )}
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {avatarSel ? <img src={avatarSel.foto} alt={avatarSel.nome} width={46} height={46} style={{ borderRadius: '50%', objectFit: 'cover', width: 46, height: 46 }} /> : <span style={{ fontSize: 26 }}>🚫</span>}
          <div style={{ fontSize: 13 }}>{avatarSel ? <span>Avatar: <b>{avatarSel.nome}</b>, no cantinho do vídeo, falando junto com a narração.</span> : <span>Sem avatar.</span>} <button onClick={onIrNarracao} style={{ ...botaoClaro, padding: '3px 10px', fontSize: 12 }}>Mudar</button></div>
        </div>
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
            <label style={label}>Volume da música: {volume}% <span style={dica}>(a voz fica sempre mais alta)</span></label>
            <input type="range" min={5} max={40} value={volume} onChange={function(e) { setVolume(parseInt(e.target.value, 10)) }} style={{ width: '100%' }} />
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
