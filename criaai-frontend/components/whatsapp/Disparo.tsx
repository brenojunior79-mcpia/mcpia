'use client'
import { useEffect, useRef, useState } from 'react'
import { renderTpl, type Tpl } from './Modelos'

type Publico = { total: number; podem: number; comPlano: number; semPlano: number; semNumero: number; contatos: number; reembolsados: number; repetidos: number }
type Cont = Record<string, number>
type Camp = { id: string; created_at: string; template_name: string; preview: string | null; segment: string; status: string; pause_reason: string | null; total: number; contagem: Cont }
type Cfg = { mode: 'nome' | 'texto'; value: string }

const card: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 16, marginBottom: 14 }
const lab: React.CSSProperties = { fontSize: 12.5, fontWeight: 700, color: 'var(--text)', marginBottom: 4, display: 'block' }
const SEG_NOME: Record<string, string> = { todos: 'Todos os alunos', plano: 'Alunos com plano', sem_plano: 'Alunos sem plano', contatos: 'Contatos importados' }

function enviadas(c: Cont) { return (c.sent || 0) + (c.delivered || 0) + (c.read || 0) }
function faltam(c: Cont) { return (c.pending || 0) + (c.sending || 0) }

// Le o CSV (separador ; ou ,) e devolve nome + whatsapp de cada linha
function lerCsv(texto: string): { nome: string; wa: string }[] {
  const linhas: string[][] = []
  const sep = (texto.split('\n')[0] || '').split(';').length >= (texto.split('\n')[0] || '').split(',').length ? ';' : ','
  let cel = '', lin: string[] = [], asp = false
  for (let i = 0; i < texto.length; i++) {
    const ch = texto[i]
    if (asp) {
      if (ch === '"') { if (texto[i + 1] === '"') { cel += '"'; i++ } else asp = false } else cel += ch
    } else if (ch === '"') asp = true
    else if (ch === sep) { lin.push(cel); cel = '' }
    else if (ch === '\n') { lin.push(cel.replace(/\r$/, '')); linhas.push(lin); lin = []; cel = '' }
    else cel += ch
  }
  if (cel || lin.length) { lin.push(cel.replace(/\r$/, '')); linhas.push(lin) }
  if (linhas.length < 2) return []
  const cab = linhas[0].map(function(x) { return x.replace(/^﻿/, '').trim().toLowerCase() })
  const iw = cab.findIndex(function(x) { return x.indexOf('whatsapp') >= 0 || x.indexOf('telefone') >= 0 || x.indexOf('celular') >= 0 || x.indexOf('phone') >= 0 })
  const inome = cab.findIndex(function(x) { return x === 'nome' || x === 'name' })
  if (iw < 0) return []
  return linhas.slice(1).map(function(l) { return { nome: inome >= 0 ? (l[inome] || '') : '', wa: l[iw] || '' } }).filter(function(x) { return x.wa.trim() })
}

