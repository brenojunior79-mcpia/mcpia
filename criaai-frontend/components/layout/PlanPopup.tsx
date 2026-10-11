'use client'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'

// Pop-up para quem tem mais de 7 dias de cadastro e ainda nao tem plano ativo.
// Aparece no primeiro acesso do dia e so volta a aparecer depois de 3 dias (por aluno, neste navegador). Admin nunca ve.
const DAYS_AFTER_SIGNUP = 7
const SHOW_EVERY_DAYS = 3
const COUPON = 'FE10'
// Checkout direto do plano Pro (mesmo link da pagina de planos)
const PRO_CHECKOUT = 'https://pay.hub.la/16HkQulcBTksGN8AEnow'

function dayNumber(ms: number) {
  // numero do dia no fuso do navegador (para comparar "dias" e nao horas)
  const d = new Date(ms)
  return Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 86400000)
}


const CONFETTI_COLORS = ['#ff4d6d', '#ffd166', '#06d6a0', '#4cc9f0', '#7b61ff', '#f72585', '#ff9f1c', '#2ec4b6']

type Piece = { left: number, delay: number, duration: number, size: number, color: string, kind: 'confetti' | 'ribbon', drift: number, spin: number }

function makePieces(): Piece[] {
  const list: Piece[] = []
  for (let i = 0; i < 70; i++) {
    const ribbon = i % 3 === 0
    list.push({
      left: Math.random() * 100,
      delay: Math.random() * 4,
      duration: 4 + Math.random() * 4,
      size: ribbon ? 6 + Math.random() * 4 : 7 + Math.random() * 8,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      kind: ribbon ? 'ribbon' : 'confetti',
      drift: (Math.random() - 0.5) * 160,
      spin: (Math.random() < 0.5 ? -1 : 1) * (360 + Math.random() * 720),
    })
  }
  return list
}

