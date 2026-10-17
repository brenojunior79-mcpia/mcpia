'use client'
import { useEffect, useState } from 'react'
import { DIAS, normalizar, type Horario as H } from '@/lib/waHours'
import { GATILHOS, VAZIO, aplicaNome, type Fluxo } from '@/lib/waFlows'
import Horario from './Horario'

const CURTO: Record<string, string> = { mon: 'Seg', tue: 'Ter', wed: 'Qua', thu: 'Qui', fri: 'Sex', sat: 'Sáb', sun: 'Dom' }

// "Seg a Sex · 09:00–18:00"
function resumo(h: H): string {
  const on = DIAS.filter(function(d) { return h.days[d.k].on })
  if (on.length === 0) return 'Nenhum dia de atendimento marcado'
  const grupos: Record<string, string[]> = {}
  for (const d of on) { const x = h.days[d.k]; const k = x.start + '–' + x.end; (grupos[k] = grupos[k] || []).push(d.k) }
  return Object.keys(grupos).map(function(k) {
    const ks = grupos[k]
    const idx = ks.map(function(x) { return DIAS.findIndex(function(d) { return d.k === x }) })
    const seq = idx.every(function(v, i) { return i === 0 || v === idx[i - 1] + 1 })
    const dias = ks.length >= 3 && seq ? CURTO[ks[0]] + ' a ' + CURTO[ks[ks.length - 1]] : ks.map(function(x) { return CURTO[x] }).join(', ')
    return dias + ' · ' + k
  }).join(' | ')
}

const ICONE: Record<string, string> = { primeira: '👋', palavra: '🔑', qualquer: '💬' }
const lab: React.CSSProperties = { fontSize: 12.5, fontWeight: 700, color: 'var(--text)', marginBottom: 4, display: 'block' }
const box: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 14, marginBottom: 14 }

function descricao(f: Fluxo): string {
  const quando = f.when_hours === 'dentro' ? ' · só dentro do horário' : f.when_hours === 'fora' ? ' · só fora do horário' : ''
  if (f.trigger === 'primeira') return 'Primeira mensagem de um contato novo' + quando
  if (f.trigger === 'qualquer') return 'Qualquer mensagem' + quando
  return (f.match === 'igual' ? 'Mensagem igual a: ' : 'Contém: ') + f.keywords.join(', ') + quando
}

