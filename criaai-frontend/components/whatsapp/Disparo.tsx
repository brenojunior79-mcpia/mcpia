'use client'
import { Fragment, useEffect, useRef, useState } from 'react'
import { renderTpl, type Tpl } from './Modelos'

type Publico = { restantes?: number; lote?: number; total: number; podem: number; comPlano: number; semPlano: number; semNumero: number; contatos: number; semExpress?: number; semExpressPartes?: number[]; base?: number; reembolsados: number; repetidos: number }
type Cont = Record<string, number>
type Camp = { id: string; created_at: string; template_name: string; preview: string | null; segment: string; status: string; pause_reason: string | null; total: number; contagem: Cont; detalhe?: Detalhe | null }
type Detalhe = { responderam: number; erros: { erro: string; qtd: number }[]; falhas: { nome: string | null; wa: string; erro: string | null }[] }
const ABERTURA_PADRAO = 'Oi! Tudo bem? Como você está indo lá na plataforma? Como estão indo as aulas? 🙏'
const NOVIDADE_PADRAO = 'Você viu a novidade que lançamos lá na plataforma? Agora você pode integrar o seu Facebook com a plataforma e eu analiso essas campanhas para você vender no automático. Eu vou te orientar e ver as suas campanhas pela plataforma.'
type Cfg = { mode: 'nome' | 'texto'; value: string }

