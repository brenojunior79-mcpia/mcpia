'use client'
import { useState } from 'react'
import { calcular, avaliar, veredito, MetricaId, Nivel } from '@/lib/anuncios'
import { moeda, inteiro, SELO_VEREDITO, botao } from './estilo'
import { DetalheMetricas, orcamentoDiario } from './CampanhaCard'

const COLUNAS = '70px minmax(260px, 1.7fr) 110px 250px 100px 70px 120px 80px 110px 90px 100px 100px 100px 90px'
const LARGURA_MIN = 1520

const PONTO: Record<Nivel, string> = { bom: 'var(--green)', atencao: 'var(--amber)', ruim: 'var(--red)', sem: 'transparent' }

function Interruptor({ ligado, ocupado, nome, onClick }: { ligado: boolean; ocupado: boolean; nome: string; onClick: () => void }) {
  return (
    <button type="button" role="switch" aria-checked={ligado} onClick={onClick} disabled={ocupado} aria-label={(ligado ? 'Pausar a campanha ' : 'Ativar a campanha ') + nome} className="anu-foco"
      style={{ cursor: ocupado ? 'wait' : 'pointer', width: 52, height: 32, borderRadius: 999, border: 0, padding: 3, background: ligado ? 'var(--green)' : 'var(--surface3)', display: 'flex', alignItems: 'center', justifyContent: ligado ? 'flex-end' : 'flex-start', transition: 'background-color .2s', opacity: ocupado ? 0.6 : 1, flexShrink: 0, touchAction: 'manipulation' }}>
      <span style={{ width: 26, height: 26, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.3)' }} />
    </button>
  )
}

const btnQuad: React.CSSProperties = { ...botao, width: 44, padding: 0, fontSize: 18, fontWeight: 800 }

function Valor({ id, m, texto }: { id: MetricaId; m: any; texto: string }) {
  const nv = avaliar(id, m).nivel
  return <span className="anu-num" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>{nv !== 'sem' && <span aria-hidden="true" style={{ width: 9, height: 9, borderRadius: '50%', background: PONTO[nv], flexShrink: 0 }} />}{texto}</span>
}

const pct = (v: number | null) => (v === null ? '—' : v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%')
const dinheiro = (v: number | null) => (v === null ? '—' : moeda(v))
const vezes = (v: number | null) => (v === null ? '—' : v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))

function Selo({ rotulo, motivo }: { rotulo: string; motivo: string }) {
  return <span title={motivo} style={{ ...SELO_VEREDITO[rotulo], fontWeight: 800, fontSize: 13, padding: '6px 14px', borderRadius: 999, display: 'inline-block', whiteSpace: 'nowrap' }}>{rotulo}</span>
}

function Orcamento({ c, orc, ocupado, onOrcamento }: { c: any; orc: number | null; ocupado: boolean; onOrcamento: (c: any, pct: number) => void }) {
  const orcTxt = function(v: number) { return 'R$ ' + (Math.round(v) === v ? String(v) : v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })) }
  if (orc === null) return <span style={{ color: 'var(--muted2)' }}>—</span>
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      <button type="button" className="anu-btn" style={btnQuad} disabled={ocupado} onClick={function() { onOrcamento(c, -10) }} aria-label={'Diminuir 10% o orçamento de ' + c.name}>−</button>
      <span className="anu-num" style={{ background: 'var(--surface2)', borderRadius: 'var(--radius-md)', padding: '0 12px', minHeight: 44, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 15, minWidth: 78 }}>{orcTxt(orc)}</span>
      <button type="button" className="anu-btn" style={btnQuad} disabled={ocupado} onClick={function() { onOrcamento(c, 10) }} aria-label={'Aumentar 10% o orçamento de ' + c.name}>+</button>
      <button type="button" className="anu-btn" style={{ ...botao, padding: '0 12px' }} disabled={ocupado} onClick={function() { onOrcamento(c, 20) }} aria-label={'Aumentar 20% o orçamento de ' + c.name}>+20%</button>
    </div>
  )
}

