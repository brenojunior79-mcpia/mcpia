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
    <div style={{ padding: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 10 }}>
      {ORDEM_METRICAS.map(function(id: MetricaId) {
        const a = avaliar(id, m)
        const k = COR[a.nivel]
        const exp = aberto === id
        return (
          <div key={id} style={{ borderRadius: 12, border: '1px solid ' + k.borda, background: k.bg, padding: '10px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted2)', flex: 1 }}>{EXPLICA[id].nome}</span>
              <button onClick={function() { setAberto(exp ? '' : id) }} title="O que é isso?" style={{ cursor: 'pointer', border: 0, background: 'var(--surface)', color: 'var(--muted2)', width: 20, height: 20, borderRadius: '50%', fontSize: 12, fontWeight: 800, lineHeight: '20px', padding: 0 }}>?</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 2 }}>
              <span style={{ fontSize: 20, fontWeight: 800, fontFamily: 'Syne, sans-serif' }}>{valorMetrica(id, m)}</span>
              <span style={{ fontSize: 11.5, fontWeight: 800, color: k.fg }}>{k.rotulo}</span>
            </div>
            {exp && <div style={{ fontSize: 12.5, marginTop: 6, padding: '6px 8px', background: 'var(--surface)', borderRadius: 8, lineHeight: 1.45 }}>💡 {EXPLICA[id].oQue}</div>}
            <div style={{ fontSize: 12.5, marginTop: 6, color: 'var(--text)', lineHeight: 1.4 }}>{a.dica}</div>
          </div>
        )
      })}
    </div>
  )
}