const card: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 18, marginBottom: 14 }
const h1: React.CSSProperties = { fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text)', margin: 0 }
const h3: React.CSSProperties = { fontWeight: 800, fontSize: 15, color: 'var(--text)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }
const tab: React.CSSProperties = { fontVariantNumeric: 'tabular-nums' }
const lab: React.CSSProperties = { fontSize: 12.5, fontWeight: 700, color: 'var(--text)', marginBottom: 4, display: 'block' }
const SEG_NOME: Record<string, string> = { todos: 'Todos os alunos', plano: 'Alunos com plano', sem_plano: 'Alunos sem plano', sem_express: 'Alunos sem a Estrutura Express', sem_express_1: 'Sem a Express · Lista 1', sem_express_2: 'Sem a Express · Lista 2', sem_express_3: 'Sem a Express · Lista 3', sem_express_4: 'Sem a Express · Lista 4', base: 'Contatos (toda a base)', sem_plano_250: 'Sem plano · lote de 250', contatos: 'Contatos importados', teste: 'Teste' }

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

function num(n: number | undefined) { return (n || 0).toLocaleString('pt-BR') }
function pct(a: number, b: number) { return b > 0 ? Math.round((a / b) * 100) + '%' : '0%' }

// Resultado do disparo: enviadas, entregues, lidas, responderam, falharam (com o motivo) e quem falhou
function Resultados({ c }: { c: Camp }) {
  const [verFalhas, setVerFalhas] = useState(false)
  const ct = c.contagem || {}
  const env = enviadas(ct)
  const entregues = (ct.delivered || 0) + (ct.read || 0)
  const lidas = ct.read || 0
  const falhas = ct.failed || 0
  const resp = c.detalhe ? c.detalhe.responderam : 0
  const itens: { n: number; rot: string; sub: string; cor: string }[] = [
    { n: env, rot: 'Enviadas', sub: 'de ' + num(c.total), cor: 'var(--text)' },
    { n: entregues, rot: 'Receberam', sub: pct(entregues, env) + ' das enviadas', cor: '#15803d' },
    { n: lidas, rot: 'Visualizaram', sub: pct(lidas, env) + ' das enviadas', cor: '#1d4ed8' },
    { n: resp, rot: 'Responderam', sub: pct(resp, env) + ' das enviadas', cor: '#7c3aed' },
    { n: falhas, rot: 'Deram erro', sub: pct(falhas, c.total) + ' do total', cor: falhas > 0 ? '#b91c1c' : 'var(--muted2)' },
    { n: faltam(ct) + (ct.cancelled || 0), rot: c.status === 'cancelado' ? 'Canceladas' : 'Faltam enviar', sub: '', cor: 'var(--muted2)' },
  ]
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(105px, 1fr))', gap: 8 }}>
        {itens.map(function(i) {
          return (
            <div key={i.rot} style={{ background: 'var(--surface2)', borderRadius: 10, padding: '8px 10px' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: i.cor, lineHeight: 1.1, ...tab }}>{num(i.n)}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{i.rot}</div>
              {i.sub && <div style={{ fontSize: 11, color: 'var(--muted2)' }}>{i.sub}</div>}
            </div>
          )
        })}
      </div>
      {falhas > 0 && c.detalhe && (
        <div style={{ marginTop: 8, fontSize: 12.5, color: 'var(--text)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: '#b91c1c' }}><i className="ti ti-alert-triangle" />Por que deu erro:</div>
          {c.detalhe.erros.map(function(e, k) { return <div key={k} style={{ color: 'var(--muted2)' }}>• {num(e.qtd)}× {e.erro}</div> })}
          <button className="at-b" onClick={function() { setVerFalhas(!verFalhas) }} aria-expanded={verFalhas} style={{ marginTop: 6 }}><i className={'ti ' + (verFalhas ? 'ti-chevron-up' : 'ti-chevron-down')} />{verFalhas ? 'Esconder quem falhou' : 'Ver quem falhou'}</button>
          {verFalhas && (
            <div style={{ marginTop: 6, maxHeight: 200, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 10px', lineHeight: 1.6, ...tab }}>
              {c.detalhe.falhas.map(function(f, k) { return <div key={k} style={{ color: 'var(--muted2)' }}>{f.nome || 'Sem nome'} · {f.wa} · {f.erro || 'Sem detalhe'}</div> })}
              {falhas > c.detalhe.falhas.length && <div style={{ color: 'var(--muted2)' }}>… e mais {num(falhas - c.detalhe.falhas.length)}</div>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Circulo de porcentagem (como na tabela de broadcasts)
function Anel({ v, cor }: { v: number; cor: string }) {
  const r = 16, c = 2 * Math.PI * r
  const p = Math.max(0, Math.min(100, Math.round(v)))
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" aria-label={p + '%'} style={{ display: 'block', margin: '0 auto' }}>
      <circle cx="20" cy="20" r={r} fill="none" stroke="var(--border)" strokeWidth="3" />
      <circle cx="20" cy="20" r={r} fill="none" stroke={cor} strokeWidth="3" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - p / 100)} transform="rotate(-90 20 20)" />
      <text x="20" y="23.5" textAnchor="middle" fontSize="9.5" fontWeight="800" fill={cor}>{p}%</text>
    </svg>
  )
}

// Tabela "Resultado dos disparos": nome, data, base, enviado, entregue, lido, falha e acoes (detalhes)
function TabelaDisparos({ camps }: { camps: Camp[] }) {
  const [aberto, setAberto] = useState<string | null>(null)
  const th: React.CSSProperties = { padding: '12px 10px', fontSize: 11.5, fontWeight: 700, color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '.03em', textAlign: 'left', whiteSpace: 'nowrap' }
  const td: React.CSSProperties = { padding: '12px 10px', fontSize: 13.5, color: 'var(--text)', borderTop: '1px solid var(--border)', verticalAlign: 'middle' }
  return (
    <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 12 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
        <thead style={{ background: 'var(--surface2)' }}>
          <tr>
            <th style={th}>Nome</th><th style={th}>Enviado</th><th style={th}>Base de contatos</th>
            <th style={{ ...th, textAlign: 'center' }}>Enviado</th><th style={{ ...th, textAlign: 'center' }}>Entregue</th><th style={{ ...th, textAlign: 'center' }}>Lido</th>
            <th style={{ ...th, textAlign: 'center' }}>Falha</th><th style={{ ...th, textAlign: 'center' }}>Ações</th>
          </tr>
        </thead>
        <tbody>
          {camps.map(function(c) {
            const ct = c.contagem || {}
            const base = c.total || 0
            const env = enviadas(ct)
            const ent = (ct.delivered || 0) + (ct.read || 0)
            const lid = ct.read || 0
            const fal = ct.failed || 0
            const p = function(n: number) { return base > 0 ? (n / base) * 100 : 0 }
            const open = aberto === c.id
            return (
              <Fragment key={c.id}>
                <tr>
                  <td style={td}><div style={{ fontWeight: 700, wordBreak: 'break-word' }}>{c.template_name}</div><div style={{ fontSize: 11.5, color: 'var(--muted2)' }}>{SEG_NOME[c.segment] || c.segment}{c.status === 'cancelado' ? ' · cancelado' : ''}</div></td>
                  <td style={{ ...td, whiteSpace: 'nowrap', ...tab }}>{new Date(c.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                  <td style={{ ...td, ...tab }}>{num(base)}</td>
                  <td style={td}><Anel v={p(env)} cor="#16a34a" /></td>
                  <td style={td}><Anel v={p(ent)} cor="#16a34a" /></td>
                  <td style={td}><Anel v={p(lid)} cor="#16a34a" /></td>
                  <td style={{ ...td, textAlign: 'center', fontWeight: 700, color: fal > 0 ? '#dc2626' : 'var(--muted2)', ...tab }}>{Math.round(p(fal))}%</td>
                  <td style={{ ...td, textAlign: 'center' }}><button type="button" onClick={function() { setAberto(open ? null : c.id) }} aria-expanded={open} title="Ver detalhes" style={{ border: 0, background: 'transparent', cursor: 'pointer', fontSize: 20, color: 'var(--muted2)', padding: '2px 8px', lineHeight: 1 }}>⋮</button></td>
                </tr>
                {open && (
                  <tr><td colSpan={8} style={{ ...td, background: 'var(--surface2)' }}><Resultados c={c} /></td></tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// Admin: total de alunos + disparo em massa de um modelo aprovado
export default function Disparo({ tpls, onLoadTpls }: { tpls: Tpl[] | null; onLoadTpls: () => void }) {
  const [pub, setPub] = useState<Publico | null>(null)
  const [pubErro, setPubErro] = useState('')
  const [seg, setSeg] = useState('todos')
  const [key, setKey] = useState('')
  const [cfg, setCfg] = useState<Cfg[]>([])
  const [teste, setTeste] = useState('')
  const [abertura, setAbertura] = useState(ABERTURA_PADRAO)
  const [novidade, setNovidade] = useState(NOVIDADE_PADRAO)
  const instrucaoIA = novidade.trim() || abertura.trim() ? JSON.stringify({ abertura: abertura.trim(), novidade: novidade.trim() }) : ''
  const [msg, setMsg] = useState('')
  const [ok, setOk] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [camps, setCamps] = useState<Camp[]>([])
  // Opcoes de "Quem vai receber" que o Breno removeu da lista (fica guardado neste navegador)
  const [escondidos, setEscondidos] = useState<string[]>([])
  useEffect(function() { try { const v = JSON.parse(localStorage.getItem('mcpia_disparo_escondidos') || '[]'); if (Array.isArray(v)) setEscondidos(v) } catch (e) {} }, [])
  function esconder(k: string) {
    const novo = escondidos.indexOf(k) >= 0 ? escondidos : escondidos.concat(k)
    setEscondidos(novo)
    try { localStorage.setItem('mcpia_disparo_escondidos', JSON.stringify(novo)) } catch (e) {}
    if (k === seg) { const ficou = ['todos', 'plano', 'sem_plano', 'sem_plano_250', 'sem_express', 'sem_express_1', 'sem_express_2', 'sem_express_3', 'sem_express_4', 'base', 'contatos'].find(function(x) { return novo.indexOf(x) < 0 }); if (ficou) setSeg(ficou) }
  }
  const [rodando, setRodando] = useState(false)
  const [imp, setImp] = useState('')
  const rodRef = useRef(false)
  const paraRef = useRef(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function carregarPub(modelo?: string) {
    try {
      const r = await fetch('/api/whatsapp/broadcast?view=publico' + (modelo ? '&template=' + encodeURIComponent(modelo) : ''), { cache: 'no-store' })
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
    const timer = setInterval(function() { if (!rodRef.current) carregarCamps() }, 30000)
    function aviso(e: BeforeUnloadEvent) { if (rodRef.current) { e.preventDefault(); e.returnValue = '' } }
    window.addEventListener('beforeunload', aviso)
    return function() { clearInterval(timer); window.removeEventListener('beforeunload', aviso); paraRef.current = true }
  }, [])

  const aprovados = (tpls || []).filter(function(t) { return t.status === 'APPROVED' })
  const t = aprovados.find(function(x) { return x.name + '|' + x.language === key }) || null
  const semMidia = function(x: Tpl) { return !x.header || x.header.charAt(0) !== '[' }
  const quantos = pub ? (seg === 'sem_plano_250' ? (pub.lote || 0) : seg === 'plano' ? pub.comPlano : seg === 'sem_plano' ? pub.semPlano : seg === 'contatos' ? pub.contatos : pub.podem) : 0
  const ativa = camps.find(function(c) { return c.status === 'rodando' || c.status === 'pausado' }) || null

  function escolher(k: string) {
    setKey(k); setOk(''); setMsg(''); carregarPub(k.split('|')[0])
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
      const r = await post('/api/whatsapp/broadcast', { action: 'teste', ...corpoBase(), numero: teste, instrucaoIA: instrucaoIA })
      if (r.ok) setOk('Teste enviado para ' + teste + '. Confira no celular.'); else setMsg(r.j.error || 'Não foi possível enviar o teste.')
    } catch (e) { setMsg('Sem conexão.') }
    setOcupado(false)
  }

  async function iniciar() {
    if (!t || !preenchido || !pub) return
    if (!window.confirm('Enviar o modelo "' + t.name + '" para ' + quantos + ' pessoa' + (quantos === 1 ? '' : 's') + ' (' + SEG_NOME[seg] + ')?\n\nIsso não pode ser desfeito depois de enviado.')) return
    setOcupado(true); setMsg(''); setOk('')
    try {
      const r = await post('/api/whatsapp/broadcast', { action: 'criar', ...corpoBase(), segmento: seg, esperado: quantos, instrucaoIA: instrucaoIA })
      if (!r.ok) { setMsg(r.j.error || 'Não foi possível criar o disparo.'); if (r.j.total) carregarPub(t ? t.name : undefined) }
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
    carregarCamps(); carregarPub(key ? key.split('|')[0] : undefined)
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


  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 20 }}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        <div style={{ marginBottom: 16 }}>
          <h2 style={h1}>Disparo em massa</h2>
          <p style={{ fontSize: 13, color: 'var(--muted2)', lineHeight: 1.5, margin: '4px 0 0', maxWidth: '65ch' }}>Envie um modelo aprovado para muitos alunos de uma vez e acompanhe quem recebeu, leu e respondeu.</p>
        </div>

        {/* Card: total de alunos */}
        <div style={card}>
          <div style={{ fontSize: 13, color: 'var(--muted2)', fontWeight: 700 }}>Total de alunos</div>
          {pubErro && <div role="alert" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#b91c1c', fontWeight: 700, fontSize: 13, marginTop: 6 }}><i className="ti ti-alert-triangle" />{pubErro}</div>}
          {!pub && !pubErro && <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--muted2)', fontSize: 13.5, marginTop: 6 }}><i className="ti ti-loader" />Carregando…</div>}
          {pub && (
            <>
              <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--text)', lineHeight: 1.1, marginTop: 2, ...tab }}>{num(pub.total)}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                {([
                  ['Podem receber no WhatsApp', pub.podem, '#15803d'],
                  ['Com plano ativo', pub.comPlano, 'var(--text)'],
                  ['Sem plano', pub.semPlano, 'var(--text)'],
                  ['Sem WhatsApp válido', pub.semNumero, '#b45309'],
                  ['Reembolsados (ficam de fora)', pub.reembolsados, '#b45309'],
                  ['Contatos importados (não alunos)', pub.contatos, 'var(--text)'],
                ] as const).map(function(x) {
                  return <div key={x[0]} style={{ flex: '1 1 150px', background: 'var(--surface2)', borderRadius: 10, padding: '8px 10px' }}><div style={{ fontSize: 20, fontWeight: 800, color: x[2], ...tab }}>{num(x[1])}</div><div style={{ fontSize: 12, color: 'var(--muted2)' }}>{x[0]}</div></div>
                })}
              </div>
            </>
          )}
        </div>

        {/* Disparo em andamento */}
        {ativa && (
          <div style={{ ...card, border: '1px solid rgba(22,163,74,0.5)' }}>
            <div style={{ ...h3, flexWrap: 'wrap' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, borderRadius: 999, padding: '2px 9px', fontSize: 11.5, fontWeight: 700, background: rodando && ativa.status !== 'pausado' ? 'rgba(22,163,74,0.14)' : 'rgba(217,119,6,0.16)', color: rodando && ativa.status !== 'pausado' ? '#15803d' : '#b45309' }}><i className={'ti ' + (ativa.status === 'pausado' ? 'ti-clock' : rodando ? 'ti-send' : 'ti-hourglass')} style={{ fontSize: 13 }} />{ativa.status === 'pausado' ? 'Disparo pausado' : rodando ? 'Enviando…' : 'Disparo parado'}</span>
              <span style={{ minWidth: 0, wordBreak: 'break-all' }}>{ativa.template_name}</span>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--muted2)', margin: '4px 0 10px', ...tab }}>{SEG_NOME[ativa.segment] || ativa.segment} · {num(ativa.total)} pessoas</div>
            <div style={{ height: 10, borderRadius: 6, background: 'var(--surface2)', overflow: 'hidden' }}><div style={{ height: '100%', width: Math.round(((ativa.total - faltam(ativa.contagem)) / Math.max(1, ativa.total)) * 100) + '%', background: '#16a34a', transition: 'width .3s' }} /></div>
            <div style={{ fontSize: 13, color: 'var(--text)', marginTop: 8, ...tab }}>
              Enviadas <b>{num(enviadas(ativa.contagem))}</b> · Falharam <b>{num(ativa.contagem.failed)}</b> · Faltam <b>{num(faltam(ativa.contagem))}</b>
            </div>
            <Resultados c={ativa} />
            {ativa.pause_reason && <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#b91c1c', fontWeight: 700, marginTop: 8 }}><i className="ti ti-alert-triangle" />{ativa.pause_reason}</div>}
            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              {!rodando && <button className="at-b at-b-ok" onClick={function() { rodar(ativa.id) }}><i className="ti ti-player-play" />Continuar envio</button>}
              {rodando && <button className="at-b" onClick={function() { paraRef.current = true }}><i className="ti ti-clock" />Pausar</button>}
              <button className="at-b" onClick={function() { cancelar(ativa.id) }} style={{ borderColor: 'rgba(220,38,38,0.4)', color: '#dc2626' }}><i className="ti ti-x" />Cancelar disparo</button>
            </div>
            {rodando && <div style={{ fontSize: 12, color: 'var(--muted2)', marginTop: 8 }}>Mantenha esta página aberta até terminar. Se fechar, é só voltar aqui e clicar em Continuar.</div>}
          </div>
        )}

        {/* Card: novo disparo */}
        <div style={card}>
          <h3 style={{ ...h3, marginBottom: 14 }}><i className="ti ti-speakerphone" style={{ color: '#15803d' }} />Novo disparo</h3>

          <label style={lab}>1. Quem vai receber</label>
          {(function() {
            const opcoes: [string, string][] = [
              ['todos', 'Todos os alunos (' + num(pub?.podem) + ')'],
              ['plano', 'Só quem tem plano ativo (' + num(pub?.comPlano) + ')'],
              ['sem_plano', 'Só quem não tem plano (' + num(pub?.semPlano) + ')'],
              ['sem_plano_250', 'Sem plano · próximos 250 que ainda não receberam este modelo (' + (t ? num(pub?.lote) + ' agora, restam ' + num(pub?.restantes) : 'escolha o modelo') + ')'],
              ['sem_express', 'Só quem não tem a Estrutura Express (' + num(pub?.semExpress) + ')'],
              ['sem_express_1', 'Sem a Estrutura Express · Lista 1 (' + num(pub?.semExpressPartes?.[0]) + ')'],
              ['sem_express_2', 'Sem a Estrutura Express · Lista 2 (' + num(pub?.semExpressPartes?.[1]) + ')'],
              ['sem_express_3', 'Sem a Estrutura Express · Lista 3 (' + num(pub?.semExpressPartes?.[2]) + ')'],
              ['sem_express_4', 'Sem a Estrutura Express · Lista 4 (' + num(pub?.semExpressPartes?.[3]) + ')'],
              ['base', 'Contatos: toda a base, alunos, conversas e compradores (' + num(pub?.base) + ')'],
              ['contatos', 'Contatos importados que não são alunos (' + num(pub?.contatos) + ')'],
            ]
            const visiveis = opcoes.filter(function(o) { return escondidos.indexOf(o[0]) < 0 || o[0] === seg })
            return (
              <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', marginBottom: 8 }}>
                {visiveis.map(function(o) {
                  const on = o[0] === seg
                  return (
                    <div key={o[0]} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderTop: '1px solid var(--border)', background: on ? 'rgba(22,163,74,.08)' : 'transparent', cursor: 'pointer' }} onClick={function() { setSeg(o[0]); setOk('') }}>
                      <span style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid ' + (on ? '#16a34a' : 'var(--border)'), background: on ? 'radial-gradient(circle, #16a34a 45%, transparent 50%)' : 'transparent', flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 13.5, fontWeight: on ? 700 : 500, color: 'var(--text)' }}>{o[1]}</span>
                      <button type="button" title="Remover esta opção da lista" aria-label={'Remover ' + o[1]} onClick={function(e) { e.stopPropagation(); esconder(o[0]) }} style={{ border: 0, background: 'transparent', color: '#dc2626', fontWeight: 800, fontSize: 15, cursor: 'pointer', padding: '0 4px' }}>✕</button>
                    </div>
                  )
                })}
              </div>
            )
          })()}
          {escondidos.length > 0 && <button type="button" className="at-b" onClick={function() { setEscondidos([]); try { localStorage.removeItem('mcpia_disparo_escondidos') } catch (e) {} }} style={{ marginBottom: 10 }}><i className="ti ti-eye" />Mostrar opções removidas ({escondidos.length})</button>}
          <a className="at-b" href={'/api/whatsapp/broadcast?view=exportar&seg=' + encodeURIComponent(seg)} download style={{ marginBottom: 12, display: 'inline-flex', textDecoration: 'none' }}><i className="ti ti-download" />Exportar contatos desta lista (CSV)</a>

          <label style={lab}>2. Modelo de mensagem</label>
          {tpls && aprovados.length === 0 && <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', fontSize: 13, color: 'var(--muted2)', marginBottom: 8 }}><i className="ti ti-info-circle" style={{ fontSize: 15, marginTop: 1 }} />Nenhum modelo aprovado ainda. Crie um na aba Modelos e espere a aprovação da Meta.</div>}
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
                    <span style={{ fontSize: 13, fontWeight: 700, width: 44, color: 'var(--text)', ...tab }}>{'{{' + (i + 1) + '}}'}</span>
                    <select className="at-input" value={c.mode} onChange={function(e) { setC(i, { mode: e.target.value as any }) }} style={{ flex: '1 1 190px', width: 'auto', minWidth: 0 }}>
                      <option value="nome">Primeiro nome da pessoa</option>
                      <option value="texto">Texto fixo (igual para todos)</option>
                    </select>
                    <input className="at-input" placeholder={c.mode === 'nome' ? 'Se não tiver nome, usar: amigo(a)' : 'Texto'} value={c.value} onChange={function(e) { setC(i, { value: e.target.value }) }} style={{ flex: '1 1 160px', width: 'auto', minWidth: 0 }} />
                  </div>
                )
              })}
            </div>
          )}

          {t && (
            <div style={{ background: '#d9fdd3', color: '#111b21', borderRadius: 12, padding: '10px 12px', fontSize: 13.5, lineHeight: 1.45, whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 200, overflowY: 'auto', marginBottom: 12 }}>
              {t.header && <div style={{ fontWeight: 800, marginBottom: 4 }}>{t.header}</div>}
              {renderTpl(t.body, cfg.map(function(c) { return c.mode === 'nome' ? 'Maria' : c.value }))}
              {t.footer && <div style={{ fontSize: 11.5, opacity: 0.6, marginTop: 6 }}>{t.footer}</div>}
              {t.buttons.length > 0 && <div style={{ fontSize: 12, marginTop: 6, opacity: 0.7 }}>Botões: {t.buttons.join(' · ')}</div>}
            </div>
          )}

          {t && (
            <>
              <label style={lab}>3a. 1ª resposta do Júnior (quando a pessoa responder o disparo)</label>
              <textarea className="at-input" rows={2} value={abertura} onChange={function(e) { setAbertura(e.target.value) }} style={{ width: '100%', resize: 'vertical', marginBottom: 8 }} />
              <label style={lab}>3b. Depois que ela responder a 1ª, o Júnior manda a novidade</label>
              <textarea className="at-input" rows={4} value={novidade} onChange={function(e) { setNovidade(e.target.value) }} style={{ width: '100%', resize: 'vertical', marginBottom: 4 }} />
              <div style={{ fontSize: 12, color: 'var(--muted2)', lineHeight: 1.5, marginBottom: 14 }}>Vale só para quem receber ESTE disparo (por 4 dias). Passo 1: a pessoa responde o disparo (oi, estou) e o Júnior manda a 1ª resposta. Passo 2: ela responde e o Júnior manda a novidade. Depois ele conduz: se ela não tiver plano, oferece o Pro de R$ 49,90 e, após o pagamento, orienta a integrar o Facebook. Quem não recebeu o disparo continua normal. Deixe os dois campos vazios para o Júnior não fazer nada especial.</div>
              <label style={lab}>4. Teste primeiro (recomendado)</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                <input className="at-input" placeholder="Seu WhatsApp com DDD, ex: 37 99999-9999" value={teste} onChange={function(e) { setTeste(e.target.value) }} style={{ flex: '1 1 220px', width: 'auto', minWidth: 0 }} />
                <button className="at-b" disabled={ocupado || !preenchido || !teste.trim()} onClick={enviarTeste}><i className="ti ti-device-mobile" />Enviar teste</button>
              </div>
              <button className="at-b at-b-ok" disabled={ocupado || rodando || !preenchido || quantos === 0 || !!ativa} onClick={iniciar} style={{ padding: '11px 18px', fontSize: 14, whiteSpace: 'normal', ...tab }}>
                <i className="ti ti-send" />Enviar para {num(quantos)} pessoa{quantos === 1 ? '' : 's'}
              </button>
              {ativa && <div style={{ fontSize: 12.5, color: 'var(--muted2)', marginTop: 6 }}>Termine ou cancele o disparo em andamento para criar outro.</div>}
            </>
          )}
          {msg && <div role="alert" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#b91c1c', fontWeight: 700, marginTop: 10 }}><i className="ti ti-alert-triangle" />{msg}</div>}
          {ok && <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#15803d', fontWeight: 700, marginTop: 10 }}><i className="ti ti-circle-check" />{ok}</div>}
          <div style={{ display: 'flex', gap: 8, fontSize: 12, color: 'var(--muted2)', lineHeight: 1.5, marginTop: 14, padding: '10px 12px', borderRadius: 10, background: 'var(--surface2)' }}>
            <i className="ti ti-info-circle" style={{ fontSize: 15, marginTop: 1, flexShrink: 0 }} />
            A Meta só permite modelos aprovados em disparo em massa e limita quantas pessoas novas o número alcança por dia (começa em 250 e sobe com o uso). Se o limite chegar, o disparo pausa sozinho e você continua depois. Muitas denúncias/bloqueios derrubam a qualidade do número, então mande só para quem espera receber.
          </div>
        </div>

        {/* Histórico */}
        {camps.filter(function(c) { return c !== ativa }).length > 0 && (
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}><h3 style={h3}><i className="ti ti-chart-bar" style={{ color: '#15803d' }} />Resultado dos disparos</h3><button className="at-b" onClick={carregarCamps}><i className="ti ti-refresh" />Atualizar</button></div>
            <TabelaDisparos camps={camps.filter(function(c) { return c !== ativa })} />
          </div>
        )}

        {/* Importar contatos */}
        <div style={{ ...card, position: 'relative' }}>
          <h3 style={{ ...h3, marginBottom: 6 }}><i className="ti ti-users" style={{ color: '#15803d' }} />Importar contatos (CSV)</h3>
          <div style={{ fontSize: 13, color: 'var(--muted2)', lineHeight: 1.5, marginBottom: 10 }}>
            Para incluir a lista da Unnichat (ou outra). O arquivo precisa ter uma coluna <b>WhatsApp</b> e, se quiser usar o nome, uma coluna <b>Nome</b>. Números que já são de alunos não repetem.
          </div>
          <input ref={fileRef} id="disparo-csv" type="file" accept=".csv,text/csv,text/plain" onChange={function(e) { const f = e.target.files?.[0]; if (f) importar(f) }} style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }} />
          <label htmlFor="disparo-csv" className="at-b" style={{ cursor: 'pointer' }}><i className="ti ti-paperclip" />Escolher arquivo CSV</label>
          {imp && <div role="status" style={{ fontSize: 13, fontWeight: 700, marginTop: 10, color: imp.indexOf('Pronto') === 0 ? '#15803d' : 'var(--text)' }}>{imp}</div>}
        </div>
      </div>
    </div>
  )
}
