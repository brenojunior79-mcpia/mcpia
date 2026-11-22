'use client'
import { useEffect, useState } from 'react'

type Camp = { id: string; created_at: string; template_name: string; segment: string; status: string; total: number; contagem: Record<string, number> }
type Dest = { wa_id: string; nome: string | null; status: string; sent_at: string | null; erro: string | null; conversa: string | null }

const SEG_NOME: Record<string, string> = { todos: 'Todos os alunos', plano: 'Alunos com plano', sem_plano: 'Alunos sem plano', sem_express: 'Sem a Estrutura Express', sem_express_1: 'Sem a Express · Lista 1', sem_express_2: 'Sem a Express · Lista 2', sem_express_3: 'Sem a Express · Lista 3', sem_express_4: 'Sem a Express · Lista 4', base: 'Contatos (toda a base)', sem_plano_250: 'Sem plano · lote de 250', contatos: 'Contatos importados', teste: 'Teste' }
const ST: Record<string, { t: string; cor: string }> = {
  pending: { t: 'Na fila', cor: '#6b7280' }, sending: { t: 'Enviando', cor: '#6b7280' }, sent: { t: 'Enviado', cor: '#2563eb' },
  delivered: { t: 'Recebeu', cor: '#15803d' }, read: { t: 'Leu', cor: '#7c3aed' }, failed: { t: 'Erro', cor: '#b91c1c' }, cancelled: { t: 'Cancelado', cor: '#6b7280' },
}
function num(n: number | undefined) { return (n || 0).toLocaleString('pt-BR') }
function hora(iso: string | null) { if (!iso) return ''; try { return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }) } catch (e) { return '' } }

