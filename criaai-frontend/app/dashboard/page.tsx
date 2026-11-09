'use client'
import RankingCard from '@/components/RankingCard'
import JornadaMapa from '@/components/JornadaMapa'
import CarrosselResultados from '@/components/CarrosselResultados'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import Link from 'next/link'

const animations = `
@keyframes spin { from { transform: rotate(0) } to { transform: rotate(360deg) } }
@keyframes fadeUp { from { opacity: 0; transform: translateY(20px) } to { opacity: 1; transform: translateY(0) } }
@keyframes fadeDown { from { opacity: 0; transform: translateY(-16px) } to { opacity: 1; transform: translateY(0) } }
@keyframes float { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(-18px) } }
@keyframes pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(124,92,252,0.3) } 50% { box-shadow: 0 0 0 10px rgba(124,92,252,0) } }
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
.result-card { transition: transform 0.25s, box-shadow 0.25s; }
.result-card:hover { transform: translateY(-4px) scale(1.01); box-shadow: 0 16px 36px rgba(0,0,0,0.2); }
.link-btn { transition: transform 0.2s, box-shadow 0.2s; }
.link-btn:hover { transform: translateY(-3px); box-shadow: 0 12px 28px rgba(0,0,0,0.18); }
.news-card { transition: transform 0.25s, box-shadow 0.25s; }
.news-card:hover { transform: translateY(-4px); box-shadow: 0 16px 36px rgba(0,0,0,0.18); }
@keyframes newsBorder { 0% { background-position: 0% 50% } 100% { background-position: 200% 50% } }
@keyframes newsShine { 0% { transform: translateX(-120%) skewX(-18deg) } 60%, 100% { transform: translateX(260%) skewX(-18deg) } }
@keyframes newsFloatA { 0%, 100% { transform: translateY(0) rotate(-5deg) } 50% { transform: translateY(-9px) rotate(-3deg) } }
@keyframes newsFloatB { 0%, 100% { transform: translateY(-6px) rotate(5deg) } 50% { transform: translateY(5px) rotate(3deg) } }
@keyframes newsPop { 0%, 100% { transform: scale(1) } 50% { transform: scale(1.12) } }
@keyframes newsRing { 0% { transform: scale(0.8); opacity: 0.7 } 100% { transform: scale(1.7); opacity: 0 } }
.step-line { position: absolute; top: 28px; left: calc(50% + 28px); width: calc(100% - 56px); height: 2px; background: linear-gradient(90deg, rgba(124,92,252,0.5), rgba(124,92,252,0.1)); }
`



export default function DashboardPage() {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [zoomSrc, setZoomSrc] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(function() {
    async function load() {
      const userResult = await supabase.auth.getUser()
      const user = userResult.data.user
      if (!user) return

      const profileResult = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()

      if (profileResult.data) setProfile(profileResult.data)
      setLoading(false)
    }
    load()
  }, [])

  const firstName = (profile?.full_name || '').split(' ')[0] || 'Bem-vindo'

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
      </div>

      <div style={{ position: 'relative', zIndex: 1, padding: '32px 28px', maxWidth: 900, margin: '0 auto' }}>

        {/* Header */}
        <div className="anim-fadeDown" style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 26, fontFamily: 'Syne, sans-serif', fontWeight: 800, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ animation: 'pulse 2s ease infinite', display: 'inline-block' }}>👋</span>
            Ola, {firstName}!
          </div>
          <div style={{ fontSize: 14, color: 'var(--muted2)' }}>
            Aqui esta um resumo da sua conta no MCP.IA
          </div>
        </div>

        {/* MAPA DA JORNADA: 3 passos com mapa ilustrado */}
        <JornadaMapa />


        {/* RANKING DO MES — top 3 com premios no Pix */}
        <RankingCard />


        {/* RESULTADOS RECENTES DE ALUNOS */}
        <div className="anim-fadeUp-2" style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <span style={{ fontSize: 22, display: 'inline-block', animation: 'newsPop 1.8s ease-in-out infinite' }}>💰</span>
            <div style={{ fontSize: 18, fontWeight: 800, fontFamily: 'Syne, sans-serif', color: 'var(--text)' }}>Resultados recentes de alunos</div>
          </div>
          <CarrosselResultados onOpen={setZoomSrc} />
        </div>


        {/* LINKS: GRUPOS E SUPORTE */}
        <div className="anim-fadeUp-3" style={{ marginBottom: 28 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            {[
              { href: 'https://chat.whatsapp.com/EQOJkJWilLjES81OIl6UWg', icon: 'ti-bell-ringing', label: 'Grupo de avisos', sub: 'Entre no grupo do WhatsApp', color: '#16a34a' },
              { href: 'https://chat.whatsapp.com/FMK11OpmjIPIO24ByPNME6', icon: 'ti-messages', label: 'Grupo de depoimentos', sub: 'Veja os resultados dos alunos', color: '#0ea5e9' },
              { href: 'https://wa.me/553791348869', icon: 'ti-brand-whatsapp', label: 'Suporte', sub: 'Fale com a gente no WhatsApp', color: '#7c5cfc' },
            ].map(function(item) {
              return (
                <a key={item.href} href={item.href} target="_blank" rel="noopener noreferrer" className="link-btn" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', borderRadius: 16, background: 'var(--surface)', border: '1px solid ' + item.color + '55' }}>
                  <div style={{ width: 46, height: 46, borderRadius: 14, background: item.color + '1f', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i className={'ti ' + item.icon} style={{ fontSize: 24, color: item.color }} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>{item.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted2)', marginTop: 2 }}>{item.sub}</div>
                  </div>
                  <i className="ti ti-external-link" style={{ marginLeft: 'auto', fontSize: 16, color: item.color, flexShrink: 0 }} />
                </a>
              )
            })}
          </div>
        </div>

        {zoomSrc && (
          <div
            onClick={function() { setZoomSrc(null) }}
            style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, cursor: 'zoom-out', animation: 'fadeUp 0.25s ease both' }}
          >
            <img src={zoomSrc} alt="Resultado de aluno" style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }} />
          </div>
        )}

      </div>
    </div>
  )
}
