'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import styles from '../dashboard.module.css'

function VideoLesson({ videoId, title, color }: { videoId: string; title: string; color: string }) {
  const [playing, setPlaying] = useState(false)
  const [thumb, setThumb] = useState<string | null>(null)

  useEffect(function() {
    let active = true
    fetch('https://vimeo.com/api/oembed.json?url=' + encodeURIComponent('https://vimeo.com/' + videoId))
      .then(function(res) { return res.ok ? res.json() : null })
      .then(function(data) { if (active && data && data.thumbnail_url) setThumb(data.thumbnail_url) })
      .catch(function() {})
    return function() { active = false }
  }, [videoId])

  if (playing) {
    return (
      <div style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', height: 0, borderRadius: 12, overflow: 'hidden', background: '#000' }}>
        <iframe
          src={'https://player.vimeo.com/video/' + videoId + '?title=0&byline=0&portrait=0&dnt=1&autoplay=1'}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
          allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media"
          allowFullScreen
          title={title}
        />
      </div>
    )
  }

  return (
    <div
      onClick={function() { setPlaying(true) }}
      role="button"
      aria-label={'Assistir: ' + title}
      style={{
        position: 'relative', width: '100%', paddingBottom: '56.25%', height: 0, borderRadius: 12,
        overflow: 'hidden', cursor: 'pointer',
        background: thumb ? '#000' : 'linear-gradient(135deg,' + color + 'dd,' + color + '88)',
        backgroundImage: thumb ? 'url(' + thumb + ')' : undefined,
        backgroundSize: 'cover', backgroundPosition: 'center',
      }}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(0deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.15) 40%, rgba(0,0,0,0.35) 100%)' }} />

      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          width: 60, height: 60, borderRadius: '50%', background: 'rgba(255,255,255,0.95)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
        }}>
          <div style={{ width: 0, height: 0, marginLeft: 4, borderTop: '11px solid transparent', borderBottom: '11px solid transparent', borderLeft: '18px solid ' + color }} />
        </div>
      </div>

      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <i className="ti ti-player-play" style={{ color: '#fff', fontSize: 13, opacity: 0.85 }} />
        <span style={{ color: '#fff', fontSize: 12, fontWeight: 700, textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>{title}</span>
      </div>
    </div>
  )
}

