'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import styles from './admin.module.css'

export default function AdminPage() {
  const [profiles, setProfiles] = useState<any[]>([])
  const [stats, setStats] = useState({ receita: 0, custo: 0, alunos: 0, videos: 0 })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('todos')
  const [apis, setApis] = useState<any>(null)
  const [apisLoading, setApisLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
      if (!profile?.is_admin) { router.push('/dashboard'); return }

      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('*, plans(name, price_monthly, credits_videos, credits_ebooks, is_unlimited)')
        .order('created_at', { ascending: false })

      if (allProfiles) {
        setProfiles(allProfiles)
        const receita = allProfiles.reduce((a, p) => a + (p.plans?.price_monthly || 0), 0)
        const custo = allProfiles.reduce((a, p) => a + (p.credits_videos_used || 0) * 0.8, 0)
        const videos = allProfiles.reduce((a, p) => a + (p.credits_videos_used || 0), 0)
        setStats({ receita, custo, alunos: allProfiles.length, videos })
      }
      setLoading(false)

      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/admin/apis', {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      })
      const data = await res.json()
      setApis(data)
      setApisLoading(false)
    }
    load()
  }, [])

  function getMargin(profile: any) {
    const receita = profile.plans?.price_monthly || 0
    const custo = (profile.credits_videos_used || 0) * 0.8 + (profile.credits_ebooks_used || 0) * 0.15
    if (receita === 0) return 0
    return Math.round(((receita - custo) / receita) * 100)
  }

  function getRisco(profile: any) {
    const plan = profile.plans
    if (!plan || plan.is_unlimited) return 'ok'
    const pct = (profile.credits_videos_used || 0) / (plan.credits_videos || 1)
    if (pct >= 0.9) return 'alto'
    if (pct >= 0.7) return 'medio'
    return 'ok'
  }

  const filtered = profiles.filter(p => {
    if (filter === 'risco') return getRisco(p) !== 'ok'
    if (filter === 'ok') return getRisco(p) === 'ok'
    return true
  })

  const klingPct = apis?.kling?.total > 0
    ? Math.round((apis.kling.credits / apis.kling.total) * 100)
    : null

  if (loading) return (
    <div className={styles.loading}>
      <i className="ti ti-loader" style={{fontSize:32,animation:'spin 1s linear infinite'}}/>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <div><div className={styles.title}>Painel Admin</div><div className={styles.sub}>Visão geral de todos os alunos e custos</div></div>
      </div>
      <div className={styles.content}>

        <div className={styles.apiPanel}>
          <div className={styles.apiCard}>
            <div className={styles.apiHeader}>
              <div className={styles.apiIcon} style={{background:'#1a1a2e'}}>
                <i className="ti ti-video" style={{color:'#7c5cfc'}}/>
              </div>
              <div>
                <div className={styles.apiName}>Kling AI</div>
                <div className={styles.apiSub}>Créditos de vídeo</div>
              </div>
              <a href="https://klingai.com" target="_blank" rel="noreferrer" className={styles.apiLink}>
                <i className="ti ti-external-link"/>
              </a>
            </div>
            {apisLoading ? (
              <div className={styles.apiLoading}>Carregando...</div>
            ) : apis?.kling?.error ? (
              <div className={styles.apiErr}><i className="ti ti-alert-circle"/> {apis.kling.error}</div>
            ) : (
              <>
                <div className={styles.apiBalance}>
                  <span className={styles.apiBalanceNum}>{apis?.kling?.credits?.toLocaleString() || 0}</span>
                  <span className={styles.apiBalanceLabel}> / {apis?.kling?.total?.toLocaleString() || 0} créditos</span>
                </div>
                {klingPct !== null && (
                  <div className={styles.apiBar}>
                    <div className={styles.apiBarFill} style={{
                      width: `${klingPct}%`,
                      background: klingPct > 30 ? 'var(--green)' : klingPct > 10 ? 'var(--amber)' : 'var(--red)'
                    }}/>
                  </div>
                )}
                <div className={styles.apiNote} style={{color: klingPct !== null && klingPct < 15 ? 'var(--red)' : 'var(--muted2)'}}>
                  {klingPct !== null && klingPct < 15 ? '⚠ Saldo baixo — recarregue em breve' : `${klingPct ?? '—'}% restante`}
                </div>
              </>
            )}
          </div>

          <div className={styles.apiCard}>
            <div className={styles.apiHeader}>
              <div className={styles.apiIcon} style={{background:'#0a2200'}}>
                <i className="ti ti-brain" style={{color:'#10a37f'}}/>
              </div>
              <div>
                <div className={styles.apiName}>OpenAI</div>
                <div className={styles.apiSub}>GPT-4o · Ebooks e páginas</div>
              </div>
              <a href="https://platform.openai.com/settings/organization/billing/overview" target="_blank" rel="noreferrer" className={styles.apiLink}>
                <i className="ti ti-external-link"/>
              </a>
            </div>
            {apisLoading ? (
              <div className={styles.apiLoading}>Carregando...</div>
            ) : apis?.openai?.error ? (
              <div className={styles.apiErr}><i className="ti ti-alert-circle"/> Verifique em platform.openai.com</div>
            ) : (
              <>
                <div className={styles.apiBalance}>
                  <span className={styles.apiBalanceNum}>
                    {apis?.openai?.balance != null ? `$${(apis.openai.balance / 100).toFixed(2)}` : '—'}
                  </span>
                  <span className={styles.apiBalanceLabel}> créditos disponíveis</span>
                </div>
                <div className={styles.apiNote} style={{color: apis?.openai?.balance != null && apis.openai.balance < 500 ? 'var(--red)' : 'var(--muted2)'}}>
                  {apis?.openai?.balance != null && apis.openai.balance < 500
                    ? '⚠ Saldo abaixo de $5 — recarregue'
                    : 'Saldo suficiente'}
                </div>
              </>
            )}
          </div>
        </div>

        <div className={styles.stats}>
          <div className={styles.stat}><div className={styles.statLabel}>Receita mensal</div><div className={styles.statValue}>R${stats.receita.toFixed(0)}</div><div className={styles.statUp}>↑ estimado</div></div>
          <div className={styles.stat}><div className={styles.statLabel}>Custo total APIs</div><div className={styles.statValue} style={{color:'var(--red)'}}>R${stats.custo.toFixed(2)}</div><div className={styles.statUp} style={{color:'var(--muted2)'}}>Kling + OpenAI</div></div>
          <div className={styles.stat}><div className={styles.statLabel}>Lucro líquido</div><div className={styles.statValue} style={{color:'var(--green)'}}>R${(stats.receita - stats.custo).toFixed(0)}</div><div className={styles.statUp}>Margem {stats.receita > 0 ? Math.round(((stats.receita - stats.custo) / stats.receita) * 100) : 0}%</div></div>
          <div className={styles.stat}><div className={styles.statLabel}>Alunos ativos</div><div className={styles.statValue}>{stats.alunos}</div><div className={styles.statUp}>{stats.videos} vídeos gerados</div></div>
        </div>

        <div className={styles.tableCard}>
          <div className={styles.tableHeader}>
            <div className={styles.tableTitle}>Custo por aluno</div>
            <div className={styles.filters}>
              {['todos','risco','ok'].map(f => (
                <div key={f} className={`${styles.ftab} ${filter===f?styles.ftabOn:''}`} onClick={()=>setFilter(f)}>
                  {f === 'todos' ? 'Todos' : f === 'risco' ? 'Em risco' : 'Saudáveis'}
                </div>
              ))}
            </div>
          </div>
          <table className={styles.table}>
            <thead><tr><th>Aluno</th><th>Plano</th><th>Receita</th><th>Custo API</th><th>Vídeos</th><th>Margem</th><th>Status</th></tr></thead>
            <tbody>
              {filtered.map(p => {
                const margin = getMargin(p)
                const risco = getRisco(p)
                const plan = p.plans
                const videosUsed = p.credits_videos_used || 0
                const videosLimit = plan?.is_unlimited ? '∞' : (plan?.credits_videos || 0)
                const custo = videosUsed * 0.8 + (p.credits_ebooks_used || 0) * 0.15
                return (
                  <tr key={p.id}>
                    <td><div className={styles.userCell}><div className={styles.avatar}>{(p.full_name || p.email || '?')[0].toUpperCase()}</div><div><div className={styles.userName}>{p.full_name || '—'}</div><div className={styles.userEmail}>{p.email}</div></div></div></td>
                    <td><span className={`${styles.planBadge} ${styles['plan' + (plan?.name || 'Starter')]}`}>{plan?.name || 'Starter'}</span></td>
                    <td className={styles.mono}>R${(plan?.price_monthly || 0).toFixed(0)}</td>
                    <td className={styles.mono} style={{color: custo > 20 ? 'var(--amber)' : 'var(--muted2)'}}>R${custo.toFixed(2)}</td>
                    <td className={styles.mono}>{videosUsed}/{videosLimit}</td>
                    <td><span className={`${styles.marginPill} ${margin >= 80 ? styles.mGood : margin >= 50 ? styles.mWarn : styles.mBad}`}>{margin}%</span></td>
                    <td><span className={`${styles.riskBadge} ${risco === 'ok' ? styles.riskOk : risco === 'medio' ? styles.riskMed : styles.riskHigh}`}>{risco === 'ok' ? '✓ Ok' : risco === 'medio' ? '⚠ Atenção' : '✗ Risco'}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <div className={styles.empty}>Nenhum aluno encontrado</div>}
        </div>
      </div>
    </div>
  )
}
