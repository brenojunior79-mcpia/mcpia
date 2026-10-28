'use client'
import { useCallback, useEffect, useState } from 'react'
import { EVENTOS, nomeEvento } from '@/lib/waAutoTipos'

type Evento = {
  id: string; created_at: string; event_type: string; name: string; email: string; wa_id: string
  produto: string; metodo: string; status: string; sent_count: number; error: string; fluxo: string
  conversation_id: string | null
}

const STATUS: Record<string, { t: string; cor: string }> = {
  ativo: { t: '⏳ Aguardando envio', cor: '#b45309' },
  concluido: { t: '✅ Mensagem enviada', cor: '#15803d' },
  cancelado: { t: '🚫 Cancelado (a pessoa comprou)', cor: '#6b7280' },
  erro: { t: '⚠️ Erro no envio', cor: '#b91c1c' },
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

  const chip = function(on: boolean): React.CSSProperties {
    return { cursor: 'pointer', border: 0, borderRadius: 999, padding: '6px 12px', fontWeight: 700, fontSize: 12.5, whiteSpace: 'nowrap', background: on ? 'var(--accent-light)' : 'var(--surface2)', color: on ? 'var(--accent)' : 'var(--muted2)' }
  }

  return (
    <div style={{ padding: 16, overflowY: 'auto', flex: 1, minHeight: 0 }}>
      <div style={{ fontSize: 13, color: 'var(--muted2)', marginBottom: 12, lineHeight: 1.5 }}>
        Aqui aparecem os eventos da Hubla (Pix gerado, compra aprovada...). Toque em <b>Abrir chat</b> para ver a conversa da pessoa no chat de recuperação.
      </div>

      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8 }}>
        <button onClick={function() { setTipo('') }} style={chip(tipo === '')}>Todos</button>
        {EVENTOS.filter(function(e) { return ['invoice.created', 'invoice.payment_succeeded', 'invoice.payment_failed', 'invoice.expired', 'lead.abandoned_checkout', 'invoice.refunded'].indexOf(e.k) !== -1 }).map(function(e) {
          return <button key={e.k} onClick={function() { setTipo(e.k) }} style={chip(tipo === e.k)}>{e.k === 'invoice.created' ? 'Pix/cobrança gerada' : e.nome}</button>
        })}
      </div>

      <input
        value={busca}
        onChange={function(e) { setBusca(e.target.value) }}
        placeholder="Buscar por nome, e-mail ou telefone"
        style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 14, margin: '4px 0 12px' }}
      />

      {erro && <div style={{ color: '#b91c1c', fontSize: 13, marginBottom: 10 }}>{erro}</div>}
      {lista === null && !erro && <div style={{ fontSize: 13, color: 'var(--muted2)' }}>Carregando...</div>}
      {lista !== null && lista.length === 0 && <div style={{ fontSize: 13.5, color: 'var(--muted2)', textAlign: 'center', padding: 20 }}>Nenhum evento encontrado.</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, opacity: carregando ? 0.6 : 1 }}>
        {(lista || []).map(function(e) {
          const st = STATUS[e.status] || { t: e.status, cor: '#6b7280' }
          return (
            <div key={e.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 12, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text)' }}>{e.name || 'Sem nome'} <span style={{ fontWeight: 500, color: 'var(--muted2)', fontSize: 12.5 }}>· {fone(e.wa_id)}</span></div>
                <div style={{ fontSize: 12.5, color: 'var(--text)', marginTop: 2 }}>
                  <b>{nomeEvento(e.event_type)}</b>{e.metodo ? ' · ' + e.metodo : ''}{e.produto ? ' · ' + e.produto : ''}
                </div>
                {e.email && <div style={{ fontSize: 12, color: 'var(--muted2)', wordBreak: 'break-all' }}>{e.email}</div>}
                <div style={{ fontSize: 12, color: 'var(--muted2)', marginTop: 2 }}>
                  {quando(e.created_at)} · <span style={{ color: st.cor, fontWeight: 700 }}>{st.t}</span>{e.fluxo ? ' · fluxo "' + e.fluxo + '"' : ''}
                </div>
                {e.error && <div style={{ fontSize: 12, color: '#b91c1c', marginTop: 2 }}>{e.error}</div>}
              </div>
              {e.conversation_id ? (
                <button onClick={function() { onAbrir(e.conversation_id as string) }} style={{ cursor: 'pointer', border: 0, borderRadius: 10, padding: '9px 14px', fontWeight: 800, fontSize: 13, background: '#16a34a', color: '#fff' }}>💬 Abrir chat</button>
              ) : (
                <span style={{ fontSize: 12, color: 'var(--muted2)' }}>Ainda sem chat</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
