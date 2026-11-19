'use client'
import { createClient } from '@/lib/supabase-browser'

const WHATSAPP = '553791348869'

const LINKS: Record<string, string> = {
  Starter: 'https://pay.hub.la/0AueQQcwJxUeV9BE1ax7',
  Pro: 'https://pay.hub.la/16HkQulcBTksGN8AEnow',
  Premium: 'https://pay.hub.la/TwrkZegsChmWcaJ9LO4z',
}

// Alerta vermelho de CONTA SUSPENSA para quem esta com a assinatura em atraso (ordem do Breno): nenhum menu fica disponivel ate o pagamento.
// Ao pagar de novo pela Hubla, o plano volta a ficar ativo sozinho.
export default function PagamentoAtrasado({ name, planName }: { name: string; planName: string }) {
  async function logout() {
    try { await createClient().auth.signOut() } catch (e) {}
    window.location.href = '/login'
  }

  const link = LINKS[planName] || ''

  return (
    <div className="pa-fundo">
      <div className="pa-card" role="alertdialog" aria-modal="true" aria-labelledby="pa-titulo">
        <div className="pa-faixa"><i className="ti ti-alert-octagon" /> ALERTA</div>
        <div className="pa-corpo">
          <div className="pa-icone"><i className="ti ti-lock" /></div>
          <h1 id="pa-titulo" className="pa-titulo">{name ? name + ', sua conta está suspensa' : 'Sua conta está suspensa'}</h1>
          <p className="pa-texto">
            Por falta de pagamento da assinatura do <b>plano {planName || 'da plataforma'}</b>.
          </p>
          <p className="pa-sub">Faça o pagamento para liberar a sua conta. Assim que o pagamento for aprovado, tudo volta ao normal.</p>
          {link ? (
            <a href={link} className="pa-pagar">Fazer o pagamento agora</a>
          ) : (
            <div>
              {Object.keys(LINKS).map(function(n) {
                return <a key={n} href={LINKS[n]} className="pa-pagar">Pagar o plano {n}</a>
              })}
            </div>
          )}
          <a href={'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent('Ola, minha conta esta suspensa por falta de pagamento e preciso de ajuda')} target="_blank" rel="noopener noreferrer" className="pa-ajuda">
            <i className="ti ti-brand-whatsapp" /> Preciso de ajuda
          </a>
          <button onClick={logout} className="pa-sair">Sair da conta</button>
        </div>
      </div>
      <style>{`
        .pa-fundo, .pa-fundo * { box-sizing: border-box; }
        .pa-fundo { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; background: radial-gradient(circle at 50% 0%, rgba(220,38,38,.22), transparent 60%), rgba(20,4,6,.92); }
        .pa-card { width: 100%; max-width: 440px; background: #fff; border-radius: 22px; overflow: hidden; text-align: center; box-shadow: 0 30px 80px rgba(220,38,38,.35); border: 2px solid #dc2626; animation: paPop .45s cubic-bezier(.16,1,.3,1); }
        .pa-faixa { background: #dc2626; color: #fff; font-weight: 900; letter-spacing: .12em; font-size: 13px; padding: 10px; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .pa-faixa i { font-size: 18px; }
        .pa-corpo { padding: 26px 24px 18px; }
        .pa-icone { width: 72px; height: 72px; border-radius: 50%; background: #fee2e2; color: #dc2626; display: flex; align-items: center; justify-content: center; font-size: 36px; margin: 0 auto 14px; box-shadow: 0 0 0 8px rgba(220,38,38,.08); animation: paPulso 1.8s ease-in-out infinite; }
        .pa-titulo { font-family: Syne, sans-serif; font-size: 23px; font-weight: 800; color: #b91c1c; margin: 0 0 8px; line-height: 1.2; }
        .pa-texto { font-size: 16px; color: #1f2937; margin: 0 0 6px; line-height: 1.5; }
        .pa-sub { font-size: 14px; color: #6b7280; margin: 0 0 20px; line-height: 1.55; }
        .pa-pagar { display: block; padding: 16px; border-radius: 14px; background: linear-gradient(135deg, #ef4444, #b91c1c); color: #fff; font-weight: 900; font-size: 17px; text-decoration: none; margin-bottom: 10px; box-shadow: 0 10px 24px rgba(220,38,38,.35); }
        .pa-pagar:hover { filter: brightness(1.06); }
        .pa-ajuda { display: flex; align-items: center; justify-content: center; gap: 6px; padding: 12px; border-radius: 12px; border: 1px solid #e5e7eb; color: #16a34a; font-weight: 800; font-size: 14px; text-decoration: none; margin-bottom: 6px; }
        .pa-sair { background: none; border: 0; cursor: pointer; color: #9ca3af; font-size: 13px; padding: 8px; font-family: inherit; }
        @keyframes paPop { from { opacity: 0; transform: translateY(20px) scale(.95) } to { opacity: 1; transform: none } }
        @keyframes paPulso { 0%,100% { box-shadow: 0 0 0 8px rgba(220,38,38,.08) } 50% { box-shadow: 0 0 0 14px rgba(220,38,38,.14) } }
        @media (prefers-reduced-motion: reduce) { .pa-card, .pa-icone { animation: none } }
      `}</style>
    </div>
  )
}
