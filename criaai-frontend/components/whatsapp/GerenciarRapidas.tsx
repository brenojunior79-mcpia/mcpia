'use client'
import { useState } from 'react'

export type Rapida = { id: string; canal: string; titulo: string; texto: string }

// Tela do admin para adicionar, editar e apagar as mensagens rapidas de um canal
export default function GerenciarRapidas({ canal, lista, onClose, onChanged }: {
  canal: 'suporte' | 'recuperacao'
  lista: Rapida[]
  onClose: () => void
  onChanged: () => void
}) {
  const [editId, setEditId] = useState<string | null>(null)
  const [titulo, setTitulo] = useState('')
  const [texto, setTexto] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  function limpar() { setEditId(null); setTitulo(''); setTexto(''); setErro('') }

  async function salvar() {
    if (!titulo.trim() || !texto.trim()) { setErro('Preencha o título do botão e a mensagem.'); return }
    setSalvando(true); setErro('')
    try {
      const r = await fetch('/api/whatsapp/rapidas', {
        method: editId ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editId ? { id: editId, titulo, texto } : { canal, titulo, texto }),
      })
      const j = await r.json().catch(function() { return {} })
      if (!r.ok) { setErro(j.error || 'Não consegui salvar.'); setSalvando(false); return }
      limpar(); onChanged()
    } catch (e) { setErro('Sem conexão. Tente de novo.') }
    setSalvando(false)
  }

  async function apagar(r: Rapida) {
    if (!window.confirm('Apagar o botão "' + r.titulo + '"?')) return
    const x = await fetch('/api/whatsapp/rapidas?id=' + encodeURIComponent(r.id), { method: 'DELETE' })
    if (x.ok) { if (editId === r.id) limpar(); onChanged() } else setErro('Não consegui apagar.')
  }

  const campo: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '9px 11px', borderRadius: 9, border: '1px solid var(--border2)', background: 'var(--surface2)', color: 'var(--text)', fontSize: 14, fontFamily: 'inherit' }
  const bt: React.CSSProperties = { cursor: 'pointer', border: '1px solid var(--border2)', background: 'var(--surface2)', color: 'var(--text)', borderRadius: 8, padding: '6px 10px', fontSize: 12.5, fontWeight: 700 }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 205, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 14 }}>
      <div onClick={function(e) { e.stopPropagation() }} style={{ background: 'var(--surface)', color: 'var(--text)', borderRadius: 14, width: '100%', maxWidth: 560, maxHeight: '92vh', overflowY: 'auto', padding: 18, boxShadow: '0 12px 40px rgba(0,0,0,0.4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
          <div style={{ fontWeight: 800, fontSize: 16, flex: 1 }}>⚡ Mensagens rápidas ({canal === 'recuperacao' ? 'Recuperação' : 'Suporte'})</div>
          <button onClick={onClose} style={{ ...bt, padding: '4px 10px' }} aria-label="Fechar">✕</button>
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--muted2)', marginBottom: 12 }}>Cada mensagem vira um botão no chat: um clique e ela é enviada na hora. Use <b>{'{{nome}}'}</b> para colocar o primeiro nome da pessoa.</div>

        <div style={{ background: 'var(--surface2)', borderRadius: 12, padding: 12, marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>{editId ? 'Editando mensagem' : 'Nova mensagem'}</div>
          <input value={titulo} onChange={function(e) { setTitulo(e.target.value) }} maxLength={40} placeholder="Nome do botão (curto). Ex: 02 · Senha" style={{ ...campo, marginBottom: 8 }} />
          <textarea value={texto} onChange={function(e) { setTexto(e.target.value) }} rows={5} maxLength={3000} placeholder="Texto que será enviado para a pessoa…" style={{ ...campo, resize: 'vertical', marginBottom: 8 }} />
          {erro && <div style={{ color: '#b91c1c', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{erro}</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={salvar} disabled={salvando} style={{ cursor: 'pointer', border: 0, background: '#16a34a', color: '#fff', borderRadius: 9, padding: '9px 16px', fontWeight: 800, fontSize: 13.5, opacity: salvando ? 0.6 : 1 }}>{salvando ? 'Salvando…' : editId ? 'Salvar alterações' : 'Adicionar'}</button>
            {editId && <button onClick={limpar} style={bt}>Cancelar edição</button>}
          </div>
        </div>

        {lista.length === 0 && <div style={{ fontSize: 13, color: 'var(--muted2)', textAlign: 'center', padding: 12 }}>Nenhuma mensagem ainda.</div>}
        {lista.map(function(r) {
          return (
            <div key={r.id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '9px 11px', marginBottom: 8, background: editId === r.id ? 'var(--accent-light)' : undefined }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ fontWeight: 800, fontSize: 13.5, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.titulo}</div>
                <button onClick={function() { setEditId(r.id); setTitulo(r.titulo); setTexto(r.texto); setErro('') }} style={bt}>Editar</button>
                <button onClick={function() { apagar(r) }} style={{ ...bt, color: '#b91c1c' }}>Apagar</button>
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--muted2)', marginTop: 5, whiteSpace: 'pre-wrap', maxHeight: 64, overflow: 'hidden' }}>{r.texto}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
