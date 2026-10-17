'use client'
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

const NEWS_PLATFORM = {
  name: 'Kaiross',
  tag: 'Produtos fisicos com entrega gerenciada',
  image: 'https://app.kaiross.com.br/_next/image?url=%2FLOGO-MENU.png&w=256&q=75',
  color: '#f97316',
  href: '/dashboard/plataformas',
}

const NEWS_PRODUCTS = [
  { name: 'Manual Biblico Digital', image: 'https://excelenciacrista.com.br/wp-content/uploads/2026/01/5-1-1024x1024.png', color: '#3b82f6', fit: 'cover' },
  { name: '700 Receitas de Bolos e Tortas', image: 'https://vida-nova-oficial.com/wp-content/uploads/2024/04/Design_sem_nome__41_-removebg.png', color: '#f97316', fit: 'contain' },
]

// Prints de resultados de alunos: coloque as imagens em public/resultados/ com os nomes resultado-1, resultado-2 e resultado-3
// (aceita .png, .jpg, .jpeg ou .webp). Se uma imagem nao existir, ela simplesmente nao aparece.
const RESULT_IDS = [1, 2, 3]
const RESULT_EXTS = ['png', 'jpg', 'jpeg', 'webp']

function ResultImage({ id, onOpen, onLoaded, delay }: { id: number; onOpen: (src: string) => void; onLoaded: () => void; delay: number }) {
  const [extIdx, setExtIdx] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const failed = extIdx >= RESULT_EXTS.length
  if (failed) return null
  const src = '/resultados/resultado-' + id + '.' + RESULT_EXTS[extIdx]
  return (
    <div
      className="result-card"
      onClick={function() { if (loaded) onOpen(src) }}
      style={{ display: loaded ? 'block' : 'none', animation: 'fadeUp 0.6s ease both ' + delay + 's', borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'zoom-in', position: 'relative' }}
    >
      <img
        src={src}
        alt={'Resultado de aluno ' + id}
        onLoad={function() { setLoaded(true); onLoaded() }}
        onError={function() { setExtIdx(extIdx + 1) }}
        style={{ width: '100%', height: 'auto', display: 'block' }}
      />
    </div>
  )
}

