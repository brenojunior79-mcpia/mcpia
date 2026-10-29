'use client'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

// "Como instalar": passo a passo para colocar a plataforma na tela de inicio (iPhone), instalar no Android ou no computador.
type Aba = 'iphone' | 'android' | 'computador'

const COR = '#7c5cfc'
const caixaIlu: React.CSSProperties = { width: 150, height: 104, flexShrink: 0, borderRadius: 14, background: 'var(--surface2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }

function Ilu({ children }: { children: React.ReactNode }) {
  return <div style={caixaIlu}><svg width="140" height="96" viewBox="0 0 140 96" fill="none">{children}</svg></div>
}

// Pequenos desenhos de cada passo
const IcoCompartilhar = (
  <g stroke={COR} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <rect x="48" y="40" width="44" height="40" rx="8" fill="var(--surface)" />
    <path d="M70 58V18M58 29l12-12 12 12" />
  </g>
)
const Navegador = (extra: React.ReactNode) => (
  <g>
    <rect x="8" y="10" width="124" height="76" rx="9" fill="var(--surface)" stroke="var(--border2)" strokeWidth="2" />
    <rect x="8" y="10" width="124" height="18" rx="9" fill="var(--surface2)" />
    <rect x="30" y="14" width="70" height="10" rx="5" fill="var(--surface)" stroke="var(--border2)" />
    {extra}
  </g>
)

function passos(aba: Aba): { t: string; d: string; ilu: React.ReactNode }[] {
  if (aba === 'iphone') return [
    { t: 'Abra no Safari', d: 'No iPhone e no iPad, só o Safari consegue instalar. Se você abriu por outro navegador ou pelo WhatsApp, copie o endereço www.mcpia.site e cole no Safari.', ilu: <g><rect x="40" y="6" width="60" height="84" rx="12" fill="var(--surface)" stroke="var(--border2)" strokeWidth="2" /><circle cx="70" cy="44" r="16" stroke={COR} strokeWidth="3" /><path d="M70 28v32M54 44h32" stroke={COR} strokeWidth="2" /></g> },
    { t: 'Toque em Compartilhar', d: 'É o quadradinho com uma seta para cima, na barra de baixo da tela (no iPad fica no alto).', ilu: <g><rect x="22" y="6" width="96" height="84" rx="12" fill="var(--surface)" stroke="var(--border2)" strokeWidth="2" /><rect x="22" y="68" width="96" height="22" rx="0" fill="var(--surface2)" />{IcoCompartilhar && <g transform="translate(47.6 63.6) scale(.32)">{IcoCompartilhar}</g>}</g> },
    { t: 'Escolha "Adicionar à Tela de Início"', d: 'Role a lista para cima até achar essa opção (tem um quadradinho com um sinal de +) e toque nela.', ilu: <g><rect x="20" y="8" width="100" height="80" rx="12" fill="var(--surface)" stroke="var(--border2)" strokeWidth="2" /><rect x="30" y="52" width="80" height="22" rx="7" fill={COR} /><path d="M40 63h14M47 56v14" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" /><rect x="62" y="60" width="38" height="6" rx="3" fill="#fff" /><rect x="30" y="20" width="80" height="22" rx="7" fill="var(--surface2)" /></g> },
    { t: 'Toque em "Adicionar"', d: 'Fica no canto de cima, à direita. Pronto: o ícone da plataforma aparece na sua tela de início e abre em tela cheia.', ilu: <g><rect x="20" y="8" width="100" height="80" rx="12" fill="var(--surface)" stroke="var(--border2)" strokeWidth="2" /><rect x="76" y="14" width="38" height="16" rx="8" fill={COR} /><rect x="83" y="20" width="24" height="4" rx="2" fill="#fff" /><rect x="52" y="44" width="36" height="36" rx="9" fill={COR} /></g> },
  ]
  if (aba === 'android') return [
    { t: 'Abra no Chrome', d: 'Entre em www.mcpia.site pelo Google Chrome (é o navegador que mais funciona para instalar).', ilu: <g><rect x="40" y="6" width="60" height="84" rx="12" fill="var(--surface)" stroke="var(--border2)" strokeWidth="2" /><circle cx="70" cy="44" r="16" stroke={COR} strokeWidth="3" /><circle cx="70" cy="44" r="6" fill={COR} /></g> },
    { t: 'Toque nos 3 pontinhos', d: 'Ficam no canto de cima, à direita da tela.', ilu: <g><rect x="22" y="6" width="96" height="84" rx="12" fill="var(--surface)" stroke="var(--border2)" strokeWidth="2" /><rect x="22" y="6" width="96" height="20" rx="12" fill="var(--surface2)" /><circle cx="104" cy="12" r="2.6" fill={COR} /><circle cx="104" cy="18" r="2.6" fill={COR} /><circle cx="104" cy="24" r="2.6" fill={COR} /></g> },
    { t: 'Escolha "Instalar app"', d: 'Em alguns celulares o nome é "Adicionar à tela inicial". Toque nessa opção.', ilu: <g><rect x="20" y="8" width="100" height="80" rx="12" fill="var(--surface)" stroke="var(--border2)" strokeWidth="2" /><rect x="30" y="20" width="80" height="14" rx="5" fill="var(--surface2)" /><rect x="30" y="40" width="80" height="22" rx="7" fill={COR} /><rect x="42" y="48" width="50" height="6" rx="3" fill="#fff" /><rect x="30" y="68" width="80" height="12" rx="5" fill="var(--surface2)" /></g> },
    { t: 'Confirme em "Instalar"', d: 'O ícone da plataforma aparece na sua tela e abre em tela cheia, como um aplicativo.', ilu: <g><rect x="20" y="20" width="100" height="56" rx="12" fill="var(--surface)" stroke="var(--border2)" strokeWidth="2" /><rect x="34" y="30" width="22" height="22" rx="6" fill={COR} /><rect x="62" y="34" width="44" height="6" rx="3" fill="var(--border2)" /><rect x="72" y="56" width="38" height="14" rx="7" fill={COR} /></g> },
  ]
  return [
    { t: 'Clique no ícone de instalar', d: 'Fica na ponta direita da barra de endereço (um monitor com uma seta para baixo). Se não aparecer, use o menu de 3 pontos e procure por "Instalar".', ilu: Navegador(<g><circle cx="116" cy="19" r="6" fill={COR} /><path d="M116 15v7M113 19.5l3 3 3-3" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></g>) },
    { t: 'Confirme em "Instalar"', d: 'A plataforma passa a abrir em janela própria, sem abas, como um programa instalado. Funciona no Chrome e no Edge.', ilu: Navegador(<g><rect x="70" y="32" width="56" height="44" rx="8" fill="var(--surface)" stroke="var(--border2)" strokeWidth="2" /><rect x="78" y="40" width="14" height="14" rx="4" fill={COR} /><rect x="96" y="42" width="24" height="5" rx="2.5" fill="var(--border2)" /><rect x="94" y="60" width="26" height="10" rx="5" fill={COR} /></g>) },
  ]
}

export default function ComoInstalarModal({ onFechar }: { onFechar: () => void }) {
  const [aba, setAba] = useState<Aba>('computador')

  useEffect(function() {
    try {
      const ua = navigator.userAgent || ''
      if (/iphone|ipad|ipod/i.test(ua) || (/Macintosh/i.test(ua) && (navigator as any).maxTouchPoints > 1)) setAba('iphone')
      else if (/android/i.test(ua)) setAba('android')
    } catch (e) {}
    function esc(e: KeyboardEvent) { if (e.key === 'Escape') onFechar() }
    window.addEventListener('keydown', esc)
    return function() { window.removeEventListener('keydown', esc) }
  }, [])

  if (typeof document === 'undefined') return null
  const lista = passos(aba)
  const abas: { id: Aba; nome: string; icone: string }[] = [
    { id: 'iphone', nome: 'iPhone / iPad', icone: '🍎' },
    { id: 'android', nome: 'Android', icone: '🤖' },
    { id: 'computador', nome: 'Computador', icone: '🖥️' },
  ]

  return createPortal(
    <div onClick={onFechar} style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 14 }}>
      <div onClick={function(e) { e.stopPropagation() }} style={{ width: '100%', maxWidth: 640, maxHeight: '92vh', display: 'flex', flexDirection: 'column', background: 'var(--surface)', color: 'var(--text)', borderRadius: 22, boxShadow: '0 24px 60px rgba(0,0,0,.4)', overflow: 'hidden' }}>
        <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 19 }}>Instalar a plataforma no seu aparelho</div>
            <div style={{ fontSize: 13, color: 'var(--muted2)', marginTop: 3 }}>Depois de instalada, ela abre direto pelo ícone, em tela cheia e sem a barra do navegador.</div>
          </div>
          <button onClick={onFechar} aria-label="Fechar" style={{ border: 0, background: 'var(--surface2)', color: 'var(--text)', width: 32, height: 32, borderRadius: 10, cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>

        <div style={{ padding: '14px 22px 0', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {abas.map(function(a) {
            const on = aba === a.id
            return <button key={a.id} onClick={function() { setAba(a.id) }} style={{ cursor: 'pointer', borderRadius: 999, padding: '8px 14px', fontSize: 13.5, fontWeight: 700, color: on ? COR : 'var(--text)', background: on ? 'rgba(124,92,252,.12)' : 'var(--surface)', border: on ? '1.5px solid ' + COR : '1px solid var(--border2)' }}>{a.icone} {a.nome}</button>
          })}
        </div>

        <div style={{ padding: '16px 22px 8px', overflowY: 'auto' }}>
          {lista.map(function(p, i) {
            return (
              <div key={aba + i} style={{ marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span style={{ width: 28, height: 28, borderRadius: '50%', background: COR, color: '#fff', fontWeight: 800, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
                  <span style={{ fontWeight: 800, fontSize: 16 }}>{p.t}</span>
                </div>
                <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Ilu>{p.ilu}</Ilu>
                  <div style={{ flex: '1 1 200px', fontSize: 13.5, color: 'var(--muted2)', lineHeight: 1.55 }}>{p.d}</div>
                </div>
              </div>
            )
          })}
        </div>

        <div style={{ padding: '12px 22px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onFechar} style={{ cursor: 'pointer', padding: '10px 20px', borderRadius: 12, border: '1px solid var(--border2)', background: 'var(--surface)', color: 'var(--text)', fontWeight: 700, fontSize: 14 }}>Fechar</button>
        </div>
      </div>
    </div>,
    document.body
  )
}
