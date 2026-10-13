'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import styles from './admin.module.css'

export default function AdminPage() {
  const [profiles, setProfiles] = useState<any[]>([])
  const [stats, setStats] = useState({ receita: 0, custo: 0, alunos: 0, videos: 0, pagantes: 0, hoje: 0 })
  const [installs, setInstalls] = useState<any>(null)
  const [emailStats, setEmailStats] = useState<any>(null)
  const [presence, setPresence] = useState<any>(null)
  const [showOnline, setShowOnline] = useState(false)
  const [heat, setHeat] = useState<any>(null)
  const [pushPeople, setPushPeople] = useState(0)
  const PAGE_STEP = 20
  const [visible, setVisible] = useState(PAGE_STEP)
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

      // O Supabase devolve no maximo 1000 linhas por consulta, entao busca em blocos ate acabar
      const PAGE_SIZE = 1000
      let allProfiles: any[] = []
      let from = 0
      let fetchFailed = false
      while (true) {
        const pageResult = await supabase
          .from('profiles')
          .select('*, plans(name, price_monthly, credits_videos, credits_ebooks, is_unlimited)')
          .order('created_at', { ascending: false })
          .order('id', { ascending: true })
          .range(from, from + PAGE_SIZE - 1)

        if (pageResult.error) { console.error('Erro ao carregar perfis:', pageResult.error); fetchFailed = true; break }
        const rows = pageResult.data || []
        allProfiles = allProfiles.concat(rows)
        if (rows.length < PAGE_SIZE) break
        from += PAGE_SIZE
      }

      if (!fetchFailed) {
        setProfiles(allProfiles)
        const pagantes = allProfiles.filter(function(p) { return p.subscription_status === 'active' })
        const hoje = allProfiles.filter(function(p) { return isToday(p.created_at) })
        const receita = pagantes.reduce(function(a, p) { return a + (p.plans?.price_monthly || 0) }, 0)
        const custo = allProfiles.reduce(function(a, p) { return a + (p.credits_videos_used || 0) * 0.56 + (p.credits_ebooks_used || 0) * 1.65 }, 0)
        const videos = allProfiles.reduce(function(a, p) { return a + (p.credits_videos_used || 0) }, 0)
        setStats({ receita, custo, alunos: allProfiles.length, videos, pagantes: pagantes.length, hoje: hoje.length })
      }
      // Instalacoes do app (PWA). Se a tabela ainda nao existir, o card mostra zero.
      try {
        const inst = await supabase.rpc('app_install_stats')
        if (!inst.error && inst.data) setInstalls(inst.data)
      } catch (e) {}
      // E-mails abertos. Se o arquivo T1 ainda nao foi rodado, o card mostra zero.
      try {
        const es = await supabase.rpc('email_open_stats')
        if (!es.error && es.data) setEmailStats(es.data)
      } catch (e) {}
      // Alunos que ativaram as notificacoes (pessoas diferentes, nao aparelhos)
      try {
        const ids: Record<string, boolean> = {}
        let pFrom = 0
        while (true) {
          const pr = await supabase.from('push_subscriptions').select('user_id').order('id', { ascending: true }).range(pFrom, pFrom + 999)
          if (pr.error) break
          const rows = pr.data || []
          rows.forEach(function(r: any) { ids[r.user_id] = true })
          if (rows.length < 1000) break
          pFrom += 1000
        }
        setPushPeople(Object.keys(ids).length)
      } catch (e) {}
      setLoading(false)
    }
    load()
  }, [])

  // Alunos online agora: atualiza sozinho a cada 30 segundos. Se o arquivo U1 ainda nao foi rodado, o card mostra zero.
  useEffect(function() {
    let alive = true
    async function loadPresence() {
      try {
        const r = await supabase.rpc('presence_stats')
        if (alive && !r.error && r.data) setPresence(r.data)
      } catch (e) {}
    }
    loadPresence()
    const t = setInterval(loadPresence, 30000)
    return function() { alive = false; clearInterval(t) }
  }, [])

  // Dias e horarios de maior acesso (ultimos 30 dias). Se o arquivo V1 ainda nao foi rodado, o grafico fica vazio.
  useEffect(function() {
    async function loadHeat() {
      try {
        const r = await supabase.rpc('presence_heatmap', { p_days: 30 })
        if (!r.error && r.data) setHeat(r.data)
      } catch (e) {}
    }
    loadHeat()
  }, [])

  const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
  const DIAS_LONGO = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']
  const grid: number[][] = []
  for (let d = 0; d < 7; d++) { grid.push([]); for (let h = 0; h < 24; h++) grid[d].push(0) }
  if (heat && heat.celulas) heat.celulas.forEach(function(c: any) { if (grid[c.dow]) grid[c.dow][c.hora] = Number(c.alunos) || 0 })
  const heatMax = Math.max(1, ...grid.map(function(row) { return Math.max(...row) }))
  const dayTotals = grid.map(function(row) { return row.reduce(function(a, b) { return a + b }, 0) })
  const hourTotals: number[] = []
  for (let h = 0; h < 24; h++) hourTotals.push(grid.reduce(function(a, row) { return a + row[h] }, 0))
  const dayMax = Math.max(1, ...dayTotals)
  const heatHasData = dayTotals.some(function(n) { return n > 0 })
  const bestDay = dayTotals.indexOf(Math.max(...dayTotals))
  const bestHour = hourTotals.indexOf(Math.max(...hourTotals))

  // Reembolsos (quem teve o acesso encerrado por reembolso)
  const refunded = profiles.filter(function(p: any) { return !!p.refunded_at }).sort(function(a: any, b: any) { return new Date(b.refunded_at).getTime() - new Date(a.refunded_at).getTime() })
  const refunded7 = refunded.filter(function(p: any) { return Date.now() - new Date(p.refunded_at).getTime() < 7 * 24 * 60 * 60 * 1000 }).length
  const refunded30 = refunded.filter(function(p: any) { return Date.now() - new Date(p.refunded_at).getTime() < 30 * 24 * 60 * 60 * 1000 }).length

  function pageLabel(path: string) {
    if (!path) return 'Painel'
    const map: Record<string, string> = {
      '/dashboard': 'Painel', '/dashboard/chat': 'Assistente IA', '/dashboard/plataformas': 'Plataformas', '/dashboard/produtos': 'Produtos em Alta',
      '/dashboard/ebook': 'Gerador de Ebook', '/dashboard/paginas': 'Gerador de Site', '/dashboard/criativo': 'Gerador de Criativos',
      '/dashboard/criativos-manuais': 'Criativos Manuais', '/dashboard/vendas': 'Vendendo no Automático', '/dashboard/anuncios': 'Gerenciador de Anúncios',
      '/dashboard/suporte': 'Suporte Humano', '/dashboard/aulas': 'Aulas ao Vivo', '/dashboard/planos': 'Planos', '/dashboard/creditos': 'Créditos',
    }
    return map[path] || path.replace('/dashboard/', '')
  }

  function agoLabel(iso: string) {
    const secs = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000))
    if (secs < 60) return 'agora'
    return 'há ' + Math.round(secs / 60) + ' min'
  }

  // Ao trocar o filtro ou a busca, volta a mostrar so os primeiros
  useEffect(function() { setVisible(PAGE_STEP) }, [filter, search])

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

        {/* Online agora */}
        <div className={styles.stat} style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ minWidth: 150 }}>
              <div className={styles.statLabel}>
                <span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: '50%', background: '#22c55e', marginRight: 6 }} />
                Online agora
              </div>
              <div className={styles.statValue} style={{ color: 'var(--green)' }}>{presence ? presence.agora : 0}</div>
              <div className={styles.statUp} style={{ color: 'var(--muted2)' }}>Atualiza sozinho a cada 30 segundos</div>
            </div>
            <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap', fontSize: 13, color: 'var(--muted2)' }}>
              <div><b style={{ color: 'var(--text)', fontSize: 18 }}>{presence ? presence.ultimos15 : 0}</b><br />Últimos 15 minutos</div>
              <div><b style={{ color: 'var(--text)', fontSize: 18 }}>{presence ? presence.hoje : 0}</b><br />Entraram hoje</div>
            </div>
            <button
              onClick={function() { setShowOnline(!showOnline) }}
              style={{ marginLeft: 'auto', padding: '8px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
            >
              {showOnline ? 'Esconder lista' : 'Ver quem está online'}
            </button>
          </div>
          {showOnline && (
            <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 12, maxHeight: 280, overflowY: 'auto' }}>
              {(!presence || !presence.online || presence.online.length === 0) ? (
                <div style={{ fontSize: 13, color: 'var(--muted2)' }}>Ninguém online neste momento.</div>
              ) : presence.online.map(function(o: any, i: number) {
                return (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '7px 0', fontSize: 13, borderBottom: '1px solid var(--border)' }}>
                    <span style={{ color: 'var(--text)', fontWeight: 600 }}>{o.nome}</span>
                    <span style={{ color: 'var(--muted2)', textAlign: 'right' }}>{pageLabel(o.pagina)} · {agoLabel(o.visto)}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Dias e horarios de maior acesso */}
        <div className={styles.stat} style={{ marginBottom: 28 }}>
          <div className={styles.statLabel}><i className="ti ti-chart-bar" /> Dias e horários de maior acesso</div>
          {!heatHasData ? (
            <div style={{ fontSize: 13, color: 'var(--muted2)', marginTop: 10, lineHeight: 1.6 }}>
              Ainda sem dados. O gráfico começa a se formar a partir de hoje, conforme os alunos usam a plataforma.
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 13, color: 'var(--muted2)', margin: '8px 0 14px' }}>
                Melhor dia: <b style={{ color: 'var(--text)' }}>{DIAS_LONGO[bestDay]}</b> · Melhor horário: <b style={{ color: 'var(--text)' }}>{bestHour}h</b> · últimos 30 dias (horário de Brasília)
              </div>

              {/* Mapa de calor: cada quadrado e um dia da semana em um horario. Quanto mais escuro, mais alunos. */}
              <div style={{ overflowX: 'auto', paddingBottom: 6 }}>
                <div style={{ minWidth: 560 }}>
                  <div style={{ display: 'flex', marginLeft: 36, marginBottom: 4 }}>
                    {Array.from({ length: 24 }).map(function(_, h) {
                      return <div key={h} style={{ flex: 1, fontSize: 10, color: 'var(--muted2)', textAlign: 'center' }}>{h % 3 === 0 ? h + 'h' : ''}</div>
                    })}
                  </div>
                  {grid.map(function(row, d) {
                    return (
                      <div key={d} style={{ display: 'flex', alignItems: 'center', marginBottom: 2 }}>
                        <div style={{ width: 36, fontSize: 11, color: 'var(--muted2)' }}>{DIAS[d]}</div>
                        {row.map(function(v, h) {
                          return (
                            <div
                              key={h}
                              title={DIAS_LONGO[d] + ', ' + h + 'h: ' + v + (v === 1 ? ' aluno' : ' alunos')}
                              style={{ flex: 1, height: 22, margin: '0 1px', borderRadius: 4, background: v > 0 ? 'rgba(91,78,248,' + (0.15 + 0.85 * (v / heatMax)).toFixed(2) + ')' : 'var(--surface2)' }}
                            />
                          )
                        })}
                      </div>
                    )
                  })}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, marginLeft: 36, fontSize: 11, color: 'var(--muted2)' }}>
                    menos
                    {[0.15, 0.35, 0.55, 0.78, 1].map(function(a, i) {
                      return <span key={i} style={{ width: 18, height: 10, borderRadius: 3, background: 'rgba(91,78,248,' + a + ')', display: 'inline-block' }} />
                    })}
                    mais alunos
                  </div>
                </div>
              </div>

              {/* Total por dia da semana */}
              <div style={{ marginTop: 18 }}>
                {dayTotals.map(function(t, d) {
                  return (
                    <div key={d} title={DIAS_LONGO[d] + ': ' + t + ' acessos'} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, fontSize: 12 }}>
                      <div style={{ width: 36, color: 'var(--muted2)' }}>{DIAS[d]}</div>
                      <div style={{ flex: 1, background: 'var(--surface2)', borderRadius: 4, height: 10, overflow: 'hidden' }}>
                        <div style={{ width: Math.round((t / dayMax) * 100) + '%', height: '100%', background: d === bestDay ? '#5b4ef8' : 'rgba(91,78,248,0.45)', borderRadius: 4 }} />
                      </div>
                      <div style={{ width: 44, textAlign: 'right', color: 'var(--text)', fontWeight: 600 }}>{t}</div>
                    </div>
                  )
                })}
                <div style={{ fontSize: 11, color: 'var(--muted2)', marginTop: 4 }}>Acessos por dia da semana: cada aluno conta 1 vez por hora em que esteve na plataforma.</div>
              </div>
            </div>
          )}
        </div>

        {/* Reembolsos */}
        <div className={styles.stat} style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ minWidth: 150 }}>
              <div className={styles.statLabel}><i className="ti ti-receipt-refund" /> Reembolsos</div>
              <div className={styles.statValue} style={{ color: refunded.length > 0 ? 'var(--red)' : 'var(--text)' }}>{refunded.length}</div>
              <div className={styles.statUp} style={{ color: 'var(--muted2)' }}>acessos encerrados por reembolso</div>
            </div>
            <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap', fontSize: 13, color: 'var(--muted2)' }}>
              <div><b style={{ color: 'var(--text)', fontSize: 18 }}>{refunded7}</b><br />Últimos 7 dias</div>
              <div><b style={{ color: 'var(--text)', fontSize: 18 }}>{refunded30}</b><br />Últimos 30 dias</div>
            </div>
            <a href="/dashboard/admin/pagamentos" style={{ marginLeft: 'auto', padding: '8px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
              Ver pagamentos
            </a>
          </div>
          {refunded.length > 0 && (
            <div style={{ marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
              {refunded.slice(0, 5).map(function(p: any) {
                return (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '6px 0', fontSize: 13 }}>
                    <span style={{ color: 'var(--text)', fontWeight: 600 }}>{p.full_name || 'Sem nome'} <span style={{ color: 'var(--muted2)', fontWeight: 400 }}>· {p.email}</span></span>
                    <span style={{ color: 'var(--muted2)', whiteSpace: 'nowrap' }}>{formatDate(p.refunded_at)}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Instalacoes do app */}
        <div className={styles.stat} style={{ marginBottom: 28, display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 150 }}>
            <div className={styles.statLabel}><i className="ti ti-device-mobile" /> Instalaram o app</div>
            <div className={styles.statValue} style={{ color: 'var(--accent)' }}>{installs ? installs.total : 0}</div>
            <div className={styles.statUp} style={{ color: 'var(--muted2)' }}>
              {installs ? installs.hoje : 0} hoje · {installs ? installs.ultimos7 : 0} nos ultimos 7 dias
            </div>
          </div>
          <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap', fontSize: 13, color: 'var(--muted2)' }}>
            <div><b style={{ color: 'var(--text)', fontSize: 18 }}>{installs ? installs.android : 0}</b><br />Android</div>
            <div><b style={{ color: 'var(--text)', fontSize: 18 }}>{installs ? installs.ios : 0}</b><br />iPhone</div>
            <div><b style={{ color: 'var(--text)', fontSize: 18 }}>{installs ? installs.computador : 0}</b><br />Computador</div>
            <div><b style={{ color: 'var(--text)', fontSize: 18 }}>{installs ? installs.ativos7 : 0}</b><br />Abriram o app (7 dias)</div>
            <div><b style={{ color: 'var(--accent)', fontSize: 18 }}>{pushPeople}</b><br />Ativaram notificações</div>
          </div>
        </div>

        {/* E-mails abertos */}
        <div className={styles.stat} style={{ marginBottom: 28, display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 150 }}>
            <div className={styles.statLabel}><i className="ti ti-mail-opened" /> E-mails abertos</div>
            <div className={styles.statValue} style={{ color: 'var(--accent)' }}>{emailStats ? emailStats.pessoas : 0}</div>
            <div className={styles.statUp} style={{ color: 'var(--muted2)' }}>
              {emailStats && emailStats.enviados > 0 ? Math.round((emailStats.pessoas / emailStats.enviados) * 100) : 0}% de {emailStats ? emailStats.enviados : 0} enviados · {emailStats ? emailStats.hoje : 0} hoje
            </div>
          </div>
          <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap', fontSize: 13, color: 'var(--muted2)' }}>
            <div><b style={{ color: 'var(--text)', fontSize: 18 }}>{emailStats && emailStats.ultimo ? emailStats.ultimo.abertos + ' de ' + emailStats.ultimo.enviados : '0'}</b><br />Último envio{emailStats && emailStats.ultimo ? ': ' + emailStats.ultimo.assunto : ''}</div>
            <div><b style={{ color: 'var(--text)', fontSize: 18 }}>{emailStats ? emailStats.abertos : 0}</b><br />Aberturas (todos os envios)</div>
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
              {filtered.slice(0, visible).map(function(p) {
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
          {filtered.length > visible && (
            <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, color: 'var(--muted2)' }}>Mostrando {Math.min(visible, filtered.length)} de {filtered.length}</span>
              <button
                onClick={function() { setVisible(visible + PAGE_STEP) }}
                style={{ padding: '9px 18px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
              >
                Ver mais
              </button>
              <button
                onClick={function() { setVisible(filtered.length) }}
                style={{ padding: '9px 12px', borderRadius: 10, border: 'none', background: 'none', color: 'var(--muted2)', fontSize: 13, cursor: 'pointer' }}
              >
                Ver todos
              </button>
            </div>
          )}
          {filtered.length > 0 && filtered.length <= visible && filtered.length > PAGE_STEP && (
            <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', textAlign: 'center', fontSize: 13, color: 'var(--muted2)' }}>
              Mostrando todos os {filtered.length}
              <button onClick={function() { setVisible(PAGE_STEP) }} style={{ marginLeft: 12, border: 'none', background: 'none', color: 'var(--accent)', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>Mostrar menos</button>
            </div>
          )}
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