export default function CriativoPage() {
  const [niche, setNiche] = useState('')
  const [tone, setTone] = useState('lifestyle')
  const [format, setFormat] = useState('9:16')
  const [customPrompt, setCustomPrompt] = useState('')
  const [customScript, setCustomScript] = useState('')
  const [avatars, setAvatars] = useState<any[]>([])
  const [avatarsLoading, setAvatarsLoading] = useState(true)
  const [avatarsError, setAvatarsError] = useState(false)
  const [selectedAvatarId, setSelectedAvatarId] = useState('')
  const [voices, setVoices] = useState<any[]>([])
  const [voicesLoading, setVoicesLoading] = useState(true)
  const [voicesError, setVoicesError] = useState(false)
  const [selectedVoiceId, setSelectedVoiceId] = useState('')
  const [playingPreview, setPlayingPreview] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(0)
  const [result, setResult] = useState('')
  const [script, setScript] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [hasSubscription, setHasSubscription] = useState<boolean | null>(null)
  const [stats, setStats] = useState({ videos: 0, ebooks: 0, creditsUsed: 0, creditsLimit: 15 })
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const supabase = createClient()
  const router = useRouter()

  const steps = [
    'Gerando roteiro com GPT-4o...',
    'Criando avatar com IA...',
    'Processando video...',
    'Finalizando criativo...',
    'Criativo pronto!',
  ]

  useEffect(function() {
    async function loadProfile() {
      const userResult = await supabase.auth.getUser()
      const user = userResult.data.user
      if (!user) { router.push('/login'); return }
      const profileResult = await supabase
        .from('profiles')
        .select('*, plans(name, credits_videos, credits_ebooks, is_unlimited, price_monthly)')
        .eq('id', user.id)
        .single()
      const data = profileResult.data
      if (data) {
        if (!data.is_admin) { router.push('/dashboard'); return }
        setProfile(data)
        const status = data.subscription_status
        const active = status === 'active' || status === 'trialing'
        setHasSubscription(active)
        if (!active) { router.push('/dashboard/planos'); return }
        const gensResult = await supabase.from('generations').select('type').eq('user_id', user.id)
        const gens = gensResult.data || []
        const videos = gens.filter(function(g) { return g.type === 'video' }).length
        const ebooks = gens.filter(function(g) { return g.type === 'ebook' }).length
        setStats({
          videos,
          ebooks,
          creditsUsed: data.credits_videos_used || 0,
          creditsLimit: (data.plans?.credits_videos || 15) + (data.credits_videos_extra || 0),
        })
      }
    }
    loadProfile()
    loadAvatars()
    loadVoices()
    return function() { if (pollingRef.current) clearInterval(pollingRef.current) }
  }, [])

  async function loadVoices() {
    setVoicesLoading(true)
    try {
      const sessionResult = await supabase.auth.getSession()
      const session = sessionResult.data.session
      const res = await fetch('/api/heygen-voices', {
        headers: { 'Authorization': 'Bearer ' + (session ? session.access_token : '') }
      })
      const data = await res.json()
      if (data.voices && data.voices.length > 0) {
        setVoices(data.voices)
        setSelectedVoiceId(data.voices[0].voiceId)
      } else {
        setVoicesError(true)
      }
    } catch (e) {
      setVoicesError(true)
    } finally {
      setVoicesLoading(false)
    }
  }

  function togglePreview(voiceId: string, url: string | null) {
    if (!url) return
    if (playingPreview === voiceId) {
      audioRef.current?.pause()
      setPlayingPreview(null)
      return
    }
    if (audioRef.current) audioRef.current.pause()
    const audio = new Audio(url)
    audioRef.current = audio
    audio.play()
    setPlayingPreview(voiceId)
    audio.onended = function() { setPlayingPreview(null) }
  }

  async function loadAvatars() {
    setAvatarsLoading(true)
    try {
      const sessionResult = await supabase.auth.getSession()
      const session = sessionResult.data.session
      const res = await fetch('/api/heygen-avatars', {
        headers: { 'Authorization': 'Bearer ' + (session ? session.access_token : '') }
      })
      const data = await res.json()
      if (data.avatars && data.avatars.length > 0) {
        setAvatars(data.avatars)
        setSelectedAvatarId(data.avatars[0].avatarId)
      } else {
        setAvatarsError(true)
      }
    } catch (e) {
      setAvatarsError(true)
    } finally {
      setAvatarsLoading(false)
    }
  }

  async function pollStatus(renderId: string) {
    let attempts = 0
    const maxAttempts = 60
    pollingRef.current = setInterval(async function() {
      attempts++
      setStep(Math.min(2 + Math.floor(attempts / 5), 3))
      try {
        const sessionResult = await supabase.auth.getSession()
        const session = sessionResult.data.session
        const res = await fetch('/api/generate-video/status?renderId=' + renderId, {
          headers: { 'Authorization': 'Bearer ' + (session ? session.access_token : '') }
        })
        const data = await res.json()
        if (data.status === 'completed' && data.videoUrl) {
          clearInterval(pollingRef.current!)
          setStep(4)
          setResult(data.videoUrl)
          setLoading(false)
          setStats(function(s) { return { ...s, videos: s.videos + 1, creditsUsed: s.creditsUsed + 1 } })
        } else if (data.status === 'failed' || attempts >= maxAttempts) {
          clearInterval(pollingRef.current!)
          setLoading(false)
          alert(data.error || 'Timeout na geracao. Tente novamente.')
        }
      } catch (e) {
        if (attempts >= maxAttempts) {
          clearInterval(pollingRef.current!)
          setLoading(false)
          alert('Erro ao verificar status. Tente novamente.')
        }
      }
    }, 5000)
  }

  async function generate() {
    if (!hasSubscription) {
      window.location.href = '/dashboard/planos'
      return
    }
    if (!niche && !customPrompt && !customScript) {
      alert('Preencha o nicho, descreva o criativo ou escreva a fala do avatar!')
      return
    }
    setLoading(true)
    setStep(0)
    setResult('')
    setScript(null)

    try {
      const res = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ niche, tone, format, customPrompt, avatarId: selectedAvatarId, voiceId: selectedVoiceId, customScript }),
      })
      const data = await res.json()
      if (!data.renderId) {
        setLoading(false)
        if (data.requiresPlan) {
          window.location.href = '/dashboard/planos'
        } else {
          alert('Erro: ' + (data.error || 'Tente novamente'))
        }
        return
      }
      setScript(data.script)
      setStep(1)
      await pollStatus(data.renderId)
    } catch (err) {
      setLoading(false)
      alert('Erro inesperado. Tente novamente.')
    }
  }

  const plan = profile?.plans
  const economia = Math.round((stats.videos * 80 + stats.ebooks * 30))

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <div>
          <div className={styles.pageTitle}>Criador de Criativos</div>
          <div className={styles.pageSub}>Descreva seu criativo e a IA gera o video automaticamente</div>
        </div>
      </div>

      <div style={{ margin: '0 24px 20px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--border)' }}>
          <div style={{ width: 38, height: 38, background: 'var(--surface2)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>🎬</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Aula: Gerando criativo</div>
            <div style={{ fontSize: 12, color: 'var(--muted2)' }}>Veja o passo a passo antes de criar o seu</div>
          </div>
        </div>
        <div style={{ padding: '20px' }}>
          <VideoLesson videoId="1201534785" title="Gerando criativo" color="#7c5cfc" />
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.stats}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Videos gerados</div>
            <div className={styles.statValue}>{stats.videos}</div>
            <div className={styles.statSub}>total na conta</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Ebooks gerados</div>
            <div className={styles.statValue}>{stats.ebooks}</div>
            <div className={styles.statSub}>total na conta</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Creditos usados</div>
            <div className={styles.statValue}>{stats.creditsUsed}</div>
            <div className={styles.statSub}>{plan?.is_unlimited ? '' : stats.creditsLimit - stats.creditsUsed} restantes</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Economia estimada</div>
            <div className={styles.statValue}>R${economia}</div>
            <div className={styles.statSub}>vs agencia</div>
          </div>
        </div>

        {hasSubscription === false && (
          <div style={{ maxWidth: 700, display: 'flex', gap: 12, padding: 16, borderRadius: 12, background: 'rgba(124,92,252,0.08)', border: '1px solid rgba(124,92,252,0.25)', marginBottom: 16 }}>
            <span>🔒</span>
            <div>
              <p style={{ fontWeight: 600, color: '#a78bfa', margin: '0 0 4px 0', fontSize: 14 }}>Recurso exclusivo para assinantes</p>
              <p style={{ color: '#9ca3af', margin: '0 0 8px 0', fontSize: 13 }}>Assine um plano para gerar videos com IA.</p>
              <a href="/dashboard/planos" style={{ color: '#7c5cfc', fontSize: 13, fontWeight: 600 }}>Ver planos</a>
            </div>
          </div>
        )}

        <div className={styles.configPanel} style={{ maxWidth: 700 }}>
          <div className={styles.configTitle}>Configuracoes do criativo</div>

          <div className={styles.field}>
            <label>Niche / produto</label>
            <input type="text" value={niche} onChange={function(e) { setNiche(e.target.value) }} placeholder="Ex: skincare, curso online, suplemento, ebook..." />
          </div>

          <div className={styles.field}>
            <label>Descreva seu criativo <span style={{ color: 'var(--accent2)', fontSize: 12 }}>(quanto mais detalhado, melhor)</span></label>
            <textarea value={customPrompt} onChange={function(e) { setCustomPrompt(e.target.value) }} placeholder="Ex: Quero um video para mulheres 25-40 anos que querem emagrecer." rows={4} style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 9, padding: '10px 14px', color: 'var(--text)', fontSize: 14, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
          </div>

          <div className={styles.field}>
            <label>Escolha o avatar</label>
            {avatarsLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '20px 0', color: 'var(--muted2)', fontSize: 13 }}>
                <i className="ti ti-loader" style={{ fontSize: 18, animation: 'spin 1s linear infinite' }} />
                Carregando avatares...
              </div>
            ) : avatarsError ? (
              <div style={{ fontSize: 13, color: 'var(--amber)', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 10, padding: '12px 14px' }}>
                Nao foi possivel carregar os avatares agora. Um avatar padrao sera usado automaticamente.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(84px, 1fr))', gap: 10, maxHeight: 320, overflowY: 'auto', paddingRight: 4 }}>
                {avatars.map(function(av) {
                  const isSelected = selectedAvatarId === av.avatarId
                  return (
                    <div
                      key={av.avatarId}
                      onClick={function() { setSelectedAvatarId(av.avatarId) }}
                      style={{ cursor: 'pointer', textAlign: 'center' }}
                    >
                      <div style={{
                        width: '100%', aspectRatio: '1', borderRadius: 12, overflow: 'hidden',
                        border: isSelected ? '3px solid var(--accent)' : '2px solid var(--border)',
                        boxShadow: isSelected ? '0 0 0 3px var(--accent-glow)' : 'none',
                        position: 'relative', background: 'var(--surface2)', transition: 'all 0.15s',
                      }}>
                        <img src={av.previewImage} alt={av.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        {isSelected && (
                          <div style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <i className="ti ti-check" style={{ color: '#fff', fontSize: 12 }} />
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize: 11, marginTop: 4, color: isSelected ? 'var(--accent2)' : 'var(--muted2)', fontWeight: isSelected ? 700 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{av.name}</div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className={styles.field}>
            <label>Escolha a voz</label>
            {voicesLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '20px 0', color: 'var(--muted2)', fontSize: 13 }}>
                <i className="ti ti-loader" style={{ fontSize: 18, animation: 'spin 1s linear infinite' }} />
                Carregando vozes...
              </div>
            ) : voicesError ? (
              <div style={{ fontSize: 13, color: 'var(--amber)', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 10, padding: '12px 14px' }}>
                Nao foi possivel carregar as vozes agora. Uma voz padrao sera usada automaticamente.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 260, overflowY: 'auto', paddingRight: 4 }}>
                {voices.map(function(v) {
                  const isSelected = selectedVoiceId === v.voiceId
                  const isPlaying = playingPreview === v.voiceId
                  return (
                    <div
                      key={v.voiceId}
                      onClick={function() { setSelectedVoiceId(v.voiceId) }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                        border: isSelected ? '2px solid var(--accent)' : '1px solid var(--border)',
                        background: isSelected ? 'rgba(124,92,252,0.08)' : 'var(--surface2)',
                        transition: 'all 0.15s',
                      }}
                    >
                      <button
                        onClick={function(e) { e.stopPropagation(); togglePreview(v.voiceId, v.previewAudio) }}
                        disabled={!v.previewAudio}
                        style={{
                          width: 30, height: 30, borderRadius: '50%', border: 'none', flexShrink: 0,
                          background: v.previewAudio ? 'var(--accent)' : 'var(--surface3)',
                          color: v.previewAudio ? '#fff' : 'var(--muted)',
                          cursor: v.previewAudio ? 'pointer' : 'default',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <i className={'ti ' + (isPlaying ? 'ti-player-pause-filled' : 'ti-player-play-filled')} style={{ fontSize: 13 }} />
                      </button>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: isSelected ? 700 : 500, color: isSelected ? 'var(--accent2)' : 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted2)' }}>{v.language}{v.gender ? ' · ' + v.gender : ''}</div>
                      </div>
                      {isSelected && <i className="ti ti-check" style={{ color: 'var(--accent2)', fontSize: 16, flexShrink: 0 }} />}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className={styles.field}>
            <label>Fala do avatar <span style={{ color: 'var(--accent2)', fontSize: 12 }}>(opcional — deixe em branco pra IA escrever por voce)</span></label>
            <textarea
              value={customScript}
              onChange={function(e) { setCustomScript(e.target.value) }}
              placeholder='Ex: "Voce ja tentou de tudo pra emagrecer e nada funcionou? Esse metodo mudou minha vida em 30 dias..."'
              rows={4}
              style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 9, padding: '10px 14px', color: 'var(--text)', fontSize: 14, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
            />
          </div>

          <style>{'@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}'}</style>

          <div className={styles.field}>
            <label>Tom do criativo</label>
            <div className={styles.toggleGroup}>
              {['lifestyle', 'urgencia', 'luxo', 'humor'].map(function(t) {
                return (
                  <div key={t} className={styles.toggleBtn + (tone === t ? ' ' + styles.toggleOn : '')} onClick={function() { setTone(t) }}>{t}</div>
                )
              })}
            </div>
          </div>

          <div className={styles.field}>
            <label>Formato</label>
            <div className={styles.toggleGroup}>
              {[['9:16', '9:16 Stories'], ['1:1', '1:1 Feed']].map(function(item) {
                return (
                  <div key={item[0]} className={styles.toggleBtn + (format === item[0] ? ' ' + styles.toggleOn : '')} onClick={function() { setFormat(item[0]) }}>{item[1]}</div>
                )
              })}
            </div>
          </div>
        </div>

        <button
          className={styles.btnGenerate}
          onClick={generate}
          disabled={loading}
          style={{ maxWidth: 700, background: hasSubscription === false ? 'linear-gradient(135deg, #7c5cfc, #9b6dfc)' : undefined }}
        >
          {hasSubscription === false ? 'Assinar para gerar videos' : loading ? 'Gerando...' : 'Gerar criativo com IA - 1 credito'}
        </button>

        {loading && (
          <div className={styles.progressWrap}>
            {steps.map(function(s, i) {
              return (
                <div key={i} className={styles.progStep + (i < step ? ' ' + styles.done : i === step ? ' ' + styles.stepActive : '')}>
                  <div className={styles.progDot} /><span>{s}</span>
                </div>
              )
            })}
          </div>
        )}

        {script && !result && (
          <div style={{ maxWidth: 700, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px', marginTop: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--muted2)', marginBottom: 10, fontWeight: 600 }}>{script.text2 ? 'ROTEIRO GERADO PELA IA' : 'FALA ENVIADA'}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {script.text2 ? (
                [script.text1, script.text2, script.text3, script.text4].map(function(text, i) {
                  return (
                    <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <span style={{ background: 'var(--accent)', color: '#fff', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{['Hook', 'Problema', 'Beneficio', 'CTA'][i]}</span>
                      <span style={{ fontSize: 14, color: 'var(--text)' }}>{text}</span>
                    </div>
                  )
                })
              ) : (
                <span style={{ fontSize: 14, color: 'var(--text)' }}>{script.text1}</span>
              )}
            </div>
          </div>
        )}

        {result && (
          <div className={styles.resultBox}>
            <video src={result} controls className={styles.resultVideo} />
            <a href={result} download className={styles.downloadBtn}>Baixar video</a>
          </div>
        )}
      </div>
    </div>
  )
}
