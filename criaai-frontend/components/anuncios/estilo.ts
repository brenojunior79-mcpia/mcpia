import type { Nivel } from '@/lib/anuncios'

export const COR: Record<Nivel, { bg: string; fg: string; borda: string; rotulo: string }> = {
  bom: { bg: 'rgba(22,163,74,0.12)', fg: '#15803d', borda: 'rgba(22,163,74,0.35)', rotulo: '🟢 Bom' },
  atencao: { bg: 'rgba(245,158,11,0.14)', fg: '#b45309', borda: 'rgba(245,158,11,0.4)', rotulo: '🟡 Atenção' },
  ruim: { bg: 'rgba(239,68,68,0.12)', fg: '#b91c1c', borda: 'rgba(239,68,68,0.4)', rotulo: '🔴 Ruim' },
  sem: { bg: 'var(--surface2)', fg: 'var(--muted2)', borda: 'var(--border)', rotulo: '⚪ Sem dados' },
}

export const cartao: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, padding: 20, boxShadow: 'var(--shadow-sm)' }
export const titulo: React.CSSProperties = { fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 18, margin: 0 }

export const moeda = (v: number | null | undefined) => 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
export const inteiro = (v: number | null | undefined) => Number(v || 0).toLocaleString('pt-BR')
