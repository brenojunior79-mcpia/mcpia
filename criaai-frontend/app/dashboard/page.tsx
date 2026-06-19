'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import Link from 'next/link'

const animations = `
@keyframes spin { from { transform: rotate(0) } to { transform: rotate(360deg) } }
@keyframes fadeUp { from { opacity: 0; transform: translateY(20px) } to { opacity: 1; transform: translateY(0) } }
@keyframes fadeDown { from { opacity: 0; transform: translateY(-16px) } to { opacity: 1; transform: translateY(0) } }
@keyframes bgPulse { 0% { opacity: 0.5; transform: scale(1) } 100% { opacity: 1; transform: scale(1.08) } }
@keyframes float { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(-18px) } }
@keyframes pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(124,92,252,0.3) } 50% { box-shadow: 0 0 0 10px rgba(124,92,252,0) } }
@keyframes barFill { from { width: 0 } to { width: var(--pct) } }
.anim-fadeUp { animation: fadeUp 0.5s ease both; }
.anim-fadeUp-1 { animation: fadeUp 0.5s ease both 0.1s; }
.anim-fadeUp-2 { animation: fadeUp 0.5s ease both 0.2s; }
.anim-fadeUp-3 { animation: fadeUp 0.5s ease both 0.3s; }
.anim-fadeUp-4 { animation: fadeUp 0.5s ease both 0.4s; }
.anim-fadeDown { animation: fadeDown 0.5s ease both; }
.card-hover { transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s; }
.card-hover:hover { transform: translateY(-3px); box-shadow: 0 12px 32px rgba(0,0,0,0.3); border-color: rgba(124,92,252,0.3) !important; }
.shortcut-hover { transition: transform 0.2s, box-shadow 0.2s, background 0.2s; }
.shortcut-hover:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.2); }
`

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

      setStats({ videos: videos.length, ebooks: ebooks.length, paginas: 0 })
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
      <style>{animations}</style>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', position: 'relative', overflow: 'hidden' }}>
      <style>{animations}</style>

      {/* Background animado */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-30%', right: '-10%', width: 500, height: 500, background: 'radial-gradient(circle, rgba(124,92,252,0.08) 0%, transparent 70%)', borderRadius: '50%', animation: 'float 8s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', bottom: '-20%', left: '-10%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(124,92,252,0.05) 0%, transparent 70%)', borderRadius: '50%', animation: 'float 10s ease-in-out infinite reverse' }} />
        <div style={{ position: 'absolute', top: '40%', left: '30%', width: 300, height: 300, background: 'radial-gradient(circle, rgba(167,139,250,0.04) 0%, transparent 70%)', borderRadius: '50%', animation: 'float 12s ease-in-out infinite 2s' }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1, padding: '32px 28px', maxWidth: 900, margin: '0 auto' }}>

        {/* Header */}
        <div className="anim-fadeDown" style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 26, fontFamily: 'Syne, sans-serif', fontWeight: 800, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ animation: 'pulse 2s ease infinite', display: 'inline-block' }}>👋</span>
            Ola, {firstName}!
          </div>
          <div style={{ fontSize: 14, color: 'var(--muted2)' }}>
            Aqui esta um resumo da sua conta no MCP.IA
          </div>
        </div>

        {/* Banner sem plano */}
        {!hasSubscription && (
          <div className="anim-fadeUp card-hover" style={{ background: 'linear-gradient(135deg, rgba(124,92,252,0.15), rgba(124,92,252,0.05))', border: '1px solid rgba(124,92,252,0.3)', borderRadius: 16, padding: '20px 24px', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#a78bfa', marginBottom: 4 }}>Voce ainda nao tem um plano ativo</div>
              <div style={{ fontSize: 13, color: 'var(--muted2)' }}>Assine agora e comece a gerar ebooks, videos e paginas com IA</div>
            </div>
            <Link href="/dashboard/planos" style={{ background: 'linear-gradient(135deg, #7c5cfc, #9b6dfc)', color: '#fff', fontWeight: 700, fontSize: 14, padding: '10px 24px', borderRadius: 12, textDecoration: 'none', whiteSpace: 'nowrap', boxShadow: '0 4px 16px rgba(124,92,252,0.4)' }}>
              Ver planos
            </Link>
          </div>
        )}

        {/* Creditos */}
        {hasSubscription && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
            <div className="anim-fadeUp-1 card-hover" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px 24px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, right: 0, width: 80, height: 80, background: 'radial-gradient(circle, rgba(124,92,252,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--muted2)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Creditos de Video</div>
                  <div style={{ fontSize: 28, fontWeight: 800, fontFamily: 'Syne, sans-serif', color: 'var(--accent2)' }}>
                    {videosLimit ? (videosLimit - videosUsed) : '∞'}
                    <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--muted2)', marginLeft: 6 }}>
                      {videosLimit ? '/ ' + videosLimit : 'ilimitados'}
                    </span>
                  </div>
                </div>
                <div style={{ width: 44, height: 44, background: 'rgba(124,92,252,0.12)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'pulse 3s ease infinite' }}>
                  <i className="ti ti-video" style={{ fontSize: 22, color: 'var(--accent2)' }} />
                </div>
              </div>
              {videosLimit && (
                <div style={{ height: 6, background: 'var(--surface2)', borderRadius: 99, overflow: 'hidden', marginBottom: 12 }}>
                  <div style={{ height: '100%', width: videosPct + '%', background: videosPct >= 90 ? '#ef4444' : videosPct >= 70 ? '#f59e0b' : 'linear-gradient(90deg, var(--accent), #9b6dfc)', borderRadius: 99, transition: 'width 1s ease' }} />
                </div>
              )}
              <Link href="/dashboard/criativo" style={{ fontSize: 13, color: 'var(--accent2)', fontWeight: 600, textDecoration: 'none' }}>
                Gerar video →
              </Link>
            </div>

            <div className="anim-fadeUp-2 card-hover" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px 24px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, right: 0, width: 80, height: 80, background: 'radial-gradient(circle, rgba(34,197,94,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--muted2)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Creditos de Ebook</div>
                  <div style={{ fontSize: 28, fontWeight: 800, fontFamily: 'Syne, sans-serif', color: 'var(--green)' }}>
                    {ebooksLimit ? (ebooksLimit - ebooksUsed) : '∞'}
                    <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--muted2)', marginLeft: 6 }}>
                      {ebooksLimit ? '/ ' + ebooksLimit : 'ilimitados'}
                    </span>
                  </div>
                </div>
                <div style={{ width: 44, height: 44, background: 'rgba(34,197,94,0.12)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="ti ti-book-2" style={{ fontSize: 22, color: 'var(--green)' }} />
                </div>
              </div>
              {ebooksLimit && (
                <div style={{ height: 6, background: 'var(--surface2)', borderRadius: 99, overflow: 'hidden', marginBottom: 12 }}>
                  <div style={{ height: '100%', width: ebooksPct + '%', background: ebooksPct >= 90 ? '#ef4444' : ebooksPct >= 70 ? '#f59e0b' : 'linear-gradient(90deg, #22c55e, #4ade80)', borderRadius: 99, transition: 'width 1s ease' }} />
                </div>
              )}
              <Link href="/dashboard/ebook" style={{ fontSize: 13, color: 'var(--green)', fontWeight: 600, textDecoration: 'none' }}>
                Gerar ebook →
              </Link>
            </div>
          </div>
        )}

        {/* Plano atual */}
        {hasSubscription && (
          <div className="anim-fadeUp-2 card-hover" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px 24px', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 44, height: 44, background: 'rgba(124,92,252,0.1)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="ti ti-credit-card" style={{ fontSize: 22, color: 'var(--accent2)' }} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--muted2)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Plano atual</div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{plan?.name || 'Starter'} <span style={{ color: 'var(--muted2)', fontWeight: 400 }}>— R${(plan?.price_monthly || 0).toFixed(2).replace('.', ',')}/mes</span></div>
              </div>
            </div>
            <Link href="/dashboard/planos" style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', fontWeight: 600, fontSize: 13, padding: '8px 18px', borderRadius: 10, textDecoration: 'none', transition: 'all 0.2s' }}>
              Gerenciar plano
            </Link>
          </div>
        )}

        {/* Atalhos rapidos */}
        <div className="anim-fadeUp-3" style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted2)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Criar agora</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            {[
              { href: '/dashboard/criativo', icon: 'ti-sparkles', label: 'Criativo de video', color: 'var(--accent2)', bg: 'rgba(124,92,252,0.08)', border: 'rgba(124,92,252,0.2)' },
              { href: '/dashboard/ebook', icon: 'ti-book-2', label: 'Gerador de Ebook', color: 'var(--green)', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.2)' },
              { href: '/dashboard/paginas', icon: 'ti-layout', label: 'Pagina de vendas', color: '#60a5fa', bg: 'rgba(96,165,250,0.08)', border: 'rgba(96,165,250,0.2)' },
              { href: '/dashboard/chat', icon: 'ti-message-circle', label: 'Assistente IA', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
            ].map(function(item) {
              return (
                <Link key={item.href} href={item.href} className="shortcut-hover" style={{ background: item.bg, border: '1px solid ' + item.border, borderRadius: 14, padding: '16px 18px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <i className={'ti ' + item.icon} style={{ fontSize: 22, color: item.color }} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{item.label}</span>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Ultimos videos */}
        {recentGenerations.length > 0 && (
          <div className="anim-fadeUp-4" style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Ultimos criativos</div>
              <Link href="/dashboard/historico" style={{ fontSize: 13, color: 'var(--accent2)', textDecoration: 'none' }}>Ver todos →</Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {recentGenerations.map(function(g) {
                return (
                  <div key={g.id} className="card-hover" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 36, height: 36, background: 'rgba(124,92,252,0.1)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <i className="ti ti-video" style={{ fontSize: 16, color: 'var(--accent2)' }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{g.niche || 'Sem titulo'}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted2)' }}>{formatDate(g.created_at)}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
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
          <div className="anim-fadeUp-4" style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Ultimos ebooks</div>
              <Link href="/dashboard/historico" style={{ fontSize: 13, color: 'var(--green)', textDecoration: 'none' }}>Ver todos →</Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {recentEbooks.map(function(g) {
                return (
                  <div key={g.id} className="card-hover" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 36, height: 36, background: 'rgba(34,197,94,0.1)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <i className="ti ti-book-2" style={{ fontSize: 16, color: 'var(--green)' }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{g.title || g.niche || 'Sem titulo'}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted2)' }}>{formatDate(g.created_at)}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
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
          <div className="anim-fadeUp-4" style={{ background: 'var(--surface)', border: '1px dashed var(--border)', borderRadius: 16, padding: '48px 24px', textAlign: 'center' }}>
            <i className="ti ti-sparkles" style={{ fontSize: 44, color: 'var(--accent2)', display: 'block', marginBottom: 16, animation: 'pulse 2s ease infinite' }} />
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Comece a criar agora!</div>
            <div style={{ fontSize: 14, color: 'var(--muted2)', marginBottom: 24, maxWidth: 360, margin: '0 auto 24px' }}>Use os atalhos acima para gerar seu primeiro criativo, ebook ou pagina de vendas.</div>
            <Link href="/dashboard/criativo" style={{ background: 'linear-gradient(135deg, var(--accent), #9b6dfc)', color: '#fff', fontWeight: 700, fontSize: 14, padding: '12px 28px', borderRadius: 12, textDecoration: 'none', boxShadow: '0 4px 16px rgba(124,92,252,0.4)' }}>
              Criar primeiro criativo
            </Link>
          </div>
        )}

      </div>
    </div>
  )
}
