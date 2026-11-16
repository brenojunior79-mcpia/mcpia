'use client'
import { useEffect, useState } from 'react'

// Card so do admin na tela Planos: ultimas tentativas de pagamento pelo cartao (aprovado, recusado, pendente, cancelado)
const COR: Record<string, { txt: string; cor: string; fundo: string }> = {
  aprovado: { txt: '✓ Aprovado', cor: '#16a34a', fundo: 'rgba(22,163,74,.12)' },
  recusado: { txt: '✕ Recusado', cor: '#dc2626', fundo: 'rgba(220,38,38,.12)' },
  pendente: { txt: '… Em aberto', cor: '#d97706', fundo: 'rgba(217,119,6,.12)' },
  cancelado: { txt: '⏸ Cancelado', cor: 'var(--muted2)', fundo: 'var(--surface2)' },
  vencido: { txt: '⌛ Venceu', cor: 'var(--muted2)', fundo: 'var(--surface2)' },
  reembolsado: { txt: '↩ Reembolsado', cor: '#7c3aed', fundo: 'rgba(124,58,237,.12)' },
}

function quando(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

// Link do WhatsApp: so numeros, com 55 na frente quando faltar
function linkZap(n: string) {
  let d = String(n || '').replace(/\D/g, '')
  if (!d) return ''
  if (d.length <= 11) d = '55' + d
  return 'https://wa.me/' + d
}

type Filtro = 'todos' | 'aprovado' | 'recusado' | 'pendente'

export default function EventosPagamento() {
  const [eventos, setEventos] = useState<any[] | null>(null)
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [erro, setErro] = useState('')

  function carregar() {
    setErro('')
    fetch('/api/mp/eventos', { cache: 'no-store' }).then(function(r) { return r.json() })
      .then(function(d) { if (d.error) setErro(d.error); else setEventos(d.eventos || []) })
      .catch(function() { setErro('Não consegui carregar agora.') })
  }
  useEffect(function() { carregar() }, [])

  const todos = eventos || []
  const lista = todos.filter(function(e) { return filtro === 'todos' || e.tipo === filtro })
  const nAprov = todos.filter(function(e) { return e.tipo === 'aprovado' }).length
  const nRec = todos.filter(function(e) { return e.tipo === 'recusado' }).length
  const nAberto = todos.filter(function(e) { return e.tipo === 'pendente' }).length

  function botao(v: Filtro, rotulo: string) {
    const on = filtro === v
    return <button key={v} onClick={function() { setFiltro(v) }} style={{ cursor: 'pointer', border: '1px solid ' + (on ? 'var(--accent)' : 'var(--border2)'), background: on ? 'var(--accent)' : 'var(--surface2)', color: on ? '#fff' : 'var(--text)', borderRadius: 999, padding: '6px 12px', fontSize: 12.5, fontWeight: 700 }}>{rotulo}</button>
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '16px 18px', marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 2 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 15, color: 'var(--text)' }}>💳 Pagamentos dos planos</div>
        <button onClick={carregar} style={{ marginLeft: 'auto', cursor: 'pointer', border: '1px solid var(--border2)', background: 'transparent', color: 'var(--muted2)', borderRadius: 8, padding: '4px 10px', fontSize: 12 }}>Atualizar</button>
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--muted2)', marginBottom: 12 }}>Só eventos dos planos (Starter, Pro e Premium), da Hubla e do cartão da plataforma, dos últimos 30 dias. Só o admin vê este card.</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {botao('todos', 'Todos')}{botao('aprovado', 'Aprovados (' + nAprov + ')')}{botao('recusado', 'Recusados (' + nRec + ')')}{botao('pendente', 'Em aberto (' + nAberto + ')')}
      </div>
      {erro && <div style={{ fontSize: 13, color: '#dc2626' }}>{erro}</div>}
      {!erro && eventos === null && <div style={{ fontSize: 13, color: 'var(--muted2)' }}>Carregando…</div>}
      {!erro && eventos && !lista.length && <div style={{ fontSize: 13, color: 'var(--muted2)' }}>Nenhuma tentativa ainda.</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 380, overflowY: 'auto' }}>
        {lista.map(function(e) {
          const c = COR[e.tipo] || COR.pendente
          return (
            <div key={e.id} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: '10px 12px', background: 'var(--surface2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: c.cor, background: c.fundo, borderRadius: 999, padding: '3px 9px' }}>{c.txt}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{e.plano ? 'Plano ' + e.plano : (e.produto || '')}</span>
                {e.origem && <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted2)', border: '1px solid var(--border2)', borderRadius: 999, padding: '2px 8px' }}>{e.origem}</span>}
                <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--muted2)' }}>{quando(e.created_at)}</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text)', marginTop: 6, wordBreak: 'break-word', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {linkZap(e.whatsapp)
                  ? <a href={linkZap(e.whatsapp)} target="_blank" rel="noopener noreferrer" title="Chamar no WhatsApp" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#16a34a', color: '#fff', borderRadius: 999, padding: '3px 10px', fontSize: 12.5, fontWeight: 800, textDecoration: 'none' }}><i className="ti ti-brand-whatsapp" /> {e.whatsapp}</a>
                  : <span style={{ fontSize: 12, color: 'var(--muted2)' }}>sem WhatsApp</span>}
                <span>{[e.nome, e.email].filter(Boolean).join(' · ') || 'Sem nome'}</span>
              </div>
              {e.motivo && <div style={{ fontSize: 12.5, color: 'var(--muted2)', marginTop: 2 }}>{e.motivo}</div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
