'use client'
import { createClient } from '@/lib/supabase-browser'

const WHATSAPP = '553791348869'

const LINKS: Record<string, string> = {
  Starter: 'https://pay.hub.la/0AueQQcwJxUeV9BE1ax7',
  Pro: 'https://pay.hub.la/16HkQulcBTksGN8AEnow',
  Premium: 'https://pay.hub.la/TwrkZegsChmWcaJ9LO4z',
}

// Pop-up unico para quem esta com a assinatura em atraso: nenhum menu fica disponivel ate o pagamento.
// Ao pagar de novo pela Hubla, o plano volta a ficar ativo sozinho.
export default function PagamentoAtrasado({ name, planName }: { name: string; planName: string }) {
  async function logout() {
    try { await createClient().auth.signOut() } catch (e) {}
    window.location.href = '/login'
  }

  const link = LINKS[planName] || ''

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 440, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 24, padding: '36px 28px', textAlign: 'center', boxShadow: '0 24px 64px rgba(0,0,0,0.12)' }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 26, marginBottom: 22 }}>
          MCP<span style={{ color: 'var(--accent2)' }}>.IA</span>
        </div>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(245,158,11,0.14)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, margin: '0 auto 16px' }}>
          <i className="ti ti-alert-triangle" />
        </div>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 21, fontWeight: 800, margin: '0 0 10px', color: 'var(--text)' }}>
          {name ? name + ', sua assinatura está em atraso' : 'Sua assinatura está em atraso'}
        </h1>
        <p style={{ fontSize: 14, color: 'var(--muted2)', lineHeight: 1.7, margin: '0 0 22px' }}>
          Não conseguimos receber o pagamento da sua assinatura{planName ? ' (plano ' + planName + ')' : ''}.
          Seu acesso fica bloqueado até a regularização. Assim que o pagamento for feito, tudo volta ao normal.
        </p>
        {link ? (
          <a href={link} style={{ display: 'block', padding: '14px 16px', borderRadius: 12, background: 'linear-gradient(135deg, #7c3aed, #5b21b6)', color: '#fff', fontWeight: 800, fontSize: 15, textDecoration: 'none', marginBottom: 12 }}>
            Regularizar pagamento
          </a>
        ) : (
          <div style={{ marginBottom: 12 }}>
            {Object.keys(LINKS).map(function(n) {
              return (
                <a key={n} href={LINKS[n]} style={{ display: 'block', padding: '12px 16px', borderRadius: 12, background: 'linear-gradient(135deg, #7c3aed, #5b21b6)', color: '#fff', fontWeight: 800, fontSize: 14, textDecoration: 'none', marginBottom: 8 }}>
                  Regularizar com o plano {n}
                </a>
              )
            })}
          </div>
        )}
        <a
          href={'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent('Ola, minha assinatura esta em atraso e preciso de ajuda')}
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
