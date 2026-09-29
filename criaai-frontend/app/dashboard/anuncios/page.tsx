'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: 'Ativa', color: '#16a34a' },
  PAUSED: { label: 'Pausada', color: '#6b6a7e' },
  CAMPAIGN_PAUSED: { label: 'Pausada', color: '#6b6a7e' },
  ADSET_PAUSED: { label: 'Conjunto pausado', color: '#6b6a7e' },
  PENDING_REVIEW: { label: 'Em revisao', color: '#f59e0b' },
  DISAPPROVED: { label: 'Reprovada', color: '#ef4444' },
  PREAPPROVED: { label: 'Pre-aprovada', color: '#3b82f6' },
  PENDING_BILLING_INFO: { label: 'Falta config. pagamento', color: '#f59e0b' },
  IN_PROCESS: { label: 'Processando', color: '#f59e0b' },
  WITH_ISSUES: { label: 'Com problemas', color: '#ef4444' },
  ARCHIVED: { label: 'Arquivada', color: '#6b6a7e' },
  DELETED: { label: 'Excluida', color: '#6b6a7e' },
}

function formatCurrency(value: any) {
  const n = Number(value || 0)
  return 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatNumber(value: any) {
  return Number(value || 0).toLocaleString('pt-BR')
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 18px', flex: 1, minWidth: 140 }}>
      <div style={{ fontSize: 20, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'Syne, sans-serif' }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--muted2)', marginTop: 2 }}>{label}</div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 700 }}>{value}</div>
    </div>
  )
}

