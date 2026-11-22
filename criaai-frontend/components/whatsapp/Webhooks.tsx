'use client'
import { useEffect, useState } from 'react'

type Ev = { evento: string; faz: string }
type Integ = { id: string; nome: string; tipo: string; url: string; protegido: boolean; protecao: string; ultimo: string | null; total30: number | null; eventos: Ev[]; recebidos: Record<string, { n: number; ultimo: string | null }>; criarLink: string; criarTexto: string }

function hora(iso: string | null) { if (!iso) return ''; try { return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }) } catch (e) { return '' } }
function num(n: number) { return n.toLocaleString('pt-BR') }

// Aba "Webhooks": todas as integrações que mandam avisos para a plataforma (Hubla, Cakto, WhatsApp, Stripe, Mercado Pago),
// com o endereço de cada uma, o que cada evento faz e o último aviso recebido. Cada cartão tem o link para criar um webhook novo.
export default function Webhooks() {
  const [lista, setLista] = useState<Integ[] | null>(null)
  const [erro, setErro] = useState('')
  const [aberto, setAberto] = useState('hubla')
  const [copiado, setCopiado] = useState('')

  async function carregar() {
    try {
      const r = await fetch('/api/whatsapp/webhooks', { cache: 'no-store' })
      const j = await r.json()
      if (!r.ok) setErro(j.error || 'Não foi possível carregar.')
      else { setLista(j.integracoes || []); setErro('') }
    } catch (e) { setErro('Sem conexão.') }
  }
  useEffect(function() { carregar() }, [])

  function copiar(id: string, url: string) {
    try { navigator.clipboard.writeText(url); setCopiado(id); setTimeout(function() { setCopiado('') }, 1800) } catch (e) { /* sem acesso à área de transferência */ }
  }

  const card: React.CSSProperties = { border: '1px solid var(--border)', borderRadius: 14, background: 'var(--surface)', marginBottom: 12, overflow: 'hidden' }
  return (
    <div style={{ maxWidth: 920, margin: '0 auto', padding: '14px 12px 40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--text)' }}><i className="ti ti-webhook" style={{ marginRight: 6 }} />Webhooks</div>
          <div style={{ fontSize: 13.5, color: 'var(--muted2)', lineHeight: 1.5, maxWidth: 640, marginTop: 4 }}>
            Webhook é o aviso que outra plataforma manda para a nossa quando algo acontece (uma compra, um pagamento recusado, uma mensagem). Aqui estão todas as integrações que já funcionam e o que cada aviso faz.
          </div>
        </div>
        <button onClick={carregar} style={{ cursor: 'pointer', border: '1px solid var(--border2)', background: 'var(--surface2)', color: 'var(--text)', borderRadius: 8, padding: '7px 12px', fontSize: 13, fontWeight: 700 }}>↻ Atualizar</button>
      </div>

      {erro && <div style={{ color: '#b91c1c', fontWeight: 700, fontSize: 14, marginBottom: 10 }}>{erro}</div>}
      {!lista && !erro && <div style={{ color: 'var(--muted2)', fontSize: 14 }}>Carregando…</div>}

      {(lista || []).map(function(it) {
        const on = aberto === it.id
        const rec = it.recebidos || {}
        return (
          <div key={it.id} style={card}>
            <div onClick={function() { setAberto(on ? '' : it.id) }} style={{ cursor: 'pointer', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15.5, color: 'var(--text)' }}>{it.nome} <span style={{ fontWeight: 600, fontSize: 12.5, color: 'var(--muted2)' }}>· {it.tipo}</span></div>
                <div style={{ fontSize: 12.5, color: 'var(--muted2)', marginTop: 2 }}>
                  {it.ultimo ? 'Último aviso: ' + hora(it.ultimo) : 'Último aviso: sem registro'}{it.total30 !== null ? ' · ' + num(it.total30) + ' avisos em 30 dias' : ''}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: it.protegido ? '#15803d' : '#b45309', background: it.protegido ? 'rgba(22,163,74,0.12)' : 'rgba(245,158,11,0.15)', borderRadius: 999, padding: '3px 10px' }}>{it.protegido ? '🔒 Protegido' : '⚠ Sem chave'}</span>
                <i className={'ti ti-chevron-' + (on ? 'up' : 'down')} style={{ color: 'var(--muted2)' }} />
              </div>
            </div>
            {on && (
              <div style={{ borderTop: '1px solid var(--border)', padding: '12px 14px' }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 4 }}>Endereço do webhook</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
                  <code style={{ flex: '1 1 260px', minWidth: 0, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', fontSize: 13, wordBreak: 'break-all', color: 'var(--text)' }}>{it.url}</code>
                  <button onClick={function() { copiar(it.id, it.url) }} style={{ cursor: 'pointer', border: '1px solid var(--border2)', background: 'var(--surface2)', color: 'var(--text)', borderRadius: 8, padding: '8px 12px', fontSize: 13, fontWeight: 700 }}>{copiado === it.id ? '✓ Copiado' : 'Copiar'}</button>
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--muted2)', marginBottom: 12 }}>Proteção: {it.protecao}.{it.id === 'hubla' ? ' Se a chave fizer parte do endereço na Hubla, ela fica depois de ?k= e não aparece aqui.' : ''}</div>

                <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 4 }}>O que cada aviso faz</div>
                {it.eventos.map(function(e, k) {
                  const quantos = Object.keys(rec).filter(function(t) { return e.evento.split(' / ').indexOf(t) >= 0 || e.evento === t }).reduce(function(a, t) { return a + rec[t].n }, 0)
                  return (
                    <div key={e.evento} style={{ padding: '7px 0', borderTop: k > 0 ? '1px solid var(--border)' : 'none', display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                      <div style={{ minWidth: 0 }}>
                        <code style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)', wordBreak: 'break-word' }}>{e.evento}</code>
                        <div style={{ fontSize: 13, color: 'var(--muted2)', lineHeight: 1.4 }}>{e.faz}</div>
                      </div>
                      {it.total30 !== null && <div style={{ flex: '0 0 auto', fontSize: 12, fontWeight: 700, color: quantos > 0 ? '#15803d' : 'var(--muted2)', whiteSpace: 'nowrap' }}>{quantos > 0 ? num(quantos) + ' em 30 dias' : 'nenhum'}</div>}
                    </div>
                  )
                })}

                <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 10, background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.25)', fontSize: 13, color: 'var(--text)', display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span><b>Criar um webhook novo:</b> {it.criarTexto}</span>
                  <a href={it.criarLink} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 800, color: '#1d4ed8', textDecoration: 'none', whiteSpace: 'nowrap' }}>Abrir {it.nome} ↗</a>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
