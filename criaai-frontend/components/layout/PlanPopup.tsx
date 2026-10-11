'use client'
import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'

// Pop-up para quem tem mais de 7 dias de cadastro e ainda nao tem plano ativo.
// Aparece no maximo 1 vez por dia (por aluno, neste navegador). Admin nunca ve.
const DAYS_AFTER_SIGNUP = 7
const SHOW_EVERY_HOURS = 24

export default function PlanPopup({ profile, user }: { profile: any, user: any }) {
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const isAdmin = !!profile?.is_admin
  const hasActivePlan = profile?.subscription_status === 'active' || profile?.subscription_status === 'trialing'
  const createdAt = profile?.created_at ? new Date(profile.created_at).getTime() : 0
  const oldEnough = createdAt > 0 && (Date.now() - createdAt) >= DAYS_AFTER_SIGNUP * 24 * 60 * 60 * 1000
  const eligible = !isAdmin && !hasActivePlan && oldEnough
  const key = 'mcpia_plan_popup_' + (user?.id || 'anon')

  useEffect(function() {
    if (!eligible) return
    // Nao mostrar na propria pagina de planos/creditos
    if (pathname && (pathname.indexOf('/dashboard/planos') === 0 || pathname.indexOf('/dashboard/creditos') === 0)) return
    try {
      const last = Number(localStorage.getItem(key) || 0)
      if (last && Date.now() - last < SHOW_EVERY_HOURS * 60 * 60 * 1000) return
    } catch (e) {}
    const t = setTimeout(function() { setOpen(true) }, 1500)
    return function() { clearTimeout(t) }
  }, [eligible, pathname, key])

  function close() {
    setOpen(false)
    try { localStorage.setItem(key, String(Date.now())) } catch (e) {}
  }

  function goPlans() {
    close()
    router.push('/dashboard/planos')
  }

  if (!open) return null

  return (
    <div
      onClick={close}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
    >
      <div
        onClick={function(e) { e.stopPropagation() }}
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, maxWidth: 420, width: '100%', padding: '32px 26px 26px', textAlign: 'center', position: 'relative', boxShadow: 'var(--shadow-lg)' }}
      >
        <button
          onClick={close}
          aria-label="Fechar"
          style={{ position: 'absolute', top: 12, right: 12, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '50%', width: 30, height: 30, cursor: 'pointer', color: 'var(--muted2)', fontSize: 16, lineHeight: 1 }}
        >
          <i className="ti ti-x" />
        </button>
        <div style={{ fontSize: 44, marginBottom: 8 }}>🚀</div>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800, color: 'var(--text)', marginBottom: 10 }}>
          Desbloqueie todo o poder da plataforma
        </div>
        <p style={{ fontSize: 14, color: 'var(--muted2)', lineHeight: 1.6, margin: '0 0 20px' }}>
          Com um plano ativo voce gera mais ebooks, paginas de venda e criativos com IA para vender mais pelo Gerenciador de Anuncios.
        </p>
        <button
          onClick={goPlans}
          style={{ width: '100%', padding: '13px 16px', borderRadius: 12, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #5b4ef8, #ec4899)', color: '#fff', fontWeight: 700, fontSize: 15 }}
        >
          Ver planos
        </button>
        <button
          onClick={close}
          style={{ marginTop: 10, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted2)', fontSize: 13 }}
        >
          Agora nao
        </button>
      </div>
    </div>
  )
}
