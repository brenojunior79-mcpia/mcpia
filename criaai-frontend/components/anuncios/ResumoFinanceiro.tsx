'use client'
import { useState, useEffect } from 'react'
import { moeda, inteiro, cartao } from './estilo'

type Resumo = {
  rotuloComparacao: string
  faturamento: { valor: number; anterior: number; vendas: number }
  gasto: { valor: number | null; anterior: number | null }
  lucro: { valor: number | null; anterior: number | null }
}

const AJUDA: Record<string, string> = {
  faturamento: 'Soma das vendas aprovadas de Mentoria e Estrutura Express (Hubla e Cakto) no período, sem os reembolsos.',
  gasto: 'Quanto o Facebook cobrou de anúncios em todas as campanhas da conta no período.',
  lucro: 'Valor que realmente sobra: vendas já sem as taxas da plataforma de pagamento, menos o gasto em anúncios.',
}

function variacao(atual: number | null, anterior: number | null): number | null {
  if (atual === null || anterior === null) return null
  if (anterior === 0) return null
  return ((atual - anterior) / Math.abs(anterior)) * 100
}

function Selo({ pct, rotulo, tipo }: { pct: number | null; rotulo: string; tipo: 'alta-boa' | 'neutro' }) {
  if (pct === null) return <span style={{ fontSize: 12, color: 'var(--muted2)' }}>Sem base de comparação</span>
  const subiu = pct >= 0
  const texto = (subiu ? '+' : '−') + Math.abs(pct).toLocaleString('pt-BR', { maximumFractionDigits: 0 }) + '% ' + rotulo
  const bom = tipo === 'alta-boa' ? subiu : null
  const estilo: React.CSSProperties = bom === null
    ? { background: 'var(--surface2)', color: 'var(--muted2)', border: '1px solid var(--border)' }
    : bom ? { background: '#0f7a4d', color: '#fff', border: '1px solid #0f7a4d' } : { background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5' }
  return <span style={{ ...estilo, fontSize: 12.5, fontWeight: 800, padding: '4px 11px', borderRadius: 999, whiteSpace: 'nowrap' }}>{texto}</span>
}

export default function ResumoFinanceiro({ periodo }: { periodo: string }) {
  const [dados, setDados] = useState<Resumo | null>(null)
  const [erro, setErro] = useState(false)
  const [ajuda, setAjuda] = useState('')

  useEffect(function() {
    let vivo = true
    setErro(false)
    fetch('/api/anuncios/resumo?datePreset=' + periodo, { cache: 'no-store' })
      .then(function(r) { return r.json().then(function(j) { return { ok: r.ok, j } }) })
      .then(function(x) { if (!vivo) return; if (x.ok) setDados(x.j); else setErro(true) })
      .catch(function() { if (vivo) setErro(true) })
    return function() { vivo = false }
  }, [periodo])

  if (erro && !dados) return null

  const cards: { id: string; titulo: string; valor: string; selo: React.ReactNode; nota: string }[] = dados ? [
    { id: 'faturamento', titulo: 'Faturamento', valor: moeda(dados.faturamento.valor), selo: <Selo pct={variacao(dados.faturamento.valor, dados.faturamento.anterior)} rotulo={dados.rotuloComparacao} tipo="alta-boa" />, nota: inteiro(dados.faturamento.vendas) + (dados.faturamento.vendas === 1 ? ' venda aprovada' : ' vendas aprovadas') },
    { id: 'gasto', titulo: 'Gasto em anúncios', valor: dados.gasto.valor === null ? '—' : moeda(dados.gasto.valor), selo: <Selo pct={variacao(dados.gasto.valor, dados.gasto.anterior)} rotulo={dados.rotuloComparacao} tipo="neutro" />, nota: 'Cobrado pelo Meta' },
    { id: 'lucro', titulo: 'Lucro', valor: dados.lucro.valor === null ? '—' : moeda(dados.lucro.valor), selo: <Selo pct={variacao(dados.lucro.valor, dados.lucro.anterior)} rotulo={dados.rotuloComparacao} tipo="alta-boa" />, nota: 'Já tirando anúncios e taxas' },
  ] : []

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
        {!dados && [0, 1, 2].map(function(i) { return <div key={i} style={{ ...cartao, minHeight: 130, opacity: 0.5 }} /> })}
        {cards.map(function(c) {
          return (
            <div key={c.id} style={{ ...cartao, padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 14.5, color: 'var(--muted2)', fontWeight: 600 }}>{c.titulo}</span>
                <button onClick={function() { setAjuda(ajuda === c.id ? '' : c.id) }} aria-label={'O que é ' + c.titulo} style={{ cursor: 'pointer', width: 22, height: 22, borderRadius: '50%', border: '1px solid var(--border2)', background: 'var(--surface)', color: 'var(--muted2)', fontSize: 12, fontWeight: 700, padding: 0 }}>?</button>
              </div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 32, fontWeight: 800, letterSpacing: -0.5, lineHeight: 1.1 }}>{c.valor}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>{c.selo}<span style={{ fontSize: 13, color: 'var(--muted2)' }}>{c.id === 'lucro' ? '' : c.nota}</span></div>
              {c.id === 'lucro' && <div style={{ fontSize: 13, color: 'var(--muted2)', marginTop: -4 }}>{c.nota}</div>}
              {ajuda === c.id && <div style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--text)', background: 'var(--surface2)', borderRadius: 10, padding: '9px 12px' }}>{AJUDA[c.id]}</div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
