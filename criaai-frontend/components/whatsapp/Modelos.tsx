'use client'
import { useEffect, useState } from 'react'

export type Tpl = { name: string; language: string; status: string; category: string; rejected_reason?: string; header: string; body: string; footer: string; buttons: string[]; vars: number }

const ST: Record<string, { t: string; c: string; bg: string; ico: string }> = {
  APPROVED: { t: 'Aprovado', c: '#15803d', bg: 'rgba(22,163,74,0.14)', ico: 'circle-check' },
  PENDING: { t: 'Em análise', c: '#b45309', bg: 'rgba(217,119,6,0.16)', ico: 'hourglass' },
  REJECTED: { t: 'Recusado', c: '#b91c1c', bg: 'rgba(220,38,38,0.14)', ico: 'circle-x' },
  PAUSED: { t: 'Pausado', c: '#b45309', bg: 'rgba(217,119,6,0.16)', ico: 'clock' },
  DISABLED: { t: 'Desativado', c: '#6b7280', bg: 'rgba(107,114,128,0.16)', ico: 'lock' },
}
const ST_OUTRO = { c: '#6b7280', bg: 'rgba(107,114,128,0.16)', ico: 'info-circle' }
function Selo({ status }: { status: string }) {
  const s = ST[status] || { t: status, ...ST_OUTRO }
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: s.bg, color: s.c, borderRadius: 999, padding: '2px 9px', fontSize: 11.5, fontWeight: 700, flexShrink: 0, whiteSpace: 'nowrap' }}><i className={'ti ti-' + s.ico} style={{ fontSize: 13 }} />{s.t}</span>
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

const h1: React.CSSProperties = { fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text)', margin: 0 }
const sub: React.CSSProperties = { fontSize: 13, color: 'var(--muted2)', lineHeight: 1.5, margin: '4px 0 0', maxWidth: '65ch' }
const fecharBtn: React.CSSProperties = { width: 34, height: 34, padding: 0, justifyContent: 'center', flexShrink: 0 }
const lab: React.CSSProperties = { fontSize: 12.5, fontWeight: 700, color: 'var(--text)', marginBottom: 4, display: 'block' }

type Pasta = { tpls: Tpl[] | null; erro: string; carregando: boolean }

