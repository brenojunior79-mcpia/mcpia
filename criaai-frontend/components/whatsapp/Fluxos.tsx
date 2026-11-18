'use client'
import { useEffect, useState } from 'react'
import { DIAS, normalizar, type Horario as H } from '@/lib/waHours'
import { GATILHOS, VAZIO, aplicaNome, type Fluxo } from '@/lib/waFlows'
import Horario from './Horario'
import EditorEvento, { VAZIO_EVENTO, textoEspera, type ConexaoLeve } from './FluxoEvento'
import { nomeEvento, type FluxoAuto } from '@/lib/waAutoTipos'
import ConstrutorFluxo, { type StatsSeq, type ConexaoSeq } from './ConstrutorFluxo'
import { VAZIA_SEQ, type Sequencia } from '@/lib/waSeqTipos'

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

const ICONE: Record<string, string> = { primeira: 'mood-smile', palavra: 'message-2', qualquer: 'messages' }
const titulo: React.CSSProperties = { margin: 0, fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text)' }
const sub: React.CSSProperties = { fontSize: 13, color: 'var(--muted2)', lineHeight: 1.5, marginTop: 3 }
const cab: React.CSSProperties = { display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 16 }
const erroSt: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#b91c1c', fontWeight: 700, marginBottom: 10 }
const cartao: React.CSSProperties = { cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 14, marginBottom: 10 }
const icoBox: React.CSSProperties = { width: 42, height: 42, borderRadius: 12, background: 'rgba(22,163,74,0.10)', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 21, flexShrink: 0 }
const nomeSt: React.CSSProperties = { fontWeight: 800, fontSize: 15, color: 'var(--text)', overflowWrap: 'anywhere' }
const descSt: React.CSSProperties = { fontSize: 12.5, color: 'var(--muted2)', marginTop: 2, lineHeight: 1.45 }
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
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 20 }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <button onClick={function() { onVoltar(false) }} className="at-b" style={{ marginBottom: 14 }}><i className="ti ti-arrow-left" />Voltar para fluxos</button>
        <h2 style={{ ...titulo, marginBottom: 14 }}>{novo ? 'Novo fluxo' : 'Editar fluxo'}</h2>

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

        {msg && <div role="alert" style={erroSt}><i className="ti ti-alert-triangle" />{msg}</div>}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="at-b at-b-ok" onClick={salvar} disabled={salvando} style={{ padding: '10px 18px', fontSize: 14, opacity: salvando ? 0.6 : 1 }}><i className="ti ti-check" />{salvando ? 'Salvando…' : 'Salvar fluxo'}</button>
          {!novo && <button className="at-b" onClick={apagar} disabled={salvando} style={{ padding: '10px 16px', fontSize: 14, color: '#dc2626', borderColor: 'rgba(220,38,38,0.4)' }}><i className="ti ti-trash" />Apagar</button>}
        </div>
      </div>
    </div>
  )
}

