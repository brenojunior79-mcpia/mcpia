'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'

export default function HiggsfieldAdminPage() {
  const [avatars, setAvatars] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(function() {
    loadAvatars()
  }, [])

  async function loadAvatars() {
    setLoading(true)
    const result = await supabase.from('ai_avatars').select('*').order('created_at', { ascending: true })
    setAvatars(result.data || [])
    setLoading(false)
  }

  async function createOrCheck(avatarId: string) {
    setProcessingId(avatarId)
    setError(null)
    try {
      const sessionResult = await supabase.auth.getSession()
      const session = sessionResult.data.session
      const res = await fetch('/api/higgsfield/create-character', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (session ? session.access_token : '') },
        body: JSON.stringify({ avatarId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Erro desconhecido')
      } else {
        await loadAvatars()
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setProcessingId(null)
    }
  }

  const statusColors: Record<string, string> = {
    pending: '#9ca3af',
    not_ready: '#f59e0b',
    queued: '#f59e0b',
    in_progress: '#3b82f6',
    completed: '#16a34a',
    failed: '#ef4444',
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', padding: '32px 24px' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Avatares Higgsfield</h1>
        <p style={{ fontSize: 13, color: 'var(--muted2)', marginBottom: 24 }}>
          Crie e acompanhe o treinamento de cada personagem reutilizavel na Higgsfield.
        </p>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#ef4444' }}>
            {error}
          </div>
        )}

        {loading ? (
          <p style={{ color: 'var(--muted2)' }}>Carregando...</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {avatars.map(function(avatar) {
              const isProcessing = processingId === avatar.id
              return (
                <div key={avatar.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
                  <img src={avatar.reference_image_url} alt={avatar.name} style={{ width: 56, height: 56, borderRadius: 10, objectFit: 'cover' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{avatar.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted2)' }}>
                      Status: <span style={{ color: statusColors[avatar.status] || 'var(--muted2)', fontWeight: 700 }}>{avatar.status}</span>
                      {avatar.external_id && <span> · ID: {avatar.external_id}</span>}
                    </div>
                  </div>
                  <button
                    onClick={function() { createOrCheck(avatar.id) }}
                    disabled={isProcessing}
                    style={{
                      background: 'linear-gradient(135deg,#5b4ef8,#9b8ffc)', color: '#fff', fontWeight: 700, fontSize: 13,
                      padding: '9px 16px', borderRadius: 9, border: 'none', cursor: isProcessing ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {isProcessing ? 'Aguarde...' : avatar.external_id ? 'Verificar status' : 'Criar na Higgsfield'}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
