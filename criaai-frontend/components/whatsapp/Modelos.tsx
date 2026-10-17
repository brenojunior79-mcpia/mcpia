'use client'
import { useState } from 'react'

export type Tpl = { name: string; language: string; status: string; category: string; rejected_reason?: string; header: string; body: string; footer: string; buttons: string[]; vars: number }

const ST: Record<string, { t: string; c: string; bg: string }> = {
  APPROVED: { t: 'Aprovado', c: '#15803d', bg: 'rgba(22,163,74,0.14)' },
  PENDING: { t: 'Em análise', c: '#b45309', bg: 'rgba(217,119,6,0.16)' },
  REJECTED: { t: 'Recusado', c: '#b91c1c', bg: 'rgba(220,38,38,0.14)' },
  PAUSED: { t: 'Pausado', c: '#b45309', bg: 'rgba(217,119,6,0.16)' },
  DISABLED: { t: 'Desativado', c: '#6b7280', bg: 'rgba(107,114,128,0.16)' },
}
const CAT: Record<string, string> = { MARKETING: 'Marketing', UTILITY: 'Utilidade', AUTHENTICATION: 'Autenticação' }

export function maxVars(text: string): number {
  let n = 0
  const re = /\{\{(\d+)\}\}/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) { n = Math.max(n, parseInt(m[1], 10)) }
  return n
}

export function renderTpl(body: string, params: string[]): string {
  return body.replace(/\{\{(\d+)\}\}/g, function(_x, i) { return params[parseInt(i, 10) - 1] || '{{' + i + '}}' })
}

function limparNome(v: string): string {
  return v.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[\s-]+/g, '_').replace(/[^a-z0-9_]/g, '').slice(0, 100)
}

const btn: React.CSSProperties = { cursor: 'pointer', border: '1px solid var(--border2)', background: 'var(--surface2)', color: 'var(--text)', borderRadius: 8, padding: '7px 11px', fontSize: 12.5, fontWeight: 700 }
const lab: React.CSSProperties = { fontSize: 12.5, fontWeight: 700, color: 'var(--text)', marginBottom: 4, display: 'block' }

