'use client'
import { useState } from 'react'
import { avaliar, valorMetrica, ORDEM_METRICAS, EXPLICA, MetricaId, Metricas } from '@/lib/anuncios'
import { COR } from './estilo'

export function orcamentoDiario(c: any): number | null {
  if (c.daily_budget) return Number(c.daily_budget) / 100
  const soma = (c.adSets || []).reduce(function(s: number, a: any) { return s + (a.daily_budget ? Number(a.daily_budget) / 100 : 0) }, 0)
  return soma > 0 ? soma : null
}

// Painel aberto ao clicar na campanha: cada metrica com nota, dica e explicacao simples
export function DetalheMetricas({ m }: { m: Metricas }) {
  const [aberto, setAberto] = useState<string>('')
  return (
    <div style={{ padding: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 230px), 1fr))', gap: 10 }}>
      {ORDEM_METRICAS.map(function(id: MetricaId) {
        const a = avaliar(id, m)
        const k = COR[a.nivel]
        const exp = aberto === id
        return (
          <div key={id} style={{ borderRadius: 'var(--radius-md)', border: '1px solid ' + k.borda, background: k.bg, padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted2)', flex: 1 }}>{EXPLICA[id].nome}</span>
              <button type="button" className="anu-btn" onClick={function() { setAberto(exp ? '' : id) }} aria-expanded={exp} aria-label={'O que é ' + EXPLICA[id].nome + '?'} style={{ cursor: 'pointer', border: '1px solid var(--border2)', background: 'var(--surface)', color: 'var(--muted2)', width: 32, height: 32, borderRadius: '50%', fontSize: 14, fontWeight: 800, padding: 0, flexShrink: 0, touchAction: 'manipulation' }}>?</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 2 }}>
              <span className="anu-num" style={{ fontSize: 21, fontWeight: 800, fontFamily: 'Syne, sans-serif' }}>{valorMetrica(id, m)}</span>
              <span style={{ fontSize: 11.5, fontWeight: 800, color: k.fg }}>{k.rotulo}</span>
            </div>
            {exp && <div style={{ fontSize: 13.5, marginTop: 6, padding: '6px 8px', background: 'var(--surface)', borderRadius: 8, lineHeight: 1.45 }}>💡 {EXPLICA[id].oQue}</div>}
            <div style={{ fontSize: 13.5, marginTop: 6, color: 'var(--text)', lineHeight: 1.45 }}>{a.dica}</div>
          </div>
        )
      })}
    </div>
  )
}
