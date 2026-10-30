'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

// Mapa da jornada do aluno: mapa do tesouro ilustrado, com trilha animada, viajante que anda ate a etapa atual
// e passo a passo para o aluno marcar o que ja fez (as marcas ficam so neste aparelho).

type Sub = { id: string; texto: string }
type Passo = { num: number; icon: string; titulo: string; curto: string; desc: string; href: string; cta: string; cor: string; x: number; y: number; subs: Sub[] }

const PASSOS: Passo[] = [
  {
    num: 1, icon: '🎯', titulo: 'Plataformas e Produtos', curto: 'Plataformas', cor: '#7c5cfc', x: 250, y: 290, href: '/dashboard/plataformas', cta: 'Ir para Plataformas',
    desc: 'Cadastre-se nas plataformas parceiras e escolha o produto que vai vender.',
    subs: [{ id: 'p1a', texto: 'Cadastre-se nas plataformas parceiras' }, { id: 'p1b', texto: 'Escolha o produto que vai vender' }],
  },
  {
    num: 2, icon: '📦', titulo: 'Prepare o material', curto: 'Material', cor: '#c8891a', x: 480, y: 200, href: '/dashboard/criativos-manuais', cta: 'Ir para as aulas',
    desc: 'Assista às aulas de criativos manuais. O material do produto também pode estar na descrição dele, em Produtos em Alta.',
    subs: [{ id: 'p2a', texto: 'Assista às aulas de criativos manuais' }, { id: 'p2b', texto: 'Pegue o material do produto (veja a descrição dele em Produtos em Alta)' }, { id: 'p2c', texto: 'Crie os seus criativos no Gerador de Criativos' }],
  },
  {
    num: 3, icon: '💰', titulo: 'Venda no automático', curto: 'Vender', cor: '#2f9e5c', x: 760, y: 150, href: '/dashboard/vendas', cta: 'Ir para Vendas',
    desc: 'Crie anúncios e venda enquanto dorme.',
    subs: [{ id: 'p3a', texto: 'Crie o seu anúncio' }, { id: 'p3b', texto: 'Acompanhe as suas vendas' }],
  },
]

const CHAVE = 'jornada_v1'
function ler(): Record<string, boolean> {
  try { const v = JSON.parse(localStorage.getItem(CHAVE) || '{}'); return v && typeof v === 'object' ? v : {} } catch (e) { return {} }
}

const CSS = `
@keyframes jmOnda { from { transform: translateX(0) } to { transform: translateX(-60px) } }
@keyframes jmNuvem { from { transform: translateX(-140px) } to { transform: translateX(1040px) } }
@keyframes jmFormiga { to { stroke-dashoffset: -38 } }
@keyframes jmPulsa { 0% { transform: scale(0.85); opacity: 0.75 } 100% { transform: scale(2.1); opacity: 0 } }
@keyframes jmBalanca { 0%,100% { transform: translateY(0) rotate(-3deg) } 50% { transform: translateY(-6px) rotate(3deg) } }
@keyframes jmBarco { 0%,100% { transform: translate(0,0) rotate(-4deg) } 50% { transform: translate(14px,-4px) rotate(4deg) } }
@keyframes jmBrilha { 0%,100% { opacity: 0.1; transform: scale(0.4) rotate(0) } 50% { opacity: 1; transform: scale(1.15) rotate(45deg) } }
@keyframes jmPassaro { from { transform: translate(-60px, 0) } to { transform: translate(980px, -50px) } }
@keyframes jmAsa { 0%,100% { transform: scaleY(1) } 50% { transform: scaleY(0.45) } }
@keyframes jmEntra { from { opacity: 0; transform: translateY(18px) } to { opacity: 1; transform: translateY(0) } }
@keyframes jmGira { to { transform: rotate(360deg) } }
@keyframes jmCheck { 0% { transform: scale(0.4) } 60% { transform: scale(1.3) } 100% { transform: scale(1) } }
@keyframes jmBrilhoBarra { 0% { left: -40% } 100% { left: 140% } }
.jm-box { transform-box: fill-box; transform-origin: center; }
.jm-pin { cursor: pointer; outline: none; }
.jm-pin:hover .jm-pin-c, .jm-pin:focus-visible .jm-pin-c { transform: scale(1.12); }
.jm-pin-c { transform-box: fill-box; transform-origin: center; transition: transform 0.2s; }
.jm-card { transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s; }
.jm-card:hover { transform: translateY(-3px); box-shadow: 0 14px 30px rgba(0,0,0,0.16); }
.jm-sub { transition: background 0.2s, border-color 0.2s; }
@media (prefers-reduced-motion: reduce) { .jm-anim, .jm-anim * { animation: none !important; transition: none !important } }
`

