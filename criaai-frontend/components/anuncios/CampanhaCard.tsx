'use client'
import { useState } from 'react'
import { calcular, avaliar, valorMetrica, ORDEM_METRICAS, EXPLICA, MetricaId } from '@/lib/anuncios'
import { COR, moeda, inteiro } from './estilo'

const STATUS: Record<string, { label: string; cor: string }> = {
  ACTIVE: { label: 'Ativa', cor: '#16a34a' }, PAUSED: { label: 'Pausada', cor: '#6b6a7e' }, CAMPAIGN_PAUSED: { label: 'Pausada', cor: '#6b6a7e' },
  ADSET_PAUSED: { label: 'Conjunto pausado', cor: '#6b6a7e' }, PENDING_REVIEW: { label: 'Em revisão', cor: '#f59e0b' }, IN_PROCESS: { label: 'Processando', cor: '#f59e0b' },
  DISAPPROVED: { label: 'Reprovada', cor: '#ef4444' }, WITH_ISSUES: { label: 'Com problemas', cor: '#ef4444' }, PENDING_BILLING_INFO: { label: 'Falta pagamento', cor: '#f59e0b' },
  ARCHIVED: { label: 'Arquivada', cor: '#6b6a7e' }, DELETED: { label: 'Excluída', cor: '#6b6a7e' },
}

export function orcamentoDiario(c: any): number | null {
  if (c.daily_budget) return Number(c.daily_budget) / 100
  const soma = (c.adSets || []).reduce(function(s: number, a: any) { return s + (a.daily_budget ? Number(a.daily_budget) / 100 : 0) }, 0)
  return soma > 0 ? soma : null
}

export default function CampanhaCard({ c, selecionada, ocupado, onVerFunil, onAlternar, onOrcamento }: {
  c: any; selecionada: boolean; ocupado: boolean
  onVerFunil: () => void; onAlternar: () => void; onOrcamento: (pct: number) => void
}) {
  const [aberto, setAberto] = useState<string>('')
  const m = calcular(c.insights)
  const ativa = c.status === 'ACTIVE'
  const st = STATUS[c.effective_status] || STATUS[c.status] || { label: c.effective_status || c.status, cor: '#6b6a7e' }
  const orc = orcamentoDiario(c)
  const roas = avaliar('roas', m)

  return (
    <div style={{ background: 'var(--surface)', border: selecionada ? '2px solid #7c5cfc' : '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', borderBottom: '1px solid var(--border)' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontWeight: 800, fontSize: 15 }}>{c.name}</div>
          <div style={{ fontSize: 12, color: 'var(--muted2)', marginTop: 2 }}>
            Gasto {moeda(m.gasto)} · {inteiro(m.compras)} venda(s) · {orc ? 'Orçamento ' + moeda(orc) + '/dia' : 'Orçamento no conjunto'}
          </div>
        </div>
        <span style={{ fontSize: 12, fontWeight: 800, padding: '4px 10px', borderRadius: 999, background: st.cor + '1f', color: st.cor }}>{st.label}</span>
      </div>

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

      <div style={{ padding: '12px 14px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', background: 'var(--surface2)' }}>
        <button onClick={onVerFunil} style={botao(false)}>🔻 Ver funil</button>
        <button onClick={onAlternar} disabled={ocupado} style={botao(false)}>{ocupado ? '...' : ativa ? '⏸ Pausar' : '▶ Ativar'}</button>
        {ativa && orc !== null && <button onClick={function() { onOrcamento(20) }} disabled={ocupado} style={botao(true)}>⬆ Aumentar orçamento 20%</button>}
        {ativa && orc !== null && <button onClick={function() { onOrcamento(-20) }} disabled={ocupado} style={botao(false)}>⬇ Reduzir 20%</button>}
        {ativa && orc !== null && roas.nivel === 'ruim' && <span style={{ fontSize: 12, color: '#b91c1c', fontWeight: 700 }}>Não aumente: está gastando mais do que vende.</span>}
      </div>
    </div>
  )
}

function botao(destaque: boolean): React.CSSProperties {
  return { cursor: 'pointer', fontWeight: 700, fontSize: 13, padding: '8px 14px', borderRadius: 10, border: destaque ? 0 : '1px solid var(--border2)', background: destaque ? '#16a34a' : 'var(--surface)', color: destaque ? '#fff' : 'var(--text)' }
}
