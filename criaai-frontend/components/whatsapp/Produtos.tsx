'use client'
// Aba "Produtos" do Atendimento WhatsApp: cadastro dos produtos usados para filtrar os fluxos.
// O nome cadastrado precisa estar contido no nome do produto que chega da Hubla (ex.: "Mentoria" vale para "Mentoria Cristão Prospero").
import { useEffect, useState } from 'react'

type Produto = { id: string; nome: string }

function novoId() { return 'p' + Math.random().toString(36).slice(2, 10) }

export default function Produtos() {
  const [lista, setLista] = useState<Produto[]>([])
  const [sugestoes, setSugestoes] = useState<string[]>([])
  const [novo, setNovo] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null)

  useEffect(function() {
    fetch('/api/whatsapp/produtos', { cache: 'no-store' })
      .then(function(r) { return r.json().then(function(j) { return { ok: r.ok, j } }) })
      .then(function(x) {
        if (!x.ok) { setMsg({ ok: false, t: x.j.error || 'Não foi possível carregar.' }); return }
        setLista(x.j.produtos || []); setSugestoes(x.j.sugestoes || [])
      })
      .catch(function() { setMsg({ ok: false, t: 'Sem conexão. Tente de novo.' }) })
      .finally(function() { setCarregando(false) })
  }, [])

  async function salvar(nova: Produto[]) {
    setSalvando(true); setMsg(null)
    try {
      const r = await fetch('/api/whatsapp/produtos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ produtos: nova }) })
      const j = await r.json().catch(function() { return {} })
      if (!r.ok) { setMsg({ ok: false, t: j.error || 'Não foi possível salvar.' }); setSalvando(false); return false }
      setLista(j.produtos || nova); setMsg({ ok: true, t: 'Salvo!' })
    } catch (e) { setMsg({ ok: false, t: 'Sem conexão. Tente de novo.' }); setSalvando(false); return false }
    setSalvando(false)
    return true
  }

  function existe(nome: string) { return lista.some(function(p) { return p.nome.toLowerCase() === nome.trim().toLowerCase() }) }

  async function adicionar(nome: string) {
    const n = nome.replace(/\s+/g, ' ').trim()
    if (!n) return
    if (existe(n)) { setMsg({ ok: false, t: 'Esse produto já está cadastrado.' }); return }
    if (await salvar(lista.concat([{ id: novoId(), nome: n }]))) setNovo('')
  }

  async function remover(p: Produto) {
    if (!window.confirm('Remover "' + p.nome + '"? Os fluxos que já usam esse produto continuam funcionando.')) return
    await salvar(lista.filter(function(x) { return x.id !== p.id }))
  }

  const faltando = sugestoes.filter(function(s) { return !existe(s) })

  return (
    <div style={{ padding: 20, maxWidth: 760, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text)' }}>Produtos</div>
          <div style={{ fontSize: 13.5, color: 'var(--muted2)', marginTop: 4, lineHeight: 1.5, maxWidth: 560 }}>Cadastre aqui os produtos. Depois, em cada fluxo de evento da compra, escolha para qual produto ele vai disparar.</div>
        </div>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 16 }}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>Nome do produto</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input className="at-input" value={novo} maxLength={80} placeholder="Ex.: Mentoria" onChange={function(e) { setNovo(e.target.value) }}
            onKeyDown={function(e) { if (e.key === 'Enter') { e.preventDefault(); adicionar(novo) } }} style={{ flex: '1 1 220px', minWidth: 0 }} />
          <button type="button" className="at-b at-b-ok" disabled={salvando || !novo.trim()} onClick={function() { adicionar(novo) }}><i className="ti ti-plus" />Cadastrar</button>
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted2)', marginTop: 8, lineHeight: 1.5 }}>Use uma parte do nome que aparece na Hubla. Exemplo: <b>Mentoria</b> vale para "Mentoria Cristão Prospero". Não importa maiúscula ou minúscula.</div>

        {faltando.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--muted2)', marginBottom: 6 }}>Produtos que já venderam na Hubla (toque para cadastrar)</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {faltando.map(function(s) {
                return <button key={s} type="button" disabled={salvando} onClick={function() { adicionar(s) }} style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5, border: '1px dashed var(--border2)', background: 'transparent', color: 'var(--text)', borderRadius: 999, padding: '6px 12px', fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit' }}><i className="ti ti-plus" style={{ fontSize: 14, color: '#16a34a' }} />{s}</button>
              })}
            </div>
          </div>
        )}
        {msg && <div style={{ marginTop: 12, fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, color: msg.ok ? '#15803d' : '#b91c1c' }}><i className={'ti ti-' + (msg.ok ? 'circle-check' : 'alert-triangle')} />{msg.t}</div>}
      </div>

      <div style={{ marginTop: 16, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
        {carregando ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted2)', fontSize: 13.5 }}><i className="ti ti-loader" style={{ fontSize: 22, display: 'block', marginBottom: 6 }} />Carregando produtos…</div>
        ) : lista.length === 0 ? (
          <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--muted2)', fontSize: 13.5, lineHeight: 1.5 }}>
            <i className="ti ti-shopping-cart" style={{ fontSize: 32, display: 'block', marginBottom: 8, opacity: 0.6 }} />
            Nenhum produto cadastrado ainda. Cadastre acima para escolher nos fluxos.
          </div>
        ) : lista.map(function(p, i) {
          return (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderTop: i ? '1px solid var(--border)' : 0 }}>
              <span style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(22,163,74,0.12)', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}><i className="ti ti-shopping-cart" /></span>
              <span style={{ flex: 1, minWidth: 0, fontWeight: 700, fontSize: 14, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nome}</span>
              <button type="button" className="at-b" disabled={salvando} onClick={function() { remover(p) }} aria-label={'Remover ' + p.nome}><i className="ti ti-trash" />Remover</button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