export default function JornadaMapa() {
  const router = useRouter()
  const [marcas, setMarcas] = useState<Record<string, boolean>>({})
  const [pronto, setPronto] = useState(false)

  useEffect(function() { setMarcas(ler()); setPronto(true) }, [])

  function alternar(id: string) {
    const novo = { ...marcas, [id]: !marcas[id] }
    setMarcas(novo)
    try { localStorage.setItem(CHAVE, JSON.stringify(novo)) } catch (e) {}
  }

  const feito = PASSOS.map(function(p) { return p.subs.every(function(s) { return !!marcas[s.id] }) })
  const total = PASSOS.reduce(function(n, p) { return n + p.subs.length }, 0)
  const marcados = PASSOS.reduce(function(n, p) { return n + p.subs.filter(function(s) { return !!marcas[s.id] }).length }, 0)
  const pct = Math.round((marcados / total) * 100)
  const primeiroPendente = feito.indexOf(false)
  const concluiu = primeiroPendente === -1
  const atual = concluiu ? PASSOS.length - 1 : primeiroPendente
  const viajante = PASSOS[atual]

  const trilhas = [
    'M 90 340 C 130 345, 180 300, 250 290',
    'M 250 290 C 330 300, 340 215, 410 230 C 440 238, 450 205, 480 200',
    'M 480 200 C 540 190, 560 120, 630 140 C 690 158, 700 120, 760 150',
  ]
  const arvores: [number, number, string, number][] = [
    [150, 250, '🌲', 20], [175, 232, '🌲', 24], [128, 262, '🌲', 18], [300, 340, '🌴', 22], [340, 355, '🌴', 20],
    [560, 300, '🌲', 22], [590, 318, '🌲', 18], [612, 296, '🌲', 24], [730, 290, '🌴', 22], [760, 300, '🌴', 20],
    [560, 118, '🌲', 20], [585, 104, '🌲', 22], [210, 180, '🌲', 20],
  ]

  return (
    <div className="jm-anim" style={{ marginBottom: 28, animation: 'jmEntra 0.5s ease both' }}>
      <style>{CSS}</style>
      <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 24, border: '2px solid #8b6b3d', background: 'linear-gradient(160deg, #f4e7c1 0%, #e6cd92 55%, #d4b36f 100%)', boxShadow: '0 12px 32px rgba(139,107,61,0.28), inset 0 0 80px rgba(139,107,61,0.2)', padding: '18px 16px 18px' }}>

        {/* Cabecalho + progresso */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
          <span style={{ fontSize: 26, display: 'inline-block', animation: 'jmBalanca 3s ease-in-out infinite' }}>🗺️</span>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 19, color: '#3d2b16', lineHeight: 1.15 }}>Sua jornada em 3 passos</div>
            <div style={{ fontSize: 12.5, color: '#6b5433', marginTop: 2 }}>
              {concluiu ? 'Parabéns! Você completou o mapa. Agora é seguir vendendo.' : 'Siga a trilha até o tesouro. Toque nos pontos do mapa para abrir cada passo.'}
            </div>
          </div>
          <div style={{ minWidth: 150 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, fontWeight: 800, color: '#3d2b16', marginBottom: 4 }}>
              <span>Seu progresso</span><span>{marcados} de {total}</span>
            </div>
            <div style={{ position: 'relative', overflow: 'hidden', height: 10, borderRadius: 99, background: 'rgba(92,67,38,0.25)' }}>
              <div style={{ width: (pronto ? pct : 0) + '%', height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, #7c5cfc, #ec4899, #f5b301)', transition: 'width 0.6s ease' }} />
              <div style={{ position: 'absolute', top: 0, bottom: 0, width: '30%', background: 'linear-gradient(100deg, transparent, rgba(255,255,255,0.55), transparent)', animation: 'jmBrilhoBarra 2.4s ease-in-out infinite' }} />
            </div>
          </div>
        </div>

        {/* O MAPA */}
        <div style={{ position: 'relative', borderRadius: 18, overflow: 'hidden', border: '2px solid #6f5330', boxShadow: '0 6px 18px rgba(60,40,15,0.35)' }}>
          <svg viewBox="0 0 900 420" role="img" aria-label="Mapa da sua jornada: plataformas, material e vendas" style={{ display: 'block', width: '100%', height: 'auto' }}>
            <defs>
              <linearGradient id="jmMar" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#2a7fae" /><stop offset="1" stopColor="#17597f" />
              </linearGradient>
              <linearGradient id="jmTerra" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#efe0ab" /><stop offset="0.55" stopColor="#dcc68a" /><stop offset="1" stopColor="#c9ad6c" />
              </linearGradient>
              <radialGradient id="jmVerde" cx="0.5" cy="0.5" r="0.5">
                <stop offset="0" stopColor="#8fb35a" stopOpacity="0.75" /><stop offset="1" stopColor="#8fb35a" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="jmBrilhoOuro" cx="0.5" cy="0.5" r="0.5">
                <stop offset="0" stopColor="#ffe27a" stopOpacity="0.95" /><stop offset="1" stopColor="#ffe27a" stopOpacity="0" />
              </radialGradient>
              <filter id="jmPapel" x="0" y="0" width="100%" height="100%">
                <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" result="r" />
                <feColorMatrix in="r" type="matrix" values="0 0 0 0 0.35  0 0 0 0 0.25  0 0 0 0 0.1  0 0 0 0.16 0" />
              </filter>
              <clipPath id="jmRecorte"><rect x="0" y="0" width="900" height="420" /></clipPath>
            </defs>

            <g clipPath="url(#jmRecorte)">
              {/* mar */}
              <rect width="900" height="420" fill="url(#jmMar)" />
              <g opacity="0.35" stroke="#bfe6f5" strokeWidth="2" fill="none" strokeLinecap="round">
                <g style={{ animation: 'jmOnda 5s linear infinite' }}>
                  {[40, 130, 220, 310, 400, 490, 580, 670, 760, 850, 940].map(function(x, i) { return <path key={'a' + i} d={'M ' + x + ' 30 q 10 -8 20 0 t 20 0'} /> })}
                  {[0, 90, 180, 270, 360, 450, 540, 630, 720, 810, 900].map(function(x, i) { return <path key={'b' + i} d={'M ' + x + ' 400 q 10 -8 20 0 t 20 0'} /> })}
                  {[20, 200, 380, 560, 740, 920].map(function(x, i) { return <path key={'c' + i} d={'M ' + x + ' 395 q 10 -8 20 0 t 20 0'} /> })}
                </g>
              </g>
              <g opacity="0.28" stroke="#d9f1fb" strokeWidth="2" fill="none" strokeLinecap="round">
                <g style={{ animation: 'jmOnda 7s linear infinite reverse' }}>
                  {[10, 110, 210, 800, 880].map(function(x, i) { return <path key={'d' + i} d={'M ' + x + ' 200 q 10 -8 20 0 t 20 0'} /> })}
                  {[820, 740, 880].map(function(x, i) { return <path key={'e' + i} d={'M ' + x + ' 20 q 10 -8 20 0 t 20 0'} /> })}
                </g>
              </g>

              {/* grade de mapa */}
              <g stroke="#ffffff" strokeOpacity="0.1" strokeWidth="1">
                {[150, 300, 450, 600, 750].map(function(x) { return <line key={'gx' + x} x1={x} y1="0" x2={x} y2="420" /> })}
                {[105, 210, 315].map(function(y) { return <line key={'gy' + y} x1="0" y1={y} x2="900" y2={y} /> })}
              </g>

              {/* ilha: aguas rasas, praia e terra */}
              <path d="M 32 332 C 8 246, 84 182, 168 192 C 226 108, 332 140, 380 100 C 450 28, 566 60, 614 82 C 704 28, 832 60, 864 148 C 902 232, 850 308, 786 338 C 704 400, 560 392, 470 380 C 380 406, 246 410, 156 394 C 82 388, 40 378, 32 332 Z" fill="#6fc2dc" opacity="0.55" />
              <path d="M 40 330 C 20 250, 90 190, 170 200 C 230 120, 330 150, 380 110 C 450 40, 560 70, 610 90 C 700 40, 820 70, 850 150 C 890 230, 840 300, 780 330 C 700 390, 560 380, 470 370 C 380 395, 250 400, 160 385 C 90 380, 50 370, 40 330 Z" fill="#f2e6bd" stroke="#fff6d6" strokeWidth="4" />
              <path d="M 62 328 C 44 256, 104 206, 174 214 C 236 134, 334 164, 384 126 C 452 62, 560 88, 608 108 C 698 58, 806 86, 832 156 C 866 228, 824 292, 770 318 C 696 372, 560 362, 470 352 C 384 376, 254 380, 166 366 C 100 362, 66 354, 62 328 Z" fill="url(#jmTerra)" />
              <ellipse cx="200" cy="240" rx="120" ry="60" fill="url(#jmVerde)" />
              <ellipse cx="610" cy="300" rx="130" ry="55" fill="url(#jmVerde)" />
              <ellipse cx="790" cy="215" rx="80" ry="45" fill="url(#jmVerde)" />
              <ellipse cx="570" cy="95" rx="70" ry="30" fill="url(#jmVerde)" />

              {/* lago e rio */}
              <path d="M 380 300 C 360 280, 410 262, 440 276 C 468 288, 450 322, 418 322 C 396 322, 388 312, 380 300 Z" fill="#5bb4d4" stroke="#3d93b5" strokeWidth="2" />
              <path d="M 424 276 C 440 250, 470 262, 500 250 C 540 236, 560 270, 600 262" fill="none" stroke="#5bb4d4" strokeWidth="5" strokeLinecap="round" opacity="0.9" />

              {/* montanhas */}
              {[[330, 140, 1], [372, 118, 1.25], [412, 146, 0.9], [650, 262, 0.8], [690, 232, 1]].map(function(m, i) {
                const x = m[0], y = m[1], s = m[2]
                return (
                  <g key={'m' + i} transform={'translate(' + x + ',' + y + ') scale(' + s + ')'}>
                    <polygon points="-34,0 0,-58 34,0" fill="#9a7b4c" stroke="#5c4326" strokeWidth="2" strokeLinejoin="round" />
                    <polygon points="0,-58 34,0 8,0" fill="#7a5f37" opacity="0.55" />
                    <polygon points="-10,-38 0,-58 10,-38 4,-42 0,-36 -5,-43" fill="#fff" />
                  </g>
                )
              })}

              {/* arvores */}
              {arvores.map(function(a, i) {
                return <text key={'t' + i} x={a[0]} y={a[1]} fontSize={a[3]} textAnchor="middle" style={{ userSelect: 'none' }}>{a[2]}</text>
              })}
              <text x="108" y="368" fontSize="22" textAnchor="middle">⛺</text>
              <text x="842" y="118" fontSize="22" textAnchor="middle">🏔️</text>

              {/* nuvens */}
              <g opacity="0.8" style={{ animation: 'jmNuvem 38s linear infinite' }}>
                <g transform="translate(0,48)"><ellipse cx="0" cy="0" rx="34" ry="10" fill="#fff" /><ellipse cx="-14" cy="-8" rx="18" ry="9" fill="#fff" /><ellipse cx="12" cy="-10" rx="20" ry="10" fill="#fff" /></g>
              </g>
              <g opacity="0.7" style={{ animation: 'jmNuvem 52s linear -20s infinite' }}>
                <g transform="translate(0,300)"><ellipse cx="0" cy="0" rx="40" ry="11" fill="#fff" /><ellipse cx="-16" cy="-9" rx="20" ry="10" fill="#fff" /><ellipse cx="14" cy="-11" rx="22" ry="11" fill="#fff" /></g>
              </g>

              {/* trilhas */}
              {trilhas.map(function(d, i) {
                const andada = i <= atual
                return (
                  <g key={'tr' + i}>
                    <path d={d} fill="none" stroke="#5c4326" strokeWidth="9" strokeLinecap="round" opacity="0.22" />
                    <path d={d} fill="none" stroke={andada ? '#2f9e5c' : '#5c4326'} strokeWidth="4.5" strokeLinecap="round" strokeDasharray="12 10" opacity={andada ? 0.95 : 0.6} style={{ animation: 'jmFormiga 1.4s linear infinite' }} />
                  </g>
                )
              })}

              {/* marca do inicio */}
              <g transform="translate(90,340)">
                <circle r="9" fill="#fbf3dc" stroke="#5c4326" strokeWidth="3" />
                <text y="-16" fontSize="13" fontWeight="800" textAnchor="middle" fill="#3d2b16" fontFamily="Syne, sans-serif">INÍCIO</text>
              </g>

              {/* tesouro */}
              <g transform="translate(834,232)">
                <circle r="58" fill="url(#jmBrilhoOuro)" className="jm-box" style={{ animation: 'jmBrilha 3s ease-in-out infinite' }} />
                {[[-40, -30, 0], [42, -26, 0.7], [-30, 28, 1.4], [38, 32, 2.1]].map(function(sp, i) {
                  return (
                    <g key={'s' + i} transform={'translate(' + sp[0] + ',' + sp[1] + ')'}>
                      <path className="jm-box" d="M 0 -9 L 2.4 -2.4 L 9 0 L 2.4 2.4 L 0 9 L -2.4 2.4 L -9 0 L -2.4 -2.4 Z" fill="#ffd23f" stroke="#c8891a" strokeWidth="1" style={{ animation: 'jmBrilha 2.2s ease-in-out ' + sp[2] + 's infinite' }} />
                    </g>
                  )
                })}
                <text y="12" fontSize="38" textAnchor="middle" className="jm-box" style={{ animation: 'jmBalanca 2.6s ease-in-out infinite' }}>{concluiu ? '🏆' : '🧰'}</text>
                <text x="26" y="-8" fontSize="26" textAnchor="middle">🚩</text>
              </g>

              {/* pinos clicaveis */}
              {PASSOS.map(function(p, i) {
                const ok = feito[i]
                const aqui = !concluiu && i === atual
                return (
                  <g key={'pin' + p.num} className="jm-pin" role="link" tabIndex={0} aria-label={'Passo ' + p.num + ': ' + p.titulo}
                    transform={'translate(' + p.x + ',' + p.y + ')'}
                    onClick={function() { router.push(p.href) }}
                    onKeyDown={function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push(p.href) } }}>
                    {aqui && <circle className="jm-box" r="27" fill="none" stroke={p.cor} strokeWidth="4" style={{ animation: 'jmPulsa 1.8s ease-out infinite' }} />}
                    {aqui && <circle className="jm-box" r="27" fill="none" stroke={p.cor} strokeWidth="3" style={{ animation: 'jmPulsa 1.8s ease-out 0.9s infinite' }} />}
                    <g className="jm-pin-c">
                      <circle r="27" fill="#fbf3dc" stroke={ok ? '#2f9e5c' : p.cor} strokeWidth="5" />
                      <circle r="27" fill="none" stroke="#000" strokeOpacity="0.15" strokeWidth="1" transform="translate(0,3)" />
                      <text y="10" fontSize="28" textAnchor="middle" fontWeight="800" fill={ok ? '#2f9e5c' : p.cor} fontFamily="Syne, sans-serif">{ok ? '✓' : p.num}</text>
                    </g>
                    <g transform="translate(0,48)">
                      <rect x="-52" y="-15" width="104" height="26" rx="13" fill="#3d2b16" opacity="0.88" />
                      <text y="4" fontSize="14.5" fontWeight="800" textAnchor="middle" fill="#fbf3dc" fontFamily="Syne, sans-serif">{p.curto}</text>
                    </g>
                  </g>
                )
              })}

              {/* viajante: caminha ate a etapa atual */}
              <g style={{ transform: 'translate(' + viajante.x + 'px,' + (viajante.y - 58) + 'px)', transition: 'transform 1.4s cubic-bezier(.5,.1,.25,1)' }}>
                <ellipse cx="0" cy="40" rx="13" ry="4" fill="#000" opacity="0.25" />
                <g style={{ animation: 'jmBalanca 1.4s ease-in-out infinite' }} className="jm-box">
                  <text x="0" y="34" fontSize="34" textAnchor="middle">{concluiu ? '🥳' : '🚶'}</text>
                </g>
                {!concluiu && (
                  <g transform="translate(0,-10)">
                    <rect x="-44" y="-14" width="88" height="22" rx="11" fill="#ef4444" />
                    <polygon points="-6,8 6,8 0,15" fill="#ef4444" />
                    <text y="2" fontSize="12.5" fontWeight="800" textAnchor="middle" fill="#fff" fontFamily="Syne, sans-serif">Você está aqui</text>
                  </g>
                )}
              </g>

              {/* passaros */}
              <g style={{ animation: 'jmPassaro 22s linear infinite' }}>
                <g transform="translate(0,170)" fill="none" stroke="#3d2b16" strokeWidth="2.4" strokeLinecap="round">
                  <path className="jm-box" d="M -10 0 q 5 -7 10 0 q 5 -7 10 0" style={{ animation: 'jmAsa 0.5s ease-in-out infinite' }} />
                  <path className="jm-box" d="M 18 -10 q 5 -7 10 0 q 5 -7 10 0" style={{ animation: 'jmAsa 0.5s ease-in-out 0.15s infinite' }} />
                </g>
              </g>

              {/* barco e baleia */}
              <g transform="translate(70,70)"><text className="jm-box" fontSize="40" textAnchor="middle" style={{ animation: 'jmBarco 5s ease-in-out infinite' }}>⛵</text></g>
              <g transform="translate(850,385)"><text className="jm-box" fontSize="34" textAnchor="middle" style={{ animation: 'jmBarco 6.5s ease-in-out infinite reverse' }}>🐋</text></g>

              {/* rosa dos ventos */}
              <g transform="translate(838,62)" opacity="0.92">
                <circle r="38" fill="#fbf3dc" fillOpacity="0.82" stroke="#5c4326" strokeWidth="2" />
                <g className="jm-box" style={{ animation: 'jmGira 40s linear infinite' }}>
                  <polygon points="0,-34 7,0 0,34 -7,0" fill="#5c4326" />
                  <polygon points="-34,0 0,-7 34,0 0,7" fill="#8b6b3d" />
                </g>
                <polygon points="0,-34 4,-6 -4,-6" fill="#ef4444" />
                <text y="-42" fontSize="13" fontWeight="800" textAnchor="middle" fill="#fff" stroke="#17597f" strokeWidth="3" paintOrder="stroke" fontFamily="Syne, sans-serif">N</text>
              </g>

              {/* escala */}
              <g transform="translate(24,404)" fontFamily="Syne, sans-serif">
                <rect x="0" y="-4" width="70" height="6" fill="#fbf3dc" stroke="#3d2b16" strokeWidth="1.5" /><rect x="0" y="-4" width="35" height="6" fill="#3d2b16" />
                <text x="78" y="3" fontSize="11" fontWeight="800" fill="#fbf3dc">Rumo ao tesouro</text>
              </g>

              {/* textura de papel envelhecido */}
              <rect width="900" height="420" filter="url(#jmPapel)" style={{ mixBlendMode: 'multiply', pointerEvents: 'none' }} />
            </g>
          </svg>
        </div>

        {/* PASSO A PASSO */}
        <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 12, marginTop: 14 }}>
          {PASSOS.map(function(p, i) {
            const ok = feito[i]
            const aqui = !concluiu && i === atual
            return (
              <div key={p.num} className="jm-card" style={{ position: 'relative', background: '#fbf3dc', border: '2px solid ' + (ok ? '#2f9e5c' : aqui ? p.cor : '#b79a63'), borderRadius: 16, padding: '14px 14px 14px', boxShadow: aqui ? '0 0 0 4px ' + p.cor + '22' : 'none', animation: 'jmEntra 0.5s ease both ' + (0.1 + i * 0.12) + 's' }}>
                {aqui && <span style={{ position: 'absolute', top: -11, right: 12, background: '#ef4444', color: '#fff', fontSize: 10.5, fontWeight: 800, letterSpacing: '0.04em', padding: '3px 9px', borderRadius: 99, fontFamily: 'Syne, sans-serif' }}>VOCÊ ESTÁ AQUI</span>}
                {ok && <span style={{ position: 'absolute', top: -11, right: 12, background: '#2f9e5c', color: '#fff', fontSize: 10.5, fontWeight: 800, letterSpacing: '0.04em', padding: '3px 9px', borderRadius: 99, fontFamily: 'Syne, sans-serif' }}>CONCLUÍDO ✓</span>}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: p.cor + '22', border: '3px solid ' + (ok ? '#2f9e5c' : p.cor), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{p.icon}</div>
                  <div>
                    <div style={{ fontSize: 10.5, fontWeight: 800, color: p.cor, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Passo {p.num}</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#3d2b16', fontFamily: 'Syne, sans-serif', lineHeight: 1.2 }}>{p.titulo}</div>
                  </div>
                </div>
                <div style={{ fontSize: 12.5, color: '#6b5433', lineHeight: 1.55, marginBottom: 10 }}>{p.desc}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {p.subs.map(function(s) {
                    const on = !!marcas[s.id]
                    return (
                      <button key={s.id} type="button" role="checkbox" aria-checked={on} onClick={function() { alternar(s.id) }}
                        className="jm-sub"
                        style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', cursor: 'pointer', padding: '8px 10px', borderRadius: 10, border: '1.5px solid ' + (on ? 'rgba(47,158,92,0.55)' : '#d3bd8c'), background: on ? 'rgba(47,158,92,0.1)' : 'rgba(255,255,255,0.55)', color: '#3d2b16', fontSize: 12.5, lineHeight: 1.4 }}>
                        <span style={{ flexShrink: 0, width: 22, height: 22, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid ' + (on ? '#2f9e5c' : '#8b6b3d'), background: on ? '#2f9e5c' : 'transparent', color: '#fff', fontWeight: 900, fontSize: 14, animation: on ? 'jmCheck 0.35s ease-out' : 'none' }}>{on ? '✓' : ''}</span>
                        <span style={{ flex: 1, opacity: on ? 0.7 : 1, textDecoration: on ? 'line-through' : 'none' }}>{s.texto}</span>
                      </button>
                    )
                  })}
                </div>
                <Link href={p.href} style={{ display: 'block', marginTop: 12, textAlign: 'center', textDecoration: 'none', padding: '10px 12px', borderRadius: 11, background: p.cor, color: '#fff', fontWeight: 800, fontSize: 13.5, fontFamily: 'Syne, sans-serif' }}>
                  {p.cta} →
                </Link>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