export default function CampanhasTabela({ campanhas, ocupadoId, selecionadaId, onAlternar, onOrcamento, onVerFunil }: {
  campanhas: any[]; ocupadoId: string | null; selecionadaId: string
  onAlternar: (c: any) => void; onOrcamento: (c: any, pct: number) => void; onVerFunil: (c: any) => void
}) {
  const [aberta, setAberta] = useState('')
  const cab: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: 'var(--muted2)' }

  const linhas = campanhas.map(function(c) {
    const m = calcular(c.insights)
    const ativa = c.status === 'ACTIVE'
    const v = veredito(m)
    return {
      c, m, ativa, v,
      orc: orcamentoDiario(c),
      ocupado: ocupadoId === c.id,
      apagada: !ativa && v.rotulo === 'Sem dados',
      abre: aberta === c.id,
      sub: [c.objective ? String(c.objective).replace('OUTCOME_', '').replace(/_/g, ' ').toLowerCase() : '', (c.adSets || []).length + ' conjunto(s)'].filter(Boolean).join(' · '),
    }
  })

  function detalhe(l: typeof linhas[number], onde: string) {
    return (
      <div id={'detalhe-' + onde + '-' + l.c.id} style={{ background: 'var(--surface2)', borderTop: '1px solid var(--border)' }}>
        <div style={{ padding: '14px 16px 0', fontSize: 14, lineHeight: 1.5 }}><b>{l.v.rotulo}:</b> {l.v.motivo}</div>
        <DetalheMetricas m={l.m} />
        <div style={{ padding: '0 16px 16px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="anu-btn" onClick={function() { onVerFunil(l.c) }} style={botao}><i className="ti ti-filter" aria-hidden="true" /> Ver o funil desta campanha</button>
        </div>
      </div>
    )
  }

  function nomeBotao(l: typeof linhas[number], onde: string) {
    return (
      <button type="button" className="anu-foco" aria-expanded={l.abre} aria-controls={'detalhe-' + onde + '-' + l.c.id} onClick={function() { setAberta(l.abre ? '' : l.c.id) }}
        style={{ all: 'unset', cursor: 'pointer', minWidth: 0, display: 'block', borderRadius: 8 }}>
        <span style={{ fontWeight: 800, fontSize: 15.5, lineHeight: 1.3, wordBreak: 'break-word', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          {l.c.name} <i className={'ti ' + (l.abre ? 'ti-chevron-up' : 'ti-chevron-down')} aria-hidden="true" style={{ color: 'var(--muted2)', fontSize: 16 }} />
        </span>
        <span style={{ display: 'block', fontSize: 12.5, color: 'var(--muted2)', marginTop: 2 }}>{l.sub}</span>
      </button>
    )
  }

  return (
    <>
      {/* Celular: um cartao por campanha */}
      <div className="anu-cards" style={{ flexDirection: 'column', gap: 12 }}>
        {linhas.map(function(l) {
          const marcada = selecionadaId === l.c.id
          return (
            <div key={l.c.id} style={{ background: 'var(--surface)', border: '1px solid ' + (marcada ? 'var(--accent)' : 'var(--border)'), borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14, opacity: l.apagada ? 0.6 : 1 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>{nomeBotao(l, 'cel')}</div>
                  <Interruptor ligado={l.ativa} ocupado={l.ocupado} nome={l.c.name} onClick={function() { onAlternar(l.c) }} />
                </div>
                <div><Selo rotulo={l.v.rotulo} motivo={l.v.motivo} /></div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                  {([
                    ['Gasto', moeda(l.m.gasto)],
                    ['Vendido', moeda(l.m.valor)],
                    ['Vendas', inteiro(l.m.compras)],
                    ['Custo por venda', dinheiro(l.m.cpa)],
                  ] as [string, string][]).map(function(it) {
                    return (
                      <div key={it[0]} style={{ background: 'var(--surface2)', borderRadius: 'var(--radius-md)', padding: '10px 12px', minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--muted2)' }}>{it[0]}</div>
                        <div className="anu-num" style={{ fontSize: 17, fontWeight: 800, marginTop: 2, overflowWrap: 'anywhere' }}>{it[1]}</div>
                      </div>
                    )
                  })}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted2)', marginBottom: 6 }}>Orçamento por dia</div>
                  <Orcamento c={l.c} orc={l.orc} ocupado={l.ocupado} onOrcamento={onOrcamento} />
                </div>
              </div>
              {l.abre && detalhe(l, 'cel')}
            </div>
          )
        })}
      </div>

      {/* Computador: tabela completa */}
      <div className="anu-tabela" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', overflowX: 'auto', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ minWidth: LARGURA_MIN }}>
          <div style={{ display: 'grid', gridTemplateColumns: COLUNAS, alignItems: 'center', gap: 8, padding: '14px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface2)' }}>
            {['Ligada', 'Campanha', 'O que fazer', 'Orçamento por dia', 'Gasto', 'Vendas', 'Vendido', 'Retorno', 'Custo por venda', 'Cliques', 'Custo por mil', 'Chegou na página', 'Foi ao pagamento', 'Vezes vista'].map(function(t) { return <div key={t} style={cab}>{t}</div> })}
          </div>

          {linhas.map(function(l) {
            const m = l.m
            return (
              <div key={l.c.id} style={{ borderBottom: '1px solid var(--border)', background: selecionadaId === l.c.id ? 'var(--accent-light)' : 'transparent' }}>
                <div style={{ display: 'grid', gridTemplateColumns: COLUNAS, alignItems: 'center', gap: 8, padding: '14px 20px', opacity: l.apagada ? 0.55 : 1, fontSize: 14 }}>
                  <div><Interruptor ligado={l.ativa} ocupado={l.ocupado} nome={l.c.name} onClick={function() { onAlternar(l.c) }} /></div>
                  {nomeBotao(l, 'pc')}
                  <div><Selo rotulo={l.v.rotulo} motivo={l.v.motivo} /></div>
                  <Orcamento c={l.c} orc={l.orc} ocupado={l.ocupado} onOrcamento={onOrcamento} />
                  <div className="anu-num">{moeda(m.gasto)}</div>
                  <div className="anu-num" style={{ fontWeight: 800 }}>{inteiro(m.compras)}</div>
                  <div className="anu-num">{moeda(m.valor)}</div>
                  <div style={{ fontWeight: 800 }}><Valor id="roas" m={m} texto={vezes(m.roas)} /></div>
                  <div><Valor id="cpa" m={m} texto={dinheiro(m.cpa)} /></div>
                  <div><Valor id="ctr" m={m} texto={pct(m.ctr)} /></div>
                  <div><Valor id="cpm" m={m} texto={dinheiro(m.cpm)} /></div>
                  <div><Valor id="connect" m={m} texto={pct(m.connect)} /></div>
                  <div><Valor id="checkout" m={m} texto={pct(m.taxaCheckout)} /></div>
                  <div><Valor id="freq" m={m} texto={m.freq === null ? '—' : m.freq.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} /></div>
                </div>
                {l.abre && detalhe(l, 'pc')}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
