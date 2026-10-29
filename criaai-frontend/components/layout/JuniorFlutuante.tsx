'use client'
import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

// Botao do Junior no cantinho de todas as telas: "Esta com duvidas? Fale conosco".
// Abre um chat pequeno com o mesmo Junior (e o mesmo historico) do menu Assistente IA.
interface Msg { id?: string; role: 'user' | 'assistant'; content: string; imageUrl?: string; human?: boolean }
const STORAGE_KEY = 'mcpia_chat_history'
const ESCONDER_EM = ['/dashboard/chat', '/dashboard/atendimento']

function boasVindas(nome: string): Msg {
  return { role: 'assistant', content: 'A paz do Senhor' + (nome ? ', ' + nome : '') + '!\n\nEu sou o Junior, assistente da Mentoria Cristao Prospero.\n\nVou te ajudar agora!' }
}

export default function JuniorFlutuante() {
  const pathname = usePathname() || ''
  const [aberto, setAberto] = useState(false)
  const [rotulo, setRotulo] = useState(true)
  const [msgs, setMsgs] = useState<Msg[]>([boasVindas('')])
  const [nome, setNome] = useState('')
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [humano, setHumano] = useState(false)
  const [pronto, setPronto] = useState(false)
  const fim = useRef<HTMLDivElement>(null)

  // Le o historico e o nome ao abrir o chat (sempre atualizado com o que foi falado no menu Assistente IA)
  useEffect(function() {
    if (!aberto) return
    let vivo = true
    async function ler() {
      let n = nome
      if (!n) {
        try {
          const u = await createClient().auth.getUser()
          if (u.data.user) {
            const p = await createClient().from('profiles').select('full_name').eq('id', u.data.user.id).single()
            n = ((p.data as any)?.full_name || '').split(' ')[0] || ''
          }
        } catch (e) {}
        if (vivo) setNome(n)
      }
      try {
        const salvo = localStorage.getItem(STORAGE_KEY)
        const lista = salvo ? JSON.parse(salvo) : null
        if (vivo) setMsgs(Array.isArray(lista) && lista.length > 0 ? lista : [boasVindas(n)])
      } catch (e) { if (vivo) setMsgs([boasVindas(n)]) }
      if (vivo) setPronto(true)
    }
    ler()
    return function() { vivo = false }
  }, [aberto])

  useEffect(function() {
    if (!pronto) return
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(msgs)) } catch (e) {}
  }, [msgs, pronto])

  useEffect(function() { if (aberto && fim.current) fim.current.scrollIntoView({ behavior: 'smooth' }) }, [msgs, aberto, enviando])

  useEffect(function() {
    try { if (sessionStorage.getItem('mcpia_junior_rotulo_off')) setRotulo(false) } catch (e) {}
  }, [])

  if (ESCONDER_EM.some(function(p) { return pathname === p || pathname.indexOf(p + '/') === 0 })) return null

  async function enviar() {
    const t = texto.trim()
    if (!t || enviando) return
    const novas: Msg[] = [...msgs, { role: 'user', content: t }]
    setMsgs(novas); setTexto(''); setEnviando(true)
    try {
      const r = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: novas.filter(function(m, i) { return m.role !== 'assistant' || i > 0 }).map(function(m) { return { role: m.role, content: m.content } }) }),
      })
      const d = await r.json()
      if (d.human) setHumano(true)
      else setMsgs(function(prev) { return [...prev, { role: 'assistant', content: d.reply || 'Erro ao gerar resposta.' }] })
    } catch (e) {
      setMsgs(function(prev) { return [...prev, { role: 'assistant', content: 'Erro ao conectar. Tente novamente.' }] })
    }
    setEnviando(false)
  }

  function fecharRotulo() { setRotulo(false); try { sessionStorage.setItem('mcpia_junior_rotulo_off', '1') } catch (e) {} }

  return (
    <>
      <style>{`
        @keyframes jfPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(31,111,80,.45), 0 6px 18px rgba(0,0,0,.25) } 50% { box-shadow: 0 0 0 12px rgba(31,111,80,0), 0 6px 18px rgba(0,0,0,.25) } }
        @keyframes jfIn { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: none } }
        .jf-painel { animation: jfIn .18s ease-out }
        @media (max-width: 640px) { .jf-painel { right: 10px !important; left: 10px !important; width: auto !important; bottom: 88px !important; height: min(70vh, 520px) !important } }
      `}</style>

      {aberto && (
        <div className="jf-painel" style={{ position: 'fixed', right: 20, bottom: 96, width: 360, height: 500, maxHeight: 'calc(100vh - 120px)', zIndex: 1000, display: 'flex', flexDirection: 'column', background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 18, boxShadow: '0 18px 50px rgba(0,0,0,.28)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: '#1f6f50', color: '#fff' }}>
            <div style={{ position: 'relative' }}>
              <img src="/avatar-junior/junior.svg" alt="Junior" style={{ width: 38, height: 38, borderRadius: '50%', display: 'block', background: '#fff' }} />
              <span style={{ position: 'absolute', bottom: 0, right: 0, width: 11, height: 11, borderRadius: '50%', background: '#4ade80', border: '2px solid #1f6f50' }} />
            </div>
            <div style={{ flex: 1, lineHeight: 1.2 }}>
              <div style={{ fontWeight: 800, fontSize: 15 }}>Junior</div>
              <div style={{ fontSize: 12, opacity: .9 }}>Online para te ajudar</div>
            </div>
            <a href="/dashboard/chat" title="Abrir a conversa completa" style={{ color: '#fff', fontSize: 12, textDecoration: 'underline', opacity: .9 }}>Tela cheia</a>
            <button onClick={function() { setAberto(false) }} aria-label="Fechar" style={{ background: 'rgba(255,255,255,.18)', border: 0, color: '#fff', width: 28, height: 28, borderRadius: 8, cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>✕</button>
          </div>
          {humano && <div style={{ padding: '8px 14px', background: 'rgba(22,163,74,.12)', fontSize: 12.5, color: 'var(--text)' }}>Um atendente da equipe está cuidando da sua conversa. Pode mandar sua mensagem que ele responde.</div>}
          <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--bg)' }}>
            {msgs.map(function(m, i) {
              const eu = m.role === 'user'
              return (
                <div key={i} style={{ display: 'flex', justifyContent: eu ? 'flex-end' : 'flex-start' }}>
                  <div style={{ maxWidth: '86%', padding: '9px 12px', borderRadius: eu ? '14px 14px 4px 14px' : '14px 14px 14px 4px', background: eu ? '#1f6f50' : 'var(--surface)', color: eu ? '#fff' : 'var(--text)', border: eu ? 0 : '1px solid var(--border)', fontSize: 14, lineHeight: 1.45, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {m.human && <div style={{ fontSize: 11, fontWeight: 800, color: '#16a34a', marginBottom: 2 }}>Atendimento da equipe</div>}
                    {m.imageUrl && <div style={{ fontSize: 12, opacity: .8, marginBottom: 4 }}>[print enviado]</div>}
                    {m.content}
                  </div>
                </div>
              )
            })}
            {enviando && <div style={{ fontSize: 13, color: 'var(--muted2)' }}>Junior está digitando…</div>}
            <div ref={fim} />
          </div>
          <div style={{ display: 'flex', gap: 8, padding: 10, borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
            <textarea value={texto} onChange={function(e) { setTexto(e.target.value) }} rows={1} placeholder="Escreva sua dúvida…"
              onKeyDown={function(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() } }}
              style={{ flex: 1, resize: 'none', border: '1px solid var(--border2)', background: 'var(--surface2)', color: 'var(--text)', borderRadius: 12, padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', outline: 'none', maxHeight: 90 }} />
            <button onClick={enviar} disabled={enviando || !texto.trim()} aria-label="Enviar" style={{ width: 42, height: 42, borderRadius: 12, border: 0, background: '#1f6f50', color: '#fff', cursor: enviando || !texto.trim() ? 'default' : 'pointer', opacity: enviando || !texto.trim() ? .5 : 1, fontSize: 18 }}>➤</button>
          </div>
        </div>
      )}

      {!aberto && rotulo && (
        <div style={{ position: 'fixed', right: 20, bottom: 94, zIndex: 999, background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border2)', borderRadius: 14, padding: '9px 30px 9px 14px', fontSize: 13.5, fontWeight: 700, boxShadow: '0 8px 24px rgba(0,0,0,.18)', animation: 'jfIn .3s ease-out', maxWidth: 230 }}>
          <span onClick={function() { setAberto(true) }} style={{ cursor: 'pointer' }}>Está com dúvidas?<br /><span style={{ color: '#1f6f50' }}>Fale conosco</span></span>
          <button onClick={fecharRotulo} aria-label="Esconder aviso" style={{ position: 'absolute', top: 4, right: 6, background: 'none', border: 0, color: 'var(--muted2)', cursor: 'pointer', fontSize: 13 }}>✕</button>
          <span style={{ position: 'absolute', right: 26, bottom: -6, width: 12, height: 12, background: 'var(--surface)', borderRight: '1px solid var(--border2)', borderBottom: '1px solid var(--border2)', transform: 'rotate(45deg)' }} />
        </div>
      )}

      <button onClick={function() { setAberto(!aberto) }} aria-label={aberto ? 'Fechar o chat do Junior' : 'Falar com o Junior'}
        style={{ position: 'fixed', right: 20, bottom: 20, zIndex: 1001, width: 62, height: 62, borderRadius: '50%', border: 0, background: '#1f6f50', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: aberto ? 'none' : 'jfPulse 2.4s ease-in-out infinite', boxShadow: '0 6px 18px rgba(0,0,0,.25)' }}>
        {aberto ? (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        ) : (
          <svg width="30" height="30" viewBox="0 0 24 24" fill="#fff"><path d="M12 3C6.9 3 3 6.6 3 11c0 2 .8 3.8 2.2 5.2L4 21l4.4-1.6c1.1.4 2.4.6 3.6.6 5.1 0 9-3.6 9-8s-3.9-9-9-9z" /></svg>
        )}
      </button>
    </>
  )
}
