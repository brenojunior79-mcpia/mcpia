'use client'
import { useEffect, useState } from 'react'

type Canal = 'recuperacao' | 'suporte'
const CANAIS: { k: Canal; i: string; t: string; d: string }[] = [
  { k: 'suporte', i: 'headset', t: 'Base do Suporte', d: 'Tudo o que o Júnior sabe e como ele atende no chat de Suporte (alunos).' },
  { k: 'recuperacao', i: 'shopping-cart', t: 'Base da Recuperação', d: 'Tudo o que o Júnior sabe e como ele atende no chat de Recuperação (quem ainda não comprou).' },
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
      else { setOriginal(texto); setPersonalizado(true); setSalvoEm(j.atualizado_em || new Date().toISOString()); setMsg('Salvo. O Júnior já usa este texto.') }
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
      else { setTexto(j.texto || ''); setOriginal(j.texto || ''); setPersonalizado(false); setSalvoEm(null); setMsg('Voltou ao texto original.') }
    } catch (e) { setErro('Sem conexão. Tente de novo.') }
    setSalvando(false)
  }

  const mudou = texto !== original
  const info = CANAIS.filter(function(c) { return c.k === canal })[0]
  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 20 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <h2 style={{ margin: 0, fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text)' }}>Base de conhecimento</h2>
          <div style={{ fontSize: 13, color: 'var(--muted2)', lineHeight: 1.5, marginTop: 3 }}>O que o Júnior sabe e como ele atende em cada chat do WhatsApp.</div>
        </div>
        <div className="at-seg" role="tablist" style={{ maxWidth: 440 }}>
          {CANAIS.map(function(c) {
            const on = c.k === canal
            return <button key={c.k} role="tab" aria-selected={on} className={on ? 'on' : ''} onClick={function() { trocar(c.k) }}><i className={'ti ti-' + c.i} />{c.t}</button>
          })}
        </div>
        <div style={{ fontSize: 13, color: 'var(--muted2)', lineHeight: 1.55, maxWidth: '75ch' }}>
          {info.d} O texto está dividido em <b>etapas</b> (ETAPA 1, 2, 3…). Edite à vontade: o Júnior lê tudo antes de cada resposta.
          Não apague o <b>{'{{firstName}}'}</b> (é onde entra o nome da pessoa). As regras do sistema (o Júnior resolve sozinho, liberação de acesso, consulta de compra) são fixas e sempre valem por cima.
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '10px 14px', borderBottom: '1px solid var(--border)', fontSize: 12.5 }}>
            {carregando
              ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--muted2)', fontWeight: 700 }}><i className="ti ti-loader" />Abrindo…</span>
              : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 800, borderRadius: 999, padding: '3px 10px', background: personalizado ? 'rgba(22,163,74,0.14)' : 'var(--surface2)', color: personalizado ? '#15803d' : 'var(--muted2)' }}>
                  <i className={'ti ti-' + (personalizado ? 'user-check' : 'book-2')} style={{ fontSize: 14 }} />
                  {personalizado ? 'Texto personalizado por você' : 'Texto original do sistema (ainda sem mudanças suas)'}
                </span>}
            {!carregando && personalizado && salvoEm && <span style={{ color: 'var(--muted2)', fontVariantNumeric: 'tabular-nums' }}>salvo em {new Date(salvoEm).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</span>}
            {!carregando && <span style={{ marginLeft: 'auto', color: 'var(--muted2)', fontVariantNumeric: 'tabular-nums' }}>{texto.length.toLocaleString('pt-BR')} caracteres</span>}
          </div>
          <textarea value={texto} onChange={function(e) { setTexto(e.target.value) }} disabled={carregando} spellCheck={false} aria-label={info.t}
            style={{ display: 'block', width: '100%', minHeight: '58vh', resize: 'vertical', border: 0, background: 'var(--surface)', color: 'var(--text)', padding: 16, fontSize: 14, lineHeight: 1.65, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', opacity: carregando ? 0.5 : 1 }} />
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <button className={mudou ? 'at-b at-b-ok' : 'at-b'} onClick={salvar} disabled={salvando || carregando || !mudou} style={{ padding: '10px 18px', fontSize: 13.5, cursor: salvando || !mudou ? 'default' : 'pointer', opacity: salvando ? 0.6 : mudou ? 1 : 0.55 }}><i className="ti ti-check" />{salvando ? 'Salvando…' : 'Salvar'}</button>
          <button className="at-b" onClick={restaurar} disabled={salvando || carregando || !personalizado} style={{ padding: '10px 14px', cursor: personalizado ? 'pointer' : 'default', opacity: personalizado ? 1 : 0.5 }}><i className="ti ti-arrow-back-up" />Restaurar padrão</button>
          {mudou && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: '#b45309', fontWeight: 700 }}><i className="ti ti-alert-triangle" />Mudanças ainda não salvas</span>}
          {msg && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: '#15803d', fontWeight: 700 }}><i className="ti ti-circle-check" />{msg}</span>}
          {erro && <span role="alert" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: '#b91c1c', fontWeight: 700 }}><i className="ti ti-alert-triangle" />{erro}</span>}
        </div>
      </div>
    </div>
  )
}
