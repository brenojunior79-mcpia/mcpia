'use client'
import { useEffect, useState } from 'react'

const NOMES: Record<string, { nome: string; curto: string; quem: string }> = {
  sentimos_falta: { nome: '💛 Sentimos sua falta', curto: '💛 Sentimos falta', quem: 'Alunos que não abrem a plataforma há alguns dias' },
  oferta_express: { nome: '🚀 Oferta da Estrutura Express', curto: '🚀 Oferta Express', quem: 'Alunos que ainda não têm a Estrutura Express' },
}

function quando(iso: string | null) {
  if (!iso) return 'ainda não enviou'
  try { return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) } catch (e) { return iso }
}

export default function PushAutoCard() {
  const [itens, setItens] = useState<any[] | null>(null)
  const [erro, setErro] = useState('')
  const [msg, setMsg] = useState<Record<string, { ok: boolean; t: string }>>({})
  const [busy, setBusy] = useState('')
  const [rodando, setRodando] = useState(false)
  const [aberto, setAberto] = useState('')

  async function carregar() {
    try {
      const r = await fetch('/api/push/auto/config', { cache: 'no-store' })
      const j = await r.json()
      if (!r.ok) { setErro(j.error || 'Não foi possível carregar.'); return }
      setItens((j.itens || []).map(function(i: any) { return { ...i, form: { ...(i.config || {}) } } }))
    } catch (e) { setErro('Sem conexão.') }
  }
  useEffect(function() { carregar() }, [])

  function mudar(tipo: string, campo: string, valor: any) {
    setItens(function(ant) { return (ant || []).map(function(i) { return i.tipo === tipo ? { ...i, form: { ...i.form, [campo]: valor } } : i }) })
  }
  function aviso(tipo: string, ok: boolean, t: string) { setMsg(function(m) { return { ...m, [tipo]: { ok, t } } }) }

  async function salvar(i: any, ativoNovo?: boolean) {
    setBusy(i.tipo + 's')
    const f = { ...i.form, ...(ativoNovo === undefined ? {} : { ativo: ativoNovo }) }
    try {
      const r = await fetch('/api/push/auto/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: i.tipo, ativo: f.ativo, titulo: f.titulo, mensagem: f.mensagem, url: f.url, dias_sem_entrar: f.dias_sem_entrar, repetir_dias: f.repetir_dias }) })
      const j = await r.json().catch(function() { return {} })
      if (!r.ok) aviso(i.tipo, false, j.error || 'Não foi possível salvar.')
      else { aviso(i.tipo, true, '✓ Salvo.'); await carregar() }
    } catch (e) { aviso(i.tipo, false, 'Sem conexão.') }
    setBusy('')
  }

  async function testar(i: any) {
    setBusy(i.tipo + 't')
    try {
      const r = await fetch('/api/push/auto?teste=1&tipo=' + i.tipo, { cache: 'no-store' })
      const j = await r.json().catch(function() { return {} })
      if (!r.ok) aviso(i.tipo, false, j.error || 'Não foi possível enviar o teste.')
      else aviso(i.tipo, true, '✓ Teste enviado para o seu celular (salve antes se mudou o texto).')
    } catch (e) { aviso(i.tipo, false, 'Sem conexão.') }
    setBusy('')
  }

  async function executarAgora() {
    if (!window.confirm('Enviar AGORA os dois avisos para todos que entram na regra? Isso manda notificação de verdade para os alunos.')) return
    setRodando(true)
    try {
      const r = await fetch('/api/push/auto?executar=1', { cache: 'no-store' })
      const j = await r.json().catch(function() { return {} })
      if (!r.ok) setErro(j.error || 'Não foi possível enviar.')
      else {
        setErro('')
        aviso('geral', true, '✓ Enviado. Sentimos sua falta: ' + ((j.sentimos_falta && j.sentimos_falta.pessoas) || 0) + ' pessoa(s). Oferta Express: ' + ((j.oferta_express && j.oferta_express.pessoas) || 0) + ' pessoa(s).')
        await carregar()
      }
    } catch (e) { setErro('Sem conexão.') }
    setRodando(false)
  }

  const input: React.CSSProperties = { width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }
  const rot: React.CSSProperties = { display: 'block', fontSize: 10.5, fontWeight: 700, color: 'var(--muted2)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '.04em' }
  const mini: React.CSSProperties = { cursor: 'pointer', border: 0, background: 'transparent', color: 'inherit', fontSize: 15, fontWeight: 800, lineHeight: 1, padding: '2px 6px', borderRadius: 6 }
  const card: React.CSSProperties = { borderRadius: 12, overflow: 'hidden', background: 'var(--surface2)', border: '1px solid var(--border)', boxShadow: '0 4px 14px rgba(0,0,0,0.10)', display: 'flex', flexDirection: 'column' }
  const barra = function(cor: string): React.CSSProperties { return { background: cor, color: '#0b2a0b', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4, padding: '5px 8px', fontSize: 12.5, fontWeight: 800 } }
  const corpo: React.CSSProperties = { padding: '10px 12px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }
  const link: React.CSSProperties = { cursor: 'pointer', border: 0, background: 'transparent', color: 'var(--accent)', fontSize: 12, fontWeight: 800, padding: 0, textAlign: 'left' }
  const editando = (itens || []).filter(function(x: any) { return x.tipo === aberto })[0]

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 14, marginBottom: 2 }}>🤖 Notificações automáticas</div>
      <div style={{ fontSize: 11.5, color: 'var(--muted2)', marginBottom: 8 }}>Enviadas sozinhas todo dia: “Sentimos falta” às 9h e “Oferta Express” às 18h (Brasília).</div>
      {msg.geral && <div style={{ marginBottom: 8, fontSize: 12.5, fontWeight: 700, color: msg.geral.ok ? 'var(--green)' : 'var(--red)' }}>{msg.geral.t}</div>}
      {erro && <div style={{ marginBottom: 8, fontSize: 12.5, fontWeight: 700, color: 'var(--red)' }}>⚠ {erro}</div>}
      {!itens && !erro && <div style={{ color: 'var(--muted2)', fontSize: 12.5 }}>Carregando…</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 215px))', gap: 12 }}>
        {(itens || []).map(function(i: any) {
          const f = i.form || {}
          const info = NOMES[i.tipo]
          const m = msg[i.tipo]
          return (
            <div key={i.tipo} style={card}>
              <div style={barra(f.ativo ? '#6bcf63' : '#b6bcc6')}>
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{info.curto}</span>
                <span style={{ display: 'flex', flexShrink: 0 }}>
                  <button title={f.ativo ? 'Desligar' : 'Ligar'} onClick={function() { salvar(i, !f.ativo) }} disabled={busy !== ''} style={mini}>{f.ativo ? '●' : '○'}</button>
                  <button title="Editar" onClick={function() { setAberto(aberto === i.tipo ? '' : i.tipo) }} style={mini}>···</button>
                </span>
              </div>
              <div style={corpo}>
                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 26, lineHeight: 1.1 }}>{i.entrariamAgora}</div>
                <div style={{ fontSize: 11.5, color: 'var(--muted2)' }}>recebem agora</div>
                <div style={{ fontSize: 11.5, marginTop: 6 }}>24h: <b>{i.enviados24h}</b> · 7 dias: <b>{i.enviados7d}</b></div>
                <div style={{ fontSize: 11.5, color: 'var(--muted2)' }}>último: {quando(i.ultimoEnvio)}</div>
                <button onClick={function() { testar(i) }} disabled={busy !== ''} style={{ ...link, marginTop: 6 }}>{busy === i.tipo + 't' ? 'Enviando…' : 'Testar no meu celular'}</button>
                {m && <div style={{ marginTop: 4, fontSize: 11.5, fontWeight: 700, color: m.ok ? 'var(--green)' : 'var(--red)' }}>{m.t}</div>}
              </div>
            </div>
          )
        })}
        {itens && (
          <div style={card}>
            <div style={barra('#c4b5fd')}><span>Enviar agora</span></div>
            <div style={corpo}>
              <div style={{ fontSize: 12, color: 'var(--muted2)', lineHeight: 1.4 }}>Dispara já os dois avisos para quem está na regra, sem esperar o horário.</div>
              <button onClick={executarAgora} disabled={rodando} style={{ marginTop: 'auto', cursor: 'pointer', border: 0, borderRadius: 8, padding: '7px 10px', fontWeight: 800, fontSize: 12.5, color: '#fff', background: 'linear-gradient(135deg,#5b4ef8,#ec4899)', opacity: rodando ? 0.7 : 1 }}>{rodando ? 'Enviando…' : 'Enviar agora'}</button>
            </div>
          </div>
        )}
      </div>

      {editando && (function() {
        const f = editando.form || {}
        return (
          <div style={{ marginTop: 12, maxWidth: 640, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface2)', padding: 12 }}>
            <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 8 }}>Editando: {NOMES[editando.tipo].nome}</div>
            <label style={rot}>Título ({(f.titulo || '').length}/65)</label>
            <input style={input} maxLength={65} value={f.titulo || ''} onChange={function(e) { mudar(editando.tipo, 'titulo', e.target.value) }} />
            <label style={{ ...rot, marginTop: 8 }}>Mensagem ({(f.mensagem || '').length}/240)</label>
            <textarea style={{ ...input, minHeight: 52, resize: 'vertical' }} maxLength={240} value={f.mensagem || ''} onChange={function(e) { mudar(editando.tipo, 'mensagem', e.target.value) }} />
            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              <div style={{ flex: '2 1 200px' }}>
                <label style={rot}>Ao tocar, abrir</label>
                <input style={input} value={f.url || ''} onChange={function(e) { mudar(editando.tipo, 'url', e.target.value) }} />
              </div>
              {editando.tipo === 'sentimos_falta' && (
                <div style={{ flex: '1 1 90px' }}>
                  <label style={rot}>Dias sem entrar</label>
                  <input style={input} type="number" min={1} max={60} value={f.dias_sem_entrar || 2} onChange={function(e) { mudar(editando.tipo, 'dias_sem_entrar', e.target.value) }} />
                </div>
              )}
              <div style={{ flex: '1 1 90px' }}>
                <label style={rot}>Repetir a cada (dias)</label>
                <input style={input} type="number" min={1} max={60} value={f.repetir_dias || 1} onChange={function(e) { mudar(editando.tipo, 'repetir_dias', e.target.value) }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button onClick={function() { salvar(editando) }} disabled={busy !== ''} style={{ cursor: 'pointer', border: 0, borderRadius: 8, padding: '7px 14px', fontWeight: 800, fontSize: 12.5, background: '#16a34a', color: '#fff' }}>{busy === editando.tipo + 's' ? 'Salvando…' : 'Salvar'}</button>
              <button onClick={function() { setAberto('') }} style={{ cursor: 'pointer', borderRadius: 8, padding: '7px 14px', fontWeight: 700, fontSize: 12.5, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}>Fechar</button>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
