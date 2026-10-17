'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'

type Conv = { id: string; wa_id: string; name: string | null; profile_label: string | null; status: string; unread: number; last_text: string | null; last_message_at: string; last_inbound_at: string | null }
type Msg = { id: string; conversation_id: string; direction: 'in' | 'out'; type: string; body: string | null; media_path: string | null; mime: string | null; status: string; error: string | null; created_at: string }
type Status = { connected: boolean; missing?: string[]; webhookUrl?: string; number?: string; name?: string; quality?: string; error?: string }

const WIN = 24 * 60 * 60 * 1000

function fmtPhone(wa: string): string {
  const d = (wa || '').replace(/\D/g, '')
  if (d.length === 13 && d.indexOf('55') === 0) return '+55 (' + d.slice(2, 4) + ') ' + d.slice(4, 9) + '-' + d.slice(9)
  if (d.length === 12 && d.indexOf('55') === 0) return '+55 (' + d.slice(2, 4) + ') ' + d.slice(4, 8) + '-' + d.slice(8)
  return d ? '+' + d : wa
}
function hora(iso: string): string {
  const d = new Date(iso)
  const hoje = new Date()
  if (d.toDateString() === hoje.toDateString()) return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const ontem = new Date(Date.now() - 86400000)
  if (d.toDateString() === ontem.toDateString()) return 'ontem'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}
function horaMsg(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}
function diaMsg(iso: string): string {
  const d = new Date(iso)
  if (d.toDateString() === new Date().toDateString()) return 'Hoje'
  if (d.toDateString() === new Date(Date.now() - 86400000).toDateString()) return 'Ontem'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })
}
function nomeDe(c: Conv): string { return c.name || fmtPhone(c.wa_id) }
function inicial(c: Conv): string { return (nomeDe(c).replace(/[^A-Za-zÀ-ú0-9]/g, '')[0] || '?').toUpperCase() }

function Tick({ s }: { s: string }) {
  if (s === 'failed') return <span title="Falhou" style={{ color: '#ef4444' }}>⚠</span>
  if (s === 'read') return <span style={{ color: '#34b7f1' }}>✓✓</span>
  if (s === 'delivered') return <span style={{ opacity: 0.6 }}>✓✓</span>
  return <span style={{ opacity: 0.6 }}>✓</span>
}

function Midia({ m }: { m: Msg }) {
  if (!m.media_path) return null
  const src = '/api/whatsapp/media?m=' + m.id
  if (m.type === 'image' || m.type === 'sticker') return <a href={src} target="_blank" rel="noopener noreferrer"><img src={src} alt="Imagem" style={{ maxWidth: '100%', maxHeight: 280, borderRadius: 8, display: 'block', marginBottom: m.body ? 6 : 0 }} /></a>
  if (m.type === 'audio') return <audio controls src={src} style={{ maxWidth: '100%', height: 36 }} />
  if (m.type === 'video') return <video controls src={src} style={{ maxWidth: '100%', maxHeight: 280, borderRadius: 8 }} />
  return <a href={src} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', fontWeight: 700 }}>📎 Abrir arquivo</a>
}

