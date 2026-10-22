'use client'
import { useState } from 'react'
import { calcular, avaliar, veredito, MetricaId, Nivel } from '@/lib/anuncios'
import { moeda, inteiro } from './estilo'
import { DetalheMetricas, orcamentoDiario } from './CampanhaCard'

const COLUNAS = '70px minmax(260px, 1.7fr) 110px 250px 100px 70px 120px 70px 110px 80px 100px 100px 100px 90px'
const LARGURA_MIN = 1500

const SELO: Record<string, React.CSSProperties> = {
  Escalar: { background: '#15803d', color: '#fff', border: '1px solid #15803d' },
  Observar: { background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' },
  Ajustar: { background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5' },
  'Sem dados': { background: 'var(--surface2)', color: 'var(--muted2)', border: '1px solid var(--border)' },
}
const PONTO: Record<Nivel, string> = { bom: '#16a34a', atencao: '#f59e0b', ruim: '#ef4444', sem: 'transparent' }

function Interruptor({ ligado, ocupado, onClick }: { ligado: boolean; ocupado: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} disabled={ocupado} aria-label={ligado ? 'Desligar campanha' : 'Ligar campanha'} style={{ cursor: ocupado ? 'wait' : 'pointer', width: 50, height: 30, borderRadius: 999, border: 0, padding: 3, background: ligado ? '#0f7a4d' : '#d8d8de', display: 'flex', alignItems: 'center', justifyContent: ligado ? 'flex-end' : 'flex-start', transition: 'background .2s', opacity: ocupado ? 0.6 : 1 }}>
      <span style={{ width: 24, height: 24, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.3)' }} />
    </button>
  )
}

const btnQuad: React.CSSProperties = { cursor: 'pointer', width: 36, height: 36, borderRadius: 10, border: '1px solid var(--border2)', background: 'var(--surface)', color: 'var(--text)', fontWeight: 800, fontSize: 16, padding: 0 }

function Valor({ id, m, texto }: { id: MetricaId; m: any; texto: string }) {
  const nv = avaliar(id, m).nivel
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>{nv !== 'sem' && <span style={{ width: 8, height: 8, borderRadius: '50%', background: PONTO[nv], flexShrink: 0 }} />}{texto}</span>
}

const pct = (v: number | null) => (v === null ? '—' : v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%')
const dinheiro = (v: number | null) => (v === null ? '—' : moeda(v))

export default function CampanhasTabela({ campanhas, ocupadoId, selecionadaId, onAlternar, onOrcamento, onVerFunil }: {
  campanhas: any[]; ocupadoId: string | null; selecionadaId: string
  onAlternar: (c: any) => void; onOrcamento: (c: any, pct: number) => void; onVerFunil: (c: any) => void
}) {
  const [aberta, setAberta] = useState('')
  const cab: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: 'var(--muted2)' }
  const orcTxt = function(v: number) { return 'R$ ' + (Math.round(v) === v ? String(v) : v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })) }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, overflowX: 'auto', boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ minWidth: LARGURA_MIN }}>
        <div style={{ display: 'grid', gridTemplateColumns: COLUNAS, alignItems: 'center', gap: 8, padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
          {['Ligado', 'Campanha', 'Veredito', 'Orçamento por dia', 'Gasto', 'Vendas', 'Faturamento', 'ROAS', 'Custo/venda', 'CTR', 'CPM', 'Chegada pág.', 'Checkout', 'Freq.'].map(function(t) { return <div key={t} style={cab}>{t}</div> })}
        </div>

        {campanhas.map(function(c) {
          const m = calcular(c.insights)
          const ativa = c.status === 'ACTIVE'
          const v = veredito(m)
          const orc = orcamentoDiario(c)
          const ocupado = ocupadoId === c.id
          const apagada = !ativa && v.rotulo === 'Sem dados'
          const abre = aberta === c.id
          const sub = [c.objective ? String(c.objective).replace('OUTCOME_', '').replace(/_/g, ' ').toLowerCase() : '', (c.adSets || []).length + ' conjunto(s)'].filter(Boolean).join(' · ')
          return (
            <div key={c.id} style={{ borderBottom: '1px solid var(--border)', background: selecionadaId === c.id ? 'rgba(124,92,252,0.06)' : 'transparent' }}>
              <div style={{ display: 'grid', gridTemplateColumns: COLUNAS, alignItems: 'center', gap: 8, padding: '14px 20px', opacity: apagada ? 0.55 : 1, fontSize: 14 }}>
                <div><Interruptor ligado={ativa} ocupado={ocupado} onClick={function() { onAlternar(c) }} /></div>

                <div style={{ minWidth: 0, cursor: 'pointer' }} onClick={function() { setAberta(abre ? '' : c.id) }}>
                  <div style={{ fontWeight: 800, fontSize: 15, lineHeight: 1.25 }}>{c.name} <span style={{ color: 'var(--muted2)', fontSize: 12 }}>{abre ? '▴' : '▾'}</span></div>
                  <div style={{ fontSize: 12, color: 'var(--muted2)', marginTop: 2 }}>{sub}</div>
                </div>

                <div><span title={v.motivo} style={{ ...SELO[v.rotulo], fontWeight: 800, fontSize: 13, padding: '6px 14px', borderRadius: 999, display: 'inline-block', cursor: 'help' }}>{v.rotulo}</span></div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {orc !== null ? (
                    <>
                      <button style={btnQuad} disabled={ocupado} onClick={function() { onOrcamento(c, -10) }} title="Reduzir 10%">−</button>
                      <span style={{ background: 'var(--surface2)', borderRadius: 10, padding: '9px 12px', fontWeight: 800, fontSize: 14, minWidth: 74, textAlign: 'center' }}>{orcTxt(orc)}</span>
                      <button style={btnQuad} disabled={ocupado} onClick={function() { onOrcamento(c, 10) }} title="Aumentar 10%">+</button>
                      <button style={{ ...btnQuad, width: 'auto', padding: '0 12px', fontSize: 13.5 }} disabled={ocupado} onClick={function() { onOrcamento(c, 20) }} title="Aumentar 20%">+20%</button>
                    </>
                  ) : <span style={{ color: 'var(--muted2)' }}>—</span>}
                </div>

                <div>{moeda(m.gasto)}</div>
                <div style={{ fontWeight: 800 }}>{inteiro(m.compras)}</div>
                <div>{moeda(m.valor)}</div>
                <div style={{ fontWeight: 800 }}><Valor id="roas" m={m} texto={m.roas === null ? '—' : m.roas.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} /></div>
                <div><Valor id="cpa" m={m} texto={dinheiro(m.cpa)} /></div>
                <div><Valor id="ctr" m={m} texto={pct(m.ctr)} /></div>
                <div><Valor id="cpm" m={m} texto={dinheiro(m.cpm)} /></div>
                <div><Valor id="connect" m={m} texto={pct(m.connect)} /></div>
                <div><Valor id="checkout" m={m} texto={pct(m.taxaCheckout)} /></div>
                <div><Valor id="freq" m={m} texto={m.freq === null ? '—' : m.freq.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} /></div>
              </div>

              {abre && (
                <div style={{ background: 'var(--surface2)', borderTop: '1px solid var(--border)' }}>
                  <div style={{ padding: '12px 20px 0', fontSize: 13.5 }}><b>{v.rotulo}:</b> {v.motivo}</div>
                  <DetalheMetricas m={m} />
                  <div style={{ padding: '0 20px 14px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button onClick={function() { onVerFunil(c) }} style={{ cursor: 'pointer', fontWeight: 700, fontSize: 13, padding: '8px 14px', borderRadius: 10, border: '1px solid var(--border2)', background: 'var(--surface)', color: 'var(--text)' }}>🔻 Ver funil desta campanha</button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
