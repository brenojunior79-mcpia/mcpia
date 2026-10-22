'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { calcular, relatorioDoFunil } from '@/lib/anuncios'
import Funil from '@/components/anuncios/Funil'
import GuiaFunil from '@/components/anuncios/GuiaFunil'
import CampanhaCard, { orcamentoDiario } from '@/components/anuncios/CampanhaCard'
import { cartao, titulo, moeda } from '@/components/anuncios/estilo'

const PERIODOS: [string, string][] = [['today', 'Hoje'], ['yesterday', 'Ontem'], ['last_7d', 'Últimos 7 dias'], ['last_14d', 'Últimos 14 dias'], ['last_30d', 'Últimos 30 dias'], ['this_month', 'Este mês']]

export default function AnunciosPage() {
  const [permitido, setPermitido] = useState<boolean | null>(null)
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
  const [ocupadoId, setOcupadoId] = useState<string | null>(null)
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)
  const [mostrarSemDados, setMostrarSemDados] = useState(false)

  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(function() {
    const params = new URLSearchParams(window.location.search)
    if (params.get('error')) setError(params.get('error'))
    if (params.get('connected')) window.history.replaceState({}, '', '/dashboard/anuncios')
    // Por enquanto so o admin usa este menu
    supabase.auth.getUser().then(async function(r) {
      const uid = r.data.user ? r.data.user.id : null
      if (!uid) { setPermitido(false); return }
      const p = await supabase.from('profiles').select('is_admin').eq('id', uid).maybeSingle()
      const ok = !!(p.data && (p.data as any).is_admin)
      setPermitido(ok)
      if (ok) loadConnection()
    })
  }, [])

  async function loadConnection() {
    setLoading(true)
    try {
      const res = await fetch('/api/facebook/ad-accounts')
      const data = await res.json()
      setConnection(data)
      if (data.connected && data.adAccountId) loadCampaigns(periodo)
    } catch (err) {
      setError('Erro ao carregar conexao')
    } finally {
      setLoading(false)
    }
  }

  async function loadCampaigns(p?: string) {
    setCampaignsLoading(true)
    setCampaignsError(null)
    setAnalysis(null)
    try {
      const res = await fetch('/api/facebook/campaigns?datePreset=' + (p || periodo), { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) setCampaignsError(data.error || 'Erro ao carregar campanhas')
      else setCampaignsData(data)
    } catch (err) {
      setCampaignsError('Erro ao carregar campanhas')
    } finally {
      setCampaignsLoading(false)
    }
  }

  async function selectAccount(accountId: string) {
    setSwitching(true)
    try {
      await fetch('/api/facebook/select-account', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accountId }) })
      setSelecionada('todas')
      await loadConnection()
    } finally { setSwitching(false) }
  }

  async function disconnect() {
    setDisconnecting(true)
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
      else { setAviso({ tipo: 'ok', texto: novo === 'ACTIVE' ? 'Campanha ativada.' : 'Campanha pausada.' }); await loadCampaigns() }
    } finally { setOcupadoId(null) }
  }

  async function mudarOrcamento(c: any, pct: number) {
    const atual = orcamentoDiario(c) || 0
    const novo = atual * (1 + pct / 100)
    const m = calcular(c.insights)
    let texto = (pct > 0 ? 'Aumentar' : 'Reduzir') + ' o orçamento de ' + moeda(atual) + ' para ' + moeda(novo) + ' por dia?'
    if (pct > 0) texto += '\n\nDica: aumente no máximo 20% a cada 2 dias, para o Facebook não "se perder".'
    if (pct > 0 && m.roas !== null && m.roas < 1) texto += '\n\nAtenção: esta campanha está gastando mais do que vende.'
    if (!window.confirm(texto)) return
    setOcupadoId(c.id); setAviso(null)
    try {
      const res = await fetch('/api/facebook/campaigns/budget', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ campaignId: c.id, percent: pct }) })
      const data = await res.json().catch(function() { return {} })
      if (!res.ok) setAviso({ tipo: 'erro', texto: data.error || 'Nao foi possivel mudar o orçamento.' })
      else { setAviso({ tipo: 'ok', texto: 'Orçamento atualizado para ' + moeda(data.novoOrcamento) + ' por dia.' }); await loadCampaigns() }
    } finally { setOcupadoId(null) }
  }

  async function analyzeMetrics() {
    setAnalyzing(true); setAnalysis(null)
    try {
      const res = await fetch('/api/facebook/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accountInsights: campaignsData?.accountInsights, campaigns: campaignsData?.campaigns || [] }) })
      const data = await res.json()
      setAnalysis(res.ok ? data.analysis : 'Erro ao analisar: ' + (data.error || 'tente novamente'))
    } finally { setAnalyzing(false) }
  }

  const todas: any[] = campaignsData?.campaigns || []
  const comDados = todas.filter(function(c) { return c.status === 'ACTIVE' || Number(c.insights?.spend || 0) > 0 })
  const semDados = todas.filter(function(c) { return !(c.status === 'ACTIVE' || Number(c.insights?.spend || 0) > 0) })
  comDados.sort(function(a, b) { return (b.status === 'ACTIVE' ? 1 : 0) - (a.status === 'ACTIVE' ? 1 : 0) || Number(b.insights?.spend || 0) - Number(a.insights?.spend || 0) })
  const camp = selecionada === 'todas' ? null : todas.find(function(c) { return c.id === selecionada }) || null
  const mFunil = calcular(camp ? camp.insights : campaignsData?.accountInsights)
  const relatorio = relatorioDoFunil(mFunil)
  const nomeFunil = camp ? camp.name : 'Todas as campanhas da conta'

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
                  <select value={periodo} onChange={function(e) { setPeriodo(e.target.value); loadCampaigns(e.target.value) }} style={sel}>
                    {PERIODOS.map(function(p) { return <option key={p[0]} value={p[0]}>{p[1]}</option> })}
                  </select>
                  <select value={selecionada} onChange={function(e) { setSelecionada(e.target.value) }} style={sel}>
                    <option value="todas">Funil de: todas as campanhas</option>
                    {comDados.map(function(c) { return <option key={c.id} value={c.id}>{'Funil de: ' + c.name}</option> })}
                  </select>
                  <button onClick={function() { loadCampaigns() }} disabled={campaignsLoading} style={{ ...sel, cursor: 'pointer' }}>{campaignsLoading ? 'Atualizando...' : '🔄 Atualizar'}</button>
                </div>

                {campaignsError && <div style={{ fontSize: 13, color: '#b91c1c', background: 'rgba(239,68,68,0.08)', borderRadius: 9, padding: '12px 16px' }}>{campaignsError}</div>}
                {aviso && <div style={{ fontSize: 13, fontWeight: 700, borderRadius: 9, padding: '10px 14px', color: aviso.tipo === 'ok' ? '#15803d' : '#b91c1c', background: aviso.tipo === 'ok' ? 'rgba(22,163,74,0.10)' : 'rgba(239,68,68,0.08)' }}>{aviso.texto}</div>}

                {campaignsData && !campaignsLoading && (
                  <>
                    <Funil m={mFunil} relatorio={relatorio} nomeCampanha={nomeFunil} />

                    <div>
                      <button onClick={analyzeMetrics} disabled={analyzing} style={{ background: 'var(--surface)', border: '1px solid var(--border2)', color: 'var(--text)', fontWeight: 700, fontSize: 13, padding: '10px 18px', borderRadius: 10, cursor: 'pointer' }}>
                        ✨ {analyzing ? 'Analisando com IA...' : 'Pedir uma análise com IA'}
                      </button>
                      {analysis && <div style={{ ...cartao, marginTop: 12, fontSize: 13.5, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{analysis}</div>}
                    </div>

                    <GuiaFunil />

                    <div>
                      <h2 style={{ ...titulo, marginBottom: 4 }}>🚀 Suas campanhas</h2>
                      <div style={{ fontSize: 13, color: 'var(--muted2)', marginBottom: 12 }}>Cada número tem uma nota (bom, atenção ou ruim) e uma dica do que fazer. Toque no “?” para entender o que o número significa.</div>
                      {!comDados.length ? (
                        <p style={{ color: 'var(--muted2)', fontSize: 13 }}>Nenhuma campanha com dados neste período.</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                          {comDados.map(function(c) {
                            return <CampanhaCard key={c.id} c={c} selecionada={selecionada === c.id} ocupado={ocupadoId === c.id}
                              onVerFunil={function() { setSelecionada(c.id); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                              onAlternar={function() { alternar(c) }} onOrcamento={function(p) { mudarOrcamento(c, p) }} />
                          })}
                        </div>
                      )}
                      {semDados.length > 0 && (
                        <div style={{ marginTop: 14 }}>
                          <button onClick={function() { setMostrarSemDados(!mostrarSemDados) }} style={{ background: 'transparent', border: 0, color: 'var(--muted2)', fontWeight: 700, fontSize: 13, cursor: 'pointer', padding: '4px 0' }}>
                            {mostrarSemDados ? '▾ Ocultar' : '▸ Mostrar'} outras campanhas, sem gasto neste período ({semDados.length})
                          </button>
                          {mostrarSemDados && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 10 }}>
                              {semDados.map(function(c) {
                                return <CampanhaCard key={c.id} c={c} selecionada={false} ocupado={ocupadoId === c.id}
                                  onVerFunil={function() { setSelecionada(c.id); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                                  onAlternar={function() { alternar(c) }} onOrcamento={function(p) { mudarOrcamento(c, p) }} />
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
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
