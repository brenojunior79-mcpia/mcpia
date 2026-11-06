'use client'
import { useEffect, useState } from 'react'

type Canal = 'recuperacao' | 'suporte'
const CANAIS: { k: Canal; t: string; d: string }[] = [
  { k: 'suporte', t: '🎧 Base do Suporte', d: 'Tudo o que o Júnior sabe e como ele atende no chat de Suporte (alunos).' },
  { k: 'recuperacao', t: '🛒 Base da Recuperação', d: 'Tudo o que o Júnior sabe e como ele atende no chat de Recuperação (quem ainda não comprou).' },
]

// Admin edita o "cérebro" do Júnior no WhatsApp: um texto por chat, separado por etapas
export default function BaseConhecimento() {
  const [canal, setCanal] = useState<Canal>('suporte')
  const [texto, setTexto] = useState('')
  const [original, setOriginal] = useState('')
  const [personalizado, setPersonalizado] = useState(false)
  const [salvoEm, setSalvoEm] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState('')
  const [erro, setErro] = useState('')

  async function carregar(c: Canal) {
    setCarregando(true); setErro(''); setMsg('')
    try {
      const r = await fetch('/api/whatsapp/conhecimento?canal=' + c, { cache: 'no-store' })
      const j = await r.json().catch(function() { return {} })
      if (!r.ok) { setErro(j.error || 'Não foi possível abrir a base.'); setTexto(''); setOriginal('') }
      else { setTexto(j.texto || ''); setOriginal(j.texto || ''); setPersonalizado(j.personalizado === true); setSalvoEm(j.atualizado_em || null) }
    } catch (e) { setErro('Sem conexão. Tente de novo.') }
    setCarregando(false)
  }
  useEffect(function() { carregar(canal) }, [canal])

  function trocar(c: Canal) {
    if (c === canal) return
    if (texto !== original && !window.confirm('Você tem mudanças que ainda não foram salvas. Sair mesmo assim?')) return
    setCanal(c)
  }

  async function salvar() {
    if (salvando) return
    if (!window.confirm('Salvar? A partir da próxima mensagem, o Júnior passa a usar este texto no chat de ' + (canal === 'suporte' ? 'Suporte' : 'Recuperação') + '.')) return
    setSalvando(true); setErro(''); setMsg('')
    try {
      const r = await fetch('/api/whatsapp/conhecimento', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ canal, texto }) })
      const j = await r.json().catch(function() { return {} })
      if (!r.ok) setErro(j.error || 'Não foi possível salvar.')
      else { setOriginal(texto); setPersonalizado(true); setSalvoEm(j.atualizado_em || new Date().toISOString()); setMsg('✓ Salvo. O Júnior já usa este texto.') }
    } catch (e) { setErro('Sem conexão. Tente de novo.') }
    setSalvando(false)
  }

  async function restaurar() {
    if (salvando) return
    if (!window.confirm('Voltar ao texto original do sistema? O que você escreveu aqui será apagado.')) return
    setSalvando(true); setErro(''); setMsg('')
    try {
      const r = await fetch('/api/whatsapp/conhecimento', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ canal, restaurar: true }) })
      const j = await r.json().catch(function() { return {} })
      if (!r.ok) setErro(j.error || 'Não foi possível restaurar.')
      else { setTexto(j.texto || ''); setOriginal(j.texto || ''); setPersonalizado(false); setSalvoEm(null); setMsg('✓ Voltou ao texto original.') }
    } catch (e) { setErro('Sem conexão. Tente de novo.') }
    setSalvando(false)
  }

  const mudou = texto !== original
  const info = CANAIS.filter(function(c) { return c.k === canal })[0]
  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 1100 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {CANAIS.map(function(c) {
          const on = c.k === canal
          return <button key={c.k} onClick={function() { trocar(c.k) }} style={{ cursor: 'pointer', border: '1px solid ' + (on ? '#7c3aed' : 'var(--border2)'), background: on ? 'rgba(124,58,237,0.12)' : 'var(--surface2)', color: on ? '#7c3aed' : 'var(--text)', borderRadius: 10, padding: '9px 14px', fontWeight: 800, fontSize: 13.5 }}>{c.t}</button>
        })}
      </div>
      <div style={{ fontSize: 13, color: 'var(--muted2)', lineHeight: 1.55 }}>
        {info.d} O texto está dividido em <b>etapas</b> (ETAPA 1, 2, 3…). Edite à vontade: o Júnior lê tudo antes de cada resposta.
        Não apague o <b>{'{{firstName}}'}</b> (é onde entra o nome da pessoa). As regras do sistema (o Júnior resolve sozinho, liberação de acesso, consulta de compra) são fixas e sempre valem por cima.
      </div>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: personalizado ? '#16a34a' : 'var(--muted2)' }}>
        {carregando ? 'Abrindo…' : personalizado ? '✏️ Texto personalizado por você' + (salvoEm ? ' · salvo em ' + new Date(salvoEm).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '') : '📘 Texto original do sistema (ainda sem mudanças suas)'}
        {!carregando && <span style={{ fontWeight: 600, color: 'var(--muted2)' }}> · {texto.length.toLocaleString('pt-BR')} caracteres</span>}
      </div>
      <textarea value={texto} onChange={function(e) { setTexto(e.target.value) }} disabled={carregando} spellCheck={false}
        style={{ width: '100%', minHeight: '58vh', resize: 'vertical', border: '1px solid var(--border2)', background: 'var(--surface2)', color: 'var(--text)', borderRadius: 12, padding: 14, fontSize: 13, lineHeight: 1.55, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', outline: 'none', boxSizing: 'border-box' }} />
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <button onClick={salvar} disabled={salvando || carregando || !mudou} style={{ cursor: salvando || !mudou ? 'default' : 'pointer', border: 0, borderRadius: 10, padding: '10px 18px', fontWeight: 800, fontSize: 13.5, color: '#fff', background: mudou ? 'linear-gradient(135deg,#22c55e,#16a34a)' : 'var(--border2)', opacity: salvando ? 0.6 : 1 }}>{salvando ? 'Salvando…' : 'Salvar'}</button>
        <button onClick={restaurar} disabled={salvando || carregando || !personalizado} style={{ cursor: personalizado ? 'pointer' : 'default', border: '1px solid var(--border2)', borderRadius: 10, padding: '10px 14px', fontWeight: 700, fontSize: 13, background: 'var(--surface2)', color: 'var(--text)', opacity: personalizado ? 1 : 0.5 }}>Restaurar padrão</button>
        {mudou && <span style={{ fontSize: 12.5, color: '#d97706', fontWeight: 700 }}>Mudanças ainda não salvas</span>}
        {msg && <span style={{ fontSize: 12.5, color: '#16a34a', fontWeight: 700 }}>{msg}</span>}
        {erro && <span style={{ fontSize: 12.5, color: '#b91c1c', fontWeight: 700 }}>{erro}</span>}
      </div>
    </div>
  )
}
