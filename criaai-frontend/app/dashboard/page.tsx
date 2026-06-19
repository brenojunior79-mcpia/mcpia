'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import Link from 'next/link'

export default function DashboardPage() {
  const [profile, setProfile] = useState<any>(null)
  const [stats, setStats] = useState({ videos: 0, ebooks: 0, paginas: 0 })
  const [recentGenerations, setRecentGenerations] = useState<any[]>([])
  const [recentEbooks, setRecentEbooks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(function() {
    async function load() {
      const userResult = await supabase.auth.getUser()
      const user = userResult.data.user
      if (!user) return

      const profileResult = await supabase
        .from('profiles')
        .select('*, plans(name, credits_videos, credits_ebooks, is_unlimited, price_monthly)')
        .eq('id', user.id)
        .single()

      const data = profileResult.data
      if (data) setProfile(data)

      const gensResult = await supabase
        .from('generations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)

      const gens = gensResult.data || []
      const videos = gens.filter(function(g) { return g.type === 'video' })
      const ebooks = gens.filter(function(g) { return g.type === 'ebook' })

      setStats({
        videos: videos.length,
        ebooks: ebooks.length,
        paginas: 0,
      })

      setRecentGenerations(videos.slice(0, 3))
      setRecentEbooks(ebooks.slice(0, 3))
      setLoading(false)
    }
    load()
  }, [])

  const plan = profile?.plans
  const hasSubscription = profile?.subscription_status === 'active' || profile?.subscription_status === 'trialing'
  const videosUsed = profile?.credits_videos_used || 0
  const videosLimit = plan?.is_unlimited ? null : ((plan?.credits_videos || 0) + (profile?.credits_videos_extra || 0))
  const ebooksUsed = profile?.credits_ebooks_used || 0
  const ebooksLimit = plan?.is_unlimited ? null : ((plan?.credits_ebooks || 0) + (profile?.credits_ebooks_extra || 0))
  const videosPct = videosLimit ? Math.min(100, Math.round((videosUsed / videosLimit) * 100)) : 0
  const ebooksPct = ebooksLimit ? Math.min(100, Math.round((ebooksUsed / ebooksLimit) * 100)) : 0
  const firstName = (profile?.full_name || '').split(' ')[0] || 'Bem-vindo'

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <i className="ti ti-loader" style={{ fontSize: 32, color: 'var(--accent2)', animation: 'spin 1s linear infinite' }} />
      <style>{'@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}'}</style>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '32px 28px', maxWidth: 900, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 24, fontFamily: 'Syne, sans-serif', fontWeight: 800, marginBottom: 4 }}>
          Ola, {firstName}! 👋
        </div>
        <div style={{ fontSize: 14, color: 'var(--muted2)' }}>
          Aqui esta um resumo da sua conta no MCP.IA
        </div>
      </div>

      {/* Banner sem plano */}
      {!hasSubscription && (
        <div style={{ background: 'linear-gradient(135deg, rgba(124,92,252,0.15), rgba(124,92,252,0.05))', border: '1px solid rgba(124,92,252,0.3)', borderRadius: 16, padding: '20px 24px', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#a78bfa', marginBottom: 4 }}>Voce ainda nao tem um plano ativo</div>
            <div style={{ fontSize: 13, color: 'var(--muted2)' }}>Assine agora e comece a gerar ebooks, videos e paginas com IA</div>
          </div>
          <Link href="/dashboard/planos" style={{ background: 'linear-gradient(135deg, #7c5cfc, #9b6dfc)', color: '#fff', fontWeight: 700, fontSize: 14, padding: '10px 24px', borderRadius: 12, textDecoration: 'none', whiteSpace: 'nowrap' }}>
            Ver planos
          </Link>
        </div>
      )}

      {/* Creditos */}
      {hasSubscription && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--muted2)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Creditos de Video</div>
                <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'Syne, sans-serif' }}>
                  {videosLimit ? (videosLimit - videosUsed) : '∞'}
                  <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--muted2)', marginLeft: 4 }}>
                    {videosLimit ? '/ ' + videosLimit + ' restantes' : 'ilimitados'}
                  </span>
                </div>
              </div>
              <div style={{ width: 40, height: 40, background: 'rgba(124,92,252,0.1)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="ti ti-video" style={{ fontSize: 20, color: 'var(--accent2)' }} />
              </div>
            </div>
            {videosLimit && (
              <div style={{ height: 6, background: 'var(--surface2)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: videosPct + '%', background: videosPct >= 90 ? '#ef4444' : videosPct >= 70 ? '#f59e0b' : 'var(--accent)', borderRadius: 99, transition: 'width 0.3s' }} />
              </div>
            )}
            <div style={{ marginTop: 12 }}>
              <Link href="/dashboard/criativo" style={{ fontSize: 13, color: 'var(--accent2)', fontWeight: 600, textDecoration: 'none' }}>
                Gerar video →
              </Link>
            </div>
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--muted2)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Creditos de Ebook</div>
                <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'Syne, sans-serif' }}>
                  {ebooksLimit ? (ebooksLimit - ebooksUsed) : '∞'}
                  <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--muted2)', marginLeft: 4 }}>
                    {ebooksLimit ? '/ ' + ebooksLimit + ' restantes' : 'ilimitados'}
                  </span>
                </div>
              </div>
              <div style={{ width: 40, height: 40, background: 'rgba(34,197,94,0.1)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="ti ti-book-2" style={{ fontSize: 20, color: 'var(--green)' }} />
              </div>
            </div>
            {ebooksLimit && (
              <div style={{ height: 6, background: 'var(--surface2)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: ebooksPct + '%', background: ebooksPct >= 90 ? '#ef4444' : ebooksPct >= 70 ? '#f59e0b' : 'var(--green)', borderRadius: 99, transition: 'width 0.3s' }} />
              </div>
            )}
            <div style={{ marginTop: 12 }}>
              <Link href="/dashboard/ebook" style={{ fontSize: 13, color: 'var(--green)', fontWeight: 600, textDecoration: 'none' }}>
                Gerar ebook →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Plano atual */}
      {hasSubscription && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px 24px', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, background: 'rgba(124,92,252,0.1)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="ti ti-credit-card" style={{ fontSize: 22, color: 'var(--accent2)' }} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--muted2)', marginBottom: 2 }}>Plano atual</div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{plan?.name || 'Starter'} — R${(plan?.price_monthly || 0).toFixed(2).replace('.', ',')}/mes</div>
            </div>
          </div>
          <Link href="/dashboard/planos" style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', fontWeight: 600, fontSize: 13, padding: '8px 18px', borderRadius: 10, textDecoration: 'none' }}>
            Gerenciar plano
          </Link>
        </div>
      )}

      {/* Atalhos rapidos */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--muted2)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Criar agora</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          {[
            { href: '/dashboard/criativo', icon: 'ti-sparkles', label: 'Criativo de video', color: 'var(--accent2)', bg: 'rgba(124,92,252,0.08)' },
            { href: '/dashboard/ebook', icon: 'ti-book-2', label: 'Gerador de Ebook', color: 'var(--green)', bg: 'rgba(34,197,94,0.08)' },
            { href: '/dashboard/paginas', icon: 'ti-layout', label: 'Pagina de vendas', color: '#60a5fa', bg: 'rgba(96,165,250,0.08)' },
            { href: '/dashboard/chat', icon: 'ti-message-circle', label: 'Assistente IA', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
          ].map(function(item) {
            return (
              <Link key={item.href} href={item.href} style={{ background: item.bg, border: '1px solid ' + item.color + '33', borderRadius: 14, padding: '16px 18px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12, transition: 'all 0.2s' }}>
                <i className={'ti ' + item.icon} style={{ fontSize: 22, color: item.color }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Ultimos videos */}
      {recentGenerations.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Ultimos criativos</div>
            <Link href="/dashboard/historico" style={{ fontSize: 13, color: 'var(--accent2)', textDecoration: 'none' }}>Ver todos →</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {recentGenerations.map(function(g) {
              return (
                <div key={g.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, background: 'rgba(124,92,252,0.1)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <i className="ti ti-video" style={{ fontSize: 16, color: 'var(--accent2)' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{g.niche || 'Sem titulo'}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted2)' }}>{formatDate(g.created_at)}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: g.status === 'completed' ? 'var(--green)' : g.status === 'pending' ? 'var(--accent2)' : '#f87171' }}>
                      {g.status === 'completed' ? 'Pronto' : g.status === 'pending' ? 'Processando' : 'Falhou'}
                    </span>
                    {g.output_url && (
                      <a href={g.output_url} download style={{ fontSize: 12, color: 'var(--accent2)', textDecoration: 'none', fontWeight: 600 }}>Baixar</a>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Ultimos ebooks */}
      {recentEbooks.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Ultimos ebooks</div>
            <Link href="/dashboard/historico" style={{ fontSize: 13, color: 'var(--green)', textDecoration: 'none' }}>Ver todos →</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {recentEbooks.map(function(g) {
              return (
                <div key={g.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, background: 'rgba(34,197,94,0.1)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <i className="ti ti-book-2" style={{ fontSize: 16, color: 'var(--green)' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{g.title || g.niche || 'Sem titulo'}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted2)' }}>{formatDate(g.created_at)}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: g.status === 'completed' ? 'var(--green)' : '#f87171' }}>
                      {g.status === 'completed' ? 'Pronto' : 'Processando'}
                    </span>
                    {g.output_url && (
                      <a href={g.output_url} download style={{ fontSize: 12, color: 'var(--green)', textDecoration: 'none', fontWeight: 600 }}>Baixar</a>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Estado vazio */}
      {recentGenerations.length === 0 && recentEbooks.length === 0 && hasSubscription && (
        <div style={{ background: 'var(--surface)', border: '1px dashed var(--border)', borderRadius: 16, padding: '40px 24px', textAlign: 'center' }}>
          <i className="ti ti-sparkles" style={{ fontSize: 40, color: 'var(--accent2)', display: 'block', marginBottom: 12 }} />
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Comece a criar agora!</div>
          <div style={{ fontSize: 14, color: 'var(--muted2)', marginBottom: 20 }}>Use os atalhos acima para gerar seu primeiro criativo, ebook ou pagina de vendas.</div>
          <Link href="/dashboard/criativo" style={{ background: 'linear-gradient(135deg, var(--accent), #9b6dfc)', color: '#fff', fontWeight: 700, fontSize: 14, padding: '12px 28px', borderRadius: 12, textDecoration: 'none' }}>
            Criar primeiro criativo
          </Link>
        </div>
      )}

    </div>
  )
}