// Aba "Disparos" do atendimento: cada disparo (sai pelo WhatsApp de Suporte) e quem recebeu, com enviado / recebeu / leu / erro.
// Quem já tem conversa abre o chat ao tocar.
export default function DisparosLista({ onAbrir }: { onAbrir: (conversaId: string) => void }) {
  const [camps, setCamps] = useState<Camp[] | null>(null)
  const [erro, setErro] = useState('')
  const [aberto, setAberto] = useState('')
  const [dest, setDest] = useState<Record<string, Dest[] | 'carregando'>>({})
  const [filtro, setFiltro] = useState('todos')

  async function carregar() {
    try {
      const r = await fetch('/api/whatsapp/broadcast?view=lista', { cache: 'no-store' })
      const j = await r.json()
      if (!r.ok) setErro(j.error || 'Não foi possível carregar os disparos.')
      else { setCamps((j.campanhas || []).filter(function(c: Camp) { return c.segment !== 'teste' })); setErro('') }
    } catch (e) { setErro('Sem conexão.') }
  }
  useEffect(function() { carregar() }, [])

  async function abrirCamp(id: string) {
    if (aberto === id) { setAberto(''); return }
    setAberto(id); setFiltro('todos')
    if (dest[id] && dest[id] !== 'carregando') return
    setDest(function(d) { return { ...d, [id]: 'carregando' } })
    try {
      const r = await fetch('/api/whatsapp/broadcast?view=enviados&id=' + encodeURIComponent(id), { cache: 'no-store' })
      const j = await r.json()
      setDest(function(d) { return { ...d, [id]: r.ok ? (j.destinatarios || []) : [] } })
    } catch (e) { setDest(function(d) { return { ...d, [id]: [] } }) }
  }

  return (
    <div style={{ padding: 10 }}>
      <div style={{ fontSize: 12.5, color: 'var(--muted2)', lineHeight: 1.45, marginBottom: 10 }}>
        Aqui ficam os disparos em massa. Eles saem pelo <b>WhatsApp de Suporte</b>. Toque em um disparo para ver quem recebeu. Quem já tem conversa abre o chat.
        <button onClick={carregar} style={{ cursor: 'pointer', marginLeft: 6, border: 0, background: 'transparent', color: '#2563eb', fontWeight: 700, fontSize: 12.5, padding: 0 }}>↻ Atualizar</button>
      </div>
      {erro && <div style={{ color: '#b91c1c', fontWeight: 700, fontSize: 13 }}>{erro}</div>}
      {!camps && !erro && <div style={{ color: 'var(--muted2)', fontSize: 13.5 }}>Carregando…</div>}
      {camps && camps.length === 0 && <div style={{ color: 'var(--muted2)', fontSize: 13.5, textAlign: 'center', padding: '24px 0' }}>Nenhum disparo feito ainda.</div>}
      {(camps || []).map(function(c) {
        const ct = c.contagem || {}
        const env = (ct.sent || 0) + (ct.delivered || 0) + (ct.read || 0)
        const d = dest[c.id]
        const lista = Array.isArray(d) ? d.filter(function(x) { return filtro === 'todos' || (filtro === 'erro' ? x.status === 'failed' : filtro === 'leu' ? x.status === 'read' : x.status === filtro) }) : []
        const on = aberto === c.id
        return (
          <div key={c.id} style={{ border: '1px solid var(--border)', borderRadius: 12, marginBottom: 8, background: 'var(--surface)', overflow: 'hidden' }}>
            <div onClick={function() { abrirCamp(c.id) }} style={{ cursor: 'pointer', padding: '10px 12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text)' }}>📣 {c.template_name}</div>
                <div style={{ fontSize: 11.5, color: 'var(--muted2)' }}>{hora(c.created_at)}</div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted2)', margin: '2px 0 6px' }}>{SEG_NOME[c.segment] || c.segment} · {num(c.total)} pessoas · {c.status === 'concluido' ? 'concluído' : c.status === 'cancelado' ? 'cancelado' : c.status === 'pausado' ? 'pausado' : 'enviando'}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, fontSize: 11.5, fontWeight: 700 }}>
                <span style={{ color: '#2563eb' }}>Enviados {num(env)}</span>
                <span style={{ color: '#15803d' }}>Receberam {num((ct.delivered || 0) + (ct.read || 0))}</span>
                <span style={{ color: '#7c3aed' }}>Leram {num(ct.read)}</span>
                <span style={{ color: (ct.failed || 0) > 0 ? '#b91c1c' : 'var(--muted2)' }}>Erro {num(ct.failed)}</span>
              </div>
            </div>
            {on && (
              <div style={{ borderTop: '1px solid var(--border)', padding: '8px 10px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                  {([['todos', 'Todos'], ['sent', 'Enviado'], ['delivered', 'Recebeu'], ['read', 'Leu'], ['erro', 'Erro']] as const).map(function(f) {
                    const ativo = filtro === f[0]
                    return <button key={f[0]} onClick={function() { setFiltro(f[0]) }} style={{ cursor: 'pointer', border: '1px solid ' + (ativo ? '#16a34a' : 'var(--border)'), background: ativo ? 'rgba(22,163,74,0.12)' : 'var(--surface2)', color: 'var(--text)', borderRadius: 999, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>{f[1]}</button>
                  })}
                </div>
                {d === 'carregando' && <div style={{ fontSize: 13, color: 'var(--muted2)' }}>Carregando…</div>}
                {Array.isArray(d) && lista.length === 0 && <div style={{ fontSize: 13, color: 'var(--muted2)' }}>Ninguém nesta lista.</div>}
                {lista.map(function(x, k) {
                  const s = ST[x.status] || { t: x.status, cor: '#6b7280' }
                  return (
                    <div key={x.wa_id + k} onClick={function() { if (x.conversa) onAbrir(x.conversa) }} style={{ cursor: x.conversa ? 'pointer' : 'default', display: 'flex', justifyContent: 'space-between', gap: 8, padding: '7px 2px', borderTop: k > 0 ? '1px solid var(--border)' : 'none', alignItems: 'center' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.nome || 'Sem nome'}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--muted2)' }}>{x.wa_id}{x.conversa ? ' · tem conversa' : ''}{x.status === 'failed' && x.erro ? ' · ' + x.erro : ''}</div>
                      </div>
                      <div style={{ textAlign: 'right', flex: '0 0 auto' }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: s.cor }}>{s.t}</div>
                        <div style={{ fontSize: 10.5, color: 'var(--muted2)' }}>{hora(x.sent_at)}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