export default function Modelos({ isAdmin, tpls, erro, carregando, onReload, canais, escopo }: { isAdmin: boolean; tpls: Tpl[] | null; erro: string; carregando: boolean; onReload: () => void; canais?: { id: string; nome: string; numero: string | null }[]; escopo?: string }) {
  const lista = canais || []
  const [novo, setNovo] = useState(false)
  const [vendo, setVendo] = useState<Tpl | null>(null)
  const [aviso, setAviso] = useState('')
  const [apagando, setApagando] = useState('')
  // Pastas: 'suporte' ou o id de um numero (ex.: Recuperacao). null = tela das pastas.
  const [pasta, setPasta] = useState<string | null>(null)
  const [outras, setOutras] = useState<Record<string, Pasta>>({})

  function carregarPasta(id: string) {
    setOutras(function(o) { return { ...o, [id]: { tpls: (o[id] || {}).tpls || null, erro: '', carregando: true } } })
    fetch('/api/whatsapp/templates?connection=' + id, { cache: 'no-store' })
      .then(function(r) { return r.json().then(function(j) { return { ok: r.ok, j: j } }) })
      .then(function(x) { setOutras(function(o) { return { ...o, [id]: { tpls: x.ok ? (x.j.templates || []) : (o[id] || {}).tpls || null, erro: x.ok ? '' : (x.j.error || 'Não foi possível listar os modelos.'), carregando: false } } }) })
      .catch(function() { setOutras(function(o) { return { ...o, [id]: { tpls: (o[id] || {}).tpls || null, erro: 'Sem conexão. Tente de novo.', carregando: false } } }) })
  }
  const chaveCanais = lista.map(function(c) { return c.id }).join(',')
  useEffect(function() { lista.forEach(function(c) { carregarPasta(c.id) }) }, [chaveCanais])

  // Quem so atende a recuperacao nao ve a pasta de suporte; com uma unica pasta, abre direto
  const soRecuperacao = escopo === 'recuperacao' && lista.length > 0
  const aberta = lista.length === 0 ? 'suporte' : (pasta || (soRecuperacao && lista.length === 1 ? lista[0].id : null))
  const conexao = aberta && aberta !== 'suporte' ? aberta : ''
  const dados: Pasta = conexao ? (outras[conexao] || { tpls: null, erro: '', carregando: true }) : { tpls, erro, carregando }
  const recarregar = function() { if (conexao) carregarPasta(conexao); else onReload() }
  const nomePasta = !aberta ? '' : conexao ? 'Modelos de ' + (lista.find(function(c) { return c.id === conexao })?.nome || 'recuperação').toLowerCase() : 'Modelos de suporte'

  async function apagar(t: Tpl) {
    if (!window.confirm('Apagar o modelo "' + t.name + '" (todos os idiomas)? Isso não pode ser desfeito.')) return
    setApagando(t.name); setAviso('')
    try {
      const r = await fetch('/api/whatsapp/templates?name=' + encodeURIComponent(t.name) + (conexao ? '&connection=' + conexao : ''), { method: 'DELETE' })
      const j = await r.json().catch(function() { return {} })
      if (!r.ok) setAviso(j.error || 'Não foi possível apagar.')
      else recarregar()
    } catch (e) { setAviso('Sem conexão. Tente de novo.') }
    setApagando('')
  }

  // Tela das pastas
  if (!aberta) {
    const pastaCard = function(id: string, icone: string, titulo: string, txt: string, n: number | null) {
      return (
        <button key={id} onClick={function() { setPasta(id); setAviso('') }} style={{ cursor: 'pointer', width: '100%', display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 14, marginBottom: 10, textAlign: 'left', fontFamily: 'inherit', color: 'var(--text)' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(22,163,74,0.12)', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}><i className={'ti ti-' + icone} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text)' }}>{titulo}</div>
            <div style={{ fontSize: 12.5, color: 'var(--muted2)', marginTop: 2 }}>{txt}</div>
            <span style={{ display: 'inline-block', marginTop: 6, fontSize: 12, fontWeight: 700, color: 'var(--muted2)', background: 'var(--surface2)', borderRadius: 999, padding: '2px 9px', fontVariantNumeric: 'tabular-nums' }}>{n === null ? 'Carregando…' : n + ' modelo' + (n === 1 ? '' : 's')}</span>
          </div>
          <i className="ti ti-chevron-right" style={{ color: 'var(--muted2)', fontSize: 18, flexShrink: 0 }} />
        </button>
      )
    }
    return (
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 20 }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <div style={{ marginBottom: 16 }}>
            <h2 style={h1}>Modelos de mensagem</h2>
            <p style={sub}>Cada número do WhatsApp tem os seus próprios modelos. Abra a pasta do número que você quer ver.</p>
          </div>
          {!soRecuperacao && pastaCard('suporte', 'headset', 'Modelos de suporte', 'Usados no Chat de suporte e nos disparos.', tpls ? tpls.length : null)}
          {lista.map(function(c) { const o = outras[c.id]; return pastaCard(c.id, 'brand-whatsapp', 'Modelos de ' + c.nome.toLowerCase(), 'Usados nos fluxos da Hubla e no Chat de recuperação' + (c.numero ? ' · ' + c.numero : '') + '.', o && o.tpls ? o.tpls.length : null) })}
        </div>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 20 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {lista.length > 0 && !(soRecuperacao && lista.length === 1) && <button className="at-b" onClick={function() { setPasta(null); setAviso('') }} style={{ marginBottom: 12 }}><i className="ti ti-arrow-left" />Voltar para as pastas</button>}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
          <div style={{ flex: '1 1 260px', minWidth: 0 }}>
            <h2 style={h1}>{lista.length > 0 ? nomePasta : 'Modelos de mensagem'}</h2>
            <p style={sub}>Modelos são mensagens pré-aprovadas pela Meta. Servem para <b>começar uma conversa</b> ou voltar a falar depois de 24h sem resposta do aluno. Só os modelos <b>Aprovados</b> podem ser enviados.</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="at-b" onClick={recarregar} disabled={dados.carregando}><i className={'ti ' + (dados.carregando ? 'ti-loader' : 'ti-refresh')} />{dados.carregando ? 'Atualizando…' : 'Atualizar'}</button>
            {isAdmin && <button className="at-b at-b-ok" onClick={function() { setNovo(true); setAviso('') }}><i className="ti ti-plus" />Novo modelo</button>}
          </div>
        </div>

        {aviso && <div role="alert" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: 13, color: '#b91c1c', fontWeight: 700 }}><i className="ti ti-alert-triangle" />{aviso}</div>}
        {dados.erro && <div role="alert" style={{ display: 'flex', gap: 8, marginBottom: 12, padding: 12, borderRadius: 12, background: 'rgba(220,38,38,0.08)', color: 'var(--text)', fontSize: 13.5, lineHeight: 1.5 }}><i className="ti ti-alert-triangle" style={{ color: '#b91c1c', fontSize: 17, marginTop: 1 }} /><span>{dados.erro}</span></div>}
        {!dados.erro && dados.tpls && dados.tpls.length === 0 && (
          <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--muted2)' }}>
            <i className="ti ti-template" style={{ fontSize: 40, opacity: 0.45 }} />
            <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text)', marginTop: 8 }}>Nenhum modelo ainda.</div>
            {isAdmin && <div style={{ fontSize: 13, marginTop: 4 }}>Clique em <b>Novo modelo</b> para criar o primeiro.</div>}
          </div>
        )}
        {!dados.tpls && !dados.erro && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 32, color: 'var(--muted2)', fontSize: 13.5 }}><i className="ti ti-loader" style={{ fontSize: 18 }} />Carregando modelos…</div>}

        {dados.tpls && dados.tpls.length > 0 && <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
          {(dados.tpls || []).map(function(t, i) {
            return (
              <button key={t.name + t.language} onClick={function() { setVendo(t) }} style={{ cursor: 'pointer', width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', border: 0, borderTop: i === 0 ? 0 : '1px solid var(--border)', background: 'transparent', color: 'var(--text)', textAlign: 'left', fontFamily: 'inherit' }}>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontWeight: 700, fontSize: 14, wordBreak: 'break-all' }}>{t.name}</span>
                  <span style={{ display: 'block', fontSize: 12, color: 'var(--muted2)', marginTop: 2 }}>{CAT[t.category] || t.category} · {t.language}</span>
                </span>
                <Selo status={t.status} />
                <i className="ti ti-chevron-right" style={{ color: 'var(--muted2)', fontSize: 17, flexShrink: 0 }} />
              </button>
            )
          })}
        </div>}
      </div>

      {vendo && (function(t: Tpl) {
        return (
          <div onClick={function() { setVendo(null) }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div role="dialog" aria-modal="true" aria-label={t.name} onClick={function(e) { e.stopPropagation() }} style={{ background: 'var(--surface)', color: 'var(--text)', borderRadius: 16, padding: 20, width: '100%', maxWidth: 480, boxShadow: '0 12px 40px rgba(0,0,0,0.25)', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 6 }}>
                <div style={{ fontWeight: 800, fontSize: 16, flex: 1, wordBreak: 'break-all' }}>{t.name}</div>
                <button className="at-b" aria-label="Fechar" onClick={function() { setVendo(null) }} style={fecharBtn}><i className="ti ti-x" /></button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                <Selo status={t.status} />
                <span style={{ fontSize: 12, color: 'var(--muted2)' }}>{CAT[t.category] || t.category} · {t.language}{t.vars > 0 ? ' · ' + t.vars + ' variável' + (t.vars > 1 ? 's' : '') : ''}</span>
              </div>
              <div style={{ background: '#d9fdd3', color: '#111b21', borderRadius: 12, padding: '10px 12px', fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {t.header && <div style={{ fontWeight: 800, marginBottom: 4 }}>{t.header}</div>}
                {t.body}
                {t.footer && <div style={{ fontSize: 12, opacity: 0.6, marginTop: 6 }}>{t.footer}</div>}
              </div>
              {t.buttons.length > 0 && <div style={{ fontSize: 12.5, color: 'var(--muted2)', marginTop: 10 }}>Botões: {t.buttons.join(' · ')}</div>}
              {t.status === 'REJECTED' && t.rejected_reason && <div style={{ display: 'flex', gap: 6, fontSize: 12.5, color: '#b91c1c', marginTop: 10, padding: '8px 10px', borderRadius: 10, background: 'rgba(220,38,38,0.08)' }}><i className="ti ti-circle-x" style={{ fontSize: 15, marginTop: 1 }} /><span>Motivo: {t.rejected_reason}</span></div>}
              {isAdmin && <div style={{ marginTop: 14 }}><button className="at-b" onClick={async function() { await apagar(t); setVendo(null) }} disabled={apagando === t.name} style={{ borderColor: 'rgba(220,38,38,0.4)', color: '#dc2626' }}><i className="ti ti-trash" />{apagando === t.name ? 'Apagando…' : 'Apagar modelo'}</button></div>}
            </div>
          </div>
        )
      })(vendo)}

      {novo && <NovoModelo connection={conexao} onClose={function() { setNovo(false) }} onCriado={function() { setNovo(false); setAviso(''); recarregar() }} />}
    </div>
  )
}

function NovoModelo({ connection, onClose, onCriado }: { connection: string; onClose: () => void; onCriado: () => void }) {
  const [nome, setNome] = useState('')
  const [cat, setCat] = useState('UTILITY')
  const [lang, setLang] = useState('pt_BR')
  const [cab, setCab] = useState('')
  const [corpo, setCorpo] = useState('')
  const [rod, setRod] = useState('')
  const [comBotao, setComBotao] = useState(false)
  const [btnTxt, setBtnTxt] = useState('')
  const [btnUrl, setBtnUrl] = useState('')
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
      const r = await fetch('/api/whatsapp/templates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ connection, name: nome, category: cat, language: lang, header: cab, body: corpo, footer: rod, examples: exemplos, botaoTexto: comBotao ? btnTxt : '', botaoUrl: comBotao ? btnUrl : '' }) })
      const j = await r.json().catch(function() { return {} })
      if (!r.ok) setMsg(j.error || 'Não foi possível criar o modelo.')
      else onCriado()
    } catch (e) { setMsg('Sem conexão. Tente de novo.') }
    setSalvando(false)
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div role="dialog" aria-modal="true" aria-label="Novo modelo de mensagem" onClick={function(e) { e.stopPropagation() }} style={{ background: 'var(--surface)', color: 'var(--text)', borderRadius: 16, padding: 20, width: '100%', maxWidth: 520, boxShadow: '0 12px 40px rgba(0,0,0,0.25)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ ...h1, fontSize: 17 }}>Novo modelo de mensagem</h3>
          <button className="at-b" aria-label="Fechar" onClick={onClose} style={fecharBtn}><i className="ti ti-x" /></button>
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
                  <input className="at-input" style={{ flex: 1, minWidth: 0 }} value={v} placeholder={i === 0 ? 'ex: Maria' : 'exemplo'} onChange={function(e) { const c = exemplos.slice(); c[i] = e.target.value; setEx(c) }} />
                </div>
              )
            })}
          </div>
        )}

        <label style={lab}>Rodapé (opcional)</label>
        <input className="at-input" value={rod} maxLength={60} placeholder="ex: Plataforma do Cristão Próspero" onChange={function(e) { setRod(e.target.value) }} style={{ marginBottom: 12 }} />

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', marginBottom: comBotao ? 8 : 12 }}>
          <input type="checkbox" checked={comBotao} onChange={function(e) { setComBotao(e.target.checked) }} style={{ width: 16, height: 16 }} />
          Adicionar botão com link
        </label>
        {comBotao && (
          <div style={{ background: 'var(--surface2)', borderRadius: 12, padding: 12, marginBottom: 12 }}>
            <label style={lab}>Texto do botão</label>
            <input className="at-input" value={btnTxt} maxLength={25} placeholder="ex: GARANTIR MINHA VAGA" onChange={function(e) { setBtnTxt(e.target.value) }} style={{ marginBottom: 8 }} />
            <label style={lab}>Link do botão</label>
            <input className="at-input" type="url" value={btnUrl} placeholder="https://..." onChange={function(e) { setBtnUrl(e.target.value) }} />
            <div style={{ fontSize: 11.5, color: 'var(--muted2)', marginTop: 4 }}>Até 25 letras no botão. Ao tocar, a pessoa abre esse link.</div>
            {btnTxt.trim() && (
              <div style={{ marginTop: 10, background: '#1f2c34', color: '#53bdeb', borderRadius: 10, padding: '10px 12px', textAlign: 'center', fontWeight: 700, fontSize: 14 }}>
                <i className="ti ti-external-link" /> {btnTxt.trim()}
              </div>
            )}
          </div>
        )}

        {msg && <div role="alert" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#b91c1c', fontWeight: 700, marginBottom: 10 }}><i className="ti ti-alert-triangle" />{msg}</div>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button className="at-b" onClick={onClose}>Cancelar</button>
          <button className="at-b at-b-ok" onClick={salvar} disabled={salvando || !nome || !corpo.trim() || (comBotao && (!btnTxt.trim() || !/^https?:\/\/\S+\.\S+/.test(btnUrl.trim())))}><i className={'ti ' + (salvando ? 'ti-loader' : 'ti-send')} />{salvando ? 'Enviando…' : 'Enviar para aprovação'}</button>
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--muted2)', marginTop: 10 }}>A Meta analisa o modelo (de minutos a algumas horas). Quando ficar <b>Aprovado</b>, ele aparece para enviar na conversa.</div>
      </div>
    </div>
  )
}
