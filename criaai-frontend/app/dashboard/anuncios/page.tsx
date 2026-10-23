'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { calcular, relatorioDoFunil } from '@/lib/anuncios'
import Funil from '@/components/anuncios/Funil'
import ResumoFinanceiro from '@/components/anuncios/ResumoFinanceiro'
import AnalisandoMetricas from '@/components/metricas/AnalisandoMetricas'
import CampanhasTabela from '@/components/anuncios/CampanhasTabela'
import CriativosAnuncios from '@/components/anuncios/CriativosAnuncios'
import { orcamentoDiario } from '@/components/anuncios/CampanhaCard'
import { cartao, titulo, moeda } from '@/components/anuncios/estilo'
import { podeUsarAnuncios } from '@/lib/acessoAnuncios'

const PERIODOS: [string, string][] = [['today', 'Hoje'], ['yesterday', 'Ontem'], ['last_7d', 'Últimos 7 dias'], ['last_14d', 'Últimos 14 dias'], ['last_30d', 'Últimos 30 dias'], ['this_month', 'Este mês']]

export default function AnunciosPage() {
  const [permitido, setPermitido] = useState<boolean | null>(null)
  const [ehAdmin, setEhAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [connection, setConnection] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [disconnecting, setDisconnecting] = useState(false)
  const [switching, setSwitching] = useState(false)

  const [periodo, setPeriodo] = useState('last_7d')
  const [campaignsLoading, setCampaignsLoading] = useState(false)
  const [campaignsData, setCampaignsData] = useState<any>(null)
  const [campaignsError, setCampaignsError] = useState<string | null>(null)
  const [selecionada, setSelecionada] = useState('todas')
  const [filtroCamp, setFiltroCamp] = useState<'ativas' | 'desativadas'>('ativas')
  const [verTodas, setVerTodas] = useState(false)
  const [ocupadoId, setOcupadoId] = useState<string | null>(null)
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)

  const [criativos, setCriativos] = useState<any[] | null>(null)
  const [criativosLoading, setCriativosLoading] = useState(false)
  const [criativosErro, setCriativosErro] = useState<string | null>(null)

  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(function() {
    const params = new URLSearchParams(window.location.search)
    if (params.get('error')) setError(params.get('error'))
    if (params.get('connected')) window.history.replaceState({}, '', '/dashboard/anuncios')
    // Liberado para os alunos; os cards de faturamento/lucro da plataforma continuam so para o admin
    supabase.auth.getUser().then(async function(r) {
      const uid = r.data.user ? r.data.user.id : null
      if (!uid) { setPermitido(false); return }
      const p = await supabase.from('profiles').select('is_admin, email').eq('id', uid).maybeSingle()
      const admin = !!(p.data && (p.data as any).is_admin)
      setEhAdmin(admin)
      const email = (p.data && (p.data as any).email) || (r.data.user ? r.data.user.email : null)
      if (!podeUsarAnuncios(admin, email)) { setPermitido(false); return }
      setPermitido(true)
      loadConnection()
    })
  }, [])

  async function loadConnection() {
    setLoading(true)
    try {
      const res = await fetch('/api/facebook/ad-accounts')
      const data = await res.json()
      setConnection(data)
      if (data.connected && data.adAccountId) { loadCampaigns(periodo); loadCriativos(periodo) }
    } catch (err) {
      setError('Erro ao carregar conexao')
    } finally {
      setLoading(false)
    }
  }

  async function loadCampaigns(p?: string, silencioso?: boolean) {
    const per = p || periodo
    // Mostra na hora o que foi carregado da ultima vez e atualiza por tras
    let temCache = false
    if (!silencioso) {
      try { const g = localStorage.getItem('anuncios_camp_' + per); if (g) { setCampaignsData(JSON.parse(g)); temCache = true } } catch (e) {}
    }
    if (!silencioso && !temCache) { setCampaignsLoading(true); setAnalysis(null) }
    setCampaignsError(null)
    try {
      const res = await fetch('/api/facebook/campaigns?datePreset=' + per, { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) setCampaignsError(data.error || 'Erro ao carregar campanhas')
      else { setCampaignsData(data); try { localStorage.setItem('anuncios_camp_' + per, JSON.stringify(data)) } catch (e) {} }
    } catch (err) {
      setCampaignsError('Erro ao carregar campanhas')
    } finally {
      setCampaignsLoading(false)
    }
  }

  async function loadCriativos(p?: string) {
    const per = p || periodo
    let temCache = false
    try { const g = localStorage.getItem('anuncios_criativos_' + per); if (g) { setCriativos(JSON.parse(g)); temCache = true } } catch (e) {}
    if (!temCache) setCriativosLoading(true)
    setCriativosErro(null)
    try {
      const res = await fetch('/api/facebook/criativos?datePreset=' + per, { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) setCriativosErro(data.error || 'Erro ao carregar criativos')
      else { setCriativos(data.criativos || []); try { localStorage.setItem('anuncios_criativos_' + per, JSON.stringify(data.criativos || [])) } catch (e) {} }
    } catch (err) {
      setCriativosErro('Erro ao carregar criativos')
    } finally { setCriativosLoading(false) }
  }

  function limparCache() {
    try { Object.keys(localStorage).forEach(function(k) { if (k.indexOf('anuncios_camp_') === 0 || k.indexOf('anuncios_criativos_') === 0) localStorage.removeItem(k) }) } catch (e) {}
  }

  async function selectAccount(accountId: string) {
    setSwitching(true); limparCache(); setCampaignsData(null); setCriativos(null)
    try {
      await fetch('/api/facebook/select-account', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accountId }) })
      setSelecionada('todas')
      await loadConnection()
    } finally { setSwitching(false) }
  }

  async function disconnect() {
    setDisconnecting(true); limparCache()
    try {
      await fetch('/api/facebook/ad-accounts', { method: 'DELETE' })
      await loadConnection()
      setCampaignsData(null)
    } finally { setDisconnecting(false) }
  }

  async function alternar(c: any) {
    const novo = c.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
    if (novo === 'PAUSED' && !window.confirm('Pausar a campanha "' + c.name + '"?')) return
    setOcupadoId(c.id); setAviso(null)
    try {
      const res = await fetch('/api/facebook/campaigns/toggle', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ campaignId: c.id, status: novo }) })
      const data = await res.json().catch(function() { return {} })
      if (!res.ok) setAviso({ tipo: 'erro', texto: data.error || 'Nao foi possivel alterar a campanha.' })
      else { setAviso({ tipo: 'ok', texto: novo === 'ACTIVE' ? 'Campanha ativada.' : 'Campanha pausada.' }); await loadCampaigns(undefined, true) }
    } finally { setOcupadoId(null) }
  }

  async function mudarOrcamento(c: any, pct: number) {
    const atual = orcamentoDiario(c) || 0
    const novo = atual * (1 + pct / 100)
    const m = calcular(c.insights)
    // Aplica na hora. So pergunta quando a campanha esta gastando mais do que vende e o aluno vai aumentar.
    if (pct > 0 && m.gasto >= 50 && m.roas !== null && m.roas < 1) {
      const texto = 'Esta campanha está gastando mais do que vende. Aumentar o orçamento de ' + moeda(atual) + ' para ' + moeda(novo) + ' por dia mesmo assim?'
      if (!window.confirm(texto)) return
    }
    setOcupadoId(c.id); setAviso(null)
    try {
      const res = await fetch('/api/facebook/campaigns/budget', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ campaignId: c.id, percent: pct }) })
      const data = await res.json().catch(function() { return {} })
      if (!res.ok) setAviso({ tipo: 'erro', texto: data.error || 'Nao foi possivel mudar o orçamento.' })
      else { setAviso({ tipo: 'ok', texto: 'Orçamento de "' + c.name + '" atualizado para ' + moeda(data.novoOrcamento) + ' por dia.' }); await loadCampaigns(undefined, true) }
    } finally { setOcupadoId(null) }
  }

  async function analyzeMetrics() {
    setAnalyzing(true); setAnalysis(null)
    try {
      const res = await fetch('/api/facebook/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accountInsights: (camp ? camp.insights : ativas.length ? somaAtivas : campaignsData?.accountInsights), campaigns: camp ? [camp] : (ativas.length ? ativas : (campaignsData?.campaigns || [])) }) })
      const data = await res.json()
      setAnalysis(res.ok ? data.analysis : 'Erro ao analisar: ' + (data.error || 'tente novamente'))
    } finally { setAnalyzing(false) }
  }

  const todas: any[] = campaignsData?.campaigns || []
  const todasOrdenadas = todas.slice().sort(function(a, b) { return (b.status === 'ACTIVE' ? 1 : 0) - (a.status === 'ACTIVE' ? 1 : 0) || Number(b.insights?.spend || 0) - Number(a.insights?.spend || 0) })
  const comDados = todasOrdenadas.filter(function(c) { return c.status === 'ACTIVE' || Number(c.insights?.spend || 0) > 0 })
  const ativas = todasOrdenadas.filter(function(c) { return c.status === 'ACTIVE' })
  const desativadas = todasOrdenadas.filter(function(c) { return c.status !== 'ACTIVE' })
  const listaCamp = filtroCamp === 'ativas' ? ativas : desativadas
  const mostradas = verTodas ? listaCamp : listaCamp.slice(0, 3)
  const camp = selecionada === 'todas' ? null : todas.find(function(c) { return c.id === selecionada }) || null
  // "Todas" = soma das campanhas ATIVAS (as mesmas da tabela), para o funil bater com os numeros das campanhas
  const somaAtivas = ativas.reduce(function(t: any, c: any) {
    const i = c.insights || {}
    ;['spend', 'impressions', 'reach', 'clicks', 'inlineLinkClicks', 'landingPageViews', 'initiateCheckout', 'purchaseCount', 'purchaseValue'].forEach(function(k) { t[k] += Number(i[k] || 0) })
    return t
  }, { spend: 0, impressions: 0, reach: 0, clicks: 0, inlineLinkClicks: 0, landingPageViews: 0, initiateCheckout: 0, purchaseCount: 0, purchaseValue: 0, frequency: 0 })
  const mFunil = calcular(camp ? camp.insights : ativas.length ? somaAtivas : campaignsData?.accountInsights)
  const relatorio = relatorioDoFunil(mFunil)
  const nomeFunil = camp ? camp.name : ativas.length ? (ativas.length === 1 ? ativas[0].name : 'Todas as campanhas ativas (' + ativas.length + ')') : 'Todas as campanhas da conta'

  const sel: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 10, padding: '9px 12px', color: 'var(--text)', fontSize: 13, fontWeight: 600, maxWidth: '100%' }

  if (permitido === null) return <div style={{ padding: 32, color: 'var(--muted2)' }}>Carregando...</div>
  if (!permitido) return <div style={{ padding: 32, color: 'var(--muted2)' }}>Este recurso está em atualização no momento.</div>

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', padding: '28px 20px 60px' }}>
      <div style={{ maxWidth: 980, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 28 }}>📊</div>
            <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 24, fontWeight: 800, margin: 0 }}>Gerenciador de Anúncios</h1>
          </div>
          <p style={{ fontSize: 14, color: 'var(--muted2)', margin: '6px 0 0' }}>Veja onde seu funil está falhando e otimize suas campanhas sem sair daqui. Só a criação da campanha é feita no Gerenciador do Facebook.</p>
        </div>

        {error && <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#ef4444' }}>Erro ao conectar: {error}</div>}

        {loading ? (
          <p style={{ color: 'var(--muted2)' }}>Carregando...</p>
        ) : !connection?.connected ? (
          <div style={{ ...cartao, padding: 32, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔗</div>
            <p style={{ fontSize: 14, color: 'var(--muted2)', marginBottom: 20 }}>Conecte seu Facebook para ver o funil e as métricas das suas campanhas.</p>
            <a href="/api/facebook/connect" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#1877f2', color: '#fff', fontWeight: 700, fontSize: 14, padding: '12px 24px', borderRadius: 10, textDecoration: 'none' }}>
              <i className="ti ti-brand-facebook" style={{ fontSize: 18 }} /> Conectar com Facebook
            </a>
          </div>
        ) : (
          <>
            <div style={{ ...cartao, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#1877f2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className="ti ti-brand-facebook" style={{ color: '#fff', fontSize: 18 }} />
              </div>
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{connection.fbUserName}</div>
                <div style={{ fontSize: 12, color: 'var(--muted2)', marginTop: 2 }}>{connection.adAccountName || 'Sem conta selecionada'}</div>
              </div>
              {connection.adAccounts && connection.adAccounts.length > 1 && (
                <select value={connection.adAccountId || ''} onChange={function(e) { selectAccount(e.target.value) }} disabled={switching} style={sel}>
                  {connection.adAccounts.map(function(acc: any) { return <option key={acc.id} value={acc.id}>{(acc.businessName ? acc.businessName + ' · ' : '') + acc.name}</option> })}
                </select>
              )}
              <button onClick={disconnect} disabled={disconnecting} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted2)', fontWeight: 600, fontSize: 12, padding: '8px 14px', borderRadius: 9, cursor: 'pointer' }}>{disconnecting ? 'Desconectando...' : 'Desconectar'}</button>
            </div>

            {!connection.adAccountId ? (
              <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#b45309' }}>Nenhuma conta de anúncios encontrada nesse login.</div>
            ) : (
              <>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  <select value={periodo} onChange={function(e) { setPeriodo(e.target.value); loadCampaigns(e.target.value); loadCriativos(e.target.value) }} style={sel}>
                    {PERIODOS.map(function(p) { return <option key={p[0]} value={p[0]}>{p[1]}</option> })}
                  </select>
                  <select value={selecionada} onChange={function(e) { setSelecionada(e.target.value) }} style={sel}>
                    <option value="todas">{ativas.length ? 'Funil de: todas as campanhas ativas' : 'Funil de: todas as campanhas'}</option>
                    {comDados.map(function(c) { return <option key={c.id} value={c.id}>{'Funil de: ' + c.name}</option> })}
                  </select>
                  <button onClick={function() { loadCampaigns(); loadCriativos() }} disabled={campaignsLoading} style={{ ...sel, cursor: 'pointer' }}>{campaignsLoading ? 'Atualizando...' : '🔄 Atualizar'}</button>
                </div>

                {campaignsError && <div style={{ fontSize: 13, color: '#b91c1c', background: 'rgba(239,68,68,0.08)', borderRadius: 9, padding: '12px 16px' }}>{campaignsError}</div>}
                {aviso && <div style={{ fontSize: 13, fontWeight: 700, borderRadius: 9, padding: '10px 14px', color: aviso.tipo === 'ok' ? '#15803d' : '#b91c1c', background: aviso.tipo === 'ok' ? 'rgba(22,163,74,0.10)' : 'rgba(239,68,68,0.08)' }}>{aviso.texto}</div>}

                {campaignsData && !campaignsLoading && (
                  <>
                    {ehAdmin && <ResumoFinanceiro periodo={periodo} />}

                    <Funil m={mFunil} relatorio={relatorio} nomeCampanha={nomeFunil} />

                    <div>
                      <button onClick={analyzeMetrics} disabled={analyzing} style={{ background: 'var(--surface)', border: '1px solid var(--border2)', color: 'var(--text)', fontWeight: 700, fontSize: 13, padding: '10px 18px', borderRadius: 10, cursor: 'pointer' }}>
                        ✨ {analyzing ? 'Analisando com IA...' : 'Pedir uma análise com IA'}
                      </button>
                      {analysis && <div style={{ ...cartao, marginTop: 12, fontSize: 13.5, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{analysis}</div>}
                    </div>

                    <div>
                      <h2 style={{ ...titulo, marginBottom: 4 }}>🚀 Suas campanhas</h2>
                      <div style={{ fontSize: 13, color: 'var(--muted2)', marginBottom: 12 }}>O selo diz o que fazer com cada campanha. Os pontinhos coloridos mostram se o número está bom, em atenção ou ruim. Toque no nome da campanha para ver as dicas e o que cada número significa.</div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                        {([['ativas', 'Campanhas ativas', ativas.length], ['desativadas', 'Campanhas desativadas', desativadas.length]] as ['ativas' | 'desativadas', string, number][]).map(function(ch) {
                          const ativo = filtroCamp === ch[0]
                          return (
                            <button key={ch[0]} onClick={function() { setFiltroCamp(ch[0]); setVerTodas(false) }} style={{ cursor: 'pointer', fontSize: 12.5, fontWeight: 700, padding: '7px 14px', borderRadius: 999, border: '1px solid ' + (ativo ? 'var(--text)' : 'var(--border2)'), background: ativo ? 'var(--text)' : 'var(--surface)', color: ativo ? 'var(--bg)' : 'var(--text)' }}>
                              {ch[1]} · {ch[2]}
                            </button>
                          )
                        })}
                      </div>
                      {!listaCamp.length ? (
                        <p style={{ color: 'var(--muted2)', fontSize: 13 }}>{filtroCamp === 'ativas' ? 'Nenhuma campanha ativa no momento.' : 'Nenhuma campanha desativada.'}</p>
                      ) : (
                        <>
                          <CampanhasTabela campanhas={mostradas} ocupadoId={ocupadoId} selecionadaId={selecionada}
                            onAlternar={function(c) { alternar(c) }} onOrcamento={function(c, p) { mudarOrcamento(c, p) }}
                            onVerFunil={function(c) { setSelecionada(c.id); window.scrollTo({ top: 0, behavior: 'smooth' }) }} />
                          {listaCamp.length > 3 && (
                            <div style={{ textAlign: 'center', marginTop: 12 }}>
                              <button onClick={function() { setVerTodas(!verTodas) }} style={{ cursor: 'pointer', fontSize: 13, fontWeight: 700, padding: '9px 20px', borderRadius: 10, border: '1px solid var(--border2)', background: 'var(--surface)', color: 'var(--text)' }}>
                                {verTodas ? 'Ver menos' : 'Ver mais (' + (listaCamp.length - 3) + ')'}
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    <CriativosAnuncios criativos={criativos} carregando={criativosLoading} erro={criativosErro} />

                    <AnalisandoMetricas embutido />
                  </>
                )}
                {campaignsLoading && <p style={{ color: 'var(--muted2)', fontSize: 13 }}>Carregando campanhas...</p>}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
