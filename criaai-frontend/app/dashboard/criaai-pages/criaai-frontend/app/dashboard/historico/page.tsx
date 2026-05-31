'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import styles from './historico.module.css'

export default function HistoricoPage() {
  const [generations, setGenerations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('todos')
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('generations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      setGenerations(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = generations.filter(g => filter === 'todos' || g.type === filter)

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <div><div className={styles.title}>Histórico</div><div className={styles.sub}>Todos os vídeos e ebooks gerados na sua conta</div></div>
      </div>
      <div className={styles.content}>
        <div className={styles.filters}>
          {['todos','video','ebook'].map(f => (
            <div key={f} className={`${styles.ftab} ${filter===f?styles.ftabOn:''}`} onClick={()=>setFilter(f)}>
              {f === 'todos' ? 'Todos' : f === 'video' ? 'Vídeos' : 'Ebooks'}
            </div>
          ))}
        </div>

        {loading ? (
          <div className={styles.loading}><i className="ti ti-loader" style={{fontSize:28,animation:'spin 1s linear infinite'}}/></div>
        ) : filtered.length === 0 ? (
          <div className={styles.empty}>
            <i className="ti ti-history" style={{fontSize:48,color:'var(--muted)',display:'block',marginBottom:16}}/>
            <div className={styles.emptyTitle}>Nenhuma geração ainda</div>
            <div className={styles.emptySub}>Seus vídeos e ebooks gerados aparecerão aqui</div>
          </div>
        ) : (
          <div className={styles.grid}>
            {filtered.map(g => (
              <div key={g.id} className={styles.card}>
                <div className={styles.cardThumb} style={{background: g.type === 'video' ? 'linear-gradient(135deg,rgba(124,92,252,.2),rgba(167,139,250,.1))' : 'linear-gradient(135deg,rgba(34,197,94,.2),rgba(34,197,94,.1))'}}>
                  <i className={`ti ${g.type === 'video' ? 'ti-video' : 'ti-book-2'}`} style={{fontSize:32,color: g.type === 'video' ? 'var(--accent2)' : 'var(--green)'}}/>
                  <div className={`${styles.statusBadge} ${g.status === 'completed' ? styles.done : g.status === 'processing' ? styles.processing : styles.failed}`}>
                    {g.status === 'completed' ? '✓ Pronto' : g.status === 'processing' ? '⏳ Processando' : '✗ Falhou'}
                  </div>
                </div>
                <div className={styles.cardInfo}>
                  <div className={styles.cardTitle}>{g.title || g.niche || 'Sem título'}</div>
                  <div className={styles.cardMeta}>{g.type === 'video' ? 'Vídeo' : 'Ebook'} · {formatDate(g.created_at)}</div>
                </div>
                <div className={styles.cardActions}>
                  {g.output_url && <a href={g.output_url} download className={styles.actionBtn}><i className="ti ti-download"/>Baixar</a>}
                  <div className={styles.actionBtn}><i className="ti ti-share"/>Compartilhar</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
