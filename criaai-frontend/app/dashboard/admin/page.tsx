'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import styles from './admin.module.css'
import BillingCard from '@/components/admin/BillingCard'
import SalesMonthsCard from '@/components/admin/SalesMonthsCard'
import ReferralPayoutsCard from '@/components/admin/ReferralPayoutsCard'
import HublaPanel from '@/components/admin/HublaPanel'

export default function AdminPage() {
  const [profiles, setProfiles] = useState<any[]>([])
  const [stats, setStats] = useState({ receita: 0, custo: 0, alunos: 0, videos: 0, pagantes: 0, hoje: 0 })
  const [installs, setInstalls] = useState<any>(null)
  const [emailStats, setEmailStats] = useState<any>(null)
  const [presence, setPresence] = useState<any>(null)
  const [showOnline, setShowOnline] = useState(false)
  const [heat, setHeat] = useState<any>(null)
  const [popup, setPopup] = useState<any>(null)
  const [pushPeople, setPushPeople] = useState(0)
  const [pushHoje, setPushHoje] = useState(0)
  const [expCliques, setExpCliques] = useState<any>(null)
  const [billing, setBilling] = useState<any>(null)
  const PAGE_FIRST = 5
  const PAGE_STEP = 10
  const [visible, setVisible] = useState(PAGE_FIRST)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('todos')
  const [search, setSearch] = useState('')
  const supabase = createClient()
  const router = useRouter()

  // Pagante = assinatura ativa, com plano da plataforma, e que nao e conta admin (mesma regra do card Assinaturas)
  function isPayer(p: any) {
    return p.subscription_status === 'active' && !!p.plan_id && !p.is_admin
  }

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
        const pagantes = allProfiles.filter(isPayer)
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
        const ids: Record<string, string> = {}
        let pFrom = 0
        while (true) {
          const pr = await supabase.from('push_subscriptions').select('user_id, created_at').order('id', { ascending: true }).range(pFrom, pFrom + 999)
          if (pr.error) break
          const rows = pr.data || []
          // guarda a data da primeira ativacao de cada pessoa
          rows.forEach(function(r: any) { if (!ids[r.user_id] || (r.created_at && r.created_at < ids[r.user_id])) ids[r.user_id] = r.created_at || '' })
          if (rows.length < 1000) break
          pFrom += 1000
        }
        setPushPeople(Object.keys(ids).length)
        // Ativaram hoje = primeira ativacao depois da meia-noite de Brasilia
        const br = new Date(Date.now() - 3 * 3600 * 1000)
        const inicioHoje = Date.UTC(br.getUTCFullYear(), br.getUTCMonth(), br.getUTCDate(), 3)
        setPushHoje(Object.keys(ids).filter(function(k) { return ids[k] && new Date(ids[k]).getTime() >= inicioHoje }).length)
      } catch (e) {}
      // Estrutura Express: quem viu a tela de venda e quem clicou no botao de compra
      try {
        const ec = await fetch('/api/estrutura/clique', { cache: 'no-store' })
        if (ec.ok) setExpCliques(await ec.json())
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

  // Estatisticas do pop-up do cupom. Se o arquivo Y1 ainda nao foi rodado, o card mostra zero.
  useEffect(function() {
    async function loadPopup() {
      try {
        const r = await supabase.rpc('popup_stats')
        if (!r.error && r.data) setPopup(r.data)
      } catch (e) {}
    }
    loadPopup()
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

  // Assinaturas ativas e proximas cobrancas. Se a tabela/funcao ainda nao existir, o card mostra zero.
  useEffect(function() {
    async function loadBilling() {
      try {
        const r = await supabase.rpc('billing_stats')
        if (!r.error && r.data) setBilling(r.data)
      } catch (e) {}
    }
    loadBilling()
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
  const hourMax = Math.max(1, ...hourTotals)
  const allTotal = Math.max(1, hourTotals.reduce(function(a, b) { return a + b }, 0))
  const periods = [
    { nome: 'Madrugada', faixa: '0h às 5h', de: 0, ate: 5 },
    { nome: 'Manhã', faixa: '6h às 11h', de: 6, ate: 11 },
    { nome: 'Tarde', faixa: '12h às 17h', de: 12, ate: 17 },
    { nome: 'Noite', faixa: '18h às 23h', de: 18, ate: 23 },
  ].map(function(pe) {
    let sum = 0
    for (let h = pe.de; h <= pe.ate; h++) sum += hourTotals[h]
    return { nome: pe.nome, faixa: pe.faixa, sum: sum, pct: Math.round((sum / allTotal) * 100) }
  })
  const bestPeriod = periods.map(function(pe) { return pe.sum }).indexOf(Math.max(...periods.map(function(pe) { return pe.sum })))

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
      '/dashboard/suporte': 'WhatsApp de Suporte', '/dashboard/aulas': 'Aulas ao Vivo', '/dashboard/planos': 'Planos', '/dashboard/creditos': 'Créditos',
    }
    return map[path] || path.replace('/dashboard/', '')
  }

  function agoLabel(iso: string) {
    const secs = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000))
    if (secs < 60) return 'agora'
    return 'há ' + Math.round(secs / 60) + ' min'
  }

  // Ao trocar o filtro ou a busca, volta a mostrar so os primeiros
  useEffect(function() { setVisible(PAGE_FIRST) }, [filter, search])

  const filtered = profiles.filter(function(p) {
    if (search.trim()) {
      const q = search.toLowerCase()
      const matchesSearch = (p.full_name || '').toLowerCase().includes(q) || (p.email || '').toLowerCase().includes(q)
      if (!matchesSearch) return false
    }
    if (filter === 'pagantes') return isPayer(p)
    if (filter === 'hoje') return isToday(p.created_at)
    if (filter === 'sempagar') return !isPayer(p) && !p.is_admin && p.subscription_status !== 'trialing'
    return true
  }).sort(function(a: any, b: any) {
    // Quem tem foto de perfil aparece primeiro (dentro de cada grupo continua do mais novo para o mais antigo)
    return (b.avatar_url ? 1 : 0) - (a.avatar_url ? 1 : 0)
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
            <div><b style={{ color: 'var(--accent)', fontSize: 18 }}>{pushPeople}</b><br />Ativaram notificações<br /><span style={{ fontSize: 12 }}>{pushHoje} hoje</span></div>
          </div>
        </div>

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
              <div><b style={{ color: 'var(--text)', fontSize: 18 }}>{presence && presence.ontem !== undefined ? presence.ontem : 0}</b><br />Entraram ontem</div>
              <div><b style={{ color: 'var(--text)', fontSize: 18 }}>{presence && presence.ultimos7 !== undefined ? presence.ultimos7 : 0}</b><br />Entraram nos últimos 7 dias</div>
              <div><b style={{ color: 'var(--text)', fontSize: 18 }}>{presence && presence.mes !== undefined ? presence.mes : 0}</b><br />Entraram neste mês</div>
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

        {/* Assinaturas ativas, recebido e proximas cobrancas */}
        <BillingCard data={billing} />

        {/* Melhores meses de vendas (Mentoria + Estrutura Express), atualiza com os avisos da Hubla e da Cakto */}
        <SalesMonthsCard />
        <ReferralPayoutsCard />

        {/* Dias e horarios de maior acesso */}
        <div className={styles.stat} style={{ marginBottom: 28 }}>
          <div className={styles.statLabel}><i className="ti ti-chart-bar" /> Quando os alunos mais acessam</div>
          {!heatHasData ? (
            <div style={{ fontSize: 13, color: 'var(--muted2)', marginTop: 10, lineHeight: 1.6 }}>
              Ainda sem dados. O gráfico começa a se formar a partir de hoje, conforme os alunos usam a plataforma.
            </div>
          ) : (
            <div>
              {/* Resposta direta */}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', margin: '12px 0 20px' }}>
                <div style={{ flex: '1 1 160px', background: 'rgba(91,78,248,0.08)', border: '1px solid rgba(91,78,248,0.25)', borderRadius: 12, padding: '12px 14px' }}>
                  <div style={{ fontSize: 11, color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '.05em', fontWeight: 700 }}>Melhor dia</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', textTransform: 'capitalize' }}>{DIAS_LONGO[bestDay]}</div>
                </div>
                <div style={{ flex: '1 1 160px', background: 'rgba(91,78,248,0.08)', border: '1px solid rgba(91,78,248,0.25)', borderRadius: 12, padding: '12px 14px' }}>
                  <div style={{ fontSize: 11, color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '.05em', fontWeight: 700 }}>Melhor horário</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>{bestHour}h às {(bestHour + 1) % 24}h</div>
                </div>
              </div>

              {/* Por periodo do dia */}
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted2)', marginBottom: 8 }}>Por período do dia</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 22 }}>
                {periods.map(function(pe, i) {
                  const isBest = i === bestPeriod
                  return (
                    <div key={pe.nome} style={{ borderRadius: 12, padding: '10px 6px', textAlign: 'center', background: isBest ? '#5b4ef8' : 'var(--surface2)', color: isBest ? '#fff' : 'var(--text)' }}>
                      <div style={{ fontSize: 20, fontWeight: 800 }}>{pe.pct}%</div>
                      <div style={{ fontSize: 12, fontWeight: 700 }}>{pe.nome}</div>
                      <div style={{ fontSize: 10, opacity: 0.75 }}>{pe.faixa}</div>
                    </div>
                  )
                })}
              </div>

              {/* Por dia da semana */}
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted2)', marginBottom: 8 }}>Por dia da semana</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 130, marginBottom: 6 }}>
                {dayTotals.map(function(t, d) {
                  const isBest = d === bestDay
                  return (
                    <div key={d} title={DIAS_LONGO[d] + ': ' + t + ' acessos'} style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: isBest ? '#5b4ef8' : 'var(--muted2)', marginBottom: 3 }}>{t}</div>
                      <div style={{ width: '100%', maxWidth: 44, height: Math.max(4, Math.round((t / dayMax) * 100)) + '%', background: isBest ? '#5b4ef8' : 'rgba(91,78,248,0.3)', borderRadius: '6px 6px 0 0' }} />
                    </div>
                  )
                })}
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 22 }}>
                {DIAS.map(function(nome, d) {
                  return <div key={d} style={{ flex: 1, textAlign: 'center', fontSize: 12, fontWeight: d === bestDay ? 800 : 500, color: d === bestDay ? 'var(--text)' : 'var(--muted2)' }}>{nome}</div>
                })}
              </div>

              {/* Por hora */}
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted2)', marginBottom: 8 }}>Por hora do dia</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 110, marginBottom: 6 }}>
                {hourTotals.map(function(t, h) {
                  const isBest = h === bestHour
                  return (
                    <div key={h} title={h + 'h: ' + t + ' acessos'} style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center' }}>
                      {isBest && <div style={{ fontSize: 10, fontWeight: 700, color: '#5b4ef8', marginBottom: 2 }}>{t}</div>}
                      <div style={{ width: '100%', height: Math.max(3, Math.round((t / hourMax) * 100)) + '%', background: isBest ? '#5b4ef8' : 'rgba(91,78,248,0.3)', borderRadius: '3px 3px 0 0' }} />
                    </div>
                  )
                })}
              </div>
              <div style={{ display: 'flex', gap: 2 }}>
                {hourTotals.map(function(_, h) {
                  return <div key={h} style={{ flex: 1, textAlign: 'center', fontSize: 9, color: 'var(--muted2)' }}>{h % 3 === 0 ? h + 'h' : ''}</div>
                })}
              </div>

              <div style={{ fontSize: 11, color: 'var(--muted2)', marginTop: 14, lineHeight: 1.5 }}>
                Últimos 30 dias, horário de Brasília. Cada aluno conta 1 acesso por hora em que esteve na plataforma. Passe o dedo ou o mouse nas barras para ver o número.
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
            <a href="#pagamentos" style={{ marginLeft: 'auto', padding: '8px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
              Ver avisos da Hubla
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

        {/* Estrutura Express: cliques no link de compra */}
        <div className={styles.stat} style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ minWidth: 150 }}>
              <div className={styles.statLabel}><i className="ti ti-bolt" /> Estrutura Express: cliques na compra</div>
              <div className={styles.statValue} style={{ color: '#f97316' }}>{expCliques ? expCliques.resumo.pessoasClicaram : 0}</div>
              <div className={styles.statUp} style={{ color: 'var(--muted2)' }}>pessoas clicaram no link de compra</div>
            </div>
            <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap', fontSize: 13, color: 'var(--muted2)' }}>
              <div><b style={{ color: 'var(--text)', fontSize: 18 }}>{expCliques ? expCliques.resumo.cliquesHoje : 0}</b><br />Cliques hoje</div>
              <div><b style={{ color: 'var(--text)', fontSize: 18 }}>{expCliques ? expCliques.resumo.cliques7 : 0}</b><br />Cliques (7 dias)</div>
              <div><b style={{ color: 'var(--text)', fontSize: 18 }}>{expCliques ? expCliques.resumo.totalCliques : 0}</b><br />Cliques no total</div>
              <div><b style={{ color: 'var(--text)', fontSize: 18 }}>{expCliques ? expCliques.resumo.pessoasViram : 0}</b><br />Viram a tela de venda</div>
              <div><b style={{ color: '#16a34a', fontSize: 18 }}>{expCliques ? expCliques.resumo.compraram : 0}</b><br />Compraram</div>
              <div><b style={{ color: '#16a34a', fontSize: 18 }}>{expCliques ? expCliques.resumo.vendasHoje : 0}</b><br />Vendas hoje</div>
              <div><b style={{ color: '#16a34a', fontSize: 18 }}>{expCliques ? expCliques.resumo.vendas7 : 0}</b><br />Vendas (7 dias)</div>
              <div><b style={{ color: 'var(--text)', fontSize: 18 }}>{expCliques && expCliques.resumo.pessoasClicaram > 0 ? Math.round(expCliques.resumo.compraramQueClicaram / expCliques.resumo.pessoasClicaram * 100) : 0}%</b><br />Clicaram e compraram</div>
            </div>
          </div>
          {expCliques && expCliques.pessoas && expCliques.pessoas.length > 0 ? (
            <div style={{ marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 10, maxHeight: 420, overflowY: 'auto' }}>
              {[
                { chave: 'comprou', titulo: '✅ Compraram', cor: '#16a34a', filtro: function(p: any) { return !!p.comprouEm } },
                { chave: 'liberado', titulo: '🔓 Liberados na mão (sem compra)', cor: '#2563eb', filtro: function(p: any) { return !p.comprouEm && p.liberado } },
                { chave: 'clicou', titulo: '🛒 Só clicaram', cor: '#f97316', filtro: function(p: any) { return !p.comprouEm && !p.liberado && p.cliques > 0 } },
                { chave: 'viu', titulo: '👀 Só viram a tela', cor: 'var(--muted2)', filtro: function(p: any) { return !p.comprouEm && !p.liberado && !(p.cliques > 0) } },
              ].map(function(g) {
                const grupo = expCliques.pessoas.filter(g.filtro)
                if (!grupo.length) return null
                return (
                  <div key={g.chave} style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 800, color: g.cor, marginBottom: 4 }}>{g.titulo} ({grupo.length})</div>
                    {grupo.map(function(p: any, i: number) {
                      const quando = g.chave === 'comprou' ? p.comprouEm : (p.ultimoClique || p.ultimaVisita)
                      return (
                        <div key={g.chave + (p.email || 'x') + i} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '6px 0', fontSize: 13, flexWrap: 'wrap' }}>
                          <span style={{ color: 'var(--text)', fontWeight: 600 }}>{p.nome || 'Sem nome'} <span style={{ color: 'var(--muted2)', fontWeight: 400 }}>· {p.email}{p.whatsapp ? ' · ' + p.whatsapp : ''}</span></span>
                          <span style={{ color: g.cor, whiteSpace: 'nowrap', fontWeight: g.chave === 'viu' ? 400 : 700 }}>
                            {g.chave === 'comprou' ? '💰 comprou' + (p.cliques > 0 ? ' · clicou' + (p.cliques > 1 ? ' ' + p.cliques + 'x' : '') : '') : g.chave === 'liberado' ? '🔓 liberado' : g.chave === 'clicou' ? '🛒 clicou' + (p.cliques > 1 ? ' ' + p.cliques + 'x' : '') : '👀 só viu a tela'} · {quando ? new Date(quando).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{ marginTop: 10, fontSize: 12, color: 'var(--muted2)' }}>
              A contagem começa a partir de agora. Os cliques feitos antes desta atualização não foram registrados.
            </div>
          )}
        </div>

        {/* Cupom FE10 */}
        <div className={styles.stat} style={{ marginBottom: 28, display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 150 }}>
            <div className={styles.statLabel}><i className="ti ti-ticket" /> Cupom FE10 (10% no Pro)</div>
            <div className={styles.statValue} style={{ color: 'var(--accent)' }}>{popup ? popup.pessoas : 0}</div>
            <div className={styles.statUp} style={{ color: 'var(--muted2)' }}>pessoas viram o pop-up{popup && popup.vezes > popup.pessoas ? ' (' + popup.vezes + ' vezes no total)' : ''}</div>
          </div>
          <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap', fontSize: 13, color: 'var(--muted2)' }}>
            <div><b style={{ color: 'var(--green)', fontSize: 18 }}>{popup ? popup.aceitaram : 0}</b><br />Aceitaram (foram ao checkout)</div>
            <div><b style={{ color: 'var(--red)', fontSize: 18 }}>{popup ? popup.recusaram : 0}</b><br />Recusaram (fecharam)</div>
            <div><b style={{ color: 'var(--text)', fontSize: 18 }}>{popup ? popup.copiaram : 0}</b><br />Copiaram o cupom</div>
          </div>
          {(!popup || !popup.pessoas) && (
            <div style={{ width: '100%', fontSize: 12, color: 'var(--muted2)' }}>
              A contagem começa a partir do momento em que esta atualização entrou no ar. Os pop-ups que já apareceram antes não foram registrados.
            </div>
          )}
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
                const isPaying = isPayer(p)
                const situacao =
                  p.is_admin ? { label: 'Administrador', color: 'var(--accent2)' } :
                  isPaying ? { label: 'Pagando', color: 'var(--green)' } :
                  p.subscription_status === 'trialing' ? { label: 'Teste gratis', color: 'var(--accent2)' } :
                  p.subscription_status === 'past_due' ? { label: 'Pagamento atrasado', color: 'var(--amber)' } :
                  p.subscription_status === 'canceled' ? { label: 'Cancelou', color: 'var(--muted)' } :
                  { label: 'Sem plano', color: 'var(--muted)' }

                return (
                  <tr key={p.id}>
                    <td>
                      <div className={styles.userCell}>
                        {p.avatar_url ? (
                          <a href={p.avatar_url} target="_blank" rel="noopener noreferrer" title="Ver a foto de perfil" style={{ flexShrink: 0, display: 'block', width: 38, height: 38 }}>
                            <img src={p.avatar_url} alt="" style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', display: 'block', border: '1px solid var(--border2)' }} />
                          </a>
                        ) : (
                          <div className={styles.avatar}>{(p.full_name || p.email || '?')[0].toUpperCase()}</div>
                        )}
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
          {filtered.length > 0 && filtered.length <= visible && filtered.length > PAGE_FIRST && (
            <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', textAlign: 'center', fontSize: 13, color: 'var(--muted2)' }}>
              Mostrando todos os {filtered.length}
              <button onClick={function() { setVisible(PAGE_FIRST) }} style={{ marginLeft: 12, border: 'none', background: 'none', color: 'var(--accent)', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>Mostrar menos</button>
            </div>
          )}
        </div>

        {/* Pagamentos (Hubla): reembolsos e ultimos avisos */}
        <HublaPanel />

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
