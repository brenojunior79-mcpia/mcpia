'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import styles from './admin.module.css'

export default function AdminPage() {
  const [profiles, setProfiles] = useState<any[]>([])
  const [stats, setStats] = useState({ receita: 0, custo: 0, alunos: 0, videos: 0, pagantes: 0, hoje: 0 })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('todos')
  const [search, setSearch] = useState('')
  const supabase = createClient()
  const router = useRouter()

  function isToday(dateStr: string) {
    const d = new Date(dateStr)
    const now = new Date()
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
  }

  function formatDate(dateStr: string) {
    if (!dateStr) return '—'
    const d = new Date(dateStr)
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
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

  const filtered = profiles.filter(function(p) {
    if (search.trim()) {
      const q = search.toLowerCase()
      const matchesSearch = (p.full_name || '').toLowerCase().includes(q) || (p.email || '').toLowerCase().includes(q)
      if (!matchesSearch) return false
    }
    if (filter === 'pagantes') return p.subscription_status === 'active'
    if (filter === 'hoje') return isToday(p.created_at)
    if (filter === 'sempagar') return p.subscription_status !== 'active' && p.subscription_status !== 'trialing'
    return true
  })

  if (loading) return (
    <div className={styles.loading}>
      <i className="ti ti-loader" style={{ fontSize: 32, animation: 'spin 1s linear infinite' }} />
      <style>{'@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}'}</style>
    </div>
  )

  const lucro = stats.receita - stats.custo

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <div>
          <div className={styles.title}>Painel Admin</div>
          <div className={styles.sub}>Quem esta usando o site e quanto esta entrando</div>
        </div>
      </div>
      <div className={styles.content}>

        {/* Resumo simples */}
        <div className={styles.stats}>
          <div
            className={styles.stat}
            style={{ cursor: 'pointer', border: filter === 'todos' ? '1px solid var(--accent)' : undefined }}
            onClick={function() { setFilter('todos') }}
          >
            <div className={styles.statLabel}>Usuarios cadastrados</div>
            <div className={styles.statValue}>{stats.alunos}</div>
            <div className={styles.statUp} style={{ color: 'var(--muted2)' }}>{stats.hoje} novos hoje — clique para ver todos</div>
          </div>
          <div
            className={styles.stat}
            style={{ cursor: 'pointer', border: filter === 'pagantes' ? '1px solid var(--accent)' : undefined }}
            onClick={function() { setFilter('pagantes') }}
          >
            <div className={styles.statLabel}>Pagando agora</div>
            <div className={styles.statValue} style={{ color: 'var(--green)' }}>{stats.pagantes}</div>
            <div className={styles.statUp}>R${stats.receita.toFixed(0)} por mes — clique para ver</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statLabel}>Lucro do mes</div>
            <div className={styles.statValue} style={{ color: lucro >= 0 ? 'var(--green)' : 'var(--red)' }}>R${lucro.toFixed(0)}</div>
            <div className={styles.statUp} style={{ color: 'var(--muted2)' }}>Depois de pagar as ferramentas de IA (R${stats.custo.toFixed(0)})</div>
          </div>
        </div>

        {/* Tabela de usuarios, simplificada */}
        <div className={styles.tableCard}>
          <div className={styles.tableHeader}>
            <div className={styles.tableTitle}>
              {filter === 'pagantes' ? 'Quem esta pagando (' + stats.pagantes + ')' :
               filter === 'hoje' ? 'Cadastrados hoje (' + stats.hoje + ')' :
               filter === 'sempagar' ? 'Sem plano pago' :
               'Todos os usuarios (' + stats.alunos + ')'}
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
                {['todos', 'pagantes', 'hoje', 'sempagar'].map(function(f) {
                  return (
                    <div
                      key={f}
                      className={styles.ftab + (filter === f ? ' ' + styles.ftabOn : '')}
                      onClick={function() { setFilter(f) }}
                    >
                      {f === 'todos' ? 'Todos' : f === 'pagantes' ? 'Pagando' : f === 'hoje' ? 'Novos hoje' : 'Sem pagar'}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Plano</th>
                <th>Situacao</th>
                <th>Cadastrado em</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(function(p) {
                const plan = p.plans
                const isPaying = p.subscription_status === 'active'
                const situacao =
                  isPaying ? { label: 'Pagando', color: 'var(--green)' } :
                  p.subscription_status === 'trialing' ? { label: 'Teste gratis', color: 'var(--accent2)' } :
                  p.subscription_status === 'past_due' ? { label: 'Pagamento atrasado', color: 'var(--amber)' } :
                  p.subscription_status === 'canceled' ? { label: 'Cancelou', color: 'var(--muted)' } :
                  { label: 'Sem plano', color: 'var(--muted)' }

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
                    <td><span className={styles.planBadge + ' ' + styles['plan' + (plan?.name || 'Starter')]}>{plan?.name || 'Sem plano'}</span></td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: situacao.color }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: situacao.color, display: 'inline-block' }} />
                        {situacao.label}
                      </span>
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--muted2)' }}>{formatDate(p.created_at)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <div className={styles.empty}>Nenhum usuario encontrado</div>}
        </div>

        {/* Saldo das ferramentas de IA — resumido, no rodape */}
        <div className={styles.apiPanel}>
          <a href="https://creatomate.com/projects" target="_blank" rel="noreferrer" className={styles.apiPill}>
            <i className="ti ti-video" /> Creatomate <i className="ti ti-external-link" style={{ marginLeft: 'auto', fontSize: 14 }} />
          </a>
          <a href="https://platform.openai.com/settings/organization/billing/overview" target="_blank" rel="noreferrer" className={styles.apiPill}>
            <i className="ti ti-brain" /> OpenAI <i className="ti ti-external-link" style={{ marginLeft: 'auto', fontSize: 14 }} />
          </a>
          <a href="https://gamma.app" target="_blank" rel="noreferrer" className={styles.apiPill}>
            <i className="ti ti-book-2" /> Gamma <i className="ti ti-external-link" style={{ marginLeft: 'auto', fontSize: 14 }} />
          </a>
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted2)', textAlign: 'center', marginTop: -12 }}>
          Clique para conferir o saldo de cada ferramenta de IA no site delas
        </div>
      </div>
    </div>
  )
}