export default function AtendimentoPage() {
  const supabase = createClient()
  const [convs, setConvs] = useState<Conv[]>([])
  const [sel, setSel] = useState<string | null>(null)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [aba, setAba] = useState<'abertas' | 'resolvidas'>('abertas')
  const [busca, setBusca] = useState('')
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [status, setStatus] = useState<Status | null>(null)
  const [staff, setStaff] = useState<boolean | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [equipe, setEquipe] = useState(false)
  const [tplNome, setTplNome] = useState('')
  const [tplLang, setTplLang] = useState('pt_BR')
  const [tplVars, setTplVars] = useState('')
  const fim = useRef<HTMLDivElement>(null)
  const selRef = useRef<string | null>(null)
  selRef.current = sel

  const carregarConvs = useCallback(async function() {
    const r = await supabase.from('wa_conversations').select('*').order('last_message_at', { ascending: false }).limit(300)
    if (!r.error && r.data) setConvs(r.data as Conv[])
  }, [])

  const carregarMsgs = useCallback(async function(id: string) {
    const r = await supabase.from('wa_messages').select('id, conversation_id, direction, type, body, media_path, mime, status, error, created_at').eq('conversation_id', id).order('created_at', { ascending: true }).limit(500)
    if (!r.error && r.data && selRef.current === id) setMsgs(r.data as Msg[])
  }, [])

  useEffect(function() {
    (async function() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setStaff(false); return }
      const p = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
      setIsAdmin(!!(p.data as any)?.is_admin)
      const s = await supabase.rpc('wa_is_staff')
      setStaff(s.data === true)
      if (s.data === true) {
        carregarConvs()
        fetch('/api/whatsapp/status').then(function(r) { return r.json() }).then(setStatus).catch(function() {})
      }
    })()
  }, [])

  // Tempo real + atualizacao de seguranca a cada 20s
  useEffect(function() {
    if (!staff) return
    let t: any = null
    const refresh = function() {
      if (t) return
      t = setTimeout(function() { t = null; carregarConvs(); if (selRef.current) carregarMsgs(selRef.current) }, 300)
    }
    const ch = supabase.channel('wa-inbox')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wa_messages' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wa_conversations' }, refresh)
      .subscribe()
    const iv = setInterval(refresh, 20000)
    return function() { clearInterval(iv); if (t) clearTimeout(t); supabase.removeChannel(ch) }
  }, [staff])

  useEffect(function() { if (fim.current) fim.current.scrollIntoView({ block: 'end' }) }, [msgs.length, sel])

  async function abrir(c: Conv) {
    setSel(c.id); setMsgs([]); setErro(''); setTexto('')
    selRef.current = c.id
    await carregarMsgs(c.id)
    if (c.unread > 0) {
      setConvs(function(l) { return l.map(function(x) { return x.id === c.id ? { ...x, unread: 0 } : x }) })
      fetch('/api/whatsapp/read', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ conversationId: c.id }) }).catch(function() {})
    }
  }

  const atual = convs.find(function(c) { return c.id === sel }) || null
  const janelaAberta = !!(atual && atual.last_inbound_at && Date.now() - new Date(atual.last_inbound_at).getTime() < WIN)
  const horasRestantes = atual && atual.last_inbound_at ? Math.max(0, Math.ceil((WIN - (Date.now() - new Date(atual.last_inbound_at).getTime())) / 3600000)) : 0

  async function enviar(modelo?: boolean) {
    if (!atual || enviando) return
    setErro('')
    const body: any = { conversationId: atual.id }
    if (modelo) {
      if (!tplNome.trim()) { setErro('Digite o nome do modelo aprovado.'); return }
      body.template = { name: tplNome.trim(), language: tplLang.trim() || 'pt_BR', params: tplVars.split('|').map(function(x) { return x.trim() }).filter(Boolean) }
    } else {
      if (!texto.trim()) return
      body.text = texto
    }
    setEnviando(true)
    try {
      const r = await fetch('/api/whatsapp/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const j = await r.json().catch(function() { return {} })
      if (!r.ok) setErro(j.error || 'Nao foi possivel enviar.')
      else { setTexto(''); if (modelo) { setTplVars('') } await carregarMsgs(atual.id); carregarConvs() }
    } catch (e) { setErro('Sem conexao. Tente de novo.') }
    setEnviando(false)
  }

  async function mudarStatus(novo: 'aberta' | 'resolvida') {
    if (!atual) return
    await supabase.rpc('wa_set_status', { p_conv: atual.id, p_status: novo })
    await carregarConvs()
    if (novo === 'resolvida') setSel(null)
  }

  const lista = convs.filter(function(c) {
    if ((aba === 'abertas') !== (c.status !== 'resolvida')) return false
    const q = busca.trim().toLowerCase()
    if (!q) return true
    return nomeDe(c).toLowerCase().indexOf(q) >= 0 || c.wa_id.indexOf(q.replace(/\D/g, '') || '§') >= 0 || (c.profile_label || '').toLowerCase().indexOf(q) >= 0
  })
  const totalNaoLidas = convs.reduce(function(n, c) { return n + (c.status !== 'resolvida' ? c.unread : 0) }, 0)

  if (staff === null) return <div style={{ padding: 24, color: 'var(--muted2)' }}>Carregando…</div>
  if (!staff) return <div style={{ padding: 24, color: 'var(--text)' }}>Este menu é só para a equipe de atendimento.</div>

  return (
    <div style={{ height: 'calc(100vh - 56px)', minHeight: 480, display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <style>{`
        .at-wrap { flex: 1; min-height: 0; display: flex; }
        .at-list { width: 340px; flex-shrink: 0; border-right: 1px solid var(--border); display: flex; flex-direction: column; background: var(--surface); }
        .at-chat { flex: 1; min-width: 0; display: flex; flex-direction: column; }
        .at-back { display: none; }
        .at-item:hover { background: var(--surface2); }
        .at-input { width: 100%; box-sizing: border-box; padding: 10px 12px; border-radius: 10px; border: 1px solid var(--border2); background: var(--surface2); color: var(--text); font-size: 14px; outline: none; font-family: inherit; }
        @media (max-width: 760px) {
          .at-list { width: 100%; border-right: 0; ${sel ? 'display: none;' : ''} }
          .at-chat { ${sel ? '' : 'display: none;'} }
          .at-back { display: inline-flex; }
        }
      `}</style>

      {/* Topo: estado da conexao */}
      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text)' }}>💬 Atendimento WhatsApp</div>
        {totalNaoLidas > 0 && <span style={{ background: '#ef4444', color: '#fff', fontSize: 11, fontWeight: 800, borderRadius: 999, padding: '2px 8px' }}>{totalNaoLidas} não lida{totalNaoLidas > 1 ? 's' : ''}</span>}
        <div style={{ flex: 1 }} />
        {status && (status.connected
          ? <span style={{ fontSize: 12.5, color: '#15803d', fontWeight: 700 }}>🟢 Conectado · {status.number}{status.quality ? ' · qualidade ' + status.quality : ''}</span>
          : <span style={{ fontSize: 12.5, color: '#b45309', fontWeight: 700 }}>🟠 Não conectado</span>)}
        {isAdmin && <button onClick={function() { setEquipe(true) }} style={{ cursor: 'pointer', border: '1px solid var(--border2)', background: 'var(--surface2)', color: 'var(--text)', borderRadius: 8, padding: '6px 10px', fontSize: 12.5, fontWeight: 700 }}>👥 Equipe</button>}
      </div>

      {status && !status.connected && (
        <div style={{ margin: 16, padding: 16, borderRadius: 14, background: 'rgba(217,119,6,0.1)', border: '1px solid rgba(217,119,6,0.3)', color: 'var(--text)', fontSize: 13.5, lineHeight: 1.6 }}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Falta ligar o número do WhatsApp oficial</div>
          {status.error && <div style={{ marginBottom: 6, color: '#b91c1c' }}>Erro da Meta: {status.error}</div>}
          {status.missing && status.missing.length > 0 && <div>Faltam estas chaves na Vercel: <b>{status.missing.join(', ')}</b>.</div>}
          <div style={{ marginTop: 6 }}>Na Meta (Webhook do WhatsApp), use este endereço de retorno: <b style={{ wordBreak: 'break-all' }}>{status.webhookUrl}</b> e assine o campo <b>messages</b>.</div>
        </div>
      )}

      <div className="at-wrap">
        {/* Lista */}
        <div className="at-list">
          <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input className="at-input" placeholder="Buscar nome ou número" value={busca} onChange={function(e) { setBusca(e.target.value) }} />
            <div style={{ display: 'flex', gap: 6 }}>
              {(['abertas', 'resolvidas'] as const).map(function(a) {
                const on = aba === a
                return <button key={a} onClick={function() { setAba(a) }} style={{ flex: 1, cursor: 'pointer', border: 0, borderRadius: 8, padding: '7px 4px', fontWeight: 700, fontSize: 13, background: on ? 'var(--accent-light)' : 'var(--surface2)', color: on ? 'var(--accent)' : 'var(--muted2)' }}>{a === 'abertas' ? 'Abertas' : 'Resolvidas'}</button>
              })}
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {lista.length === 0 && <div style={{ padding: 20, fontSize: 13.5, color: 'var(--muted2)', textAlign: 'center' }}>{aba === 'abertas' ? 'Nenhuma conversa aberta.' : 'Nenhuma conversa resolvida.'}</div>}
            {lista.map(function(c) {
              const on = c.id === sel
              return (
                <div key={c.id} className="at-item" onClick={function() { abrir(c) }} style={{ display: 'flex', gap: 10, padding: '11px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)', background: on ? 'var(--accent-light)' : undefined }}>
                  <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'linear-gradient(135deg,#16a34a,#4ade80)', color: '#fff', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{inicial(c)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ fontWeight: c.unread > 0 ? 800 : 600, fontSize: 14, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nomeDe(c)}</div>
                      <div style={{ fontSize: 11.5, color: c.unread > 0 ? '#16a34a' : 'var(--muted2)', flexShrink: 0 }}>{hora(c.last_message_at)}</div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                      <div style={{ fontSize: 12.5, color: 'var(--muted2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.last_text}</div>
                      {c.unread > 0 && <span style={{ background: '#16a34a', color: '#fff', borderRadius: 999, minWidth: 20, height: 20, padding: '0 6px', fontSize: 11.5, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>{c.unread}</span>}
                    </div>
                    {c.profile_label && <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>🎓 {c.profile_label}</div>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Conversa */}
        <div className="at-chat">
          {!atual ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted2)', fontSize: 14, textAlign: 'center', padding: 20 }}>Escolha uma conversa à esquerda para responder.</div>
          ) : (
            <>
              <div style={{ padding: '10px 14px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <button className="at-back" onClick={function() { setSel(null) }} style={{ border: 0, background: 'var(--surface2)', color: 'var(--text)', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>←</button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nomeDe(atual)}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted2)' }}>{fmtPhone(atual.wa_id)}{atual.profile_label ? ' · 🎓 ' + atual.profile_label : ''}</div>
                </div>
                {atual.status === 'resolvida'
                  ? <button onClick={function() { mudarStatus('aberta') }} style={{ cursor: 'pointer', border: '1px solid var(--border2)', background: 'var(--surface2)', color: 'var(--text)', borderRadius: 8, padding: '7px 10px', fontWeight: 700, fontSize: 12.5 }}>Reabrir</button>
                  : <button onClick={function() { mudarStatus('resolvida') }} style={{ cursor: 'pointer', border: 0, background: '#16a34a', color: '#fff', borderRadius: 8, padding: '7px 10px', fontWeight: 800, fontSize: 12.5 }}>✓ Resolver</button>}
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 6px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {msgs.map(function(m, i) {
                  const novoDia = i === 0 || new Date(msgs[i - 1].created_at).toDateString() !== new Date(m.created_at).toDateString()
                  const meu = m.direction === 'out'
                  return (
                    <div key={m.id} style={{ display: 'flex', flexDirection: 'column' }}>
                      {novoDia && <div style={{ alignSelf: 'center', fontSize: 11.5, color: 'var(--muted2)', background: 'var(--surface2)', borderRadius: 999, padding: '3px 10px', margin: '8px 0' }}>{diaMsg(m.created_at)}</div>}
                      <div style={{ alignSelf: meu ? 'flex-end' : 'flex-start', maxWidth: 'min(78%, 520px)', background: meu ? '#d9fdd3' : 'var(--surface)', color: meu ? '#111b21' : 'var(--text)', border: meu ? 'none' : '1px solid var(--border)', borderRadius: 12, padding: '7px 10px 5px', fontSize: 14, lineHeight: 1.4, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                        <Midia m={m} />
                        {m.type !== 'audio' && m.body && <div>{m.body}</div>}
                        {!m.media_path && m.type !== 'text' && m.type !== 'template' && !m.body && <div style={{ opacity: 0.7 }}>[{m.type}]</div>}
                        <div style={{ fontSize: 10.5, opacity: 0.65, textAlign: 'right', marginTop: 2 }}>{horaMsg(m.created_at)} {meu && <Tick s={m.status} />}</div>
                        {m.status === 'failed' && m.error && <div style={{ fontSize: 11.5, color: '#b91c1c' }}>{m.error}</div>}
                      </div>
                    </div>
                  )
                })}
                <div ref={fim} />
              </div>

              <div style={{ padding: 10, background: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
                {erro && <div style={{ marginBottom: 8, fontSize: 13, color: '#b91c1c', fontWeight: 600 }}>{erro}</div>}
                {janelaAberta ? (
                  <>
                    <div style={{ fontSize: 11.5, color: 'var(--muted2)', marginBottom: 6 }}>Você pode responder por mais ~{horasRestantes}h.</div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                      <textarea className="at-input" rows={2} placeholder="Digite a resposta…" value={texto} onChange={function(e) { setTexto(e.target.value) }}
                        onKeyDown={function(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() } }} style={{ resize: 'none' }} />
                      <button disabled={enviando || !texto.trim()} onClick={function() { enviar() }} style={{ cursor: 'pointer', border: 0, background: '#16a34a', color: '#fff', borderRadius: 10, padding: '11px 16px', fontWeight: 800, fontSize: 14, opacity: enviando || !texto.trim() ? 0.55 : 1 }}>{enviando ? '…' : 'Enviar'}</button>
                    </div>
                  </>
                ) : (
                  <div style={{ background: 'rgba(217,119,6,0.1)', borderRadius: 12, padding: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>⏳ Passaram 24 horas desde a última mensagem do aluno.</div>
                    <div style={{ fontSize: 12.5, color: 'var(--muted2)', marginBottom: 8 }}>Para voltar a falar, envie um <b>modelo aprovado</b> na Meta. Quando o aluno responder, a conversa volta a ficar livre.</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <input className="at-input" placeholder="Nome do modelo" value={tplNome} onChange={function(e) { setTplNome(e.target.value) }} style={{ flex: '1 1 150px' }} />
                      <input className="at-input" placeholder="Idioma" value={tplLang} onChange={function(e) { setTplLang(e.target.value) }} style={{ flex: '0 0 90px' }} />
                      <input className="at-input" placeholder="Variáveis do modelo separadas por | (se tiver)" value={tplVars} onChange={function(e) { setTplVars(e.target.value) }} style={{ flex: '2 1 220px' }} />
                      <button disabled={enviando} onClick={function() { enviar(true) }} style={{ cursor: 'pointer', border: 0, background: '#16a34a', color: '#fff', borderRadius: 10, padding: '10px 14px', fontWeight: 800, fontSize: 13.5 }}>{enviando ? '…' : 'Enviar modelo'}</button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {equipe && <Equipe onClose={function() { setEquipe(false) }} />}
    </div>
  )
}

// Admin escolhe quem da equipe pode atender (so ve este menu, sem acesso ao resto do admin)
function Equipe({ onClose }: { onClose: () => void }) {
  const supabase = createClient()
  const [lista, setLista] = useState<{ id: string; nome: string; email: string }[]>([])
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState('')

  async function carregar() {
    const r = await supabase.rpc('wa_support_list')
    if (!r.error && r.data) setLista(r.data as any)
  }
  useEffect(function() { carregar() }, [])

  async function mudar(em: string, on: boolean) {
    setMsg('')
    const r = await supabase.rpc('wa_set_support', { p_email: em, p_on: on })
    if (r.error) setMsg(r.error.message)
    else { if (on) setEmail(''); carregar() }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={function(e) { e.stopPropagation() }} style={{ background: 'var(--surface)', color: 'var(--text)', borderRadius: 16, padding: 20, width: '100%', maxWidth: 440, maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div style={{ fontWeight: 800, fontSize: 16 }}>👥 Equipe de atendimento</div>
          <button onClick={onClose} style={{ border: 0, background: 'transparent', color: 'var(--muted2)', fontSize: 20, cursor: 'pointer' }}>×</button>
        </div>
        <div style={{ fontSize: 13, color: 'var(--muted2)', marginBottom: 12 }}>Quem você adicionar aqui vê só o menu de atendimento, sem acesso ao resto do painel admin. A pessoa precisa ter conta na plataforma.</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input className="at-input" type="email" placeholder="E-mail da conta do atendente" value={email} onChange={function(e) { setEmail(e.target.value) }} />
          <button onClick={function() { if (email.trim()) mudar(email, true) }} style={{ cursor: 'pointer', border: 0, background: '#16a34a', color: '#fff', borderRadius: 10, padding: '0 14px', fontWeight: 800 }}>Adicionar</button>
        </div>
        {msg && <div style={{ fontSize: 13, color: '#b91c1c', fontWeight: 600, marginBottom: 8 }}>{msg}</div>}
        {lista.length === 0 ? <div style={{ fontSize: 13.5, color: 'var(--muted2)' }}>Nenhum atendente adicionado ainda (admins sempre têm acesso).</div> : lista.map(function(p) {
          return (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 10, background: 'var(--surface2)', marginBottom: 6 }}>
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 700, fontSize: 14 }}>{p.nome || 'Sem nome'}</div><div style={{ fontSize: 12, color: 'var(--muted2)', wordBreak: 'break-all' }}>{p.email}</div></div>
              <button onClick={function() { mudar(p.email, false) }} style={{ cursor: 'pointer', border: '1px solid rgba(220,38,38,0.4)', background: 'transparent', color: '#dc2626', borderRadius: 8, padding: '5px 9px', fontWeight: 700, fontSize: 12 }}>Remover</button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