// Editor de um fluxo (novo ou existente)
function Editor({ inicial, onVoltar }: { inicial: Fluxo; onVoltar: (recarregar: boolean) => void }) {
  const [f, setF] = useState<Fluxo>(inicial)
  const [palavras, setPalavras] = useState((inicial.keywords || []).join(', '))
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState('')
  const novo = !inicial.id

  async function salvar() {
    setSalvando(true); setMsg('')
    try {
      const r = await fetch('/api/whatsapp/flows', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'salvar', ...f, id: inicial.id, keywords: palavras.split(/[,\n;]/).map(function(x) { return x.trim() }).filter(Boolean) }) })
      const j = await r.json().catch(function() { return {} })
      if (!r.ok) setMsg(j.error || 'Não foi possível salvar.'); else onVoltar(true)
    } catch (e) { setMsg('Sem conexão. Tente de novo.') }
    setSalvando(false)
  }
  async function apagar() {
    if (!window.confirm('Apagar o fluxo "' + (f.name || 'sem nome') + '"?')) return
    setSalvando(true)
    try { await fetch('/api/whatsapp/flows', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'apagar', id: inicial.id }) }) } catch (e) {}
    onVoltar(true)
  }
  const g = GATILHOS.find(function(x) { return x.k === f.trigger })

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 16 }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <button onClick={function() { onVoltar(false) }} style={{ cursor: 'pointer', border: 0, background: 'transparent', color: 'var(--accent)', fontWeight: 800, fontSize: 13.5, padding: 0, marginBottom: 10 }}>← Voltar para fluxos</button>
        <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--text)', marginBottom: 12 }}>{novo ? '➕ Novo fluxo' : '✏️ Editar fluxo'}</div>

        <div style={box}>
          <label style={lab}>Nome do fluxo</label>
          <input className="at-input" placeholder="Ex: Boas-vindas, Preço, Link de acesso" maxLength={80} value={f.name} onChange={function(e) { setF({ ...f, name: e.target.value }) }} />
        </div>

        <div style={box}>
          <label style={lab}>Quando o fluxo dispara</label>
          <select className="at-input" value={f.trigger} onChange={function(e) { setF({ ...f, trigger: e.target.value as any }) }}>
            {GATILHOS.map(function(x) { return <option key={x.k} value={x.k}>{x.nome}</option> })}
          </select>
          {g && <div style={{ fontSize: 12.5, color: 'var(--muted2)', marginTop: 6 }}>{g.desc}</div>}
          {f.trigger === 'palavra' && (
            <div style={{ marginTop: 12 }}>
              <label style={lab}>Palavras-chave (separe por vírgula)</label>
              <input className="at-input" placeholder="Ex: preço, valor, quanto custa" value={palavras} onChange={function(e) { setPalavras(e.target.value) }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, color: 'var(--text)' }}>Dispara quando a mensagem</span>
                <select className="at-input" value={f.match} onChange={function(e) { setF({ ...f, match: e.target.value as any }) }} style={{ width: 'auto' }}>
                  <option value="contem">contém a palavra</option>
                  <option value="igual">é igual à palavra</option>
                </select>
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted2)', marginTop: 6 }}>Não diferencia maiúsculas, acentos nem pontuação.</div>
            </div>
          )}
          <div style={{ marginTop: 12 }}>
            <label style={lab}>Em qual horário</label>
            <select className="at-input" value={f.when_hours} onChange={function(e) { setF({ ...f, when_hours: e.target.value as any }) }}>
              <option value="sempre">A qualquer hora</option>
              <option value="dentro">Só dentro do horário de atendimento</option>
              <option value="fora">Só fora do horário de atendimento</option>
            </select>
          </div>
        </div>

        <div style={box}>
          <label style={lab}>Mensagem que a plataforma envia</label>
          <textarea className="at-input" rows={5} maxLength={1000} placeholder="Escreva a resposta automática…" value={f.message} onChange={function(e) { setF({ ...f, message: e.target.value }) }} />
          <div style={{ fontSize: 12, color: 'var(--muted2)', marginTop: 4 }}>Use <b>{'{{nome}}'}</b> para colocar o primeiro nome da pessoa. {f.message.length}/1000</div>
          {f.message.trim() && (
            <div style={{ background: '#d9fdd3', color: '#111b21', borderRadius: 10, padding: '8px 10px', fontSize: 13.5, lineHeight: 1.45, whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginTop: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.6, marginBottom: 2 }}>Prévia (nome de exemplo: Maria)</div>
              {aplicaNome(f.message, 'Maria')}
            </div>
          )}
          {f.trigger !== 'primeira' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, color: 'var(--text)' }}>Não repetir para a mesma pessoa por</span>
              <select className="at-input" value={f.cooldown_hours} onChange={function(e) { setF({ ...f, cooldown_hours: Number(e.target.value) }) }} style={{ width: 110 }}>
                {[1, 3, 6, 12, 24, 48, 72].map(function(n) { return <option key={n} value={n}>{n} hora{n > 1 ? 's' : ''}</option> })}
              </select>
            </div>
          )}
        </div>

        <div style={box}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontWeight: 800, fontSize: 14, color: 'var(--text)' }}>
            <input type="checkbox" checked={f.enabled} onChange={function(e) { setF({ ...f, enabled: e.target.checked }) }} style={{ width: 18, height: 18 }} />
            Fluxo ativo
          </label>
          <div style={{ fontSize: 12, color: 'var(--muted2)', marginTop: 6, lineHeight: 1.5 }}>
            A plataforma envia só uma resposta automática por mensagem. Se o aviso de horário de atendimento já respondeu, os outros fluxos esperam. Entre os fluxos, vale o mais antigo que combinar.
          </div>
        </div>

        {msg && <div style={{ fontSize: 13, color: '#b91c1c', fontWeight: 700, marginBottom: 8 }}>{msg}</div>}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={salvar} disabled={salvando} style={{ cursor: 'pointer', border: 0, background: '#16a34a', color: '#fff', borderRadius: 10, padding: '11px 20px', fontWeight: 800, fontSize: 14, opacity: salvando ? 0.6 : 1 }}>{salvando ? 'Salvando…' : 'Salvar fluxo'}</button>
          {!novo && <button onClick={apagar} disabled={salvando} style={{ cursor: 'pointer', border: '1px solid rgba(220,38,38,0.4)', background: 'transparent', color: '#dc2626', borderRadius: 10, padding: '11px 16px', fontWeight: 700, fontSize: 14 }}>Apagar</button>}
        </div>
      </div>
    </div>
  )
}

