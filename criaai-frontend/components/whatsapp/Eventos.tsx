'use client'
import { useCallback, useEffect, useState } from 'react'
import { EVENTOS, nomeEvento } from '@/lib/waAutoTipos'

type Evento = {
  id: string; created_at: string; event_type: string; name: string; email: string; wa_id: string
  produto: string; metodo: string; status: string; sent_count: number; error: string; fluxo: string
  conversation_id: string | null
}

const STATUS: Record<string, { t: string; cor: string; bg: string; ico: string }> = {
  ativo: { t: 'Aguardando envio', cor: '#b45309', bg: 'rgba(217,119,6,0.14)', ico: 'hourglass' },
  concluido: { t: 'Mensagem enviada', cor: '#15803d', bg: 'rgba(22,163,74,0.14)', ico: 'check' },
  cancelado: { t: 'Cancelado (a pessoa comprou)', cor: '#6b7280', bg: 'rgba(107,114,128,0.14)', ico: 'circle-x' },
  erro: { t: 'Erro no envio', cor: '#b91c1c', bg: 'rgba(220,38,38,0.12)', ico: 'alert-triangle' },
  falhou: { t: 'Erro no envio', cor: '#b91c1c', bg: 'rgba(220,38,38,0.12)', ico: 'alert-triangle' },
}

function quando(iso: string): string {
  try {
    return new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  } catch (e) { return '' }
}
function fone(wa: string): string {
  const m = String(wa || '').match(/^55(\d{2})(\d{4,5})(\d{4})$/)
  return m ? '(' + m[1] + ') ' + m[2] + '-' + m[3] : wa
}

// Eventos da Hubla (pix gerado, compra aprovada...) e botao para abrir o chat de cada pessoa
export default function Eventos({ onAbrir }: { onAbrir: (conversationId: string) => void }) {
  const [lista, setLista] = useState<Evento[] | null>(null)
  const [tipo, setTipo] = useState('')
  const [busca, setBusca] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  const carregar = useCallback(async function(t: string, q: string) {
    setCarregando(true); setErro('')
    try {
      const r = await fetch('/api/whatsapp/eventos?tipo=' + encodeURIComponent(t) + '&q=' + encodeURIComponent(q), { cache: 'no-store' })
      const j = await r.json().catch(function() { return {} })
      if (r.ok) setLista(j.eventos || []); else setErro(j.error || 'Não foi possível carregar os eventos.')
    } catch (e) { setErro('Sem conexão. Tente de novo.') }
    setCarregando(false)
  }, [])

  useEffect(function() {
    const tm = setTimeout(function() { carregar(tipo, busca) }, busca ? 400 : 0)
    return function() { clearTimeout(tm) }
  }, [tipo, busca, carregar])

  const tipos = EVENTOS.filter(function(e) { return ['invoice.created', 'invoice.payment_succeeded', 'invoice.payment_failed', 'invoice.expired', 'lead.abandoned_checkout', 'invoice.refunded'].indexOf(e.k) !== -1 })

  return (
    <div style={{ padding: 20, overflowY: 'auto', flex: 1, minHeight: 0 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
          <div style={{ flex: '1 1 260px', minWidth: 0 }}>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text)', margin: 0 }}>Eventos da Hubla</h2>
            <p style={{ fontSize: 13, color: 'var(--muted2)', lineHeight: 1.5, margin: '4px 0 0', maxWidth: '65ch' }}>Pix gerado, compra aprovada e outros avisos da Hubla. Toque em <b>Abrir chat</b> para ver a conversa da pessoa no chat de recuperação.</p>
          </div>
          <button className="at-b" onClick={function() { carregar(tipo, busca) }} disabled={carregando}><i className={'ti ' + (carregando ? 'ti-loader' : 'ti-refresh')} />{carregando ? 'Atualizando…' : 'Atualizar'}</button>
        </div>

        <div className="at-seg" style={{ overflowX: 'auto', marginBottom: 10 }}>
          <button className={tipo === '' ? 'on' : ''} onClick={function() { setTipo('') }} style={{ flex: '0 0 auto', padding: '7px 12px' }}>Todos</button>
          {tipos.map(function(e) {
            return <button key={e.k} className={tipo === e.k ? 'on' : ''} onClick={function() { setTipo(e.k) }} style={{ flex: '0 0 auto', padding: '7px 12px', overflow: 'visible' }}>{e.k === 'invoice.created' ? 'Pix/cobrança gerada' : e.nome}</button>
          })}
        </div>

        <div className="at-busca" style={{ marginBottom: 14 }}>
          <i className="ti ti-search" />
          <input className="at-input" value={busca} onChange={function(e) { setBusca(e.target.value) }} placeholder="Buscar por nome, e-mail ou telefone" aria-label="Buscar eventos" />
        </div>

        {erro && <div role="alert" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 12, background: 'rgba(220,38,38,0.08)', color: '#b91c1c', fontSize: 13, fontWeight: 700, marginBottom: 12 }}><i className="ti ti-alert-triangle" />{erro}</div>}
        {lista === null && !erro && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 32, fontSize: 13.5, color: 'var(--muted2)' }}><i className="ti ti-loader" style={{ fontSize: 18 }} />Carregando eventos…</div>}
        {lista !== null && lista.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--muted2)' }}>
            <i className="ti ti-inbox" style={{ fontSize: 40, opacity: 0.45 }} />
            <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text)', marginTop: 8 }}>Nenhum evento encontrado.</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>{busca || tipo ? 'Tente outro filtro ou apague a busca.' : 'Quando alguém gerar um Pix ou comprar pela Hubla, aparece aqui.'}</div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, opacity: carregando ? 0.6 : 1, transition: 'opacity .15s' }}>
          {(lista || []).map(function(e) {
            const st = STATUS[e.status] || { t: e.status, cor: '#6b7280', bg: 'rgba(107,114,128,0.14)', ico: 'info-circle' }
            return (
              <div key={e.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text)' }}>{e.name || 'Sem nome'} <span style={{ fontWeight: 500, color: 'var(--muted2)', fontSize: 12.5, fontVariantNumeric: 'tabular-nums' }}>· {fone(e.wa_id)}</span></div>
                  <div style={{ fontSize: 12.5, color: 'var(--text)', marginTop: 3 }}>
                    <b>{nomeEvento(e.event_type)}</b>{e.metodo ? ' · ' + e.metodo : ''}{e.produto ? ' · ' + e.produto : ''}
                  </div>
                  {e.email && <div style={{ fontSize: 12, color: 'var(--muted2)', wordBreak: 'break-all', marginTop: 2 }}>{e.email}</div>}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', fontSize: 12, color: 'var(--muted2)', marginTop: 6 }}>
                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>{quando(e.created_at)}</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: st.bg, color: st.cor, borderRadius: 999, padding: '2px 8px', fontSize: 11.5, fontWeight: 700 }}><i className={'ti ti-' + st.ico} style={{ fontSize: 13 }} />{st.t}</span>
                    {e.fluxo ? <span>fluxo &ldquo;{e.fluxo}&rdquo;</span> : null}
                  </div>
                  {e.error && <div style={{ fontSize: 12, color: '#b91c1c', marginTop: 4 }}>{e.error}</div>}
                </div>
                {e.conversation_id ? (
                  <button className="at-b at-b-ok" onClick={function() { onAbrir(e.conversation_id as string) }}><i className="ti ti-message-circle" />Abrir chat</button>
                ) : (
                  <span style={{ fontSize: 12, color: 'var(--muted2)' }}>Ainda sem chat</span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
