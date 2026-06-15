'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import styles from './historico.module.css'

export default function HistoricoPage() {
  const [generations, setGenerations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('todos')
  const [deleting, setDeleting] = useState<string | null>(null)
  const [clearingAll, setClearingAll] = useState(false)
  const supabase = createClient()

  useEffect(function() {
    async function load() {
      const userResult = await supabase.auth.getUser()
      const user = userResult.data.user
      if (!user) return
      const result = await supabase
        .from('generations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      setGenerations(result.data || [])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = generations.filter(function(g) {
    return filter === 'todos' || g.type === filter
  })

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit'
    })
  }

  async function deleteOne(id: string) {
    if (!confirm('Remover este item do historico?')) return
    setDeleting(id)
    const userResult = await supabase.auth.getUser()
    const user = userResult.data.user
    if (!user) return
    await supabase.from('generations').delete().eq('id', id).eq('user_id', user.id)
    setGenerations(function(prev) { return prev.filter(function(g) { return g.id !== id }) })
    setDeleting(null)
  }

  async function clearAll() {
    if (!confirm('Limpar todo o historico? Esta acao nao pode ser desfeita.')) return
    setClearingAll(true)
    const userResult = await supabase.auth.getUser()
    const user = userResult.data.user
    if (!user) return
    await supabase.from('generations').delete().eq('user_id', user.id)
    setGenerations([])
    setClearingAll(false)
  }

  function VideoThumb({ url }: { url: string }) {
    const [thumb, setThumb] = useState<string | null>(null)

    useEffect(function() {
      const video = document.createElement('video')
      video.src = url
      video.crossOrigin = 'anonymous'
      video.currentTime = 1
      video.addEventListener('seeked', function() {
        const canvas = document.createElement('canvas')
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(video, 0, 0)
          setThumb(canvas.toDataURL('image/jpeg'))
        }
      })
      video.load()
    }, [url])

    if (!thumb) return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <i className="ti ti-video" style={{ fontSize: 32, color: 'var(--accent2)' }} />
      </div>
    )

    return <img src={thumb} alt="thumb" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} />
  }

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <div>
          <div className={styles.title}>Historico</div>
          <div className={styles.sub}>Todos os videos e ebooks gerados na sua conta</div>
        </div>
        {generations.length > 0 && (
          <button
            onClick={clearAll}
            disabled={clearingAll}
            style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: 10,
              padding: '8px 16px',
              color: '#fca5a5',
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontFamily: 'DM Sans, sans-serif',
            }}
          >
            <i className="ti ti-trash" /> {clearingAll ? 'Limpando...' : 'Limpar tudo'}
          </button>
        )}
      </div>

      <div className={styles.content}>
        <div className={styles.filters}>
          {['todos', 'video', 'ebook'].map(function(f) {
            return (
              <div
                key={f}
                className={styles.ftab + (filter === f ? ' ' + styles.ftabOn : '')}
                onClick={function() { setFilter(f) }}
              >
                {f === 'todos' ? 'Todos' : f === 'video' ? 'Videos' : 'Ebooks'}
              </div>
            )
          })}
        </div>

        {loading ? (
          <div className={styles.loading}>
            <i className="ti ti-loader" style={{ fontSize: 28, animation: 'spin 1s linear infinite' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className={styles.empty}>
            <i className="ti ti-history" style={{ fontSize: 48, color: 'var(--muted)', display: 'block', marginBottom: 16 }} />
            <div className={styles.emptyTitle}>Nenhuma geracao ainda</div>
            <div className={styles.emptySub}>Seus videos e ebooks gerados aparecerão aqui</div>
          </div>
        ) : (
          <div className={styles.grid}>
            {filtered.map(function(g) {
              const hasOutput = !!g.output_url
              const isVideo = g.type === 'video'
              const isCompleted = g.status === 'completed'

              return (
                <div key={g.id} className={styles.card}>
                  <div
                    className={styles.cardThumb}
                    style={{
                      background: isVideo
                        ? 'linear-gradient(135deg,rgba(124,92,252,.2),rgba(167,139,250,.1))'
                        : 'linear-gradient(135deg,rgba(34,197,94,.2),rgba(34,197,94,.1))',
                      overflow: 'hidden',
                      position: 'relative',
                    }}
                  >
                    {isVideo && hasOutput && isCompleted ? (
                      <VideoThumb url={g.output_url} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <i
                          className={'ti ' + (isVideo ? 'ti-video' : 'ti-book-2')}
                          style={{ fontSize: 32, color: isVideo ? 'var(--accent2)' : 'var(--green)' }}
                        />
                      </div>
                    )}
                    <div
                      className={styles.statusBadge + ' ' + (
                        g.status === 'completed' ? styles.done :
                        g.status === 'processing' ? styles.processing :
                        styles.failed
                      )}
                      style={{ position: 'absolute', top: 8, right: 8 }}
                    >
                      {g.status === 'completed' ? 'Pronto' : g.status === 'processing' ? 'Processando' : 'Falhou'}
                    </div>
                  </div>

                  <div className={styles.cardInfo}>
                    <div className={styles.cardTitle}>{g.title || g.niche || 'Sem titulo'}</div>
                    <div className={styles.cardMeta}>{isVideo ? 'Video' : 'Ebook'} · {formatDate(g.created_at)}</div>
                  </div>

                  <div className={styles.cardActions}>
                    {hasOutput && (
                      <a href={g.output_url} download className={styles.actionBtn}>
                        <i className="ti ti-download" /> Baixar
                      </a>
                    )}
                    {hasOutput && (
                      <button
                        className={styles.actionBtn}
                        onClick={function() { navigator.clipboard.writeText(g.output_url) }}
                      >
                        <i className="ti ti-copy" /> Copiar link
                      </button>
                    )}
                    <button
                      className={styles.actionBtn}
                      onClick={function() { deleteOne(g.id) }}
                      disabled={deleting === g.id}
                      style={{ color: '#fca5a5' }}
                    >
                      <i className="ti ti-trash" /> {deleting === g.id ? '...' : 'Limpar'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