export default function PlanPopup({ profile, user }: { profile: any, user: any }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [pieces, setPieces] = useState<Piece[]>([])

  const isAdmin = !!profile?.is_admin
  const hasActivePlan = profile?.subscription_status === 'active' || profile?.subscription_status === 'trialing'
  const createdAt = profile?.created_at ? new Date(profile.created_at).getTime() : 0
  const oldEnough = createdAt > 0 && (Date.now() - createdAt) >= DAYS_AFTER_SIGNUP * 24 * 60 * 60 * 1000
  const eligible = !isAdmin && !hasActivePlan && oldEnough
  const firstName = (profile?.full_name || '').split(' ')[0] || ''
  const key = 'mcpia_plan_popup_' + (user?.id || 'anon')

  useEffect(function() {
    if (!eligible) return
    // Nao mostrar na propria pagina de planos/creditos
    if (pathname && (pathname.indexOf('/dashboard/planos') === 0 || pathname.indexOf('/dashboard/creditos') === 0)) return
    try {
      const last = Number(localStorage.getItem(key) || 0)
      if (last && dayNumber(Date.now()) - dayNumber(last) < SHOW_EVERY_DAYS) return
    } catch (e) {}
    const t = setTimeout(function() {
      setPieces(makePieces())
      setOpen(true)
      // marca como mostrado agora, assim nao volta a aparecer ao atualizar a pagina
      try { localStorage.setItem(key, String(Date.now())) } catch (e) {}
    }, 1500)
    return function() { clearTimeout(t) }
  }, [eligible, pathname, key])

  function close() {
    setOpen(false)
  }

  function copyCoupon() {
    try {
      navigator.clipboard.writeText(COUPON)
      setCopied(true)
      setTimeout(function() { setCopied(false) }, 2000)
    } catch (e) {}
  }

  function goPlans() {
    close()
    window.location.href = PRO_CHECKOUT
  }

  if (!open) return null

  return (
    <div
      onClick={close}
      style={{ position: 'fixed', inset: 0, background: 'rgba(10,8,30,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, animation: 'ppFade 0.3s ease' }}
    >
      {/* Confete e fitinhas caindo na tela toda */}
      <div aria-hidden="true" style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 1001 }}>
        {pieces.map(function(c, i) {
          const isRibbon = c.kind === 'ribbon'
          return (
            <span
              key={i}
              className="pp-piece"
              style={{
                position: 'absolute',
                top: -30,
                left: c.left + '%',
                width: isRibbon ? c.size * 0.6 : c.size,
                height: isRibbon ? c.size * 4 : c.size * 0.6,
                background: c.color,
                borderRadius: isRibbon ? 3 : 2,
                opacity: 0.95,
                animation: 'ppFall ' + c.duration + 's linear ' + c.delay + 's infinite',
                ['--drift' as any]: c.drift + 'px',
                ['--spin' as any]: c.spin + 'deg',
              }}
            />
          )
        })}
      </div>

      <div
        onClick={function(e) { e.stopPropagation() }}
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 24, maxWidth: 420, width: '100%', textAlign: 'center', position: 'relative', boxShadow: '0 25px 70px rgba(91,78,248,0.45)', overflow: 'hidden', zIndex: 1002, animation: 'ppPop 0.5s cubic-bezier(.2,1.4,.4,1)' }}
      >
        {/* Topo colorido */}
        <div style={{ background: 'linear-gradient(135deg, #5b4ef8, #ec4899 60%, #ff9f1c)', padding: '28px 20px 44px', position: 'relative' }}>
          <button
            onClick={close}
            aria-label="Fechar"
            style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(255,255,255,0.25)', border: 'none', borderRadius: '50%', width: 30, height: 30, cursor: 'pointer', color: '#fff', fontSize: 16, lineHeight: 1 }}
          >
            <i className="ti ti-x" />
          </button>
          <div style={{ fontSize: 54, lineHeight: 1, animation: 'ppBounce 1.4s ease-in-out infinite' }}>🎁</div>
          <div style={{ marginTop: 10, color: '#fff', fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', opacity: 0.95 }}>
            Presente para você 🎉
          </div>
        </div>

        {/* Selo 10% */}
        <div style={{ marginTop: -30, position: 'relative' }}>
          <div style={{ display: 'inline-block', background: '#fff', color: '#ec4899', fontFamily: 'Syne, sans-serif', fontWeight: 900, fontSize: 30, padding: '8px 22px', borderRadius: 40, boxShadow: '0 8px 22px rgba(0,0,0,0.22)', border: '3px solid #ffd166', animation: 'ppPulse 1.8s ease-in-out infinite' }}>
            10% OFF
          </div>
        </div>

        <div style={{ padding: '18px 26px 26px' }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800, color: 'var(--text)', marginBottom: 14, lineHeight: 1.3 }}>
            Ei{firstName ? ', ' + firstName : ''}! Você acabou de ganhar 10% de desconto no plano Pro
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted2)', marginBottom: 6 }}>Use o cupom</div>
          <button
            onClick={copyCoupon}
            title="Clique para copiar"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '10px 20px', borderRadius: 12, border: '2px dashed #5b4ef8', background: 'rgba(91,78,248,0.08)', color: 'var(--text)', fontWeight: 800, fontSize: 24, letterSpacing: 4, cursor: 'pointer', marginBottom: 6 }}
          >
            {COUPON}
            <i className={'ti ' + (copied ? 'ti-check' : 'ti-copy')} style={{ fontSize: 16, letterSpacing: 0, color: 'var(--muted2)' }} />
          </button>
          <div style={{ fontSize: 11, color: 'var(--muted2)', marginBottom: 20, minHeight: 14 }}>
            {copied ? 'Cupom copiado!' : 'Toque no cupom para copiar'}
          </div>
          <button
            onClick={goPlans}
            style={{ width: '100%', padding: '14px 16px', borderRadius: 12, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #5b4ef8, #ec4899)', color: '#fff', fontWeight: 800, fontSize: 16, boxShadow: '0 8px 20px rgba(236,72,153,0.4)', animation: 'ppPulse 1.8s ease-in-out infinite' }}
          >
            Aproveitar o desconto
          </button>
          <button
            onClick={close}
            style={{ marginTop: 10, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted2)', fontSize: 13 }}
          >
            Agora nao
          </button>
        </div>
      </div>

      <style>{`
        @keyframes ppFade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes ppPop { from { opacity: 0; transform: scale(0.8) translateY(20px) } to { opacity: 1; transform: scale(1) translateY(0) } }
        @keyframes ppBounce { 0%, 100% { transform: translateY(0) rotate(-6deg) } 50% { transform: translateY(-8px) rotate(6deg) } }
        @keyframes ppPulse { 0%, 100% { transform: scale(1) } 50% { transform: scale(1.05) } }
        @keyframes ppFall {
          0% { transform: translate3d(0, -30px, 0) rotate(0deg) }
          100% { transform: translate3d(var(--drift), 110vh, 0) rotate(var(--spin)) }
        }
        @media (prefers-reduced-motion: reduce) {
          .pp-piece { display: none }
        }
      `}</style>
    </div>
  )
}