export default function Modelos({ isAdmin, tpls, erro, carregando, onReload }: { isAdmin: boolean; tpls: Tpl[] | null; erro: string; carregando: boolean; onReload: () => void }) {
  const [novo, setNovo] = useState(false)
  const [aviso, setAviso] = useState('')
  const [apagando, setApagando] = useState('')

  async function apagar(t: Tpl) {
    if (!window.confirm('Apagar o modelo "' + t.name + '" (todos os idiomas)? Isso não pode ser desfeito.')) return
    setApagando(t.name); setAviso('')
    try {
      const r = await fetch('/api/whatsapp/templates?name=' + encodeURIComponent(t.name), { method: 'DELETE' })
      const j = await r.json().catch(function() { return {} })
      if (!r.ok) setAviso(j.error || 'Não foi possível apagar.')
      else onReload()
    } catch (e) { setAviso('Sem conexão. Tente de novo.') }
    setApagando('')
  }

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 16 }}>
      <div style={{ maxWidth: 920, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
          <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--text)', flex: 1 }}>📄 Modelos de mensagem</div>
          <button style={btn} onClick={onReload} disabled={carregando}>{carregando ? 'Atualizando…' : '↻ Atualizar'}</button>
          {isAdmin && <button onClick={function() { setNovo(true); setAviso('') }} style={{ cursor: 'pointer', border: 0, background: '#16a34a', color: '#fff', borderRadius: 8, padding: '8px 13px', fontWeight: 800, fontSize: 13 }}>+ Novo modelo</button>}
        </div>
        <div style={{ fontSize: 13, color: 'var(--muted2)', lineHeight: 1.5, marginBottom: 14 }}>
          Modelos são mensagens pré-aprovadas pela Meta. Servem para <b>começar uma conversa</b> ou voltar a falar depois de 24h sem resposta do aluno. Só os modelos <b>Aprovados</b> podem ser enviados.
        </div>

        {aviso && <div style={{ marginBottom: 12, fontSize: 13, color: '#b91c1c', fontWeight: 700 }}>{aviso}</div>}
        {erro && <div style={{ marginBottom: 12, padding: 12, borderRadius: 12, background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.25)', color: 'var(--text)', fontSize: 13.5, lineHeight: 1.5 }}>{erro}</div>}
        {!erro && tpls && tpls.length === 0 && <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted2)', fontSize: 14 }}>Nenhum modelo ainda.{isAdmin ? ' Clique em “+ Novo modelo” para criar o primeiro.' : ''}</div>}
        {!tpls && !erro && <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted2)' }}>Carregando…</div>}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
          {(tpls || []).map(function(t) {
            const s = ST[t.status] || { t: t.status, c: '#6b7280', bg: 'rgba(107,114,128,0.16)' }
            return (
              <div key={t.name + t.language} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text)', wordBreak: 'break-all', flex: 1 }}>{t.name}</div>
                  <span style={{ background: s.bg, color: s.c, borderRadius: 999, padding: '2px 9px', fontSize: 11.5, fontWeight: 800 }}>{s.t}</span>
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--muted2)' }}>{CAT[t.category] || t.category} · {t.language}{t.vars > 0 ? ' · ' + t.vars + ' variável' + (t.vars > 1 ? 's' : '') : ''}</div>
                <div style={{ background: '#d9fdd3', color: '#111b21', borderRadius: 10, padding: '8px 10px', fontSize: 13.5, lineHeight: 1.45, whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 220, overflowY: 'auto' }}>
                  {t.header && <div style={{ fontWeight: 800, marginBottom: 4 }}>{t.header}</div>}
                  {t.body}
                  {t.footer && <div style={{ fontSize: 11.5, opacity: 0.6, marginTop: 6 }}>{t.footer}</div>}
                </div>
                {t.buttons.length > 0 && <div style={{ fontSize: 12, color: 'var(--muted2)' }}>Botões: {t.buttons.join(' · ')}</div>}
                {t.status === 'REJECTED' && t.rejected_reason && <div style={{ fontSize: 12, color: '#b91c1c' }}>Motivo: {t.rejected_reason}</div>}
                {isAdmin && <div><button onClick={function() { apagar(t) }} disabled={apagando === t.name} style={{ cursor: 'pointer', border: '1px solid rgba(220,38,38,0.4)', background: 'transparent', color: '#dc2626', borderRadius: 8, padding: '5px 10px', fontWeight: 700, fontSize: 12 }}>{apagando === t.name ? 'Apagando…' : 'Apagar'}</button></div>}
              </div>
            )
          })}
        </div>
      </div>

      {novo && <NovoModelo onClose={function() { setNovo(false) }} onCriado={function() { setNovo(false); setAviso(''); onReload() }} />}
    </div>
  )
}