// Lista de fluxos de automacao do WhatsApp. Cada fluxo abre a propria tela de configuracao.
export default function Fluxos() {
  const [tela, setTela] = useState<'lista' | 'horario' | 'editar'>('lista')
  const [h, setH] = useState<H | null>(null)
  const [fluxos, setFluxos] = useState<(Fluxo & { id: string })[] | null>(null)
  const [edit, setEdit] = useState<Fluxo>(VAZIO)
  const [erro, setErro] = useState('')

  function carregar() {
    fetch('/api/whatsapp/settings', { cache: 'no-store' }).then(function(r) { return r.json() }).then(function(j) { if (j.settings) setH(normalizar(j.settings)) }).catch(function() {})
    fetch('/api/whatsapp/flows', { cache: 'no-store' }).then(function(r) { return r.json().then(function(j) { return { ok: r.ok, j: j } }) }).then(function(x) {
      if (x.ok) { setFluxos(x.j.fluxos || []); setErro('') } else setErro(x.j.error || 'Não foi possível carregar os fluxos.')
    }).catch(function() { setErro('Sem conexão.') })
  }
  useEffect(function() { if (tela === 'lista') carregar() }, [tela])

  async function ligar(f: Fluxo & { id: string }, on: boolean) {
    setFluxos(function(l) { return (l || []).map(function(x) { return x.id === f.id ? { ...x, enabled: on } : x }) })
    try { await fetch('/api/whatsapp/flows', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'ligar', id: f.id, enabled: on }) }) } catch (e) { carregar() }
  }

  if (tela === 'editar') return <Editor inicial={edit} onVoltar={function() { setTela('lista') }} />

  if (tela === 'horario') {
    return (
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '10px 16px 0', maxWidth: 680, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
          <button onClick={function() { setTela('lista') }} style={{ cursor: 'pointer', border: 0, background: 'transparent', color: 'var(--accent)', fontWeight: 800, fontSize: 13.5, padding: 0 }}>← Voltar para fluxos</button>
        </div>
        <Horario />
      </div>
    )
  }

  const ativo = !!h && h.away_enabled
  const chip = function(on: boolean, ok: boolean): React.CSSProperties { return { fontSize: 12, fontWeight: 800, borderRadius: 999, padding: '4px 10px', background: !ok ? 'var(--surface2)' : on ? 'rgba(22,163,74,0.14)' : 'var(--surface2)', color: !ok ? 'var(--muted2)' : on ? '#15803d' : 'var(--muted2)' } }
  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 16 }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
          <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--text)', flex: 1 }}>⚡ Fluxos</div>
          <button onClick={function() { setEdit(VAZIO); setTela('editar') }} style={{ cursor: 'pointer', border: 0, background: '#16a34a', color: '#fff', borderRadius: 10, padding: '9px 16px', fontWeight: 800, fontSize: 13.5 }}>+ Novo fluxo</button>
        </div>
        <div style={{ fontSize: 13, color: 'var(--muted2)', lineHeight: 1.5, marginBottom: 14 }}>
          Automações do WhatsApp: respostas que a plataforma envia sozinha. Clique em um fluxo para ver e editar.
        </div>

        <div onClick={function() { setTela('horario') }} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 14, flexWrap: 'wrap', marginBottom: 10 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>🕒</div>
          <div style={{ flex: '1 1 220px', minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text)' }}>Horário de atendimento</div>
            <div style={{ fontSize: 12.5, color: 'var(--muted2)', marginTop: 2 }}>Responde sozinho quando alguém escreve fora do horário.</div>
            {h && <div style={{ fontSize: 12.5, color: 'var(--text)', marginTop: 4, fontWeight: 600 }}>{resumo(h)}</div>}
          </div>
          <span style={chip(ativo, !!h)}>{!h ? '…' : ativo ? '● Ativo' : '○ Desligado'}</span>
          <span style={{ color: 'var(--accent)', fontWeight: 800, fontSize: 13.5 }}>Editar ›</span>
        </div>

        {erro && <div style={{ fontSize: 13, color: '#b91c1c', fontWeight: 700, marginBottom: 8 }}>{erro}</div>}
        {fluxos && fluxos.length === 0 && !erro && <div style={{ fontSize: 13.5, color: 'var(--muted2)', padding: '14px 4px' }}>Você ainda não criou outros fluxos. Clique em <b>+ Novo fluxo</b> para criar um.</div>}
        {(fluxos || []).map(function(f) {
          return (
            <div key={f.id} onClick={function() { setEdit(f); setTela('editar') }} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 14, flexWrap: 'wrap', marginBottom: 10, opacity: f.enabled ? 1 : 0.7 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{ICONE[f.trigger] || '⚡'}</div>
              <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text)' }}>{f.name}</div>
                <div style={{ fontSize: 12.5, color: 'var(--muted2)', marginTop: 2 }}>{descricao(f)}</div>
                <div style={{ fontSize: 12.5, color: 'var(--text)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>💬 {f.message}</div>
              </div>
              <button onClick={function(e) { e.stopPropagation(); ligar(f, !f.enabled) }} title={f.enabled ? 'Clique para desligar' : 'Clique para ligar'} style={{ cursor: 'pointer', border: 0, ...chip(f.enabled, true) }}>{f.enabled ? '● Ativo' : '○ Desligado'}</button>
              <span style={{ color: 'var(--accent)', fontWeight: 800, fontSize: 13.5 }}>Editar ›</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