export default function AnunciosPage() {
  const [loading, setLoading] = useState(true)
  const [connection, setConnection] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [disconnecting, setDisconnecting] = useState(false)
  const [switching, setSwitching] = useState(false)

  const [campaignsLoading, setCampaignsLoading] = useState(false)
  const [campaignsData, setCampaignsData] = useState<any>(null)
  const [campaignsError, setCampaignsError] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editBudget, setEditBudget] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<string | null>(null)
  const [showInactive, setShowInactive] = useState(false)

  const supabase = createClient()

  useEffect(function() {
    const params = new URLSearchParams(window.location.search)
    if (params.get('error')) setError(params.get('error'))
    if (params.get('connected')) window.history.replaceState({}, '', '/dashboard/anuncios')
    loadConnection()
  }, [])

  async function authHeader() {
    const sessionResult = await supabase.auth.getSession()
    const session = sessionResult.data.session
    return { 'Authorization': 'Bearer ' + (session ? session.access_token : '') }
  }

  async function loadConnection() {
    setLoading(true)
    try {
      const headers = await authHeader()
      const res = await fetch('/api/facebook/ad-accounts', { headers })
      const data = await res.json()
      setConnection(data)
      if (data.connected && data.adAccountId) loadCampaigns()
    } catch (err) {
      setError('Erro ao carregar conexao')
    } finally {
      setLoading(false)
    }
  }

  async function loadCampaigns() {
    setCampaignsLoading(true)
    setCampaignsError(null)
    setAnalysis(null)
    try {
      const headers = await authHeader()
      const res = await fetch('/api/facebook/campaigns', { headers })
      const data = await res.json()
      if (!res.ok) {
        setCampaignsError(data.error || 'Erro ao carregar campanhas')
      } else {
        setCampaignsData(data)
      }
    } catch (err) {
      setCampaignsError('Erro ao carregar campanhas')
    } finally {
      setCampaignsLoading(false)
    }
  }

  async function selectAccount(accountId: string) {
    setSwitching(true)
    try {
      const headers = await authHeader()
      await fetch('/api/facebook/select-account', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId }),
      })
      await loadConnection()
    } finally {
      setSwitching(false)
    }
  }

  async function disconnect() {
    setDisconnecting(true)
    try {
      const headers = await authHeader()
      await fetch('/api/facebook/ad-accounts', { method: 'DELETE', headers })
      await loadConnection()
      setCampaignsData(null)
    } finally {
      setDisconnecting(false)
    }
  }

  async function toggleCampaign(campaignId: string, currentStatus: string) {
    setTogglingId(campaignId)
    try {
      const headers = await authHeader()
      const newStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
      const res = await fetch('/api/facebook/campaigns/toggle', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId, status: newStatus }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert('Erro: ' + (data.error || 'Nao foi possivel alterar'))
      } else {
        await loadCampaigns()
      }
    } finally {
      setTogglingId(null)
    }
  }

  function startEdit(campaign: any) {
    setEditingId(campaign.id)
    setEditName(campaign.name)
    setEditBudget(campaign.daily_budget ? (Number(campaign.daily_budget) / 100).toString() : '')
  }

  async function saveEdit(campaignId: string) {
    setSavingEdit(true)
    try {
      const headers = await authHeader()
      const res = await fetch('/api/facebook/campaigns/update', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId, name: editName, dailyBudget: editBudget }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert('Erro: ' + (data.error || 'Nao foi possivel salvar'))
      } else {
        setEditingId(null)
        await loadCampaigns()
      }
    } finally {
      setSavingEdit(false)
    }
  }

  async function analyzeMetrics() {
    setAnalyzing(true)
    setAnalysis(null)
    try {
      const headers = await authHeader()
      const res = await fetch('/api/facebook/analyze', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountInsights: campaignsData?.accountInsights, campaigns: campaignsData?.campaigns || [] }),
      })
      const data = await res.json()
      if (!res.ok) {
        setAnalysis('Erro ao analisar: ' + (data.error || 'tente novamente'))
      } else {
        setAnalysis(data.analysis)
      }
    } finally {
      setAnalyzing(false)
    }
  }

  const insights = campaignsData?.accountInsights
  const activeCampaignsCount = (campaignsData?.campaigns || []).filter(function(c: any) { return c.status === 'ACTIVE' }).length

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', padding: '32px 24px' }}>
      <div style={{ maxWidth: 940, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div style={{ fontSize: 28 }}>📊</div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 24, fontWeight: 800, margin: 0 }}>Gerenciador de Anuncios</h1>
        </div>
        <p style={{ fontSize: 14, color: 'var(--muted2)', marginBottom: 24 }}>
          Acompanhe metricas e gerencie suas campanhas do Facebook Ads direto por aqui.
        </p>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#ef4444' }}>
            Erro ao conectar: {error}
          </div>
        )}

        {loading ? (
          <p style={{ color: 'var(--muted2)' }}>Carregando...</p>
        ) : !connection?.connected ? (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '32px', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔗</div>
            <p style={{ fontSize: 14, color: 'var(--muted2)', marginBottom: 20 }}>Nenhuma conta conectada ainda.</p>
            <a
              href="/api/facebook/connect"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#1877f2', color: '#fff', fontWeight: 700, fontSize: 14, padding: '12px 24px', borderRadius: 10, textDecoration: 'none' }}
            >
              <i className="ti ti-brand-facebook" style={{ fontSize: 18 }} />
              Conectar com Facebook
            </a>
          </div>
        ) : (
          <>
            {/* Cabecalho da conexao */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '18px 22px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#1877f2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className="ti ti-brand-facebook" style={{ color: '#fff', fontSize: 18 }} />
              </div>
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{connection.fbUserName}</div>
                <div style={{ fontSize: 11, color: 'var(--muted2)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  {connection.adAccountBusinessName && (
                    <span style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, padding: '1px 7px', fontWeight: 600 }}>
                      {connection.adAccountBusinessName}
                    </span>
                  )}
                  <span>{connection.adAccountName || 'Sem conta selecionada'}</span>
                </div>
              </div>

              {connection.adAccounts && connection.adAccounts.length > 1 && (
                <select
                  value={connection.adAccountId || ''}
                  onChange={function(e) { selectAccount(e.target.value) }}
                  disabled={switching}
                  style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 9, padding: '8px 10px', color: 'var(--text)', fontSize: 13 }}
                >
                  {Object.entries(
                    connection.adAccounts.reduce(function(groups: Record<string, any[]>, acc: any) {
                      const key = acc.businessName || 'Outros'
                      if (!groups[key]) groups[key] = []
                      groups[key].push(acc)
                      return groups
                    }, {})
                  ).map(function([businessName, accounts]: [string, any]) {
                    return (
                      <optgroup key={businessName} label={businessName}>
                        {accounts.map(function(acc: any) {
                          return <option key={acc.id} value={acc.id}>{acc.name}</option>
                        })}
                      </optgroup>
                    )
                  })}
                </select>
              )}

              <button
                onClick={disconnect}
                disabled={disconnecting}
                style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted2)', fontWeight: 600, fontSize: 12, padding: '8px 14px', borderRadius: 9, cursor: disconnecting ? 'not-allowed' : 'pointer' }}
              >
                {disconnecting ? 'Desconectando...' : 'Desconectar'}
              </button>
            </div>

            {!connection.adAccountId ? (
              <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#f59e0b' }}>
                Nenhuma conta de anuncios encontrada nesse login.
              </div>
            ) : (
              <>
                {/* Cartoes de metricas */}
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
                  <StatCard label="Campanhas ativas" value={String(activeCampaignsCount)} icon="🚀" />
                  <StatCard label="Gasto (30 dias)" value={insights ? formatCurrency(insights.spend) : '—'} icon="💰" />
                  <StatCard label="Valor de vendas" value={insights ? formatCurrency(insights.purchaseValue) : '—'} icon="🛒" />
                  <StatCard label="ROAS" value={insights ? Number(insights.roas || 0).toFixed(2) + 'x' : '—'} icon="🎯" />
                </div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
                  <StatCard label="Cliques" value={insights ? formatNumber(insights.clicks) : '—'} icon="🖱️" />
                  <StatCard label="CTR (link)" value={insights ? Number(insights.linkCtr || 0).toFixed(2) + '%' : '—'} icon="📈" />
                  <StatCard label="CPC (link)" value={insights ? formatCurrency(insights.linkCpc) : '—'} icon="💵" />
                  <StatCard label="CPM" value={insights ? formatCurrency(insights.cpm) : '—'} icon="📣" />
                </div>

                {/* Botao de analise com IA */}
                <div style={{ marginBottom: 20 }}>
                  <button
                    onClick={analyzeMetrics}
                    disabled={analyzing || !insights}
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', fontWeight: 700, fontSize: 13, padding: '10px 18px', borderRadius: 10, cursor: analyzing ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}
                  >
                    <i className="ti ti-sparkles" style={{ color: 'var(--accent2)' }} />
                    {analyzing ? 'Analisando com IA...' : 'Analisar metricas com IA'}
                  </button>

                  {analysis && (
                    <div style={{ marginTop: 12, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px', fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                      {analysis}
                    </div>
                  )}
                </div>

                {/* Lista de campanhas */}
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted2)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Campanhas ativas</div>

                {campaignsLoading ? (
                  <p style={{ color: 'var(--muted2)', fontSize: 13 }}>Carregando campanhas...</p>
                ) : campaignsError ? (
                  <div style={{ fontSize: 13, color: '#ef4444', background: 'rgba(239,68,68,0.08)', borderRadius: 9, padding: '12px 16px' }}>{campaignsError}</div>
                ) : !campaignsData?.campaigns?.length ? (
                  <p style={{ color: 'var(--muted2)', fontSize: 13 }}>Nenhuma campanha encontrada.</p>
                ) : (
                  <>
                    {(function() {
                      const active = campaignsData.campaigns.filter(function(c: any) { return c.status === 'ACTIVE' })
                      const inactive = campaignsData.campaigns.filter(function(c: any) { return c.status !== 'ACTIVE' })

                      function renderCampaign(campaign: any) {
                        const isActive = campaign.status === 'ACTIVE'
                        const isExpanded = expandedId === campaign.id
                        const isEditing = editingId === campaign.id
                        const statusInfo = STATUS_LABELS[campaign.effective_status] || STATUS_LABELS[campaign.status] || { label: campaign.effective_status || campaign.status, color: 'var(--muted2)' }
                        const budget = campaign.daily_budget ? formatCurrency(Number(campaign.daily_budget) / 100) + '/dia' : (campaign.lifetime_budget ? formatCurrency(Number(campaign.lifetime_budget) / 100) + ' total' : '—')

                        return (
                          <div key={campaign.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                            <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                              {isEditing ? (
                                <div style={{ flex: 1, minWidth: 220, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                  <input
                                    type="text"
                                    value={editName}
                                    onChange={function(e) { setEditName(e.target.value) }}
                                    style={{ flex: 1, minWidth: 140, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px', color: 'var(--text)', fontSize: 13 }}
                                  />
                                  <input
                                    type="number"
                                    value={editBudget}
                                    onChange={function(e) { setEditBudget(e.target.value) }}
                                    placeholder="Orcamento R$/dia"
                                    style={{ width: 130, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px', color: 'var(--text)', fontSize: 13 }}
                                  />
                                  <button onClick={function() { saveEdit(campaign.id) }} disabled={savingEdit} style={{ background: '#16a34a', color: '#fff', fontWeight: 700, fontSize: 12, padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer' }}>
                                    {savingEdit ? '...' : 'Salvar'}
                                  </button>
                                  <button onClick={function() { setEditingId(null) }} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', fontWeight: 600, fontSize: 12, padding: '7px 14px', borderRadius: 8, cursor: 'pointer' }}>
                                    Cancelar
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <div style={{ flex: 1, minWidth: 180 }}>
                                    <div style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                                      <i className="ti ti-speakerphone" style={{ fontSize: 13, color: 'var(--accent2)' }} />
                                      {campaign.name}
                                    </div>
                                    <div style={{ fontSize: 11, color: 'var(--muted2)' }}>{campaign.objective} · {budget} · {campaign.adSets?.length || 0} conjunto(s)</div>
                                  </div>
                                  <div style={{ fontSize: 12, color: 'var(--muted2)', minWidth: 80 }}>
                                    {formatCurrency(campaign.insights?.spend)}
                                  </div>
                                  <div style={{ fontSize: 12, color: 'var(--muted2)', minWidth: 70 }}>
                                    ROAS {Number(campaign.insights?.roas || 0).toFixed(2)}x
                                  </div>
                                  <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 99, background: statusInfo.color + '1a', color: statusInfo.color }}>
                                    {statusInfo.label}
                                  </span>
                                  <button
                                    onClick={function() { setExpandedId(isExpanded ? null : campaign.id) }}
                                    style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', fontWeight: 600, fontSize: 12, padding: '7px 12px', borderRadius: 9, cursor: 'pointer' }}
                                  >
                                    {isExpanded ? 'Ocultar' : 'Detalhes'}
                                  </button>
                                  <button
                                    onClick={function() { startEdit(campaign) }}
                                    style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', fontWeight: 600, fontSize: 12, padding: '7px 12px', borderRadius: 9, cursor: 'pointer' }}
                                  >
                                    Editar
                                  </button>
                                  <button
                                    onClick={function() { toggleCampaign(campaign.id, campaign.status) }}
                                    disabled={togglingId === campaign.id}
                                    style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', fontWeight: 600, fontSize: 12, padding: '7px 14px', borderRadius: 9, cursor: togglingId === campaign.id ? 'not-allowed' : 'pointer' }}
                                  >
                                    {togglingId === campaign.id ? '...' : isActive ? 'Pausar' : 'Ativar'}
                                  </button>
                                </>
                              )}
                            </div>

                            {isExpanded && (
                              <div style={{ borderTop: '1px solid var(--border)', background: 'var(--surface2)' }}>
                                <div style={{ padding: '14px 18px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 14, borderBottom: '1px solid var(--border)' }}>
                                  <DetailRow label="CTR (link)" value={Number(campaign.insights?.linkCtr || 0).toFixed(2) + '%'} />
                                  <DetailRow label="CPC (link)" value={formatCurrency(campaign.insights?.linkCpc)} />
                                  <DetailRow label="CPM" value={formatCurrency(campaign.insights?.cpm)} />
                                  <DetailRow label="Visitas na pagina" value={formatNumber(campaign.insights?.landingPageViews)} />
                                  <DetailRow label="Checkout iniciado" value={formatNumber(campaign.insights?.initiateCheckout)} />
                                  <DetailRow label="Vendas" value={formatNumber(campaign.insights?.purchaseCount) + ' (' + formatCurrency(campaign.insights?.purchaseValue) + ')'} />
                                </div>

                                <div style={{ padding: '12px 18px' }}>
                                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Conjuntos de anuncios</div>
                                  {!campaign.adSets?.length ? (
                                    <p style={{ fontSize: 12, color: 'var(--muted2)' }}>Nenhum conjunto encontrado.</p>
                                  ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                      {campaign.adSets.map(function(adSet: any) {
                                        const adSetStatus = STATUS_LABELS[adSet.effective_status] || STATUS_LABELS[adSet.status] || { label: adSet.effective_status || adSet.status, color: 'var(--muted2)' }
                                        return (
                                          <div key={adSet.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 9, padding: '10px 14px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                              <i className="ti ti-layout-grid" style={{ fontSize: 13, color: 'var(--muted2)' }} />
                                              <span style={{ fontSize: 13, fontWeight: 700, flex: 1, minWidth: 140 }}>{adSet.name}</span>
                                              <span style={{ fontSize: 11, color: 'var(--muted2)' }}>{formatCurrency(adSet.insights?.spend)}</span>
                                              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: adSetStatus.color + '1a', color: adSetStatus.color }}>{adSetStatus.label}</span>
                                            </div>
                                            {adSet.ads?.length > 0 && (
                                              <div style={{ marginTop: 8, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                {adSet.ads.map(function(ad: any) {
                                                  const adStatus = STATUS_LABELS[ad.effective_status] || STATUS_LABELS[ad.status] || { label: ad.effective_status || ad.status, color: 'var(--muted2)' }
                                                  return (
                                                    <div key={ad.id} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                                      <i className="ti ti-ad-2" style={{ fontSize: 12, color: 'var(--muted)' }} />
                                                      <span style={{ fontSize: 12, flex: 1, minWidth: 120 }}>{ad.name}</span>
                                                      <span style={{ fontSize: 11, color: 'var(--muted2)' }}>{formatCurrency(ad.insights?.spend)}</span>
                                                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: adStatus.color + '1a', color: adStatus.color }}>{adStatus.label}</span>
                                                    </div>
                                                  )
                                                })}
                                              </div>
                                            )}
                                          </div>
                                        )
                                      })}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      }

                      return (
                        <>
                          {!active.length ? (
                            <p style={{ color: 'var(--muted2)', fontSize: 13, marginBottom: 16 }}>Nenhuma campanha ativa no momento.</p>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                              {active.map(renderCampaign)}
                            </div>
                          )}

                          {inactive.length > 0 && (
                            <div>
                              <button
                                onClick={function() { setShowInactive(!showInactive) }}
                                style={{ background: 'transparent', border: 'none', color: 'var(--muted2)', fontWeight: 600, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, padding: '6px 0', marginBottom: showInactive ? 10 : 0 }}
                              >
                                <i className={'ti ' + (showInactive ? 'ti-chevron-down' : 'ti-chevron-right')} />
                                {showInactive ? 'Ocultar' : 'Mostrar'} campanhas pausadas / outras ({inactive.length})
                              </button>
                              {showInactive && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                  {inactive.map(renderCampaign)}
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )
                    })()}
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
