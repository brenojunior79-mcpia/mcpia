'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'

export default function AnunciosPage() {
  const [loading, setLoading] = useState(true)
  const [connection, setConnection] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [disconnecting, setDisconnecting] = useState(false)
  const [switching, setSwitching] = useState(false)
  const supabase = createClient()

  useEffect(function() {
    const params = new URLSearchParams(window.location.search)
    if (params.get('error')) setError(params.get('error'))
    if (params.get('connected')) window.history.replaceState({}, '', '/dashboard/anuncios')

    loadConnection()
  }, [])

  async function loadConnection() {
    setLoading(true)
    try {
      const sessionResult = await supabase.auth.getSession()
      const session = sessionResult.data.session
      const res = await fetch('/api/facebook/ad-accounts', {
        headers: { 'Authorization': 'Bearer ' + (session ? session.access_token : '') },
      })
      const data = await res.json()
      setConnection(data)
    } catch (err) {
      setError('Erro ao carregar conexao')
    } finally {
      setLoading(false)
    }
  }

  async function selectAccount(accountId: string) {
    setSwitching(true)
    try {
      const sessionResult = await supabase.auth.getSession()
      const session = sessionResult.data.session
      await fetch('/api/facebook/select-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (session ? session.access_token : '') },
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
      const sessionResult = await supabase.auth.getSession()
      const session = sessionResult.data.session
      await fetch('/api/facebook/ad-accounts', {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + (session ? session.access_token : '') },
      })
      await loadConnection()
    } finally {
      setDisconnecting(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', padding: '32px 24px' }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div style={{ fontSize: 28 }}>📊</div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 24, fontWeight: 800, margin: 0 }}>Gerenciador de Anuncios</h1>
        </div>
        <p style={{ fontSize: 14, color: 'var(--muted2)', marginBottom: 28 }}>
          Conecte sua conta de anuncios do Facebook para gerenciar campanhas direto por aqui.
        </p>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#ef4444' }}>
            Erro ao conectar: {error}
          </div>
        )}

        {loading ? (
          <p style={{ color: 'var(--muted2)' }}>Carregando...</p>
        ) : connection?.connected ? (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#1877f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="ti ti-brand-facebook" style={{ color: '#fff', fontSize: 20 }} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>Conectado como {connection.fbUserName}</div>
                <div style={{ fontSize: 12, color: 'var(--muted2)' }}>
                  {connection.adAccountName ? 'Conta: ' + connection.adAccountName : 'Nenhuma conta de anuncios encontrada'}
                </div>
              </div>
            </div>

            {!connection.adAccountId && (
              <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#f59e0b' }}>
                Nao encontramos nenhuma conta de anuncios associada a este login. Verifique se voce tem acesso a uma conta de anuncios no Gerenciador de Negocios da Meta.
              </div>
            )}

            {connection.adAccounts && connection.adAccounts.length > 1 && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted2)', display: 'block', marginBottom: 6 }}>
                  Escolha qual conta usar ({connection.adAccounts.length} encontradas)
                </label>
                <select
                  value={connection.adAccountId || ''}
                  onChange={function(e) { selectAccount(e.target.value) }}
                  disabled={switching}
                  style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 9, padding: '10px 12px', color: 'var(--text)', fontSize: 14 }}
                >
                  {connection.adAccounts.map(function(acc: any) {
                    return <option key={acc.id} value={acc.id}>{acc.name}</option>
                  })}
                </select>
              </div>
            )}

            <button
              onClick={disconnect}
              disabled={disconnecting}
              style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', fontWeight: 600, fontSize: 13, padding: '10px 18px', borderRadius: 9, cursor: disconnecting ? 'not-allowed' : 'pointer' }}
            >
              {disconnecting ? 'Desconectando...' : 'Desconectar'}
            </button>
          </div>
        ) : (
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
        )}
      </div>
    </div>
  )
}