export default function DashboardPage() {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [zoomSrc, setZoomSrc] = useState<string | null>(null)
  const [resultsLoaded, setResultsLoaded] = useState(0)
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

        {/* PASSO A PASSO 3 ETAPAS — mapa do tesouro */}
        <div className="anim-fadeUp" style={{ marginBottom: 28 }}>
          <div
            style={{
              position: 'relative',
              overflow: 'hidden',
              background: 'linear-gradient(160deg, #f1e2b8 0%, #e4c98d 45%, #d2b06d 100%)',
              border: '2px solid #8b6b3d',
              borderRadius: 20,
              padding: '26px 30px 24px',
              boxShadow: '0 10px 28px rgba(139,107,61,0.25), inset 0 0 70px rgba(139,107,61,0.18)',
            }}
          >
            {/* manchas de envelhecimento do pergaminho */}
            <div style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              background: 'radial-gradient(circle at 12% 18%, rgba(139,107,61,0.18), transparent 26%), radial-gradient(circle at 88% 78%, rgba(139,107,61,0.2), transparent 30%), radial-gradient(circle at 55% 95%, rgba(139,107,61,0.12), transparent 25%), radial-gradient(circle at 95% 15%, rgba(139,107,61,0.14), transparent 22%)',
            }} />
            {/* bordas enroladas do pergaminho */}
            <div style={{ position: 'absolute', left: -12, top: 6, bottom: 6, width: 22, borderRadius: 12, background: 'linear-gradient(90deg, #7a5c30, #d2b06d)', boxShadow: '2px 0 8px rgba(0,0,0,0.25)' }} />
            <div style={{ position: 'absolute', right: -12, top: 6, bottom: 6, width: 22, borderRadius: 12, background: 'linear-gradient(270deg, #7a5c30, #d2b06d)', boxShadow: '-2px 0 8px rgba(0,0,0,0.25)' }} />

            {/* rosa dos ventos decorativa */}
            <svg viewBox="0 0 100 100" width={56} height={56} style={{ position: 'absolute', top: 14, right: 40, opacity: 0.55 }}>
              <circle cx="50" cy="50" r="45" fill="none" stroke="#5c4326" strokeWidth="1.5" />
              <polygon points="50,5 58,50 50,95 42,50" fill="#5c4326" />
              <polygon points="5,50 50,42 95,50 50,58" fill="#5c4326" />
              <polygon points="50,20 63,50 50,50 37,50" fill="#8b6b3d" />
              <text x="50" y="16" fontSize="11" fontWeight="700" textAnchor="middle" fill="#5c4326">N</text>
              <text x="50" y="97" fontSize="11" fontWeight="700" textAnchor="middle" fill="#5c4326">S</text>
              <text x="9" y="54" fontSize="11" fontWeight="700" textAnchor="middle" fill="#5c4326">O</text>
              <text x="91" y="54" fontSize="11" fontWeight="700" textAnchor="middle" fill="#5c4326">L</text>
            </svg>

            <div style={{ position: 'relative', fontSize: 11, fontWeight: 800, color: '#5c4326', marginBottom: 22, textTransform: 'uppercase', letterSpacing: '0.12em', display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'Syne, sans-serif' }}>
              <span style={{ fontSize: 15 }}>🗺️</span> Sua jornada em 3 passos
            </div>

            {/* trilha pontilhada conectando os passos */}
            <svg viewBox="0 0 900 40" preserveAspectRatio="none" style={{ position: 'absolute', top: 78, left: '16.5%', width: '67%', height: 30, zIndex: 0 }}>
              <path d="M 0 20 Q 225 -6, 450 20 T 900 20" fill="none" stroke="#5c4326" strokeWidth="3" strokeDasharray="9 10" strokeLinecap="round" opacity="0.55" />
            </svg>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, position: 'relative', zIndex: 1 }}>
              {[
                { num: 1, icon: '🎯', label: 'Plataformas e Produtos', desc: 'Cadastre-se nas plataformas parceiras e escolha o produto que vai vender', href: '/dashboard/plataformas', color: '#7c5cfc' },
                { num: 2, icon: '📦', label: 'Prepare o material', desc: 'Assista as aulas de criativos manuais. O material do produto tambem pode estar na descricao dele, em Produtos em Alta', href: '/dashboard/criativos-manuais', color: '#c8891a' },
                { num: 3, icon: '💰', label: 'Venda no automatico', desc: 'Crie anuncios e venda enquanto dorme', href: '/dashboard/vendas', color: '#2f9e5c' },
              ].map(function(step) {
                return (
                  <Link key={step.num} href={step.href} style={{ textDecoration: 'none' }}>
                    <div className="card-hover" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '0 6px', cursor: 'pointer' }}>
                      <div style={{
                        width: 60, height: 60, borderRadius: '50%', background: '#fbf3dc',
                        border: '3px solid ' + step.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 26, boxShadow: '0 6px 14px rgba(92,67,38,0.3)', marginBottom: 10, position: 'relative',
                      }}>
                        {step.icon}
                        {step.num === 3 && (
                          <span style={{ position: 'absolute', top: -18, right: -8, fontSize: 20 }}>🚩</span>
                        )}
                      </div>
                      <div style={{ fontSize: 10, fontWeight: 800, color: step.color, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Passo {step.num}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#3d2b16' }}>{step.label}</div>
                      <div style={{ fontSize: 11, color: '#6b5433', lineHeight: 1.5, marginTop: 4 }}>{step.desc}</div>
                      <div style={{ marginTop: 12, fontSize: 12, color: step.color, fontWeight: 700 }}>Acessar →</div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>


        {/* NOVIDADES DA SEMANA */}
        <div className="anim-fadeUp-1" style={{ marginBottom: 28 }}>
          <div style={{
            borderRadius: 22, padding: 2,
            background: 'linear-gradient(90deg, #7c5cfc, #f97316, #22c55e, #7c5cfc)',
            backgroundSize: '200% 100%', animation: 'newsBorder 5s linear infinite',
          }}>
            <div style={{ position: 'relative', overflow: 'hidden', background: 'var(--surface)', borderRadius: 20, padding: '22px 22px 24px' }}>
              <div style={{ position: 'absolute', top: -60, right: -40, width: 220, height: 220, background: 'radial-gradient(circle, rgba(124,92,252,0.14) 0%, transparent 70%)', pointerEvents: 'none' }} />

              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                <span style={{ fontSize: 22, display: 'inline-block', animation: 'newsPop 1.6s ease-in-out infinite' }}>🔥</span>
                <div style={{ fontSize: 18, fontWeight: 800, fontFamily: 'Syne, sans-serif', color: 'var(--text)' }}>Novidades da semana</div>
                <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', color: '#fff', background: 'linear-gradient(135deg, #ef4444, #f97316)', padding: '4px 10px', borderRadius: 99, animation: 'newsPop 1.6s ease-in-out infinite' }}>NOVO</span>
              </div>

              <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>

                {/* Nova plataforma */}
                <Link href={NEWS_PLATFORM.href} style={{ textDecoration: 'none' }}>
                  <div className="news-card" style={{ position: 'relative', overflow: 'hidden', height: '100%', minHeight: 200, borderRadius: 16, padding: '20px 20px 18px', background: 'linear-gradient(145deg, ' + NEWS_PLATFORM.color + '22, ' + NEWS_PLATFORM.color + '08)', border: '1px solid ' + NEWS_PLATFORM.color + '55', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', cursor: 'pointer' }}>
                    <div style={{ position: 'absolute', top: 0, bottom: 0, width: 60, left: 0, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)', animation: 'newsShine 4s ease-in-out infinite', pointerEvents: 'none' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ position: 'relative', width: 78, height: 78, flexShrink: 0 }}>
                        <div style={{ position: 'absolute', inset: 0, borderRadius: 20, border: '2px solid ' + NEWS_PLATFORM.color, animation: 'newsRing 2.2s ease-out infinite' }} />
                        <div style={{ position: 'relative', width: 78, height: 78, borderRadius: 20, background: '#fff', border: '2px solid ' + NEWS_PLATFORM.color, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', animation: 'float 4s ease-in-out infinite', boxShadow: '0 10px 24px ' + NEWS_PLATFORM.color + '55' }}>
                          <img src={NEWS_PLATFORM.image} alt={NEWS_PLATFORM.name} style={{ width: '82%', height: '82%', objectFit: 'contain' }} />
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: NEWS_PLATFORM.color, marginBottom: 4 }}>Nova plataforma liberada</div>
                        <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'Syne, sans-serif', color: 'var(--text)' }}>{NEWS_PLATFORM.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted2)', marginTop: 2 }}>{NEWS_PLATFORM.tag}</div>
                      </div>
                    </div>
                    <div style={{ marginTop: 16, fontSize: 13, fontWeight: 700, color: NEWS_PLATFORM.color }}>Conferir plataforma →</div>
                  </div>
                </Link>

                {/* Novos produtos */}
                <Link href="/dashboard/produtos" style={{ textDecoration: 'none' }}>
                  <div className="news-card" style={{ position: 'relative', overflow: 'hidden', height: '100%', minHeight: 200, borderRadius: 16, padding: '20px 20px 18px', background: 'linear-gradient(145deg, rgba(34,197,94,0.14), rgba(34,197,94,0.04))', border: '1px solid rgba(34,197,94,0.4)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', cursor: 'pointer' }}>
                    <div style={{ position: 'absolute', top: 0, bottom: 0, width: 60, left: 0, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)', animation: 'newsShine 4s ease-in-out 1.5s infinite', pointerEvents: 'none' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ position: 'relative', width: 120, height: 84, flexShrink: 0 }}>
                        {NEWS_PRODUCTS.map(function(prod, idx) {
                          return (
                            <div key={prod.name} style={{ position: 'absolute', top: idx === 0 ? 0 : 6, left: idx === 0 ? 0 : 44, width: 74, height: 74, borderRadius: 16, background: '#fff', border: '2px solid ' + prod.color, overflow: 'hidden', boxShadow: '0 10px 22px rgba(0,0,0,0.22)', animation: (idx === 0 ? 'newsFloatA 3.6s' : 'newsFloatB 4.2s') + ' ease-in-out infinite', zIndex: idx + 1 }}>
                              <img src={prod.image} alt={prod.name} style={{ width: '100%', height: '100%', objectFit: prod.fit as any }} />
                            </div>
                          )
                        })}
                      </div>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#16a34a', marginBottom: 4 }}>Novos produtos</div>
                        <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'Syne, sans-serif', color: 'var(--text)', lineHeight: 1.15 }}>2 novos produtos liberados</div>
                        <div style={{ fontSize: 12, color: 'var(--muted2)', marginTop: 2 }}>Confira!</div>
                      </div>
                    </div>
                    <div style={{ marginTop: 16, fontSize: 13, fontWeight: 700, color: '#16a34a' }}>Ver produtos →</div>
                  </div>
                </Link>

              </div>
            </div>
          </div>
        </div>


        {/* RESULTADOS RECENTES DE ALUNOS */}
        <div className="anim-fadeUp-2" style={{ marginBottom: 28 }}>
          <div style={{ display: resultsLoaded > 0 ? 'flex' : 'none', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <span style={{ fontSize: 22, display: 'inline-block', animation: 'newsPop 1.8s ease-in-out infinite' }}>💰</span>
            <div style={{ fontSize: 18, fontWeight: 800, fontFamily: 'Syne, sans-serif', color: 'var(--text)' }}>Resultados recentes de alunos</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, alignItems: 'start' }}>
            {RESULT_IDS.map(function(id, idx) {
              return <ResultImage key={id} id={id} delay={0.1 + idx * 0.15} onOpen={setZoomSrc} onLoaded={function() { setResultsLoaded(function(n) { return n + 1 }) }} />
            })}
          </div>
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
