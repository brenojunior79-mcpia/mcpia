'use client'
import { createClient } from '@/lib/supabase-browser'

const WHATSAPP = '553791348869'

// Tela unica para quem teve o pagamento reembolsado: nenhum menu fica disponivel.
export default function RefundBlocked({ name }: { name: string }) {
  async function logout() {
    try { await createClient().auth.signOut() } catch (e) {}
    window.location.href = '/login'
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 440, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 24, padding: '36px 28px', textAlign: 'center', boxShadow: '0 24px 64px rgba(0,0,0,0.12)' }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 26, marginBottom: 22 }}>
          MCP<span style={{ color: 'var(--accent2)' }}>.IA</span>
        </div>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(239,68,68,0.12)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, margin: '0 auto 16px' }}>
          <i className="ti ti-lock" />
        </div>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 21, fontWeight: 800, margin: '0 0 10px', color: 'var(--text)' }}>
          {name ? name + ', seu acesso foi encerrado' : 'Seu acesso foi encerrado'}
        </h1>
        <p style={{ fontSize: 14, color: 'var(--muted2)', lineHeight: 1.7, margin: '0 0 22px' }}>
          Seu pagamento foi reembolsado, por isso o acesso à plataforma foi encerrado.
          Se você acha que isso foi um engano ou quer voltar, fale com o nosso suporte.
        </p>
        <a
          href={'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent('Ola, meu acesso foi encerrado por reembolso e preciso de ajuda')}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'block', padding: '14px 16px', borderRadius: 12, background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: '#fff', fontWeight: 800, fontSize: 15, textDecoration: 'none', marginBottom: 12 }}
        >
          Falar com o suporte
        </a>
        <button onClick={logout} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted2)', fontSize: 13 }}>
          Sair da conta
        </button>
      </div>
    </div>
  )
}
