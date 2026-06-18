'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import styles from './admin.module.css'

export default function AdminPage() {
  const [profiles, setProfiles] = useState<any[]>([])
  const [stats, setStats] = useState({ receita: 0, custo: 0, alunos: 0, videos: 0, pagantes: 0, hoje: 0 })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pagantes')
  const [search, setSearch] = useState('')
  const supabase = createClient()
  const router = useRouter()

  function isToday(dateStr: string) {
    const d = new Date(dateStr)
    const now = new Date()
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
  }

  useEffect(function() {
    async function load() {
      const userResult = await supabase.auth.getUser()
      const user = userResult.data.user
      if (!user) { router.push('/login'); return }

      const profileResult = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
      if (!profileResult.data?.is_admin) { router.push('/dashboard'); return }

      const allResult = await supabase
        .from('profiles')
        .select('*, plans(name, price_monthly, credits_videos, credits_ebooks, is_unlimited)')
        .order('created_at', { ascending: false })

      const allProfiles = allResult.data
      if (allProfiles) {
        setProfiles(allProfiles)
        const pagantes = allProfiles.filter(function(p) { return p.subscription_status === 'active' })
        const hoje = allProfiles.filter(function(p) { return isToday(p.created_at) })
        const receita = pagantes.reduce(function(a, p) { return a + (p.plans?.price_monthly || 0) }, 0)
        const custo = allProfiles.reduce(function(a, p) { return a + (p.credits_videos_used || 0) * 0.56 + (p.credits_ebooks_used || 0) * 1.65 }, 0)
        const videos = allProfiles.reduce(function(a, p) { return a + (p.credits_videos_used || 0) }, 0)
        setStats({ receita, custo, alunos: allProfiles.length, videos, pagantes: pagantes.length, hoje: hoje.length })
      }
      setLoading(false)
    }
    load()
  }, [])

  function getMargin(profile: any) {
    const receita = profile.plans?.price_monthly || 0
    const custo = (profile.credits_videos_used || 0) * 0.56 + (profile.credits_ebooks_used || 0) * 1.65
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

  const filtered = profiles.filter(function(p) {
    if (search.trim()) {
      const q = search.toLowerCase()
      const matchesSearch = (p.full_name || '').toLowerCase().includes(q) || (p.email || '').toLowerCase().includes(q)
      if (!matchesSearch) return false
    }
    if (filter === 'risco') return getRisco(p) !== 'ok'
    if (filter === 'ok') return getRisco(p) === 'ok'
    if (filter === 'pagantes') return p.subscription_status === 'active'
    if (filter === 'inativos') return p.subscription_status !== 'active' && p.subscription_status !== 'trialing'
    if (filter === 'hoje') return isToday(p.created_at)
    return true
  })

  if (loading) return (
    <div className={styles.loading}>
      <i className="ti ti-loader" style={{ fontSize: 32, animation: 'spin 1s linear infinite' }} />
      <style>{'@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}'}</style>
    </div>
  )

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <div>
          <div className={styles.title}>Painel Admin</div>
          <div className={styles.sub}>Visao geral de todos os alunos e custos</div>
        </div>
      </div>
      <div className={styles.content}>

        <div className={styles.apiPanel}>
          <div className={styles.apiCard}>
            <div className={styles.apiHeader}>
              <div className={styles.apiIcon} style={{ background: '#1a1a2e' }}>
                <i className="ti ti-video" style={{ color: '#7c5cfc' }} />
              </div>
              <div>
                <div className={styles.apiName}>Creatomate</div>
                <div className={styles.apiSub}>Renders de video</div>
              </div>
              <a href="https://creatomate.com/projects" target="_blank" rel="noreferrer" className={styles.apiLink}>
                <i className="ti ti-external-link" />
              </a>
            </div>
            <div className={styles.apiNote}>Verifique o saldo de renders em creatomate.com</div>
          </div>

          <div className={styles.apiCard}>
            <div className={styles.apiHeader}>
              <div className={styles.apiIcon} style={{ background: '#0a2200' }}>
                <i className="ti ti-brain" style={{ color: '#10a37f' }} />
              </div>
              <div>
                <div className={styles.apiName}>OpenAI</div>
                <div className={styles.apiSub}>GPT-4o · Roteiros, ebooks e paginas</div>
              </div>
              <a href="https://platform.openai.com/settings/organization/billing/overview" target="_blank" rel="noreferrer" className={styles.apiLink}>
                <i className="ti ti-external-link" />
              </a>
            </div>
            <div className={styles.apiNote}>Verifique o saldo em platform.openai.com</div>
          </div>

          <div className={styles.apiCard}>
            <div className={styles.apiHeader}>
              <div className={styles.apiIcon} style={{ background: '#1a2e1a' }}>
                <i className="ti ti-book-2" style={{ color: '#4ade80' }} />
              </div>
              <div>
                <div className={styles.apiName}>Gamma</div>
                <div className={styles.apiSub}>Geracao de ebooks</div>
              </div>
              <a href="https://gamma.app" target="_blank" rel="noreferrer" className={styles.apiLink}>
                <i className="ti ti-external-link" />
              </a>
            </div>
            <div className={styles.apiNote}>Verifique o saldo em gamma.app</div>
          </div>
        </div>

        <div className={styles.stats}>
          <div
            className={styles.stat}
            style={{ cursor: 'pointer', border: filter === 'pagantes' ? '1px solid var(--accent)' : undefined }}
            onClick={function() { setFilter('pagantes') }}
          >
            <div className={styles.statLabel}>Receita mensal</div>
            <div className={styles.statValue}>R${stats.receita.toFixed(0)}</div>
            <div className={styles.statUp}>{stats.pagantes} alunos pagantes — clique para ver</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statLabel}>Custo total APIs</div>
            <div className={styles.statValue} style={{ color: 'var(--red)' }}>R${stats.custo.toFixed(2)}</div>
            <div className={styles.statUp} style={{ color: 'var(--muted2)' }}>Creatomate + OpenAI + Gamma</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statLabel}>Lucro liquido</div>
            <div className={styles.statValue} style={{ color: 'var(--green)' }}>R${(stats.receita - stats.custo).toFixed(0)}</div>
            <div className={styles.statUp}>Margem {stats.receita > 0 ? Math.round(((stats.receita - stats.custo) / stats.receita) * 100) : 0}%</div>
          </div>
          <div
            className={styles.stat}
            style={{ cursor: 'pointer', border: filter === 'hoje' ? '1px solid var(--accent)' : undefined }}
            onClick={function() { setFilter('hoje') }}
          >
            <div className={styles.statLabel}>Cadastros hoje</div>
            <div className={styles.statValue}>{stats.hoje}</div>
            <div className={styles.statUp}>de {stats.alunos} no total — clique para ver</div>
          </div>
        </div>

        <div className={styles.tableCard}>
          <div className={styles.tableHeader}>
            <div className={styles.tableTitle}>
              {filter === 'pagantes' ? 'Alunos com plano ativo (' + stats.pagantes + ')' :
               filter === 'hoje' ? 'Cadastrados hoje (' + stats.hoje + ')' :
               'Alunos cadastrados'}
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="text"
                value={search}
                onChange={function(e) { setSearch(e.target.value) }}
                placeholder="Buscar por nome ou email..."
                style={{
                  background: 'var(--surface2)',
                  border: '1px solid var(--border)',
                  borderRadius: 9,
                  padding: '8px 14px',
                  color: 'var(--text)',
                  fontSize: 13,
                  outline: 'none',
                  minWidth: 220,
                }}
              />
              <div className={styles.filters}>
                {['pagantes', 'hoje', 'todos', 'inativos', 'risco', 'ok'].map(function(f) {
                  return (
                    <div
                      key={f}
                      className={styles.ftab + (filter === f ? ' ' + styles.ftabOn : '')}
                      onClick={function() { setFilter(f) }}
                    >
                      {f === 'todos' ? 'Todos' : f === 'pagantes' ? 'Pagantes' : f === 'hoje' ? 'Cadastrados hoje' : f === 'inativos' ? 'Inativos' : f === 'risco' ? 'Em risco' : 'Saudaveis'}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Aluno</th>
                <th>Plano</th>
                <th>Status</th>
                <th>Provedor</th>
                <th>Receita</th>
                <th>Custo API</th>
                <th>Videos</th>
                <th>Margem</th>
                <th>Risco</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(function(p) {
                const margin = getMargin(p)
                const risco = getRisco(p)
                const plan = p.plans
                const videosUsed = p.credits_videos_used || 0
                const videosLimit = plan?.is_unlimited ? '∞' : (plan?.credits_videos || 0)
                const custo = videosUsed * 0.56 + (p.credits_ebooks_used || 0) * 1.65
                const isPaying = p.subscription_status === 'active'

                return (
                  <tr key={p.id}>
                    <td>
                      <div className={styles.userCell}>
                        <div className={styles.avatar}>{(p.full_name || p.email || '?')[0].toUpperCase()}</div>
                        <div>
                          <div className={styles.userName}>{p.full_name || '—'}</div>
                          <div className={styles.userEmail}>{p.email}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className={styles.planBadge + ' ' + styles['plan' + (plan?.name || 'Starter')]}>{plan?.name || 'Starter'}</span></td>
                    <td>
                      <span style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: isPaying ? 'var(--green)' : p.subscription_status === 'trialing' ? 'var(--accent2)' : 'var(--muted)',
                      }}>
                        {isPaying ? 'Ativo' : p.subscription_status === 'trialing' ? 'Trial' : p.subscription_status === 'past_due' ? 'Atrasado' : p.subscription_status === 'canceled' ? 'Cancelado' : 'Inativo'}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--muted2)', textTransform: 'capitalize' }}>{p.payment_provider || '—'}</td>
                    <td className={styles.mono}>R${(plan?.price_monthly || 0).toFixed(0)}</td>
                    <td className={styles.mono} style={{ color: custo > 20 ? 'var(--amber)' : 'var(--muted2)' }}>R${custo.toFixed(2)}</td>
                    <td className={styles.mono}>{videosUsed}/{videosLimit}</td>
                    <td><span className={styles.marginPill + ' ' + (margin >= 80 ? styles.mGood : margin >= 50 ? styles.mWarn : styles.mBad)}>{margin}%</span></td>
                    <td><span className={styles.riskBadge + ' ' + (risco === 'ok' ? styles.riskOk : risco === 'medio' ? styles.riskMed : styles.riskHigh)}>{risco === 'ok' ? 'Ok' : risco === 'medio' ? 'Atencao' : 'Risco'}</span></td>
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