function NovoModelo({ onClose, onCriado }: { onClose: () => void; onCriado: () => void }) {
  const [nome, setNome] = useState('')
  const [cat, setCat] = useState('UTILITY')
  const [lang, setLang] = useState('pt_BR')
  const [cab, setCab] = useState('')
  const [corpo, setCorpo] = useState('')
  const [rod, setRod] = useState('')
  const [ex, setEx] = useState<string[]>([])
  const [msg, setMsg] = useState('')
  const [salvando, setSalvando] = useState(false)

  const n = maxVars(corpo)
  const exemplos: string[] = []
  for (let i = 0; i < n; i++) exemplos.push(ex[i] || '')

  async function salvar() {
    setMsg('')
    setSalvando(true)
    try {
      const r = await fetch('/api/whatsapp/templates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: nome, category: cat, language: lang, header: cab, body: corpo, footer: rod, examples: exemplos }) })
      const j = await r.json().catch(function() { return {} })
      if (!r.ok) setMsg(j.error || 'Não foi possível criar o modelo.')
      else onCriado()
    } catch (e) { setMsg('Sem conexão. Tente de novo.') }
    setSalvando(false)
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={function(e) { e.stopPropagation() }} style={{ background: 'var(--surface)', color: 'var(--text)', borderRadius: 16, padding: 20, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontWeight: 800, fontSize: 16 }}>Novo modelo de mensagem</div>
          <button onClick={onClose} style={{ border: 0, background: 'transparent', color: 'var(--muted2)', fontSize: 22, cursor: 'pointer' }}>×</button>
        </div>

        <label style={lab}>Nome do modelo</label>
        <input className="at-input" value={nome} placeholder="ex: aviso_acesso_liberado" onChange={function(e) { setNome(limparNome(e.target.value)) }} />
        <div style={{ fontSize: 11.5, color: 'var(--muted2)', margin: '4px 0 12px' }}>Só letras minúsculas, números e _ (sem espaços). Não dá para mudar depois.</div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 180px' }}>
            <label style={lab}>Categoria</label>
            <select className="at-input" value={cat} onChange={function(e) { setCat(e.target.value) }}>
              <option value="UTILITY">Utilidade (avisos, acesso, pedido)</option>
              <option value="MARKETING">Marketing (ofertas, promoções)</option>
            </select>
          </div>
          <div style={{ flex: '1 1 140px' }}>
            <label style={lab}>Idioma</label>
            <select className="at-input" value={lang} onChange={function(e) { setLang(e.target.value) }}>
              <option value="pt_BR">Português (Brasil)</option>
              <option value="en_US">Inglês (EUA)</option>
              <option value="es">Espanhol</option>
            </select>
          </div>
        </div>

        <label style={lab}>Título (opcional)</label>
        <input className="at-input" value={cab} maxLength={60} placeholder="ex: Seu acesso chegou 🎉" onChange={function(e) { setCab(e.target.value) }} style={{ marginBottom: 12 }} />

        <label style={lab}>Mensagem</label>
        <textarea className="at-input" rows={5} value={corpo} maxLength={1024} placeholder={'Olá {{1}}, seu acesso à plataforma já está liberado! Qualquer dúvida é só responder aqui.'} onChange={function(e) { setCorpo(e.target.value) }} />
        <div style={{ fontSize: 11.5, color: 'var(--muted2)', margin: '4px 0 12px' }}>Para colocar o nome do aluno (ou outro dado), use <b>{'{{1}}'}</b>, <b>{'{{2}}'}</b>… O texto não pode começar nem terminar com uma variável.</div>

        {n > 0 && (
          <div style={{ background: 'var(--surface2)', borderRadius: 12, padding: 12, marginBottom: 12 }}>
            <div style={{ fontSize: 12.5, fontWeight: 800, marginBottom: 6 }}>Exemplo de cada variável (a Meta pede para aprovar)</div>
            {exemplos.map(function(v, i) {
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <div style={{ width: 52, fontWeight: 700, fontSize: 13 }}>{'{{' + (i + 1) + '}}'}</div>
                  <input className="at-input" value={v} placeholder={i === 0 ? 'ex: Maria' : 'exemplo'} onChange={function(e) { const c = exemplos.slice(); c[i] = e.target.value; setEx(c) }} />
                </div>
              )
            })}
          </div>
        )}

        <label style={lab}>Rodapé (opcional)</label>
        <input className="at-input" value={rod} maxLength={60} placeholder="ex: Plataforma do Cristão Próspero" onChange={function(e) { setRod(e.target.value) }} style={{ marginBottom: 12 }} />

        {msg && <div style={{ fontSize: 13, color: '#b91c1c', fontWeight: 700, marginBottom: 10 }}>{msg}</div>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={btn}>Cancelar</button>
          <button onClick={salvar} disabled={salvando || !nome || !corpo.trim()} style={{ cursor: 'pointer', border: 0, background: '#16a34a', color: '#fff', borderRadius: 8, padding: '8px 14px', fontWeight: 800, fontSize: 13, opacity: salvando || !nome || !corpo.trim() ? 0.55 : 1 }}>{salvando ? 'Enviando…' : 'Enviar para aprovação'}</button>
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--muted2)', marginTop: 10 }}>A Meta analisa o modelo (de minutos a algumas horas). Quando ficar <b>Aprovado</b>, ele aparece para enviar na conversa.</div>
      </div>
    </div>
  )
}
