'use client'
import { useEffect, useState } from 'react'

const NOMES: Record<string, { nome: string; quem: string }> = {
  sentimos_falta: { nome: '💛 Sentimos sua falta', quem: 'Alunos que não abrem a plataforma há alguns dias' },
  oferta_express: { nome: '🚀 Oferta da Estrutura Express', quem: 'Alunos que ainda não têm a Estrutura Express' },
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
  const btn: React.CSSProperties = { cursor: 'pointer', borderRadius: 8, padding: '6px 11px', fontWeight: 700, fontSize: 12.5, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)' }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '12px 14px', marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 15 }}>🤖 Notificações automáticas</div>
          <div style={{ fontSize: 11.5, color: 'var(--muted2)' }}>Enviadas todo dia às 18h (Brasília), no máximo 1 por pessoa por dia.</div>
        </div>
        <button onClick={executarAgora} disabled={rodando || !itens} style={{ ...btn, background: 'linear-gradient(135deg,#5b4ef8,#ec4899)', color: '#fff', border: 0, opacity: rodando ? 0.7 : 1 }}>{rodando ? 'Enviando…' : 'Enviar agora'}</button>
      </div>
      {msg.geral && <div style={{ marginTop: 8, fontSize: 12.5, fontWeight: 700, color: msg.geral.ok ? 'var(--green)' : 'var(--red)' }}>{msg.geral.t}</div>}
      {erro && <div style={{ marginTop: 8, fontSize: 12.5, fontWeight: 700, color: 'var(--red)' }}>⚠ {erro}</div>}
      {!itens && !erro && <div style={{ color: 'var(--muted2)', fontSize: 12.5, marginTop: 8 }}>Carregando…</div>}
      <div style={{ marginTop: 10 }}>
        {(itens || []).map(function(i: any) {
          const f = i.form || {}
          const info = NOMES[i.tipo]
          const m = msg[i.tipo]
          const edit = aberto === i.tipo
          return (
            <div key={i.tipo} style={{ borderTop: '1px solid var(--border)', padding: '9px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>{info.nome}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted2)' }}>👥 {i.entrariamAgora} agora · 📤 {i.enviados24h} em 24h · {i.enviados7d} em 7 dias · último: {quando(i.ultimoEnvio)}</div>
                </div>
                <button onClick={function() { salvar(i, !f.ativo) }} disabled={busy !== ''} style={{ ...btn, background: f.ativo ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.12)', color: f.ativo ? 'var(--green)' : 'var(--red)' }}>{f.ativo ? '● Ligada' : '○ Desligada'}</button>
                <button onClick={function() { testar(i) }} disabled={busy !== ''} style={btn}>{busy === i.tipo + 't' ? 'Enviando…' : 'Testar'}</button>
                <button onClick={function() { setAberto(edit ? '' : i.tipo) }} style={btn}>{edit ? 'Fechar' : 'Editar'}</button>
              </div>
              {edit && (
                <div style={{ marginTop: 10 }}>
                  <label style={rot}>Título ({(f.titulo || '').length}/65)</label>
                  <input style={input} maxLength={65} value={f.titulo || ''} onChange={function(e) { mudar(i.tipo, 'titulo', e.target.value) }} />
                  <label style={{ ...rot, marginTop: 8 }}>Mensagem ({(f.mensagem || '').length}/240)</label>
                  <textarea style={{ ...input, minHeight: 52, resize: 'vertical' }} maxLength={240} value={f.mensagem || ''} onChange={function(e) { mudar(i.tipo, 'mensagem', e.target.value) }} />
                  <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                    <div style={{ flex: '2 1 200px' }}>
                      <label style={rot}>Ao tocar, abrir</label>
                      <input style={input} value={f.url || ''} onChange={function(e) { mudar(i.tipo, 'url', e.target.value) }} />
                    </div>
                    {i.tipo === 'sentimos_falta' && (
                      <div style={{ flex: '1 1 90px' }}>
                        <label style={rot}>Dias sem entrar</label>
                        <input style={input} type="number" min={1} max={60} value={f.dias_sem_entrar || 2} onChange={function(e) { mudar(i.tipo, 'dias_sem_entrar', e.target.value) }} />
                      </div>
                    )}
                    <div style={{ flex: '1 1 90px' }}>
                      <label style={rot}>Repetir a cada (dias)</label>
                      <input style={input} type="number" min={1} max={60} value={f.repetir_dias || 1} onChange={function(e) { mudar(i.tipo, 'repetir_dias', e.target.value) }} />
                    </div>
                  </div>
                  <button onClick={function() { salvar(i) }} disabled={busy !== ''} style={{ ...btn, marginTop: 10, background: '#16a34a', color: '#fff', border: 0 }}>{busy === i.tipo + 's' ? 'Salvando…' : 'Salvar'}</button>
                </div>
              )}
              {m && <div style={{ marginTop: 6, fontSize: 12, fontWeight: 700, color: m.ok ? 'var(--green)' : 'var(--red)' }}>{m.t}</div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
