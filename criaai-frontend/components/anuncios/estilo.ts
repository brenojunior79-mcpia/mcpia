import type { Nivel } from '@/lib/anuncios'

// Cores dos niveis usando as variaveis do tema (funcionam no modo claro e no escuro)
export const COR: Record<Nivel, { bg: string; fg: string; borda: string; rotulo: string }> = {
  bom: { bg: 'var(--green-light)', fg: 'var(--green)', borda: 'color-mix(in srgb, var(--green) 35%, transparent)', rotulo: '🟢 Bom' },
  atencao: { bg: 'var(--amber-light)', fg: 'var(--amber)', borda: 'color-mix(in srgb, var(--amber) 40%, transparent)', rotulo: '🟡 Atenção' },
  ruim: { bg: 'var(--red-light)', fg: 'var(--red)', borda: 'color-mix(in srgb, var(--red) 40%, transparent)', rotulo: '🔴 Ruim' },
  sem: { bg: 'var(--surface2)', fg: 'var(--muted2)', borda: 'var(--border)', rotulo: '⚪ Sem dados' },
}

// Selo do veredito (Escalar / Observar / Ajustar), igual na tabela e nos criativos
export const SELO_VEREDITO: Record<string, React.CSSProperties> = {
  Escalar: { background: 'var(--green)', color: 'var(--surface)', border: '1px solid var(--green)' },
  Observar: { background: 'var(--amber-light)', color: 'var(--amber)', border: '1px solid color-mix(in srgb, var(--amber) 45%, transparent)' },
  Ajustar: { background: 'var(--red-light)', color: 'var(--red)', border: '1px solid color-mix(in srgb, var(--red) 45%, transparent)' },
  'Sem dados': { background: 'var(--surface2)', color: 'var(--muted2)', border: '1px solid var(--border)' },
}

export const cartao: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: 20, boxShadow: 'var(--shadow-sm)' }
export const titulo: React.CSSProperties = { fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 19, margin: 0, lineHeight: 1.25, display: 'flex', alignItems: 'center', gap: 8, textWrap: 'balance' as any }
export const subtitulo: React.CSSProperties = { fontSize: 14, color: 'var(--muted2)', margin: '4px 0 14px', lineHeight: 1.5 }
export const iconeTitulo: React.CSSProperties = { width: 32, height: 32, borderRadius: 10, background: 'var(--accent-light)', color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }

// Botao secundario padrao da tela (altura minima boa para o dedo)
export const botao: React.CSSProperties = { cursor: 'pointer', minHeight: 44, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'var(--surface)', border: '1px solid var(--border2)', color: 'var(--text)', fontWeight: 700, fontSize: 14, padding: '0 16px', borderRadius: 'var(--radius-md)', touchAction: 'manipulation' }

export const avisoErro: React.CSSProperties = { fontSize: 14, lineHeight: 1.5, color: 'var(--red)', background: 'var(--red-light)', border: '1px solid color-mix(in srgb, var(--red) 30%, transparent)', borderRadius: 'var(--radius-md)', padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'flex-start' }
export const avisoOk: React.CSSProperties = { ...avisoErro, color: 'var(--green)', background: 'var(--green-light)', border: '1px solid color-mix(in srgb, var(--green) 30%, transparent)' }
export const avisoAtencao: React.CSSProperties = { ...avisoErro, color: 'var(--amber)', background: 'var(--amber-light)', border: '1px solid color-mix(in srgb, var(--amber) 30%, transparent)' }

// Foco visivel para teclado e estados de toque, usados pelas classes "anu-*"
export const CSS_ANUNCIOS = `
.anu-btn { transition: background-color .15s, border-color .15s, color .15s, box-shadow .15s; -webkit-tap-highlight-color: transparent; }
.anu-btn:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
.anu-btn:disabled { opacity: .6; cursor: wait; }
.anu-btn:focus-visible, .anu-foco:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
.anu-num { font-variant-numeric: tabular-nums; }
.anu-tabela { display: block; }
.anu-cards { display: none; }
@media (max-width: 760px) { .anu-tabela { display: none; } .anu-cards { display: flex; } }
@media (prefers-reduced-motion: reduce) { .anu-btn { transition: none; } }
`

export const moeda = (v: number | null | undefined) => 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
export const inteiro = (v: number | null | undefined) => Number(v || 0).toLocaleString('pt-BR')