// Lista de fluxos de automacao do WhatsApp. Cada fluxo abre a propria tela de configuracao.
export default function Fluxos() {
  const [tela, setTela] = useState<'lista' | 'horario' | 'editar' | 'escolher' | 'evento' | 'construtor'>('lista')
  const [seqs, setSeqs] = useState<(Sequencia & { id: string })[]>([])
  const [seqStats, setSeqStats] = useState<Record<string, StatsSeq>>({})
  const [seqConexoes, setSeqConexoes] = useState<ConexaoSeq[]>([])
  const [editSeq, setEditSeq] = useState<Sequencia>(VAZIA_SEQ)
  const [autos, setAutos] = useState<(FluxoAuto & { id: string })[]>([])
  const [stats, setStats] = useState<Record<string, any>>({})
  const [conexoes, setConexoes] = useState<ConexaoLeve[]>([])
  const [editAuto, setEditAuto] = useState<FluxoAuto>(VAZIO_EVENTO)
  const [h, setH] = useState<H | null>(null)
  const [fluxos, setFluxos] = useState<(Fluxo & { id: string })[] | null>(null)
  const [edit, setEdit] = useState<Fluxo>(VAZIO)
  const [erro, setErro] = useState('')

  function carregar() {
    fetch('/api/whatsapp/settings', { cache: 'no-store' }).then(function(r) { return r.json() }).then(function(j) { if (j.settings) setH(normalizar(j.settings)) }).catch(function() {})
    fetch('/api/whatsapp/flows', { cache: 'no-store' }).then(function(r) { return r.json().then(function(j) { return { ok: r.ok, j: j } }) }).then(function(x) {
      if (x.ok) { setFluxos(x.j.fluxos || []); setErro('') } else setErro(x.j.error || 'Não foi possível carregar os fluxos.')
    }).catch(function() { setErro('Sem conexão.') })
    fetch('/api/whatsapp/seq', { cache: 'no-store' }).then(function(r) { return r.json().then(function(j) { return { ok: r.ok, j: j } }) }).then(function(x) {
      if (x.ok) { setSeqs(x.j.fluxos || []); setSeqStats(x.j.stats || {}); setSeqConexoes(x.j.conexoes || []) }
    }).catch(function() {})
    fetch('/api/whatsapp/auto', { cache: 'no-store' }).then(function(r) { return r.json().then(function(j) { return { ok: r.ok, j: j } }) }).then(function(x) {
      if (x.ok) { setAutos(x.j.fluxos || []); setStats(x.j.stats || {}); setConexoes(x.j.conexoes || []) }
    }).catch(function() {})
  }
  useEffect(function() { if (tela === 'lista') carregar() }, [tela])

  async function ligar(f: Fluxo & { id: string }, on: boolean) {
    setFluxos(function(l) { return (l || []).map(function(x) { return x.id === f.id ? { ...x, enabled: on } : x }) })
    try { await fetch('/api/whatsapp/flows', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'ligar', id: f.id, enabled: on }) }) } catch (e) { carregar() }
  }

  async function ligarAuto(f: FluxoAuto & { id: string }, on: boolean) {
    setErro('')
    try {
      const r = await fetch('/api/whatsapp/auto', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'ligar', id: f.id, enabled: on }) })
      const j = await r.json().catch(function() { return {} })
      if (!r.ok) setErro(j.error || 'Não foi possível salvar.')
    } catch (e) {}
    carregar()
  }

  if (tela === 'construtor') return <ConstrutorFluxo key={editSeq.id || 'novo'} inicial={editSeq} conexoes={seqConexoes} stats={editSeq.id ? seqStats[editSeq.id] : undefined} onVoltar={function() { setTela('lista') }} />

  if (tela === 'evento') return <EditorEvento inicial={editAuto} conexoes={conexoes} onVoltar={function() { setTela('lista') }} />

  if (tela === 'escolher') {
    const op = function(icone: string, tit: string, desc: string, ir: () => void) {
      return (
        <div onClick={ir} style={{ ...cartao, flexWrap: 'nowrap' }}>
          <div style={icoBox}><i className={'ti ti-' + icone} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={nomeSt}>{tit}</div>
            <div style={descSt}>{desc}</div>
          </div>
          <span style={{ display: 'inline-flex', alignItems: 'center', color: '#15803d', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>Criar<i className="ti ti-chevron-right" style={{ fontSize: 16 }} /></span>
        </div>
      )
    }
    return (
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 20 }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <button onClick={function() { setTela('lista') }} className="at-b" style={{ marginBottom: 14 }}><i className="ti ti-arrow-left" />Voltar para fluxos</button>
          <h2 style={{ ...titulo, marginBottom: 14 }}>Que tipo de fluxo você quer criar?</h2>
          {op('layout', 'Fluxo em blocos (construtor)', 'Monte uma sequência: começa quando a pessoa manda uma palavra ou quando acontece algo na compra, com atrasos, textos, áudios, imagens, vídeos e modelos. Você vê quantos enviaram, entregaram e leram.', function() { setEditSeq({ ...VAZIA_SEQ, steps: [] }); setTela('construtor') })}
          {op('message-circle', 'Resposta automática', 'Responde sozinho quando alguém escreve para o suporte (palavra-chave, primeira mensagem…).', function() { setEdit(VAZIO); setTela('editar') })}
          {op('shopping-cart', 'Fluxo por evento da Hubla', 'Começa quando acontece algo na Hubla: carrinho abandonado, Pix gerado, cartão recusado, compra aprovada… Com esperas e modelos de mensagem.', function() { setEditAuto({ ...VAZIO_EVENTO, connection_id: conexoes.length === 1 ? conexoes[0].id : null }); setTela('evento') })}
        </div>
      </div>
    )
  }

  if (tela === 'editar') return <Editor inicial={edit} onVoltar={function() { setTela('lista') }} />

  if (tela === 'horario') {
    return (
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 20px 0', maxWidth: 680, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
          <button onClick={function() { setTela('lista') }} className="at-b"><i className="ti ti-arrow-left" />Voltar para fluxos</button>
        </div>
        <Horario />
      </div>
    )
  }

  const ativo = !!h && h.away_enabled
  const chip = function(on: boolean, ok: boolean): React.CSSProperties { return { display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 800, borderRadius: 999, padding: '4px 10px', whiteSpace: 'nowrap', background: !ok ? 'var(--surface2)' : on ? 'rgba(22,163,74,0.14)' : 'var(--surface2)', color: !ok ? 'var(--muted2)' : on ? '#15803d' : 'var(--muted2)' } }
  const ponto = function(on: boolean) { return <span aria-hidden style={{ width: 7, height: 7, borderRadius: 99, background: on ? '#16a34a' : 'var(--border2)' }} /> }
  const icone = function(nome: string) { return <div style={icoBox}><i className={'ti ti-' + nome} /></div> }
  const sw = function(on: boolean, fn: () => void) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }} onClick={function(e) { e.stopPropagation() }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: on ? '#15803d' : 'var(--muted2)' }}>{on ? 'Ligado' : 'Desligado'}</span>
        <button type="button" className={'at-sw' + (on ? ' on' : '')} aria-pressed={on} aria-label={on ? 'Clique para desligar' : 'Clique para ligar'} title={on ? 'Clique para desligar' : 'Clique para ligar'} onClick={fn} />
      </span>
    )
  }
  const abrir = function(t: string) { return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, color: '#15803d', fontWeight: 800, fontSize: 13 }}>{t}<i className="ti ti-chevron-right" style={{ fontSize: 16 }} /></span> }
  const secao = function(ico: string, t: string) { return <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, fontSize: 13.5, color: 'var(--text)', margin: '22px 0 10px' }}><i className={'ti ti-' + ico} style={{ fontSize: 17, color: 'var(--muted2)' }} />{t}</div> }
  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 20 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={cab}>
          <div style={{ flex: '1 1 260px', minWidth: 0 }}>
            <h2 style={titulo}>Fluxos</h2>
            <div style={sub}>Automações do WhatsApp: respostas que a plataforma envia sozinha. Clique em um fluxo para ver e editar.</div>
          </div>
          <button className="at-b at-b-ok" onClick={function() { setTela('escolher') }}><i className="ti ti-plus" />Novo fluxo</button>
        </div>

        <div onClick={function() { setTela('horario') }} style={cartao}>
          {icone('clock')}
          <div style={{ flex: '1 1 220px', minWidth: 0 }}>
            <div style={nomeSt}>Horário de atendimento</div>
            <div style={descSt}>Responde sozinho quando alguém escreve fora do horário.</div>
            {h && <div style={{ fontSize: 12.5, color: 'var(--text)', marginTop: 4, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{resumo(h)}</div>}
          </div>
          <span style={chip(ativo, !!h)}>{!h ? 'Carregando…' : <>{ponto(ativo)}{ativo ? 'Ativo' : 'Desligado'}</>}</span>
          {abrir('Editar')}
        </div>

        {erro && <div role="alert" style={erroSt}><i className="ti ti-alert-triangle" />{erro}</div>}
        {!fluxos && !erro && <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--muted2)', padding: '14px 4px' }}><i className="ti ti-loader" />Carregando fluxos…</div>}
        {fluxos && fluxos.length === 0 && !erro && (
          <div style={{ textAlign: 'center', padding: '28px 16px', color: 'var(--muted2)' }}>
            <i className="ti ti-bolt" style={{ fontSize: 40, opacity: 0.5 }} />
            <div style={{ fontSize: 13.5, marginTop: 6, lineHeight: 1.5 }}>Você ainda não criou outros fluxos. Clique em <b>Novo fluxo</b> para criar um.</div>
          </div>
        )}
        {(fluxos || []).map(function(f) {
          return (
            <div key={f.id} onClick={function() { setEdit(f); setTela('editar') }} style={{ ...cartao, opacity: f.enabled ? 1 : 0.75 }}>
              {icone(ICONE[f.trigger] || 'bolt')}
              <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                <div style={nomeSt}>{f.name}</div>
                <div style={descSt}>{descricao(f)}</div>
                <div style={{ fontSize: 12.5, color: 'var(--text)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.message}</div>
              </div>
              {sw(f.enabled, function() { ligar(f, !f.enabled) })}
              {abrir('Editar')}
            </div>
          )
        })}

        {seqs.length > 0 && secao('layout', 'Fluxos em blocos')}
        {seqs.map(function(f) {
          const cn = seqConexoes.find(function(c) { return c.id === f.connection_id })
          const g = f.trigger
          const gat = g.tipo === 'palavra' ? 'Palavra: ' + (g.palavras.length ? g.palavras.join(', ') : '…') : 'Evento: ' + (g.eventos && g.eventos.length ? g.eventos : [g.evento]).map(nomeEvento).join(' ou ') + (g.metodo ? ' · ' + g.metodo : '')
          // Conta quem JA RECEBEU o fluxo: o maior numero de pessoas que receberam algum bloco de mensagem (nao so quem terminou todos os blocos)
          const porBloco: Record<string, number> = {}
          const sendsF = (seqStats[f.id] || { sends: [] }).sends || []
          sendsF.forEach(function(x) { if (['falhou', 'erro', 'failed'].indexOf(String(x.status)) < 0) porBloco[x.step_id] = (porBloco[x.step_id] || 0) + x.n })
          const enviados = Object.keys(porBloco).reduce(function(a, k) { return Math.max(a, porBloco[k]) }, 0)
          return (
            <div key={f.id} onClick={function() { setEditSeq(f); setTela('construtor') }} style={{ ...cartao, opacity: f.enabled ? 1 : 0.75 }}>
              {icone('layout')}
              <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                <div style={nomeSt}>{f.name}</div>
                <div style={descSt}>{gat}{cn ? ' · ' + cn.name : ''}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: 'var(--text)', marginTop: 4 }}><i className="ti ti-checks" style={{ color: '#16a34a', fontSize: 15 }} /><b style={{ fontVariantNumeric: 'tabular-nums' }}>{enviados}</b> {enviados === 1 ? 'fluxo enviado' : 'fluxos enviados'}</div>
              </div>
              <span style={chip(f.enabled, true)}>{ponto(f.enabled)}{f.enabled ? 'Ligado' : 'Desligado'}</span>
              {abrir('Abrir')}
            </div>
          )
        })}

        {autos.length > 0 && secao('shopping-cart', 'Fluxos por evento da Hubla')}
        {autos.map(function(f) {
          const st = stats[f.id] || {}
          const passos = f.steps.map(function(p) { return p.tipo === 'esperar' ? 'Esperar ' + textoEspera(p.minutos) : (p.template || '?') }).join(' → ')
          const num = function(k: string) { return Number(st[k] || 0) }
          const cn = conexoes.find(function(c) { return c.id === f.connection_id })
          const erros = num('erros') + num('falharam')
          const n = function(t: string, v: number, cor?: string) { return <span style={{ color: cor || 'var(--muted2)' }}>{t}: <b style={{ color: cor || 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{v}</b></span> }
          return (
            <div key={f.id} onClick={function() { setEditAuto(f); setTela('evento') }} style={{ ...cartao, display: 'block', opacity: f.enabled ? 1 : 0.75 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                {icone('shopping-cart')}
                <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                  <div style={nomeSt}>{f.name}</div>
                  <div style={descSt}>Evento: {nomeEvento(f.trigger_event)}{f.trigger_filter.metodo ? ' · ' + f.trigger_filter.metodo : ''}{cn ? ' · ' + cn.name : ''}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--text)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{passos || 'Sem passos ainda'}</div>
                </div>
                {sw(f.enabled, function() { ligarAuto(f, !f.enabled) })}
                {abrir('Editar')}
              </div>
              <div style={{ display: 'flex', gap: '6px 14px', flexWrap: 'wrap', fontSize: 12, marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                {n('Esperando', num('ativos'))}
                {n('Concluídos', num('concluidos'))}
                {n('Cancelados (compraram)', num('cancelados'))}
                {n('Enviadas', num('enviadas'))}
                {n('Entregues', num('entregues'))}
                {n('Lidas', num('lidas'))}
                {erros > 0 && n('Com erro', erros, '#b91c1c')}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
