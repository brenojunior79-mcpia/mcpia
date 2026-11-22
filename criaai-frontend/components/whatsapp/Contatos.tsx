'use client'
// Aba "Contatos" do Atendimento (ordem do Breno): toda a base num lugar so — alunos, conversas do WhatsApp
// (suporte e recuperacao), compradores da Hubla e dos relatorios de vendas (Cakto, Kiwify, Greenn...) e contatos importados.
// Da para buscar, filtrar pela origem e exportar a lista em CSV para fazer um disparo.
import { useEffect, useMemo, useState } from 'react'

type Contato = { nome: string; wa: string; origem: string }

function fone(wa: string) {
  const d = wa.replace(/\D/g, '')
  if (d.length >= 12) return '+' + d.slice(0, 2) + ' (' + d.slice(2, 4) + ') ' + d.slice(4, d.length - 4) + '-' + d.slice(-4)
  return wa
}

export default function Contatos({ onVoltar }: { onVoltar?: () => void }) {
  const [lista, setLista] = useState<Contato[] | null>(null)
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')
  const [origem, setOrigem] = useState('Todas')
  const [limite, setLimite] = useState(100)

  function carregar() {
    setErro(''); setLista(null)
    fetch('/api/whatsapp/broadcast?view=contatos', { cache: 'no-store' }).then(function(r) { return r.json() }).then(function(j) {
      if (j && Array.isArray(j.contatos)) setLista(j.contatos); else setErro((j && j.error) || 'Não foi possível carregar os contatos.')
    }).catch(function() { setErro('Sem conexão. Tente de novo.') })
  }
  useEffect(carregar, [])

  const origens = useMemo(function() {
    const m = new Map<string, number>()
    for (const c of (lista || [])) { const k = c.origem.indexOf('Comprador') === 0 ? 'Compradores' : c.origem; m.set(k, (m.get(k) || 0) + 1) }
    return Array.from(m.entries()).sort(function(a, b) { return b[1] - a[1] })
  }, [lista])

  const filtrados = (lista || []).filter(function(c) {
    const grupo = c.origem.indexOf('Comprador') === 0 ? 'Compradores' : c.origem
    if (origem !== 'Todas' && grupo !== origem) return false
    const b = busca.trim().toLowerCase()
    if (!b) return true
    return c.nome.toLowerCase().indexOf(b) >= 0 || c.wa.indexOf(b.replace(/\D/g, '') || '§') >= 0 || c.origem.toLowerCase().indexOf(b) >= 0
  })

  const card: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 18, marginBottom: 14 }
  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '18px 16px' }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {onVoltar && <button type="button" className="at-b" onClick={onVoltar} aria-label="Voltar" title="Voltar" style={{ padding: '6px 10px' }}><i className="ti ti-arrow-left" /></button>}
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800, margin: 0, color: 'var(--text)' }}>Contatos</h2>
        </div>
        <div style={{ fontSize: 13.5, color: 'var(--muted2)', marginTop: 4 }}>Toda a base num lugar só: alunos, conversas do WhatsApp (suporte e recuperação) e compradores de todas as plataformas. Sem números repetidos e sem reembolsados.</div>
      </div>

      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 13, color: 'var(--muted2)', fontWeight: 700 }}>Total de contatos</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: '#7c3aed', lineHeight: 1.1 }}>{lista ? lista.length.toLocaleString('pt-BR') : '…'}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="at-b" onClick={carregar}><i className="ti ti-refresh" />Atualizar</button>
            <a className="at-b at-b-ok" href="/api/whatsapp/broadcast?view=exportar&seg=base" download style={{ textDecoration: 'none', display: 'inline-flex' }}><i className="ti ti-download" />Exportar contatos (CSV)</a>
          </div>
        </div>
        {origens.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
            {origens.map(function(o) {
              return <div key={o[0]} style={{ flex: '1 1 150px', background: 'var(--surface2)', borderRadius: 10, padding: '8px 10px' }}><div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>{o[1].toLocaleString('pt-BR')}</div><div style={{ fontSize: 12, color: 'var(--muted2)' }}>{o[0]}</div></div>
            })}
          </div>
        )}
      </div>

      <div style={card}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <input className="at-input" value={busca} onChange={function(e) { setBusca(e.target.value); setLimite(100) }} placeholder="Buscar por nome ou número..." style={{ flex: '1 1 220px' }} />
          <select className="at-input" value={origem} onChange={function(e) { setOrigem(e.target.value); setLimite(100) }} style={{ flex: '0 1 220px' }}>
            <option value="Todas">Todas as origens</option>
            {origens.map(function(o) { return <option key={o[0]} value={o[0]}>{o[0]} ({o[1]})</option> })}
          </select>
        </div>
        {erro && <div role="alert" style={{ color: '#b91c1c', fontWeight: 700, fontSize: 13.5 }}>{erro}</div>}
        {!lista && !erro && <div style={{ color: 'var(--muted2)', fontSize: 13.5 }}><i className="ti ti-loader" /> Carregando… (pode levar alguns segundos)</div>}
        {lista && (
          <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 12 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
              <thead style={{ background: 'var(--surface2)' }}>
                <tr>{['Nome', 'WhatsApp', 'Origem'].map(function(h) { return <th key={h} style={{ padding: '10px 12px', fontSize: 11.5, textTransform: 'uppercase', color: 'var(--muted2)', textAlign: 'left' }}>{h}</th> })}</tr>
              </thead>
              <tbody>
                {filtrados.slice(0, limite).map(function(c) {
                  return (
                    <tr key={c.wa}>
                      <td style={{ padding: '10px 12px', borderTop: '1px solid var(--border)', fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>{c.nome || <span style={{ color: 'var(--muted2)', fontWeight: 400 }}>Sem nome</span>}</td>
                      <td style={{ padding: '10px 12px', borderTop: '1px solid var(--border)', fontSize: 13.5, color: 'var(--text)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{fone(c.wa)}</td>
                      <td style={{ padding: '10px 12px', borderTop: '1px solid var(--border)', fontSize: 12.5, color: 'var(--muted2)' }}>{c.origem}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        {lista && filtrados.length > limite && (
          <button className="at-b" style={{ marginTop: 10 }} onClick={function() { setLimite(limite + 200) }}>Ver mais ({(filtrados.length - limite).toLocaleString('pt-BR')})</button>
        )}
        {lista && <div style={{ fontSize: 12, color: 'var(--muted2)', marginTop: 8 }}>Mostrando {Math.min(limite, filtrados.length).toLocaleString('pt-BR')} de {filtrados.length.toLocaleString('pt-BR')}. Para fazer um disparo para todos, vá em Disparo e escolha "Contatos: toda a base".</div>}
      </div>
    </div>
  )
}
