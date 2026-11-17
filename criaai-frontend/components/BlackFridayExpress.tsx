'use client'
// Black Friday da Estrutura Express 2.0: o mesmo bloco aparece no pop-up do dia, na tela da Estrutura Express
// (no lugar da oferta, para quem ainda nao tem) e como faixa no topo das aulas (para quem ja tem).
// Para trocar o link do grupo, a data da aula ou a lista, mude so as constantes abaixo.

export const BF_LINK_GRUPO = 'https://chat.whatsapp.com/HHgJ8ivnyRhFfpd3lJkKzb?s=cl&p=i&iam=2'
export const BF_AULA = 'Aula ao vivo na terça, 24/11'
export const BF_ITENS = ['Produtos prontos', 'Criativos prontos', 'Funil pronto', 'Seu site pronto', 'Produtos em assinaturas']

type Modo = 'popup' | 'pagina' | 'faixa'

export default function BlackFridayExpress({ modo, onEntrar }: { modo: Modo; onEntrar?: () => void }) {
  const faixa = modo === 'faixa'
  return (
    <div className={'bf-caixa bf-' + modo}>
      <span className="bf-brilho" aria-hidden="true" />
      <span className="bf-bola bf-b1" aria-hidden="true" />
      <span className="bf-bola bf-b2" aria-hidden="true" />
      <span className="bf-bola bf-b3" aria-hidden="true" />
      <div className="bf-conteudo">
        <div className="bf-selo"><span className="bf-ponto" />Grupo VIP aberto</div>
        <div className="bf-black">BLACK FRIDAY</div>
        <h2 className="bf-titulo">da Estrutura Express <span>2.0</span></h2>
        {!faixa && (
          <ul className="bf-lista">
            {BF_ITENS.map(function(t, i) { return <li key={t} style={{ animationDelay: (0.15 + i * 0.08) + 's' }}><span>✅</span>{t}</li> })}
          </ul>
        )}
        {faixa && <div className="bf-linha">{BF_ITENS.map(function(t) { return '✅ ' + t }).join('   ')}</div>}
        <div className="bf-aula"><i className="ti ti-broadcast" />{BF_AULA}: a Black Friday será liberada ao vivo e você aprende a usar a Estrutura Express 2.0.</div>
        <a href={BF_LINK_GRUPO} target="_blank" rel="noopener noreferrer" className="bf-cta" onClick={function() { if (onEntrar) onEntrar() }}>
          <span className="bf-cta-luz" aria-hidden="true" />
          <i className="ti ti-brand-whatsapp" />Entre no grupo para participar da Black
        </a>
        <div className="bf-nota">É grátis entrar no grupo. As novidades e o link da aula saem lá primeiro.</div>
      </div>
      <style>{`
        .bf-caixa { position: relative; overflow: hidden; color: #fff; text-align: center; background:
          radial-gradient(90% 70% at 0% 0%, rgba(255,61,127,.55) 0%, transparent 60%),
          radial-gradient(80% 70% at 100% 10%, rgba(255,170,0,.55) 0%, transparent 60%),
          radial-gradient(90% 80% at 50% 110%, rgba(124,58,237,.7) 0%, transparent 65%),
          linear-gradient(160deg, #120b24 0%, #0a0612 100%); }
        .bf-popup { border-radius: 26px; padding: 30px 22px 22px; }
        .bf-pagina { border-radius: 24px; padding: 44px 24px 34px; }
        .bf-faixa { border-radius: 20px; padding: 22px 20px 20px; margin-bottom: 20px; }
        .bf-brilho { position: absolute; inset: -50% -30% auto; height: 200%; background: conic-gradient(from 0deg, transparent 0 70%, rgba(255,255,255,.14) 80%, transparent 90%); animation: bfGira 10s linear infinite; pointer-events: none; }
        .bf-bola { position: absolute; border-radius: 50%; filter: blur(2px); opacity: .9; pointer-events: none; animation: bfFlutua 5s ease-in-out infinite; }
        .bf-b1 { width: 14px; height: 14px; background: #ffd400; top: 18%; left: 8%; }
        .bf-b2 { width: 10px; height: 10px; background: #ff3d7f; top: 12%; right: 12%; animation-delay: 1.2s; }
        .bf-b3 { width: 12px; height: 12px; background: #22d3ee; bottom: 22%; right: 7%; animation-delay: 2.1s; }
        .bf-conteudo { position: relative; max-width: 560px; margin: 0 auto; }
        .bf-selo { display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; border-radius: 99px; background: rgba(255,255,255,.12); border: 1px solid rgba(255,255,255,.25); font-size: 12.5px; font-weight: 800; letter-spacing: .3px; }
        .bf-ponto { width: 8px; height: 8px; border-radius: 99px; background: #4ade80; animation: bfPonto 1.6s ease-out infinite; }
        .bf-black { margin: 14px 0 2px; font-family: Syne, sans-serif; font-weight: 800; letter-spacing: .02em; line-height: 1; font-size: clamp(34px, 9vw, 58px);
          background: linear-gradient(90deg, #ffd400, #ff8a00, #ff3d7f, #ffd400); background-size: 300% 100%; -webkit-background-clip: text; background-clip: text; color: transparent; animation: bfCor 4s linear infinite; filter: drop-shadow(0 4px 18px rgba(255,138,0,.45)); }
        .bf-faixa .bf-black { font-size: clamp(28px, 6vw, 40px); }
        .bf-titulo { margin: 4px 0 16px; font-family: Syne, sans-serif; font-weight: 800; font-size: clamp(20px, 4.6vw, 28px); line-height: 1.15; color: #fff; }
        .bf-titulo span { display: inline-block; padding: 0 10px; border-radius: 10px; background: linear-gradient(135deg, #ff3d7f, #7c3aed); }
        .bf-lista { list-style: none; margin: 0 auto 16px; padding: 0; display: grid; gap: 8px; max-width: 360px; text-align: left; }
        .bf-lista li { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 14px; background: rgba(255,255,255,.09); border: 1px solid rgba(255,255,255,.16); font-size: 16px; font-weight: 800; opacity: 0; animation: bfEntra .45s cubic-bezier(.16,1,.3,1) forwards; }
        .bf-linha { font-size: 14px; font-weight: 700; opacity: .95; margin: 0 0 14px; white-space: pre-wrap; line-height: 1.7; }
        .bf-aula { display: flex; align-items: flex-start; gap: 10px; text-align: left; margin: 0 auto 18px; max-width: 420px; padding: 12px 14px; border-radius: 14px; background: rgba(255,212,0,.14); border: 1px solid rgba(255,212,0,.45); color: #fff3b0; font-size: 14.5px; font-weight: 700; line-height: 1.45; }
        .bf-aula .ti { font-size: 22px; color: #ffd400; flex-shrink: 0; margin-top: 1px; }
        .bf-cta { position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center; gap: 10px; width: 100%; max-width: 420px; margin: 0 auto; padding: 17px 18px; border-radius: 16px; background: linear-gradient(135deg, #25d366, #128c7e); color: #fff; font-weight: 800; font-size: 17.5px; text-decoration: none; box-shadow: 0 10px 28px rgba(37,211,102,.45); animation: bfChama 2.2s ease-in-out 1s infinite; box-sizing: border-box; }
        .bf-cta .ti { font-size: 24px; }
        .bf-cta:hover { filter: brightness(1.06); }
        .bf-cta:focus-visible { outline: 3px solid #ffd400; outline-offset: 3px; }
        .bf-cta-luz { position: absolute; top: 0; bottom: 0; left: -40%; width: 30%; background: linear-gradient(90deg, transparent, rgba(255,255,255,.5), transparent); transform: skewX(-20deg); animation: bfLuz 2.6s ease-in-out .8s infinite; }
        .bf-nota { margin-top: 10px; font-size: 12.5px; opacity: .75; }
        @keyframes bfGira { to { transform: rotate(360deg) } }
        @keyframes bfCor { to { background-position: 300% 0 } }
        @keyframes bfFlutua { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-10px) } }
        @keyframes bfPonto { 0% { box-shadow: 0 0 0 0 rgba(74,222,128,.7) } 100% { box-shadow: 0 0 0 10px rgba(74,222,128,0) } }
        @keyframes bfEntra { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: none } }
        @keyframes bfLuz { 0% { left: -40% } 60%,100% { left: 130% } }
        @keyframes bfChama { 0%,100% { transform: scale(1) } 50% { transform: scale(1.03) } }
        @media (prefers-reduced-motion: reduce) { .bf-brilho, .bf-bola, .bf-black, .bf-ponto, .bf-cta, .bf-cta-luz { animation: none !important } .bf-lista li { animation: none; opacity: 1 } }
      `}</style>
    </div>
  )
}