// Admin: total de alunos + disparo em massa de um modelo aprovado
export default function Disparo({ tpls, onLoadTpls }: { tpls: Tpl[] | null; onLoadTpls: () => void }) {
  const [pub, setPub] = useState<Publico | null>(null)
  const [pubErro, setPubErro] = useState('')
  const [seg, setSeg] = useState('todos')
  const [key, setKey] = useState('')
  const [cfg, setCfg] = useState<Cfg[]>([])
  const [teste, setTeste] = useState('')
  const [msg, setMsg] = useState('')
  const [ok, setOk] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [camps, setCamps] = useState<Camp[]>([])
  const [rodando, setRodando] = useState(false)
  const [imp, setImp] = useState('')
  const rodRef = useRef(false)
  const paraRef = useRef(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function carregarPub() {
    try {
      const r = await fetch('/api/whatsapp/broadcast?view=publico', { cache: 'no-store' })
      const j = await r.json()
      if (!r.ok) setPubErro(j.error || 'Não foi possível carregar.')
      else { setPub(j); setPubErro('') }
    } catch (e) { setPubErro('Sem conexão.') }
  }
  async function carregarCamps() {
    try {
      const r = await fetch('/api/whatsapp/broadcast?view=lista', { cache: 'no-store' })
      const j = await r.json()
      if (r.ok) setCamps(j.campanhas || [])
    } catch (e) {}
  }
  useEffect(function() {
    carregarPub(); carregarCamps(); onLoadTpls()
    function aviso(e: BeforeUnloadEvent) { if (rodRef.current) { e.preventDefault(); e.returnValue = '' } }
    window.addEventListener('beforeunload', aviso)
    return function() { window.removeEventListener('beforeunload', aviso); paraRef.current = true }
  }, [])

  const aprovados = (tpls || []).filter(function(t) { return t.status === 'APPROVED' })
  const t = aprovados.find(function(x) { return x.name + '|' + x.language === key }) || null
  const semMidia = function(x: Tpl) { return !x.header || x.header.charAt(0) !== '[' }
  const quantos = pub ? (seg === 'plano' ? pub.comPlano : seg === 'sem_plano' ? pub.semPlano : seg === 'contatos' ? pub.contatos : pub.podem) : 0
  const ativa = camps.find(function(c) { return c.status === 'rodando' || c.status === 'pausado' }) || null

  function escolher(k: string) {
    setKey(k); setOk(''); setMsg('')
    const x = aprovados.find(function(y) { return y.name + '|' + y.language === k })
    setCfg(x ? Array.from({ length: x.vars }).map(function(_a, i) { return { mode: i === 0 ? 'nome' : 'texto', value: '' } as Cfg }) : [])
  }
  function setC(i: number, p: Partial<Cfg>) { const c = cfg.slice(); c[i] = { ...c[i], ...p }; setCfg(c) }
  const preenchido = !!t && cfg.every(function(c) { return c.mode === 'nome' || c.value.trim().length > 0 })

  function corpoBase() {
    return { template: { name: t!.name, language: t!.language, preview: renderTpl(t!.body, cfg.map(function(c) { return c.mode === 'nome' ? 'Maria' : c.value })) }, params: cfg }
  }

  async function post(url: string, body: any) {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const j = await r.json().catch(function() { return {} })
    return { ok: r.ok, j }
  }

  async function enviarTeste() {
    if (!t || !preenchido) return
    setOcupado(true); setMsg(''); setOk('')
    try {
      const r = await post('/api/whatsapp/broadcast', { action: 'teste', ...corpoBase(), numero: teste })
      if (r.ok) setOk('Teste enviado para ' + teste + '. Confira no celular.'); else setMsg(r.j.error || 'Não foi possível enviar o teste.')
    } catch (e) { setMsg('Sem conexão.') }
    setOcupado(false)
  }

  async function iniciar() {
    if (!t || !preenchido || !pub) return
    if (!window.confirm('Enviar o modelo "' + t.name + '" para ' + quantos + ' pessoa' + (quantos === 1 ? '' : 's') + ' (' + SEG_NOME[seg] + ')?\n\nIsso não pode ser desfeito depois de enviado.')) return
    setOcupado(true); setMsg(''); setOk('')
    try {
      const r = await post('/api/whatsapp/broadcast', { action: 'criar', ...corpoBase(), segmento: seg, esperado: quantos })
      if (!r.ok) { setMsg(r.j.error || 'Não foi possível criar o disparo.'); if (r.j.total) carregarPub() }
      else { await carregarCamps(); rodar(r.j.id) }
    } catch (e) { setMsg('Sem conexão.') }
    setOcupado(false)
  }

  async function rodar(id: string) {
    if (rodRef.current) return
    rodRef.current = true; paraRef.current = false; setRodando(true); setMsg('')
    try {
      for (let i = 0; i < 1000; i++) {
        if (paraRef.current) break
        const r = await post('/api/whatsapp/broadcast/run', { id })
        if (!r.ok) { setMsg(r.j.error || 'Erro no envio.'); break }
        setCamps(function(cs) { return cs.map(function(c) { return c.id === id ? { ...c, status: r.j.status, contagem: r.j.contagem || c.contagem } : c }) })
        if (r.j.status !== 'rodando') { if (r.j.motivo) setMsg(r.j.motivo); break }
      }
    } catch (e) { setMsg('A conexão caiu. Clique em Continuar para seguir de onde parou.') }
    rodRef.current = false; setRodando(false)
    carregarCamps()
  }

  async function cancelar(id: string) {
    if (!window.confirm('Cancelar este disparo? Quem ainda não recebeu não vai receber.')) return
    paraRef.current = true
    await post('/api/whatsapp/broadcast', { action: 'cancelar', id })
    carregarCamps()
  }

  async function importar(f: File) {
    setImp('Lendo arquivo…')
    try {
      const lista = lerCsv(await f.text())
      if (lista.length === 0) { setImp('Não achei a coluna do WhatsApp no arquivo. Ela precisa se chamar "WhatsApp" ou "Telefone".'); return }
      let salvos = 0, inval = 0
      for (let i = 0; i < lista.length; i += 500) {
        setImp('Importando… ' + Math.min(i + 500, lista.length) + ' de ' + lista.length)
        const r = await post('/api/whatsapp/broadcast', { action: 'importar', contatos: lista.slice(i, i + 500) })
        if (!r.ok) { setImp(r.j.error || 'Erro ao importar.'); return }
        salvos += r.j.salvos || 0; inval += r.j.invalidos || 0
      }
      setImp('Pronto! ' + salvos + ' contatos importados' + (inval ? ' (' + inval + ' números inválidos ignorados)' : '') + '.')
      carregarPub()
    } catch (e) { setImp('Não foi possível ler o arquivo.') }
    if (fileRef.current) fileRef.current.value = ''
  }

  const num = function(n: number | undefined) { return (n || 0).toLocaleString('pt-BR') }

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 16 }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--text)', marginBottom: 12 }}>📣 Disparo em massa</div>

        {/* Card: total de alunos */}
        <div style={card}>
          <div style={{ fontSize: 13, color: 'var(--muted2)', fontWeight: 700 }}>Total de alunos</div>
          {pubErro && <div style={{ color: '#b91c1c', fontWeight: 700, fontSize: 13, marginTop: 6 }}>{pubErro}</div>}
          {!pub && !pubErro && <div style={{ color: 'var(--muted2)', fontSize: 13.5, marginTop: 6 }}>Carregando…</div>}
          {pub && (
            <>
              <div style={{ fontSize: 40, fontWeight: 900, color: 'var(--text)', lineHeight: 1.1 }}>{num(pub.total)}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                {([
                  ['Podem receber no WhatsApp', pub.podem, '#15803d'],
                  ['Com plano ativo', pub.comPlano, 'var(--text)'],
                  ['Sem plano', pub.semPlano, 'var(--text)'],
                  ['Sem WhatsApp válido', pub.semNumero, '#b45309'],
                  ['Reembolsados (ficam de fora)', pub.reembolsados, '#b45309'],
                  ['Contatos importados (não alunos)', pub.contatos, 'var(--text)'],
                ] as const).map(function(x) {
                  return <div key={x[0]} style={{ flex: '1 1 150px', background: 'var(--surface2)', borderRadius: 10, padding: '8px 10px' }}><div style={{ fontSize: 20, fontWeight: 800, color: x[2] }}>{num(x[1])}</div><div style={{ fontSize: 12, color: 'var(--muted2)' }}>{x[0]}</div></div>
                })}
              </div>
            </>
          )}
        </div>

        {/* Disparo em andamento */}
        {ativa && (
          <div style={{ ...card, border: '1px solid rgba(22,163,74,0.5)' }}>
            <div style={{ fontWeight: 800, fontSize: 14.5, color: 'var(--text)' }}>{ativa.status === 'pausado' ? '⏸️ Disparo pausado' : rodando ? '🚀 Enviando…' : '⏸️ Disparo parado'} · {ativa.template_name}</div>
            <div style={{ fontSize: 12.5, color: 'var(--muted2)', marginBottom: 8 }}>{SEG_NOME[ativa.segment] || ativa.segment} · {num(ativa.total)} pessoas</div>
            <div style={{ height: 10, borderRadius: 6, background: 'var(--surface2)', overflow: 'hidden' }}><div style={{ height: '100%', width: Math.round(((ativa.total - faltam(ativa.contagem)) / Math.max(1, ativa.total)) * 100) + '%', background: '#16a34a', transition: 'width .3s' }} /></div>
            <div style={{ fontSize: 13, color: 'var(--text)', marginTop: 8 }}>
              Enviadas <b>{num(enviadas(ativa.contagem))}</b> · Falharam <b>{num(ativa.contagem.failed)}</b> · Faltam <b>{num(faltam(ativa.contagem))}</b>
            </div>
            {ativa.pause_reason && <div style={{ fontSize: 13, color: '#b91c1c', fontWeight: 700, marginTop: 6 }}>{ativa.pause_reason}</div>}
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              {!rodando && <button onClick={function() { rodar(ativa.id) }} style={{ cursor: 'pointer', border: 0, background: '#16a34a', color: '#fff', borderRadius: 10, padding: '9px 16px', fontWeight: 800, fontSize: 13.5 }}>▶ Continuar envio</button>}
              {rodando && <button onClick={function() { paraRef.current = true }} style={{ cursor: 'pointer', border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', borderRadius: 10, padding: '9px 16px', fontWeight: 800, fontSize: 13.5 }}>⏸ Pausar</button>}
              <button onClick={function() { cancelar(ativa.id) }} style={{ cursor: 'pointer', border: '1px solid rgba(220,38,38,0.4)', background: 'transparent', color: '#dc2626', borderRadius: 10, padding: '9px 16px', fontWeight: 700, fontSize: 13.5 }}>Cancelar disparo</button>
            </div>
            {rodando && <div style={{ fontSize: 12, color: 'var(--muted2)', marginTop: 8 }}>Mantenha esta página aberta até terminar. Se fechar, é só voltar aqui e clicar em Continuar.</div>}
          </div>
        )}

        {/* Card: novo disparo */}
        <div style={card}>
          <div style={{ fontWeight: 800, fontSize: 14.5, color: 'var(--text)', marginBottom: 10 }}>Novo disparo</div>

          <label style={lab}>1. Quem vai receber</label>
          <select className="at-input" value={seg} onChange={function(e) { setSeg(e.target.value); setOk('') }} style={{ marginBottom: 12 }}>
            <option value="todos">Todos os alunos ({num(pub?.podem)})</option>
            <option value="plano">Só quem tem plano ativo ({num(pub?.comPlano)})</option>
            <option value="sem_plano">Só quem não tem plano ({num(pub?.semPlano)})</option>
            <option value="contatos">Contatos importados que não são alunos ({num(pub?.contatos)})</option>
          </select>

          <label style={lab}>2. Modelo de mensagem</label>
          {tpls && aprovados.length === 0 && <div style={{ fontSize: 13, color: 'var(--muted2)', marginBottom: 8 }}>Nenhum modelo aprovado ainda. Crie um na aba Modelos e espere a aprovação da Meta.</div>}
          <select className="at-input" value={key} onChange={function(e) { escolher(e.target.value) }} style={{ marginBottom: 10 }}>
            <option value="">{tpls ? 'Escolha um modelo aprovado…' : 'Carregando modelos…'}</option>
            {aprovados.map(function(x) { return <option key={x.name + x.language} value={x.name + '|' + x.language} disabled={!semMidia(x)}>{x.name} ({x.category === 'MARKETING' ? 'marketing' : 'utilidade'}){!semMidia(x) ? ' — com mídia, não suportado' : ''}</option> })}
          </select>

          {t && t.vars > 0 && (
            <div style={{ marginBottom: 10 }}>
              <label style={lab}>Variáveis do modelo</label>
              {cfg.map(function(c, i) {
                return (
                  <div key={i} style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6, alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, width: 44, color: 'var(--text)' }}>{'{{' + (i + 1) + '}}'}</span>
                    <select className="at-input" value={c.mode} onChange={function(e) { setC(i, { mode: e.target.value as any }) }} style={{ flex: '0 0 190px', width: 'auto' }}>
                      <option value="nome">Primeiro nome da pessoa</option>
                      <option value="texto">Texto fixo (igual para todos)</option>
                    </select>
                    <input className="at-input" placeholder={c.mode === 'nome' ? 'Se não tiver nome, usar: amigo(a)' : 'Texto'} value={c.value} onChange={function(e) { setC(i, { value: e.target.value }) }} style={{ flex: '1 1 160px', width: 'auto' }} />
                  </div>
                )
              })}
            </div>
          )}

          {t && (
            <div style={{ background: '#d9fdd3', color: '#111b21', borderRadius: 10, padding: '8px 10px', fontSize: 13.5, lineHeight: 1.45, whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 200, overflowY: 'auto', marginBottom: 12 }}>
              {t.header && <div style={{ fontWeight: 800, marginBottom: 4 }}>{t.header}</div>}
              {renderTpl(t.body, cfg.map(function(c) { return c.mode === 'nome' ? 'Maria' : c.value }))}
              {t.footer && <div style={{ fontSize: 11.5, opacity: 0.6, marginTop: 6 }}>{t.footer}</div>}
              {t.buttons.length > 0 && <div style={{ fontSize: 12, marginTop: 6, opacity: 0.7 }}>Botões: {t.buttons.join(' · ')}</div>}
            </div>
          )}

          {t && (
            <>
              <label style={lab}>3. Teste primeiro (recomendado)</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                <input className="at-input" placeholder="Seu WhatsApp com DDD, ex: 37 99999-9999" value={teste} onChange={function(e) { setTeste(e.target.value) }} style={{ flex: '1 1 220px', width: 'auto' }} />
                <button disabled={ocupado || !preenchido || !teste.trim()} onClick={enviarTeste} style={{ cursor: 'pointer', border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', borderRadius: 10, padding: '10px 14px', fontWeight: 800, fontSize: 13.5, opacity: ocupado || !preenchido || !teste.trim() ? 0.55 : 1 }}>Enviar teste</button>
              </div>
              <button disabled={ocupado || rodando || !preenchido || quantos === 0 || !!ativa} onClick={iniciar} style={{ cursor: 'pointer', border: 0, background: '#16a34a', color: '#fff', borderRadius: 10, padding: '12px 20px', fontWeight: 800, fontSize: 14.5, opacity: ocupado || rodando || !preenchido || quantos === 0 || ativa ? 0.55 : 1 }}>
                📣 Enviar para {num(quantos)} pessoa{quantos === 1 ? '' : 's'}
              </button>
              {ativa && <div style={{ fontSize: 12.5, color: 'var(--muted2)', marginTop: 6 }}>Termine ou cancele o disparo em andamento para criar outro.</div>}
            </>
          )}
          {msg && <div style={{ fontSize: 13, color: '#b91c1c', fontWeight: 700, marginTop: 10 }}>{msg}</div>}
          {ok && <div style={{ fontSize: 13, color: '#15803d', fontWeight: 700, marginTop: 10 }}>{ok}</div>}
          <div style={{ fontSize: 12, color: 'var(--muted2)', lineHeight: 1.5, marginTop: 12 }}>
            A Meta só permite modelos aprovados em disparo em massa e limita quantas pessoas novas o número alcança por dia (começa em 250 e sobe com o uso). Se o limite chegar, o disparo pausa sozinho e você continua depois. Muitas denúncias/bloqueios derrubam a qualidade do número, então mande só para quem espera receber.
          </div>
        </div>

        {/* Histórico */}
        {camps.filter(function(c) { return c !== ativa }).length > 0 && (
          <div style={card}>
            <div style={{ fontWeight: 800, fontSize: 14.5, color: 'var(--text)', marginBottom: 8 }}>Disparos anteriores</div>
            {camps.filter(function(c) { return c !== ativa }).map(function(c) {
              const e = enviadas(c.contagem)
              return (
                <div key={c.id} style={{ padding: '8px 0', borderTop: '1px solid var(--border)', fontSize: 13, color: 'var(--text)' }}>
                  <div style={{ fontWeight: 700 }}>{c.template_name} <span style={{ fontWeight: 400, color: 'var(--muted2)' }}>· {new Date(c.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })} · {SEG_NOME[c.segment] || c.segment}{c.status === 'cancelado' ? ' · cancelado' : ''}</span></div>
                  <div style={{ color: 'var(--muted2)', marginTop: 2 }}>
                    Enviadas {num(e)} de {num(c.total)} · Entregues {num((c.contagem.delivered || 0) + (c.contagem.read || 0))} · Lidas {num(c.contagem.read)} · Falharam {num(c.contagem.failed)}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Importar contatos */}
        <div style={card}>
          <div style={{ fontWeight: 800, fontSize: 14.5, color: 'var(--text)', marginBottom: 6 }}>Importar contatos (CSV)</div>
          <div style={{ fontSize: 13, color: 'var(--muted2)', lineHeight: 1.5, marginBottom: 10 }}>
            Para incluir a lista da Unnichat (ou outra). O arquivo precisa ter uma coluna <b>WhatsApp</b> e, se quiser usar o nome, uma coluna <b>Nome</b>. Números que já são de alunos não repetem.
          </div>
          <input ref={fileRef} type="file" accept=".csv,text/csv,text/plain" onChange={function(e) { const f = e.target.files?.[0]; if (f) importar(f) }} style={{ fontSize: 13 }} />
          {imp && <div style={{ fontSize: 13, fontWeight: 700, marginTop: 8, color: imp.indexOf('Pronto') === 0 ? '#15803d' : 'var(--text)' }}>{imp}</div>}
        </div>
      </div>
    </div>
  )
}
